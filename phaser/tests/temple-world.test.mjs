import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import temple from '../levels/sunken-temple.json' with {type:'json'};
import {stepPlayerMotion} from '../src/player-motion.js';
import {surfaceGroundAt} from '../src/surface-geometry.js';
import {createTempleWorld,stepTempleWorld,templeInWater,
  templeBlockHorizontal,templeCurrent} from '../src/temple-world.js';
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
  assert.equal(templeWorld.state.modes['sluice-valve'],'hold');
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
