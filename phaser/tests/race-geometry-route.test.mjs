import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import race from '../levels/skybound-stampede.json' with {type:'json'};
import {stepMountedMotion} from '../src/mounts.js';
import {surfaceGroundAt} from '../src/surface-geometry.js';
import {createRaceWorld,stepRaceWorld} from '../src/race-world.js';

const scope={};scope.window=scope;vm.createContext(scope);
vm.runInContext(readFileSync(new URL('../../src/platform/world-compiler.js',
  import.meta.url),'utf8'),scope);
const level=scope.WW.worldCompiler.compile(race);
const groundAt=x=>surfaceGroundAt(level,x);
const world={width:level.width*16,height:level.height*16,tile:16,
  groundAt,platformSegments:level.platformSegments,
  flightVolumes:race.flightVolumes};
const obstacles=race.hazards.filter(h=>h.stage==='groundScroll'&&
  h.kind!=='swinging-branch'&&h.id!=='crossing-cart');
const cart=race.hazards.find(h=>h.id==='crossing-cart');

function groundRoute(jump){
  // A trusted, already boarded Unicorn enters the encounter gate. All
  // subsequent motion is production mount physics over compiled terrain.
  const x=race.mountEncounters[0].at[0]*16;
  const mount={kind:'unicorn',rider:0,x,y:groundAt(x),vx:0,vy:0,
    face:1,grounded:true,flaps:0,flapWait:0};
  const player={id:0,mount,assist:false};
  const state=createRaceWorld(race);
  stepRaceWorld(race,state,[player]);
  assert.equal(state.state.phase,'groundScroll');
  for(let tick=0;tick<1100;tick++){
    const near=obstacles.some(hazard=>{
      const distance=hazard.home[0]*16-mount.x;
      return distance>=50&&distance<=65;
    });
    const cartDistance=cart.home[0]*16-mount.x;
    const jumpPressed=jump&&mount.grounded&&
      (near||cartDistance>=55&&cartDistance<=69);
    stepMountedMotion(mount,{right:true,left:false,down:false,
      jump:jumpPressed,jumpPressed},1,world);
    player.x=mount.x;player.y=mount.y;
    const result=stepRaceWorld(race,state,[player]);
    if(result.restarted)
      return {status:'collision',hazard:result.hit,tick,mount,state};
    if(state.state.phase==='sanctuaryStop')
      return {status:'sanctuary',tick,mount,state};
  }
  return {status:'timeout',mount,state};
}

test('a no-jump Unicorn run hits an authored obstacle and resets the stage',()=>{
  const failed=groundRoute(false);
  assert.equal(failed.status,'collision');
  assert.ok(failed.hazard==='root-trainer'||failed.hazard==='bridge-gap');
  assert.equal(failed.state.state.phase,'waitingForUnicorns');
  assert.equal(failed.state.state.anchor,512);
});

test('one Unicorn can jump the compiled ground corridor to the Pegasus sanctuary',()=>{
  const passed=groundRoute(true);
  assert.equal(passed.status,'sanctuary',
    'The full woodland route must be possible with actual mounted controls');
  assert.equal(passed.state.state.anchor,184*16);
  assert.ok(passed.mount.x>race.hazards.find(h=>
    h.id==='crossing-cart').home[0]*16);
  assert.equal(passed.state.state.checkpoint,'sanctuary');
  assert.ok(passed.tick<1100);
  const repeated=groundRoute(true);
  assert.equal(repeated.status,'sanctuary');
  assert.equal(repeated.tick,passed.tick);
  assert.equal(repeated.mount.x,passed.mount.x);
  assert.equal(repeated.mount.y,passed.mount.y);
});
