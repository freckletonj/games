import test from 'node:test';
import assert from 'node:assert/strict';
import race from '../levels/skybound-stampede.json' with {type:'json'};
import {stepRace,createRaceState,CRASH_TICKS,raceHazardPose} from '../src/race-rules.js';
import {stepMountedMotion,MOUNTS} from '../src/mounts.js';
import {createRaceWorld,stepRaceWorld,raceRiderLeftBehind,
  raceCameraFrame,raceHazardContact} from '../src/race-world.js';

const world={width:race.width*16,height:race.height*16,tile:16,
  groundAt:()=>880,platformSegments:[],inWater:()=>false};
const actions={left:false,right:true,down:false,jump:false,jumpPressed:false};
const trainingRace={...race,hazards:[]};

function rider(id,kind,x){
  const mount={kind,x,y:880,vx:0,vy:0,grounded:true,face:1,
    flaps:0,flapWait:0,rider:id};
  return {id,x,y:880,mount,sleep:false,bubble:null,clouded:null,assist:false};
}
function advanceMounted(players){
  for(const player of players){
    stepMountedMotion(player.mount,actions,1,world);
    player.x=player.mount.x;
    player.y=player.mount.y;
  }
}

test('1P and 2P gates are based on actual independent mount objects',()=>{
  const first=rider(0,'unicorn',232);
  const second={id:1,x:408,mount:null,assist:false};
  const raceWorld=createRaceWorld(race);
  for(let i=0;i<90;i++)
    stepRaceWorld(race,raceWorld,[first,second]);
  assert.equal(raceWorld.state.phase,'waitingForUnicorns');
  assert.equal(raceWorld.state.anchor,512);
  assert.deepEqual(raceWorld.hazards,[]);
  second.mount=first.mount;
  stepRaceWorld(race,raceWorld,[first,second]);
  assert.equal(raceWorld.state.phase,'waitingForUnicorns',
    'A shared Unicorn is not two distinct seats');
  second.mount=rider(1,'unicorn',408).mount;
  second.mount.rider=0;
  stepRaceWorld(race,raceWorld,[first,second]);
  assert.equal(raceWorld.state.phase,'waitingForUnicorns',
    'A mount assigned to player one cannot satisfy player two');
  second.mount.rider=1;
  stepRaceWorld(race,raceWorld,[first,second]);
  assert.equal(raceWorld.state.phase,'groundScroll');
  assert.equal(raceWorld.state.tick,0);
});

test('mount acceleration and 60 Hz progress retain both riders in camera limits',()=>{
  assert.equal(MOUNTS.unicorn.speed,4.2);
  assert.equal(MOUNTS.pegasus.kind,'flight');
  const riders=[rider(0,'unicorn',232),rider(1,'unicorn',408)];
  const state=createRaceWorld(trainingRace);
  stepRaceWorld(trainingRace,state,riders);
  let observedHazard=false,observedClamp=false;
  for(let tick=0;tick<1200&&state.state.phase==='groundScroll';tick++){
    advanceMounted(riders);
    const next=stepRaceWorld(trainingRace,state,riders);
    assert.equal(next.restarted,false,'Both riders stay inside progress window');
    assert.ok(state.state.anchor>=512&&state.state.anchor<=2944);
    if(state.state.phase==='groundScroll')
      assert.ok(riders.every(p=>p.mount.x<=state.state.anchor+race.camera.ahead+.01));
    observedHazard||=state.hazards.length>0;
    observedClamp||=riders.some(p=>Math.abs(
      p.mount.x-(state.state.anchor+race.camera.ahead))<.001);
  }
  assert.equal(observedHazard,false);
  assert.ok(observedClamp);
  assert.equal(state.state.phase,'sanctuaryStop');
  assert.equal(state.state.anchor,2944);
  assert.deepEqual(state.hazards,[]);
  for(let i=0;i<400;i++)stepRaceWorld(trainingRace,state,riders);
  assert.equal(state.state.phase,'waitingForPegasi');
  assert.equal(state.state.anchor,2944);
});

test('midpoint stays stopped until every human rides a Pegasus, not cloud assist',()=>{
  const p1=rider(0,'unicorn',232),p2=rider(1,'unicorn',408);
  const state=createRaceWorld(trainingRace);
  stepRaceWorld(trainingRace,state,[p1,p2]);
  for(let i=0;i<1200&&state.state.phase==='groundScroll';i++){
    advanceMounted([p1,p2]);
    stepRaceWorld(trainingRace,state,[p1,p2]);
  }
  stepRaceWorld(trainingRace,state,[p1,p2]);
  assert.equal(state.state.phase,'waitingForPegasi');
  p1.mount=rider(0,'pegasus',2984).mount;
  for(let i=0;i<140;i++)stepRaceWorld(trainingRace,state,[p1,p2]);
  assert.equal(state.state.phase,'waitingForPegasi');
  p2.mount=rider(1,'pegasus',3176).mount;
  stepRaceWorld(trainingRace,state,[p1,p2]);
  assert.equal(state.state.phase,'flightScroll');
  const frozen=state.state;
  stepRaceWorld(trainingRace,state,[p1,p2],{paused:true});
  assert.equal(state.state,frozen);
  for(let i=0;i<1000&&state.state.phase==='flightScroll';i++){
    advanceMounted([p1,p2]);
    stepRaceWorld(trainingRace,state,[p1,p2]);
  }
  assert.equal(state.state.phase,'finished');
  assert.equal(state.state.anchor,5504);
  assert.deepEqual(state.hazards,[]);
  const cloud={id:1,assist:{},mount:null};
  const solo=createRaceWorld(trainingRace);
  stepRaceWorld(trainingRace,solo,[rider(0,'unicorn',232),cloud]);
  assert.equal(solo.state.phase,'groundScroll');
});


test('a voluntary Unicorn dismount holds scroll and hazards, then reboarding resumes',()=>{
  const player=rider(0,'unicorn',232),players=[player];
  const state=createRaceWorld(race);
  stepRaceWorld(race,state,players);
  for(let i=0;i<50;i++){
    advanceMounted(players);
    stepRaceWorld(race,state,players);
  }
  const mount=player.mount;
  mount.rider=null;
  player.mount=null;
  player.x=mount.x+28;player.y=mount.y-24;
  const anchor=state.state.anchor,tick=state.state.tick;
  const hazards=state.hazards.map(h=>[h.id,h.x,h.y]);
  const camera=raceCameraFrame(race,state.state,players).x;
  for(let i=0;i<200;i++){
    const result=stepRaceWorld(race,state,players);
    assert.equal(result.state.phase,'groundScroll');
    assert.equal(result.restarted,false);
    assert.equal(state.state.anchor,anchor);
    assert.equal(state.state.tick,tick);
  }
  assert.deepEqual(state.hazards.map(h=>[h.id,h.x,h.y]),hazards);
  assert.equal(raceCameraFrame(race,state.state,players).x,camera);
  player.mount=mount;mount.rider=player.id;
  const resumed=stepRaceWorld(race,state,players);
  assert.equal(resumed.state.phase,'groundScroll');
  assert.equal(resumed.restarted,false);
  assert.ok(resumed.state.anchor>anchor);
  assert.equal(resumed.state.tick,tick+1);
});

test('two humans can wait for a dismounted Unicorn without losing their progress',()=>{
  const players=[rider(0,'unicorn',232),rider(1,'unicorn',408)];
  const state=createRaceWorld(trainingRace);
  stepRaceWorld(trainingRace,state,players);
  for(let i=0;i<35;i++){
    advanceMounted(players);
    stepRaceWorld(trainingRace,state,players);
  }
  const secondMount=players[1].mount;
  players[1].x=secondMount.x+28;
  players[1].mount=null;secondMount.rider=null;
  const anchor=state.state.anchor;
  for(let i=0;i<100;i++){
    const current=stepRaceWorld(trainingRace,state,players);
    assert.equal(current.restarted,false);
    assert.equal(current.state.phase,'groundScroll');
    assert.equal(current.state.anchor,anchor);
  }
  players[1].mount=secondMount;secondMount.rider=1;
  stepRaceWorld(trainingRace,state,players);
  assert.ok(state.state.anchor>anchor);
});

test('voluntary dismount never bypasses a real offscreen failure',()=>{
  const player=rider(0,'unicorn',232),state=createRaceWorld(trainingRace);
  stepRaceWorld(trainingRace,state,[player]);
  state.state={...state.state,anchor:1800};
  player.mount.rider=null;player.mount=null;player.x=100;
  assert.equal(raceRiderLeftBehind(trainingRace,state.state,[player]),true);
  for(let i=0;i<40;i++)stepRaceWorld(trainingRace,state,[player]);
  assert.equal(state.state.phase,'crash');
});

test('a missing rider is a joint restart instead of the follow-bubble shortcut',()=>{
  const p1=rider(0,'unicorn',232),p2=rider(1,'unicorn',408);
  const state=createRaceWorld(race);
  stepRaceWorld(race,state,[p1,p2]);
  for(let i=0;i<85;i++){
    advanceMounted([p1,p2]);
    stepRaceWorld(race,state,[p1,p2]);
  }
  p2.bubble={};
  const result=stepRaceWorld(race,state,[p1,p2]);
  assert.equal(result.restarted,false);
  assert.equal(result.state.phase,'crash');
  assert.equal(result.state.crash.fromPhase,'groundScroll');
  for(let i=0;i<CRASH_TICKS;i++)stepRaceWorld(race,state,[p1,p2]);
  assert.equal(state.state.phase,'waitingForUnicorns');
  assert.equal(state.state.anchor,512);
  assert.deepEqual(state.hazards,[]);
  const again=createRaceWorld(race);
  stepRaceWorld(race,again,[p1,{...p2,bubble:null}]);
  again.state={...again.state,anchor:1000};
  assert.equal(raceRiderLeftBehind(race,again.state,[p1,p2]),true);
  const back=stepRaceWorld(race,again,[p1,p2]);
  assert.equal(back.state.phase,'crash');
});

test('moving hazards use reproducible world-space poses independent of sprites',()=>{
  const p1=rider(0,'unicorn',232);
  const state=createRaceWorld(race);
  stepRaceWorld(race,state,[p1]);
  const snapshots=[];
  for(let i=0;i<100;i++){
    advanceMounted([p1]);
    stepRaceWorld(race,state,[p1]);
    if(i%20===0)snapshots.push(state.hazards.map(h=>[h.id,h.x,h.y,h.rotation]));
  }
  const p2=rider(0,'unicorn',232);
  const replay=createRaceWorld(race);
  stepRaceWorld(race,replay,[p2]);
  const repeated=[];
  for(let i=0;i<100;i++){
    advanceMounted([p2]);
    stepRaceWorld(race,replay,[p2]);
    if(i%20===0)repeated.push(replay.hazards.map(h=>[h.id,h.x,h.y,h.rotation]));
  }
  assert.deepEqual(snapshots,repeated);
});

test('camera framing is continuous at corral, sanctuary and finish stops',()=>{
  const first=rider(0,'unicorn',232),second=rider(1,'unicorn',408);
  const players=[first,second],state=createRaceWorld(race);
  const initial=raceCameraFrame(race,state.state,players);
  assert.ok(initial.x>first.x&&initial.x<second.x);
  assert.ok(initial.zoom>=1.48&&initial.zoom<=2);
  stepRaceWorld(race,state,players);
  const started=raceCameraFrame(race,state.state,players);
  assert.equal(started.x,initial.x);
  state.state={...state.state,anchor:2944};
  const beforeStop=raceCameraFrame(race,state.state,players);
  state.state={...state.state,phase:'waitingForPegasi'};
  const atSanctuary=raceCameraFrame(race,state.state,players);
  assert.ok(Math.abs(beforeStop.x-atSanctuary.x)<.01);
  first.mount=rider(0,'pegasus',2984).mount;
  second.mount=rider(1,'pegasus',3176).mount;
  state.state={...state.state,phase:'flightScroll',anchor:2944};
  const flying=raceCameraFrame(race,state.state,players);
  assert.equal(flying.x,atSanctuary.x);
  state.state={...state.state,phase:'flightScroll',anchor:5504};
  const beforeFinish=raceCameraFrame(race,state.state,players);
  state.state={...state.state,phase:'finished'};
  const atFinish=raceCameraFrame(race,state.state,players);
  assert.equal(beforeFinish.x,atFinish.x);
});

test('the ground camera slows at the sanctuary instead of rushing to catch up',()=>{
  const player=rider(0,'unicorn',232);
  let state=stepRace(race,createRaceState(race),[player]);
  const samples=[];
  for(let tick=0;tick<1200&&state.phase==='groundScroll';tick++){
    const before=raceCameraFrame(race,state,[player]).x;
    state=stepRace(race,state,[player]);
    const after=raceCameraFrame(race,state,[player]).x;
    samples.push(after-before);
  }
  assert.equal(state.phase,'sanctuaryStop');
  const early=samples.slice(780,810).reduce((a,b)=>a+b,0)/30;
  const late=samples.slice(-25).reduce((a,b)=>a+b,0)/25;
  assert.ok(early>late*2,
    'Late camera velocity should fall substantially, not accelerate');
  assert.ok(samples.slice(-50).every(delta=>delta>=0&&delta<2),
    'The final approach cannot include a last-minute camera warp');
});

test('the old woodland stage remains visible at the Pegasus sanctuary',()=>{
  const player=rider(0,'unicorn',184*16-25);
  const world=createRaceWorld(race);
  stepRaceWorld(race,world,[player]);
  world.state={...world.state,phase:'groundScroll',anchor:2944-.2,
    tick:950,activeIds:[0]};
  world.hazards=race.hazards.filter(h=>h.stage==='groundScroll').map(h=>({
    id:h.id,kind:h.kind,size:h.size,warningDistance:h.warningDistance,
    ...raceHazardPose(h,950)}));
  const course=world.hazards.map(h=>({id:h.id,x:h.x,y:h.y}));
  stepRaceWorld(race,world,[player]);
  assert.equal(world.state.phase,'sanctuaryStop');
  assert.deepEqual(world.hazards,[],
    'Completed obstacles cannot still collide during Pegasus selection');
  assert.deepEqual(world.retiredHazards.map(h=>({id:h.id,x:h.x,y:h.y})),course);
  stepRaceWorld(race,world,[player]);
  assert.equal(world.state.phase,'waitingForPegasi');
  assert.deepEqual(world.retiredHazards.map(h=>({id:h.id,x:h.x,y:h.y})),course,
    'The previous course must not disappear between stages');
});

test('authored race hazards distinguish a grounded hit from a cleared jump',()=>{
  const root=race.hazards.find(h=>h.id==='root-trainer');
  const gap=race.hazards.find(h=>h.id==='bridge-gap');
  const log={...root,x:root.home[0]*16,y:root.home[1]*16};
  const drop={...gap,x:gap.home[0]*16,y:gap.home[1]*16};
  assert.equal(raceHazardContact(log,{x:log.x,y:912,grounded:true}),true);
  assert.equal(raceHazardContact(log,{x:log.x,y:815,grounded:false}),false);
  assert.equal(raceHazardContact(log,{x:log.x+100,y:912,grounded:true}),false);
  assert.equal(raceHazardContact(drop,{x:drop.x,y:928,grounded:true}),true);
  assert.equal(raceHazardContact(drop,{x:drop.x,y:890,grounded:false}),false);
  const flyer=race.hazards.find(h=>h.id==='crossing-flyer');
  const flying={...flyer,x:flyer.home[0]*16,y:flyer.home[1]*16};
  assert.equal(raceHazardContact(flying,
    {x:flying.x,y:flying.y+36,grounded:false}),true);
  assert.equal(raceHazardContact(flying,
    {x:flying.x,y:flying.y+150,grounded:false}),false);
});

test('an actual obstacle remains visible during a brief crash before camp reset',()=>{
  const root=race.hazards.find(h=>h.id==='root-trainer');
  const player=rider(0,'unicorn',232);
  const state=createRaceWorld(race);
  stepRaceWorld(race,state,[player]);
  state.state={...state.state,anchor:800};
  player.mount.x=root.home[0]*16;
  player.mount.y=912;
  player.mount.grounded=true;
  player.x=player.mount.x;
  const hit=stepRaceWorld(race,state,[player]);
  assert.equal(hit.hit,'root-trainer');
  assert.equal(hit.restarted,false);
  assert.equal(state.state.phase,'crash');
  assert.equal(state.state.crash.remaining,CRASH_TICKS);
  assert.ok(state.hazards.some(h=>h.id==='root-trainer'),
    'The object that caused the failure must remain visible');
  const frozenAnchor=state.state.anchor;
  for(let i=1;i<CRASH_TICKS;i++){
    const frame=stepRaceWorld(race,state,[player]);
    assert.equal(frame.restarted,false);
    assert.equal(frame.state.anchor,frozenAnchor);
    assert.ok(state.hazards.some(h=>h.id==='root-trainer'));
  }
  const reset=stepRaceWorld(race,state,[player]);
  assert.equal(reset.restarted,true);
  assert.equal(state.state.phase,'waitingForUnicorns');
  assert.equal(state.state.anchor,512);
  assert.deepEqual(state.hazards,[]);
  // The same horizontal crossing is safe when the rider actually clears
  // the authored collision envelope on a jump.
  const clear=createRaceWorld(race);
  stepRaceWorld(race,clear,[player]);
  clear.state={...clear.state,anchor:800};
  player.mount.y=800;
  player.mount.grounded=false;
  const avoided=stepRaceWorld(race,clear,[player]);
  assert.equal(avoided.hit,null);
  assert.equal(clear.state.phase,'groundScroll');
});

test('Pegasus gust volumes change the actual 60 Hz vertical trajectory',()=>{
  const draft=race.flightVolumes[0];
  const x=(draft.bounds[0]+3)*16,y=42*16;
  const plain={...rider(0,'pegasus',x).mount,
    x,y,grounded:false,vy:0};
  const wind={...plain};
  const still={...world,groundAt:()=>1100};
  const gust={...still,flightVolumes:[draft]};
  const coast={left:false,right:false,down:false,jump:false,
    jumpPressed:false};
  for(let tick=0;tick<30;tick++){
    stepMountedMotion(plain,coast,1,still);
    stepMountedMotion(wind,coast,1,gust);
  }
  assert.ok(wind.y<plain.y-40,
    'The declared updraft must materially lift an airborne Pegasus');
  assert.ok(wind.vy<plain.vy);
  assert.equal(wind.x,plain.x);
});


test('open-air Pegasus route recalls the party instead of allowing a ground shortcut',()=>{
  const player=rider(0,'pegasus',230*16);
  const state=createRaceWorld(race);
  state.state={...state.state,phase:'flightScroll',anchor:4000,
    checkpoint:'sanctuary',activeIds:[0]};
  player.mount.y=(race.flightVoid.fallY+.25)*16;
  player.y=player.mount.y;
  const result=stepRaceWorld(race,state,[player]);
  assert.equal(result.restarted,false);
  assert.equal(result.state.phase,'crash');
  for(let i=0;i<CRASH_TICKS;i++)stepRaceWorld(race,state,[player]);
  assert.equal(state.state.phase,'waitingForPegasi');
  assert.equal(state.state.checkpoint,'sanctuary');
});

test('the storm canyon specifies a void below the flight path',()=>{
  assert.ok(race.flightVoid.from>205);
  assert.ok(race.flightVoid.to<341);
  assert.ok(race.flightVoid.fallY>60);
  const flightFloor=race.ridge.filter(([x])=>
    x>=race.flightVoid.from&&x<=race.flightVoid.to);
  assert.ok(flightFloor.every(([,y])=>y>race.flightVoid.fallY));
});


test('the chaser waits until the rider is genuinely offscreen, then allows recovery',()=>{
  const player=rider(0,'unicorn',232);
  const world=createRaceWorld(race);
  stepRaceWorld(race,world,[player]);
  world.state={...world.state,anchor:960,tick:180,activeIds:[0]};
  const frame=raceCameraFrame(race,world.state,[player]);
  const edge=frame.x-960/(2*frame.zoom);
  player.mount.x=edge+12;
  player.x=player.mount.x;
  assert.equal(raceRiderLeftBehind(race,world.state,[player]),false,
    'Inside the visible camera may never cause a restart');
  player.mount.x=edge-65;
  player.x=player.mount.x;
  assert.equal(raceRiderLeftBehind(race,world.state,[player]),true);
  for(let i=0;i<39;i++){
    const result=stepRaceWorld(race,world,[player]);
    assert.equal(result.restarted,false,'The rider has time to recover');
  }
  assert.equal(stepRaceWorld(race,world,[player]).state.phase,'crash');
  for(let i=0;i<CRASH_TICKS;i++)stepRaceWorld(race,world,[player]);
  assert.equal(world.state.phase,'waitingForUnicorns');
});

test('scroll progress eases in and slows before the sanctuary',()=>{
  const player=rider(0,'unicorn',232);
  const start=createRaceWorld(race);
  stepRaceWorld(race,start,[player]);
  const initial=start.state.anchor;
  stepRaceWorld(race,start,[player]);
  const first=start.state.anchor-initial;
  for(let i=0;i<220;i++)stepRaceWorld({...race,hazards:[]},start,[player]);
  const mid=stepRaceWorld({...race,hazards:[]},start,[player]);
  const phase=race.racePhases.find(p=>p.id==='groundScroll');
  const before={...start.state,anchor:phase.to-45,tick:500};
  const finish=stepRace(race,before,[player]);
  assert.ok(first<phase.speed,'The start must not jump straight to full speed');
  assert.ok(finish.anchor-before.anchor<phase.speed,
    'Approaching the sanctuary must slow down');
});

test('both upper route entries are reachable with an ordinary Unicorn jump',()=>{
  assert.equal(race.routeChoices.length,2);
  const first=[48,53],second=[109,50];
  for(const [x,y] of [first,second]){
    const ground=race.ridge.findLast(point=>point[0]<=x);
    assert.ok((ground[1]-y)*16<112,'Route entry platform is too high');
  }
});


test('mount-selection corral never recalls unmounted players',()=>{
  const player={id:0,x:166,y:880,mount:null,assist:false,
    sleep:false,bubble:null,clouded:null};
  const world=createRaceWorld(race);
  for(let tick=0;tick<180;tick++){
    const result=stepRaceWorld(race,world,[player]);
    assert.equal(result.restarted,false);
    assert.equal(result.state.phase,'waitingForUnicorns');
    assert.equal(world.offscreenTicks,0);
  }
});

test('both Pegasus storm cloud edges recall a rider at the real authored boundary',()=>{
  for(const [edge,offset] of [['ceilingY',-3],['fallY',3]]){
    const player=rider(0,'pegasus',250*16);
    player.mount.y=(race.flightVoid[edge]+offset/16)*16;
    player.y=player.mount.y;
    const world=createRaceWorld(race);
    world.state={...world.state,phase:'flightScroll',anchor:4100,
      checkpoint:'sanctuary',activeIds:[0],tick:140};
    const result=stepRaceWorld(race,world,[player]);
    assert.equal(result.state.phase,'crash',edge+' clouds must physically fail');
    for(let i=0;i<CRASH_TICKS;i++)stepRaceWorld(race,world,[player]);
    assert.equal(world.state.phase,'waitingForPegasi');
  }
});


test('all six new Pegasus hazards expose matching collision geometry',()=>{
  const ids=['first-hanging-rock','falling-boulder-one','thunder-gate',
    'falling-boulder-two','low-rock-shelf','last-hanging-rock'];
  const flight=race.hazards.filter(h=>h.stage==='flightScroll');
  for(const id of ids){
    const h=flight.find(h=>h.id===id);
    assert.ok(h,'missing hazard '+id);
    const position={...h,x:h.home[0]*16,y:h.home[1]*16};
    assert.equal(raceHazardContact(position,{
      x:position.x,y:position.y+20,grounded:false}),true,id);
    assert.equal(raceHazardContact(position,{
      x:position.x+h.size[0]+80,y:position.y+20,grounded:false}),false,id);
  }
});
