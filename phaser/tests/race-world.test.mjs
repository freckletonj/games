import test from 'node:test';
import assert from 'node:assert/strict';
import race from '../levels/skybound-stampede.json' with {type:'json'};
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
  for(let tick=0;tick<1000&&state.state.phase==='groundScroll';tick++){
    advanceMounted(riders);
    const next=stepRaceWorld(trainingRace,state,riders);
    assert.equal(next.restarted,false,'Both riders stay inside progress window');
    assert.ok(state.state.anchor>=512&&state.state.anchor<=2944);
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
  for(let i=0;i<1000&&state.state.phase==='groundScroll';i++){
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
  assert.equal(result.restarted,true);
  assert.equal(result.state.phase,'waitingForUnicorns');
  assert.equal(result.state.anchor,512);
  assert.deepEqual(state.hazards,[]);
  const again=createRaceWorld(race);
  stepRaceWorld(race,again,[p1,{...p2,bubble:null}]);
  again.state={...again.state,anchor:1000};
  assert.equal(raceRiderLeftBehind(race,again.state,[p1,p2]),true);
  const back=stepRaceWorld(race,again,[p1,p2]);
  assert.equal(back.restarted,true);
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

test('an actual rider touching an authored obstacle resets the whole race',()=>{
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
  assert.equal(hit.restarted,true);
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
