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
function groundRoute(jump,humanCount=1){
  // Start with distinct, correctly boarded Unicorns. The subsequent
  // traversal uses production movement, the compiled ridge and the
  // changing hazard poses, never painting or scripted teleports.
  const players=race.mountEncounters.slice(0,humanCount).map((encounter,id)=>{
    const x=encounter.at[0]*16;
    const mount={kind:'unicorn',rider:id,x,y:groundAt(x),vx:0,vy:0,
      face:1,grounded:true,flaps:0,flapWait:0};
    return {id,mount,assist:false,x,y:mount.y};
  });
  const state=createRaceWorld(race);
  stepRaceWorld(race,state,players);
  assert.equal(state.state.phase,'groundScroll');
  for(let tick=0;tick<1100;tick++){
    for(const player of players){
      const mount=player.mount;
      const near=state.hazards.some(hazard=>{
        if(hazard.kind==='swinging-branch')return false;
        const distance=hazard.x-mount.x;
        const from=hazard.id==='boulder-run'?65:
          hazard.id==='crossing-cart'?55:50;
        const to=hazard.id==='boulder-run'?79:
          hazard.id==='crossing-cart'?69:65;
        return distance>=from&&distance<=to;
      });
      const jumpPressed=jump&&mount.grounded&&near;
      stepMountedMotion(mount,{right:true,left:false,down:false,
        jump:jumpPressed,jumpPressed},1,world);
      player.x=mount.x;player.y=mount.y;
    }
    const result=stepRaceWorld(race,state,players);
    if(result.restarted)
      return {status:'collision',hazard:result.hit,tick,players,state};
    if(state.state.phase==='sanctuaryStop')
      return {status:'sanctuary',tick,players,state};
  }
  return {status:'timeout',players,state};
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
  assert.ok(passed.players[0].mount.x>race.hazards.find(h=>
    h.id==='crossing-cart').home[0]*16);
  assert.equal(passed.state.state.checkpoint,'sanctuary');
  assert.ok(passed.tick<1100);
  const repeated=groundRoute(true);
  assert.equal(repeated.status,'sanctuary');
  assert.equal(repeated.tick,passed.tick);
  assert.equal(repeated.players[0].mount.x,passed.players[0].mount.x);
  assert.equal(repeated.players[0].mount.y,passed.players[0].mount.y);
});

test('two distinct Unicorns traverse the same moving hazards to sanctuary',()=>{
  const passed=groundRoute(true,2);
  assert.equal(passed.status,'sanctuary',
    'Both mounted players must survive real moving obstacle collisions');
  assert.equal(passed.players.length,2);
  assert.ok(passed.players.every(p=>
    p.mount.x>race.hazards.find(h=>h.id==='crossing-cart').home[0]*16));
  assert.equal(passed.state.state.anchor,184*16);
  assert.equal(groundRoute(true,2).tick,passed.tick);
});
