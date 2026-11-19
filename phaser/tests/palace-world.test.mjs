import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import palace from '../levels/mirror-palace.json' with {type:'json'};
import {stepPlayerMotion} from '../src/player-motion.js';
import {surfaceGroundAt,surfaceMaterialColumn} from '../src/surface-geometry.js';
import {createPalaceWorld,stepPalaceWorld,restorePalaceWorld,
  palaceBlockHorizontal,palaceSteepBanks} from '../src/palace-world.js';
import {tracePalaceBeams,setMirrorDetent,setPalaceShutter,
  createPalaceState,occluderPosition,stepPalace} from '../src/palace-rules.js';
import {deckTopAt} from '../src/moving-platforms.js';

const scope={};scope.window=scope;vm.createContext(scope);
vm.runInContext(readFileSync(new URL('../../src/platform/world-compiler.js',
  import.meta.url),'utf8'),scope);
const level=scope.WW.worldCompiler.compile(palace);
level.materialColumn=x=>surfaceMaterialColumn(level,x);
const groundAt=x=>surfaceGroundAt(level,x);
const explorer=(id,x,y=groundAt(x))=>({id,x,y,vx:0,vy:0,face:1,
  grounded:true,coyote:5,jumpBuffer:0,jumps:0,flaps:0,flapWait:0,
  powers:0,hover:0,breach:0,bloomWindow:0,form:null});
const controls={left:false,right:false,upPressed:false,
  jump:false,jumpPressed:false,down:false};

function simulation(players){
  const palaceWorld=createPalaceWorld(palace,level);
  const world={width:level.width*16,height:level.height*16,tile:16,
    groundAt,inWater:()=>false,waterBodies:[],thermalVolumes:[],
    platformSegments:level.platformSegments,movingPlatforms:palaceWorld.decks,
    blockHorizontal:(from,to,feet,onTerrain)=>palaceBlockHorizontal(
      palace,palaceWorld,from,to,feet,onTerrain)};
  function step(actions=[]){
    const inputs=players.map(p=>({...controls,...actions[p.id]}));
    stepPalaceWorld(palace,palaceWorld,players,inputs);
    for(const player of players)
      stepPlayerMotion(player,inputs[player.id],1,world);
  }
  return {palaceWorld,world,step};
}
function ticks(step,count){
  for(let i=0;i<count;i++)step();
}
function operate(world,player,stationId){
  const station=palace.controlStations.find(s=>s.id===stationId);
  player.x=station.at[0]*16;
  player.y=groundAt(player.x);
  player.vx=0;player.vy=0;player.grounded=true;
  world.step([{upPressed:true}]);
}
function configuredState(){
  let s=createPalaceState(palace);
  s=setMirrorDetent(palace,s,'atrium-mirror',-45);
  s=setMirrorDetent(palace,s,'gallery-mirror-a',-45);
  s=setMirrorDetent(palace,s,'gallery-mirror-b',-45);
  s=setPalaceShutter(palace,s,'gallery-shutter','open');
  s=setMirrorDetent(palace,s,'observatory-prism',-45);
  s=setPalaceShutter(palace,s,'eclipse-shutter','open');
  return s;
}

test('the first visible emitter, its dial and the real mirror share one view',()=>{
  const emitter=palace.lightSources.find(s=>s.id==='atrium-sun');
  const dial=palace.controlStations.find(s=>s.id==='atrium-dial');
  const mirror=palace.mirrors.find(m=>m.id==='atrium-mirror');
  const x=[emitter.at[0],dial.at[0],mirror.at[0]];
  assert.ok(Math.max(...x)-Math.min(...x)<30,
    'First-time players need to see where the ray comes from');
  const ray=tracePalaceBeams(palace,createPalaceState(palace));
  assert.equal(ray.segments.find(segment=>segment.source==='atrium-sun').hit,
    'atrium-mirror','The dial should visibly change the incoming beam');
});

test('all six visible control stations operate exactly one real mechanism',()=>{
  assert.equal(palace.controlStations.length,6);
  const names=palace.controlStations.map(s=>s.id);
  assert.equal(new Set(names).size,6);
  const mechanismNames=palace.controlStations.map(s=>s.control);
  assert.equal(new Set(mechanismNames).size,6);
  assert.ok(palace.controlStations.every(s=>s.at.length===2));
  assert.equal(palace.circuitSwitches,undefined,
    'One-hit auto-solving room relays have been eliminated');
});

test('blue mirror teaches a single bounce and delayed physical bridge',()=>{
  const player=explorer(0,36*16);
  const world=simulation([player]);
  const bridge=world.palaceWorld.decks.find(d=>d.id==='atrium-crystal');
  assert.equal(bridge.enabled,false);
  assert.equal(deckTopAt(bridge,bridge.position[0]),null);
  world.step([{upPressed:true}]);
  assert.equal(world.palaceWorld.state.mirrors['atrium-mirror'],-45);
  assert.ok(world.palaceWorld.state.light.lit.includes('atrium-target'));
  assert.equal(bridge.enabled,false,'A bridge must telegraph before appearing');
  ticks(world.step,30);
  assert.equal(bridge.enabled,true);
  assert.equal(deckTopAt(bridge,bridge.position[0]),bridge.position[1]);
  assert.equal(world.palaceWorld.state.gates['atrium-light-gate'],true);
  const path=world.palaceWorld.state.light.segments
    .filter(s=>s.source==='atrium-sun');
  assert.ok(path.length>=2);
  assert.ok(path.some(segment=>segment.hit==='atrium-target'));
});

test('gallery requires two actual reflections and an independently opened curtain',()=>{
  const player=explorer(0,83*16),world=simulation([player]);
  const state=()=>world.palaceWorld.state;
  const gallery=()=>state().light.lit.includes('gallery-target');
  operate(world,player,'gallery-first');
  assert.equal(state().mirrors['gallery-mirror-a'],-45);
  assert.equal(state().mirrors['gallery-mirror-b'],45);
  assert.equal(state().shutters['gallery-shutter'],'closed');
  assert.equal(gallery(),false);
  operate(world,player,'gallery-second');
  assert.equal(state().mirrors['gallery-mirror-b'],-45);
  assert.equal(gallery(),false,'The shutter must actually block the beam');
  operate(world,player,'gallery-curtain');
  assert.equal(state().shutters['gallery-shutter'],'open');
  assert.equal(gallery(),true);
  ticks(world.step,55);
  assert.ok(['gallery-near','gallery-step-two','gallery-step-three',
    'gallery-step-four','gallery-step-five','gallery-far'].every(id=>
    world.palaceWorld.decks.find(d=>d.id===id).enabled));
  assert.equal(state().gates['gallery-light-gate'],true);
  const segment=state().light.segments.find(s=>
    s.source==='gallery-lantern'&&s.hit==='gallery-target');
  assert.ok(segment,'The target was reached by a traced reflected beam');
});

test('the stored blue bridge survives a second exploratory dial turn',()=>{
  const player=explorer(0,36*16),world=simulation([player]);
  world.step([{upPressed:true}]);
  ticks(world.step,30);
  const bridge=world.palaceWorld.decks.find(d=>d.id==='atrium-crystal');
  assert.equal(bridge.enabled,true);
  assert.equal(world.palaceWorld.state.charged['atrium-target'],true);
  world.step([{upPressed:true}]);
  ticks(world.step,100);
  assert.equal(world.palaceWorld.state.light.lit.includes('atrium-target'),false);
  assert.equal(bridge.enabled,true,'A solved room cannot trap a returning player');
  assert.equal(world.palaceWorld.state.gates['atrium-light-gate'],true);
});

test('gallery stores the full optical solution and grows steps from near to far',()=>{
  let state=createPalaceState(palace);
  state=setMirrorDetent(palace,state,'gallery-mirror-a',-45);
  state=setMirrorDetent(palace,state,'gallery-mirror-b',-45);
  state=setPalaceShutter(palace,state,'gallery-shutter','open');
  for(let i=0;i<27;i++)state=stepPalace(palace,state);
  assert.equal(state.charged['gallery-target'],true);
  assert.equal(state.platforms['gallery-near'].solid,true);
  assert.equal(state.platforms['gallery-far'].solid,false,
    'The far step should form after the near landing');
  for(let i=0;i<35;i++)state=stepPalace(palace,state);
  assert.ok(palace.phasePlatforms.filter(p=>p.target==='gallery-target')
    .every(p=>state.platforms[p.id].solid));
  state=setPalaceShutter(palace,state,'gallery-shutter','closed');
  for(let i=0;i<95;i++)state=stepPalace(palace,state);
  assert.equal(state.light.lit.includes('gallery-target'),false);
  assert.ok(palace.phasePlatforms.filter(p=>p.target==='gallery-target')
    .every(p=>state.platforms[p.id].solid),
  'Stored pink light protects the return route from further experimentation');
});

test('gallery curtain control leaves space for the nearby first step to form',()=>{
  const station=palace.controlStations.find(s=>s.id==='gallery-curtain');
  const player=explorer(0,station.at[0]*16,station.at[1]*16);
  const world=simulation([player]);
  world.palaceWorld.state=setMirrorDetent(palace,world.palaceWorld.state,
    'gallery-mirror-a',-45);
  world.palaceWorld.state=setMirrorDetent(palace,world.palaceWorld.state,
    'gallery-mirror-b',-45);
  world.step([{upPressed:true}]);
  ticks(world.step,60);
  assert.equal(world.palaceWorld.decks.find(d=>d.id==='gallery-near').enabled,true,
    'The control operator should not obstruct the first ladder step');
});

test('three-position prism and eclipse shutter independently complete the gold staircase',()=>{
  const player=explorer(0,164*16),world=simulation([player]);
  operate(world,player,'observatory-prism-dial');
  assert.equal(world.palaceWorld.state.mirrors['observatory-prism'],45);
  world.step();
  operate(world,player,'observatory-prism-dial');
  assert.equal(world.palaceWorld.state.mirrors['observatory-prism'],-45);
  assert.equal(world.palaceWorld.state.shutters['eclipse-shutter'],'closed');
  assert.equal(world.palaceWorld.state.gates['observatory-light-gate'],false);
  operate(world,player,'observatory-shutter');
  assert.equal(world.palaceWorld.state.shutters['eclipse-shutter'],'open');
  for(let tick=0;tick<500&&!world.palaceWorld.state.gates[
    'observatory-light-gate'];tick++)world.step();
  assert.equal(world.palaceWorld.state.gates['observatory-light-gate'],true);
  assert.ok(world.palaceWorld.decks.filter(d=>
    d.target==='observatory-target').length===8);
  const eclipse=palace.occluders[0];
  assert.deepEqual(occluderPosition(eclipse,0),
    occluderPosition(eclipse,eclipse.periodTicks));
});

test('the eclipse capacitor needs accumulated clean light and remembers shadows',()=>{
  let state=createPalaceState(palace);
  state=setMirrorDetent(palace,state,'observatory-prism',-45);
  state=setPalaceShutter(palace,state,'eclipse-shutter','open');
  const receiver=palace.beamTargets.find(t=>t.id==='observatory-target');
  const required=receiver.chargeTicks;
  assert.ok(required>=20);
  let sawShadow=false,sawLight=false,previousCharge=0;
  for(let tick=0;tick<900&&!state.charged[receiver.id];tick++){
    state=stepPalace(palace,state);
    const charge=state.chargeTicks[receiver.id];
    const hit=state.light.lit.includes(receiver.id);
    sawShadow ||= !hit;
    sawLight ||= hit;
    assert.ok(charge>=previousCharge,'Eclipse shadows cannot erase earned charge');
    if(!hit)assert.equal(charge,previousCharge);
    if(charge<required){
      assert.equal(state.gates['observatory-light-gate'],false);
      assert.equal(state.platforms['eclipse-step-one'].solid,false);
    }
    previousCharge=charge;
  }
  assert.equal(state.charged[receiver.id],true);
  assert.equal(state.chargeTicks[receiver.id],required);
  assert.ok(sawLight&&sawShadow,'The disc must actually interrupt the charging ray');
  assert.equal(state.gates['observatory-light-gate'],true);
  for(let i=0;i<70;i++)state=stepPalace(palace,state);
  assert.ok(palace.phasePlatforms.filter(p=>p.target===receiver.id)
    .every(p=>state.platforms[p.id].solid));
});

test('stored eclipse light cannot retract the staircase during a later shadow',()=>{
  let state=createPalaceState(palace);
  state=setMirrorDetent(palace,state,'observatory-prism',-45);
  state=setPalaceShutter(palace,state,'eclipse-shutter','open');
  for(let tick=0;tick<500&&!state.charged['observatory-target'];tick++)
    state=stepPalace(palace,state);
  assert.equal(state.charged['observatory-target'],true,
    'The eclipse must permit a clean charging window');
  for(let i=0;i<90;i++)state=stepPalace(palace,state);
  let shaded=false;
  for(let i=0;i<840;i++){
    state=stepPalace(palace,state);
    if(!state.light.lit.includes('observatory-target'))shaded=true;
    assert.ok(palace.phasePlatforms.filter(p=>p.target==='observatory-target').every(p=>
      state.platforms[p.id].solid),
      'Stored light must not collapse an in-progress ascent');
  }
  assert.ok(shaded,'The disc must cast a real moving shadow');
  assert.equal(createPalaceState(palace).charged['observatory-target'],undefined);
});

test('incomplete optical paths cannot turn on the matching gate or platforms',()=>{
  const base=createPalaceState(palace);
  for(const skip of ['atrium-mirror','gallery-mirror-a','gallery-mirror-b',
    'gallery-shutter','observatory-prism','eclipse-shutter']){
    let state=configuredState();
    if(skip.includes('shutter'))
      state=setPalaceShutter(palace,state,skip,'closed');
    else state=setMirrorDetent(palace,state,skip,
      skip==='observatory-prism'?0:45);
    for(let i=0;i<55;i++)
      state=importStep(state);
    const target=skip.startsWith('atrium')?'atrium-target':
      skip.startsWith('gallery')?'gallery-target':'observatory-target';
    const gate=palace.beamGates.find(g=>g.target===target);
    assert.equal(state.gates[gate.id],false,
      'Missing '+skip+' must keep its gate closed');
    assert.ok(palace.phasePlatforms.filter(p=>p.target===target).every(p=>
      !state.platforms[p.id].solid),
      'Missing '+skip+' must leave its steps ghosted');
  }
});
function importStep(state){
  return stepPalace(palace,state);
}

test('orb contact deduplicates hits and no other station changes',()=>{
  const player=explorer(0,83*16),world=simulation([player]);
  world.palaceWorld.orbHits.push('gallery-first','gallery-first');
  world.step();
  assert.deepEqual(world.palaceWorld.orbHits,[]);
  assert.equal(world.palaceWorld.state.mirrors['gallery-mirror-a'],-45);
  assert.equal(world.palaceWorld.state.mirrors['gallery-mirror-b'],45);
  assert.equal(world.palaceWorld.state.shutters['gallery-shutter'],'closed');
});

test('two simultaneous explorers cannot rotate the same dial twice',()=>{
  const x=36*16;
  const p0=explorer(0,x),p1=explorer(1,x+10);
  const world=simulation([p0,p1]);
  world.step([{upPressed:true},{upPressed:true}]);
  assert.equal(world.palaceWorld.state.mirrors['atrium-mirror'],-45);
});

test('phase decks never vanish under occupied riders and never spawn inside a body',()=>{
  const player=explorer(0,58*16);
  const world=simulation([player]),bridge=world.palaceWorld.decks
    .find(d=>d.id==='atrium-crystal');
  player.x=bridge.position[0];
  player.y=bridge.position[1]+8;
  player.grounded=false;player.coyote=0;
  world.palaceWorld.state=setMirrorDetent(palace,world.palaceWorld.state,
    'atrium-mirror',-45);
  for(let i=0;i<70;i++)
    stepPalaceWorld(palace,world.palaceWorld,[player],[controls]);
  assert.equal(bridge.enabled,false);
  player.x=36*16;player.y=groundAt(player.x);player.grounded=true;
  world.step();
  ticks(world.step,20);
  assert.equal(bridge.enabled,true);
  player.x=bridge.position[0];player.y=bridge.position[1];
  player.onPlatform=bridge.id;player.grounded=true;
  world.palaceWorld.state=setMirrorDetent(palace,world.palaceWorld.state,
    'atrium-mirror',45);
  for(let i=0;i<100;i++)world.step();
  assert.equal(bridge.enabled,true);
  player.x=36*16;player.y=groundAt(player.x);
  player.onPlatform=null;player.grounded=true;
  world.step();
  ticks(world.step,25);
  assert.equal(bridge.enabled,true,
    'A properly powered bridge must stay safe for a returning explorer');
});

test('a temporary unlatched practice deck stays solid under its rider',()=>{
  const temporary={...palace,phasePlatforms:palace.phasePlatforms.map(p=>
    p.id==='atrium-crystal'?{...p,latch:false}:p)};
  const player=explorer(0,36*16),world=createPalaceWorld(temporary,level);
  world.state=setMirrorDetent(temporary,world.state,'atrium-mirror',-45);
  for(let i=0;i<30;i++)stepPalaceWorld(temporary,world,[player],[controls]);
  assert.equal(world.decks[0].enabled,true);
  player.x=58*16;player.y=45*16;player.onPlatform='atrium-crystal';
  world.state=setMirrorDetent(temporary,world.state,'atrium-mirror',45);
  for(let i=0;i<65;i++)stepPalaceWorld(temporary,world,[player],[controls]);
  assert.equal(world.decks[0].enabled,true,'Occupancy delays an unsafe withdrawal');
  player.x=36*16;player.y=46*16;player.onPlatform=null;
  for(let i=0;i<30;i++)stepPalaceWorld(temporary,world,[player],[controls]);
  assert.equal(world.decks[0].enabled,false,'Temporary decks can clear once empty');
});

test('checkpoint reset restores shutters, mirror detents and collision flags',()=>{
  const player=explorer(0,36*16),world=simulation([player]);
  const checkpoint=world.palaceWorld.state;
  world.step([{upPressed:true}]);
  ticks(world.step,30);
  assert.equal(world.palaceWorld.state.gates['atrium-light-gate'],true);
  restorePalaceWorld(world.palaceWorld,checkpoint);
  assert.equal(world.palaceWorld.state.tick,0);
  assert.equal(world.palaceWorld.state.mirrors['atrium-mirror'],45);
  assert.equal(world.palaceWorld.state.shutters['gallery-shutter'],'closed');
  assert.equal(world.palaceWorld.decks[0].enabled,false);
  world.step([{upPressed:true}]);
  assert.equal(world.palaceWorld.state.mirrors['atrium-mirror'],-45);
});

test('ray trace is physically blocked by a new rock obstruction',()=>{
  const active=setMirrorDetent(palace,createPalaceState(palace),
    'atrium-mirror',-45);
  const solidAt=(x,y)=>['rock','shelf'].includes(
    level.materialColumn(x)(y));
  assert.ok(tracePalaceBeams(palace,active,{solidAt}).lit
    .includes('atrium-target'));
  const rock=(x,y)=>solidAt(x,y)||
    (x>=31*16&&x<=32*16&&y>42*16&&y<44*16);
  assert.equal(tracePalaceBeams(palace,active,{solidAt:rock}).lit
    .includes('atrium-target'),false);
});

test('cliff faces and physical gates are rooted into authored rock',()=>{
  assert.equal(palace.ledges.length,0,
    'No inherited floating shelf is allowed to impersonate a puzzle step');
  for(const platform of palace.phasePlatforms){
    assert.ok(platform.home[1]*16<groundAt(platform.home[0]*16),
      'Light platform '+platform.id+' must be visibly above the physical ground');
  }
  for(const gate of palace.beamGates){
    const x=gate.at[0]*16,top=gate.at[1]*16;
    const opening=groundAt(x)-top;
    assert.ok(opening>=64&&opening<=192,
      gate.id+' is a misplaced giant light curtain');
    assert.ok(top+gate.size[1]>=groundAt(x),
      gate.id+' has a traversal hole beneath the stone');
  }
  for(const [ax,ay] of palace.ridge){
    assert.ok(Number.isFinite(ax)&&Number.isFinite(ay));
  }
});

test('closed doors cannot be skipped from floors or real high balcony ledges',()=>{
  const starts=[
    {id:'atrium-light-gate',x:73.5,y:40},
    {id:'gallery-light-gate',x:134,y:39},
    {id:'observatory-light-gate',x:192,y:35}
  ];
  for(const start of starts){
    const gate=palace.beamGates.find(g=>g.id===start.id);
    for(const period of [31,43,61,73]){
      for(const form of [null,'tideling']){
        const player=explorer(0,start.x*16,start.y*16);
        player.form=form;
        const world=simulation([player]);
        let max=player.x;
        for(let i=0;i<650;i++){
          const jumping=i%period<24;
          world.step([{right:true,jump:jumping,
            jumpPressed:i%period===0}]);
          max=Math.max(max,player.x);
        }
        assert.equal(world.palaceWorld.state.gates[start.id],false);
        assert.ok(max<gate.at[0]*16,
          'Door bypass '+start.id+' '+(form??'ordinary')+
          ' period '+period+' at x '+max/16);
      }
    }
  }
});

test('the three deep dry-vault cliffs require their bridges even if doors are open',()=>{
  const attempts=[
    {from:60,crest:76,block:'atrium-crystal'},
    {from:108,crest:134,block:'gallery-middle'},
    {from:159,crest:194,block:'eclipse-step-two'}
  ];
  for(const a of attempts){
    for(const period of [33,49,71]){
      const player=explorer(0,a.from*16);
      const world=simulation([player]);
      for(const id of Object.keys(world.palaceWorld.state.gates))
        world.palaceWorld.state.gates[id]=true;
      let furthest=player.x;
      for(let i=0;i<850;i++){
        const jumping=i%period<20;
        world.step([{right:true,jump:jumping,
          jumpPressed:i%period===0}]);
        furthest=Math.max(furthest,player.x);
      }
      assert.ok(furthest<a.crest*16,
        'Can skip '+a.block+' without phase-platform collision: '+furthest/16);
    }
  }
});

test('the flapping creature cannot be captured before all optical gates',()=>{
  const moth=palace.creatures.find(c=>c[0]==='glimmermoth');
  assert.ok(moth[1]>Math.max(...palace.beamGates.map(g=>g.at[0])));
});

function runRoute(humans,operateControls=true){
  const players=Array.from({length:humans},(_,id)=>
    explorer(id,72+14*id));
  const simulationWorld=simulation(players),{palaceWorld,step}=simulationWorld;
  const stations=palace.controlStations;
  const required=stations.map(s=>s.id==='observatory-prism-dial'?2:1);
  const activated=[];
  let index=0,pressed=0,light=false,lastUp=false;
  const visitedExit=new Set();
  const relic=level.objects.find(o=>o.kind==='springKey');
  const exit=level.objects.find(o=>o.kind==='exit');
  const center=o=>[(o.x+.5)*16,(o.y+.5)*16-12];
  const [rx,ry]=center(relic),[ex,ey]=center(exit);
  let farthest=players[0].x;
  const trace=[];
  for(let tick=0;tick<6200;tick++){
    const driver=players[0];
    let action={right:true};
    if(index<stations.length&&operateControls){
      const station=stations[index];
      const x=station.at[0]*16,y=station.at[1]*16;
      const distance=Math.hypot(driver.x-x,driver.y-y);
      if(distance<43&&operateControls){
        if(pressed<required[index]){
          if(!lastUp){
            action={upPressed:true};
            pressed++;
            activated.push(station.id);
          }else action={};
        }else{
          index++;pressed=0;
          action={right:true};
        }
      }else{
        action={right:driver.x<x+5,left:driver.x>x+5};
      }
    }
    lastUp=Boolean(action.upPressed);
    const mustJump=index>0&&(driver.grounded&&tick%19===0||
      tick%31<19);
    if(!action.upPressed){
      action.jump=mustJump;action.jumpPressed=mustJump&&tick%31===0;
    }
    const others=players.slice(1).map(p=>{
      const jump=tick%31<19;
      return {right:true,jump,jumpPressed:tick%31===0};
    });
    step([action,...others]);
    farthest=Math.max(farthest,driver.x);
    if(tick%50===0)trace.push([tick,Math.round(driver.x/16),
      Math.round(driver.y/16),driver.onPlatform,index,
      palaceWorld.state.gates['gallery-light-gate']]);
    if(players.some(p=>Math.abs(p.x-rx)<19&&
      Math.abs(p.y-ry)<26))light=true;
    for(const p of players)
      if(Math.abs(p.x-ex)<28&&Math.abs(p.y-ey)<26)
        visitedExit.add(p.id);
    if(light&&visitedExit.size===humans)
      return {completed:true,light,activated,tick,
        players,visitedExit:[...visitedExit],farthest,trace,palaceWorld};
  }
  return {completed:false,light,activated,tick:6200,
    players,visitedExit:[...visitedExit],farthest,trace,palaceWorld};
}

test('normal-spawn solo input traverses all six optical controls and reaches Light and exit',()=>{
  const r=runRoute(1,true);
  assert.ok(r.completed,JSON.stringify({
    activated:r.activated,farthest:r.farthest/16,light:r.light,trace:r.trace,
    players:r.players.map(p=>({x:p.x/16,y:p.y/16})),
    gates:r.palaceWorld.state.gates
  }));
  assert.deepEqual(r.activated,[
    'atrium-dial','gallery-first','gallery-second','gallery-curtain',
    'observatory-prism-dial','observatory-prism-dial','observatory-shutter'
  ]);
  assert.ok(Object.values(r.palaceWorld.state.gates).every(Boolean));
  assert.ok(r.tick<5000);
  assert.equal(runRoute(1,true).tick,r.tick,
    'Same fixed ticks and inputs must reach the exit deterministically');
});

test('a player who ignores every optical station cannot reach the Light',()=>{
  const r=runRoute(1,false);
  assert.equal(r.completed,false);
  assert.equal(r.light,false);
  assert.ok(r.farthest<75*16,
    'Closed first doorway should stop an ordinary route, not the player');
});

test('two human explorers can reach the Light and exit without simultaneous switches',()=>{
  const r=runRoute(2,true);
  assert.ok(r.completed,JSON.stringify({
    activated:r.activated,farthest:r.farthest/16,
    light:r.light,visitedExit:r.visitedExit,
    players:r.players.map(p=>({x:p.x/16,y:p.y/16})),
    gates:r.palaceWorld.state.gates
  }));
  assert.equal(r.visitedExit.length,2);
  assert.ok(r.palaceWorld.state.gates['observatory-light-gate']);
});

test('walking on a lit crystal bridge reaches its visible far-bank lip without an invisible stop',()=>{
  for(const {id,start,minX} of [
    {id:'atrium-crystal',start:67,minX:73},
    {id:'gallery-far',start:128.5,minX:132},
    {id:'eclipse-step-eight',start:188.5,minX:192}
  ]){
    const deck=palace.phasePlatforms.find(platform=>platform.id===id);
    const player=explorer(0,start*16,deck.home[1]*16);
    player.onPlatform=id;
    const {world,palaceWorld}=simulation([player]);
    palaceWorld.decks.find(platform=>platform.id===id).enabled=true;
    for(let tick=0;tick<280;tick++)
      stepPlayerMotion(player,{...controls,right:true},1,world);
    assert.ok(player.x>minX*16,
      `${id}: walking stopped at tile ${player.x/16}, before visible far bank ${minX}`);
  }
});


test('V-overlay bank geometry matches all three authored steep collision slopes',()=>{
  assert.deepEqual(palaceSteepBanks(palace).map(bank=>[
    bank.fromX/16,bank.fromY/16,bank.toX/16,bank.toY/16
  ]),[[72,55,76,43],[130,55,134,42],[190,55,194,37]]);
});
