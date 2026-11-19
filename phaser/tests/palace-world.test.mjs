import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import palace from '../levels/mirror-palace.json' with {type:'json'};
import {stepPlayerMotion} from '../src/player-motion.js';
import {surfaceGroundAt,surfaceMaterialColumn} from '../src/surface-geometry.js';
import {createPalaceWorld,stepPalaceWorld,restorePalaceWorld,
  palaceBlockHorizontal} from '../src/palace-world.js';
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
    blockHorizontal:(from,to,feet)=>palaceBlockHorizontal(
      palace,palaceWorld,from,to,feet)};
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
  ticks(world.step,25);
  assert.ok(['gallery-near','gallery-middle','gallery-far'].every(id=>
    world.palaceWorld.decks.find(d=>d.id===id).enabled));
  assert.equal(state().gates['gallery-light-gate'],true);
  const segment=state().light.segments.find(s=>
    s.source==='gallery-lantern'&&s.hit==='gallery-target');
  assert.ok(segment,'The target was reached by a traced reflected beam');
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
    d.target==='observatory-target').length===4);
  const eclipse=palace.occluders[0];
  assert.deepEqual(occluderPosition(eclipse,0),
    occluderPosition(eclipse,eclipse.periodTicks));
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
  assert.equal(bridge.enabled,false);
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
    (x>=31*16&&x<=32*16&&y>25*16&&y<33*16);
  assert.equal(tracePalaceBeams(palace,active,{solidAt:rock}).lit
    .includes('atrium-target'),false);
});

test('cliff faces and physical gates are rooted into authored rock',()=>{
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
    if(players.some(p=>Math.abs(p.x-rx)<19&&
      Math.abs(p.y-ry)<26))light=true;
    for(const p of players)
      if(Math.abs(p.x-ex)<28&&Math.abs(p.y-ey)<26)
        visitedExit.add(p.id);
    if(light&&visitedExit.size===humans)
      return {completed:true,light,activated,tick,
        players,visitedExit:[...visitedExit],farthest,palaceWorld};
  }
  return {completed:false,light,activated,tick:6200,
    players,visitedExit:[...visitedExit],farthest,palaceWorld};
}

test('normal-spawn solo input traverses all six optical controls and reaches Light and exit',()=>{
  const r=runRoute(1,true);
  assert.ok(r.completed,JSON.stringify({
    activated:r.activated,farthest:r.farthest/16,light:r.light,
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
