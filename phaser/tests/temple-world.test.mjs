import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import temple from '../levels/sunken-temple.json' with {type:'json'};
import {stepPlayerMotion} from '../src/player-motion.js';
import {surfaceGroundAt} from '../src/surface-geometry.js';
import {createTempleWorld,stepTempleWorld,templeInWater,
  templeBlockHorizontal,templeCurrent,snapshotTempleWorld,
  restoreTempleWorld} from '../src/temple-world.js';
import {setTempleValve} from '../src/temple-rules.js';

const scope={};
scope.window=scope;vm.createContext(scope);
vm.runInContext(readFileSync(new URL('../../src/platform/world-compiler.js',
  import.meta.url),'utf8'),scope);
const level=scope.WW.worldCompiler.compile(temple);
const groundAt=x=>surfaceGroundAt(level,x);
const controls={left:false,right:false,up:false,down:false,jump:false,jumpPressed:false};
const explorer=(x,y)=>({id:0,x,y,vx:0,vy:0,face:1,grounded:true,coyote:5,
  jumpBuffer:0,jumps:0,flaps:0,flapWait:0,powers:0,hover:0,breach:0,
  bloomWindow:0,form:null});

function simulation(player){
  const templeWorld=createTempleWorld(temple);
  const world={width:level.width*16,height:level.height*16,tile:16,
    groundAt,inWater:(x,y)=>templeInWater(templeWorld,groundAt,x,y),
    currentAt:(x,y)=>templeCurrent(templeWorld,temple,x,y),
    waterBodies:templeWorld.waterBodies,thermalVolumes:[],
    platformSegments:level.platformSegments,movingPlatforms:templeWorld.decks,
    blockHorizontal:(from,to,feet)=>templeBlockHorizontal(
      temple,templeWorld,from,to,feet)};
  function step(actions={}){
    const input={...controls,...actions};
    stepTempleWorld(temple,templeWorld,[player],[input]);
    return stepPlayerMotion(player,input,1,world);
  }
  return {player,templeWorld,world,step};
}

test('actual player movement is carried up by the courtyard raft on rising tide',()=>{
  const deck=temple.buoyantObjects.find(o=>o.id==='courtyard-raft');
  const x=deck.home[0]*16;
  const {player,templeWorld,step}=simulation(explorer(x,deck.home[1]*16));
  player.onPlatform=deck.id;
  for(let tick=0;tick<360;tick++)step();
  assert.equal(templeWorld.state.surfaces.courtyard,46);
  assert.ok(player.grounded);
  assert.equal(player.onPlatform,deck.id);
  assert.ok(Math.abs(player.y-46*16)<.001);
  for(let tick=0;tick<360;tick++)step();
  assert.equal(player.onPlatform,deck.id);
  assert.ok(Math.abs(player.y-54*16)<.001);
});

test('a solo player can turn the valve and push a real colliding crate onto its plate',()=>{
  const valve=temple.valves[0];
  const {player,templeWorld,step}=simulation(
    explorer(valve.at[0]*16,valve.at[1]*16));
  step({upPressed:true});
  assert.equal(templeWorld.state.modes['sluice-valve'],'fill');
  for(let i=0;i<410;i++)step();
  assert.equal(templeWorld.state.surfaces.sluice,45);
  const crate=templeWorld.crates[0];
  player.x=crate.x-crate.size[0]/2-10;
  player.y=crate.y+11;
  player.grounded=false;player.coyote=0;player.vx=0;player.vy=0;
  let pushed=0;
  for(let i=0;i<100&&!templeWorld.state.gates['sluice-gate'];i++){
    step({right:true});
    pushed++;
    assert.ok(player.x<=crate.x-crate.size[0]/2-9.9,
      'The explorer must not pass through the crate');
  }
  // Plate detection uses the actual pushed crate, not a pre-lit trigger.
  assert.ok(pushed>35&&pushed<100);
  assert.equal(templeWorld.state.plates['sluice-plate'],true);
  assert.equal(templeWorld.state.gates['sluice-gate'],true);
  assert.ok(crate.x>temple.buoyantObjects.find(o=>o.id===crate.id).home[0]*16+80);
});

test('closed sluice blocks walking; its physical body clears after plate activation',()=>{
  const {player,templeWorld,step,world}=simulation(explorer(106*16-31,45*16));
  assert.equal(templeWorld.state.gates['sluice-gate'],false);
  const blocked=world.blockHorizontal(106*16-30,106*16+5,45*16);
  assert.ok(blocked<106*16-12);
  templeWorld.state.gates['sluice-gate']=true;
  assert.equal(world.blockHorizontal(106*16-30,106*16+5,45*16),106*16+5);
  // A flooded basin is water only below its true surface and above the
  // compiled ground, not over the adjacent dry banks.
  assert.equal(world.inWater(90*16,54*16),false);
  assert.equal(world.inWater(90*16,56*16),true);
  assert.equal(world.inWater(59*16,56*16),false);
  step();
  assert.equal(templeWorld.state.gates['sluice-gate'],false);
});

test('currents push actual swimming movement and reverse with valve changes',()=>{
  const {player,templeWorld,step}=simulation(explorer(85*16,50*16));
  templeWorld.state=setTempleValve(temple,templeWorld.state,
    'sluice-handle','fill');
  for(let i=0;i<410;i++)step();
  player.x=85*16;player.y=50*16;player.vx=0;player.vy=0;
  player.grounded=false;player.coyote=0;player.form='tideling';
  const initial=player.x;
  for(let i=0;i<45;i++)step();
  assert.ok(player.x>initial+8,'The authored current moves the swimmer');
  templeWorld.state=setTempleValve(temple,templeWorld.state,
    'sluice-handle','hold');
  player.vx=0;
  const resting=player.x;
  for(let i=0;i<45;i++)step();
  assert.ok(player.x-resting<1.5,'Holding the sluice removes the current');
});

test('replaying identical real motion inputs from a fresh state is deterministic',()=>{
  function replay(){
    const {player,templeWorld,step}=simulation(explorer(43*16,54*16));
    player.onPlatform='courtyard-raft';
    const traces=[];
    for(let tick=0;tick<500;tick++){
      step({right:tick%100>=60&&tick%100<80});
      if(tick%50===0)traces.push([
        player.x,player.y,player.vx,player.vy,player.onPlatform,
        templeWorld.state.surfaces.courtyard
      ]);
    }
    return traces;
  }
  assert.deepEqual(replay(),replay());
});

test('checkpoint restoration replays tides, rider carry and crate positions exactly',()=>{
  const {player,templeWorld,step}=simulation(explorer(43*16,54*16));
  player.onPlatform='courtyard-raft';
  for(let i=0;i<140;i++)step();
  const snapshot=snapshotTempleWorld(templeWorld);
  const playerAtCheckpoint={...player};
  const deck=templeWorld.decks[0],volume=templeWorld.waterBodies[0];
  const capture=()=>{
    const trace=[];
    for(let i=0;i<160;i++){
      step({right:i>=50&&i<80});
      if(i%20===0)trace.push([player.x,player.y,player.onPlatform,
        volume.surface,deck.position[1]]);
    }
    return trace;
  };
  const first=capture();
  restoreTempleWorld(temple,templeWorld,snapshot);
  Object.assign(player,playerAtCheckpoint);
  assert.equal(templeWorld.decks[0],deck);
  assert.equal(templeWorld.waterBodies[0],volume);
  assert.equal(templeWorld.state.tick,140);
  assert.deepEqual(capture(),first);
});

test('a single active explorer can physically reach the Temple Light and exit',()=>{
  const start=72,player=explorer(start,groundAt(start));
  const {templeWorld,step}=simulation(player);
  const pressed=new Set();
  const relic=level.objects.find(object=>object.kind==='springKey');
  const exit=level.objects.find(object=>object.kind==='exit');
  const itemX=item=>(item.x+.5)*16;
  const itemY=item=>(item.y+.5)*16-12;
  let light=false,exited=false;
  let reachedSluice=false,reachedWheel=false;
  for(let tick=0;tick<2600;tick++){
    const valve=temple.valves.find(valve=>!pressed.has(valve.id)&&
      Math.hypot(player.x-valve.at[0]*16,
        player.y-valve.at[1]*16)<valve.reach-5);
    if(valve)pressed.add(valve.id);
    const crateJump=player.x>=1578&&player.x<1650&&tick%45===0;
    const relicJump=!light&&player.x>3420&&player.x<3490&&
      (tick%45===0||player.grounded&&!player.floating);
    const jumpPressed=crateJump||relicJump;
    step({right:true,upPressed:Boolean(valve),
      jumpPressed,jump:jumpPressed});
    reachedSluice||=templeWorld.state.gates['sluice-gate'];
    reachedWheel||=templeWorld.state.wheelActive;
    if(Math.abs(player.x-itemX(relic))<19&&
       Math.abs(player.y-itemY(relic))<26)light=true;
    if(light&&Math.abs(player.x-itemX(exit))<28&&
       Math.abs(player.y-itemY(exit))<26){exited=true;break}
  }
  assert.ok(reachedSluice,'Crate must open the sluice on the actual route');
  assert.ok(reachedWheel,'The final waterwheel must turn on the actual route');
  assert.ok(templeWorld.state.gates['wheel-gate']);
  assert.ok(light,'Explorer must touch the elevated Temple Light physically');
  assert.ok(exited,'Explorer must reach the exit after collecting the light');
  assert.deepEqual([...pressed],['sluice-handle','cascade-handle']);
});

test('skipping the waterwheel leaves a physical gate across the finishing route',()=>{
  const player=explorer(72,groundAt(72));
  const {templeWorld,step}=simulation(player);
  let sluicePressed=false;
  for(let tick=0;tick<2700;tick++){
    const valve=temple.valves[0];
    const upPressed=!sluicePressed&&Math.hypot(player.x-valve.at[0]*16,
      player.y-valve.at[1]*16)<valve.reach-5;
    if(upPressed)sluicePressed=true;
    const jump=player.x>=1578&&player.x<1650&&tick%45===0;
    step({right:true,upPressed,jumpPressed:jump,jump});
  }
  assert.ok(templeWorld.state.gates['sluice-gate']);
  assert.equal(templeWorld.state.wheelActive,false);
  assert.equal(templeWorld.state.gates['wheel-gate'],false);
  assert.ok(player.x<=212*16-18,'A closed wheel gate must stop the explorer');
});

test('two active explorers share valves/crates but both traverse the complete route',()=>{
  const players=[explorer(72,groundAt(72)),
    {...explorer(86,groundAt(86)),id:1}];
  const templeWorld=createTempleWorld(temple);
  const world={width:level.width*16,height:level.height*16,tile:16,
    groundAt,inWater:(x,y)=>templeInWater(templeWorld,groundAt,x,y),
    currentAt:(x,y)=>templeCurrent(templeWorld,temple,x,y),
    waterBodies:templeWorld.waterBodies,thermalVolumes:[],
    platformSegments:level.platformSegments,movingPlatforms:templeWorld.decks,
    blockHorizontal:(from,to,feet)=>templeBlockHorizontal(
      temple,templeWorld,from,to,feet)};
  const pressed=new Set();
  let light=false,gateOpen=false,wheelOn=false,completed=false;
  const relic=level.objects.find(item=>item.kind==='springKey');
  const exit=level.objects.find(item=>item.kind==='exit');
  for(let tick=0;tick<3000;tick++){
    const actions=players.map(p=>{
      const valve=temple.valves.find(v=>!pressed.has(v.id)&&
        Math.hypot(p.x-v.at[0]*16,p.y-v.at[1]*16)<v.reach-5);
      if(valve)pressed.add(valve.id);
      const jump=(p.x>=1578&&p.x<1650&&tick%45===0)||
        (!light&&p.x>3420&&p.x<3490&&tick%45===0);
      return {...controls,right:true,upPressed:Boolean(valve),
        jump,jumpPressed:jump};
    });
    stepTempleWorld(temple,templeWorld,players,actions);
    for(const p of players)stepPlayerMotion(p,actions[p.id],1,world);
    gateOpen||=templeWorld.state.gates['sluice-gate'];
    wheelOn||=templeWorld.state.wheelActive;
    light||=players.some(p=>Math.abs(p.x-(relic.x+.5)*16)<19&&
      Math.abs(p.y-((relic.y+.5)*16-12))<26);
    completed=light&&players.every(p=>Math.abs(p.x-(exit.x+.5)*16)<28&&
      Math.abs(p.y-((exit.y+.5)*16-12))<26);
    if(completed)break;
  }
  assert.ok(gateOpen&&wheelOn);
  assert.ok(light);
  assert.ok(completed,'Both explorers reach the physical exit after the light');
  assert.deepEqual([...pressed],['sluice-handle','cascade-handle']);
});

test('co-op simultaneous input changes each valve only one detent per tick',()=>{
  const valve=temple.valves[0];
  const x=valve.at[0]*16,y=valve.at[1]*16;
  const players=[explorer(x,y),{...explorer(x+12,y),id:1}];
  const world=createTempleWorld(temple);
  stepTempleWorld(temple,world,players,[
    {upPressed:true},{upPressed:true}
  ]);
  assert.equal(world.state.modes['sluice-valve'],'fill');
});

test('final wheel walkway has no collision until its controller reaches the threshold',()=>{
  const {player,templeWorld,step}=simulation(explorer(197*16,41*16-6));
  const deck=templeWorld.decks.find(deck=>deck.id==='wheel-walkway');
  assert.equal(deck.enabled,false);
  player.grounded=false;player.coyote=0;player.vy=5;
  step();
  assert.notEqual(player.onPlatform,deck.id);
  templeWorld.state=setTempleValve(temple,templeWorld.state,
    'cascade-handle','fill');
  for(let i=0;i<410;i++)step();
  assert.equal(templeWorld.state.wheelActive,true);
  assert.equal(deck.enabled,true);
  player.x=197*16;player.y=41*16-6;player.grounded=false;
  player.vy=5;player.onPlatform=null;
  step();
  assert.equal(player.onPlatform,deck.id);
  assert.equal(player.y,41*16);
});
