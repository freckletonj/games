import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import race from '../levels/skybound-stampede.json' with {type:'json'};
import {stepMountedMotion,seatFor} from '../src/mounts.js';
import {surfaceGroundAt} from '../src/surface-geometry.js';
import {createRaceWorld,stepRaceWorld} from '../src/race-world.js';

const scope={};scope.window=scope;vm.createContext(scope);
vm.runInContext(readFileSync(new URL('../../src/platform/world-compiler.js',
  import.meta.url),'utf8'),scope);
const level=scope.WW.worldCompiler.compile(race);
const groundAt=x=>surfaceGroundAt(level,x);
const physics={width:level.width*16,height:level.height*16,tile:16,
  groundAt,platformSegments:level.platformSegments,
  flightVolumes:race.flightVolumes};
const relic=level.objects.find(item=>item.kind==='springKey');
const exit=level.objects.find(item=>item.kind==='exit');
const center=item=>[(item.x+.5)*16,(item.y+.5)*16-12];
const [relicX,relicY]=center(relic);
const [exitX,exitY]=center(exit);

function flightRoute(humanCount){
  // Start from the genuine stationary Pegasus checkpoint, with a distinct
  // trusted mount for every human. The mounted motion and collision are
  // production rules; scenery and camera never supply physics.
  const encounters=race.mountEncounters.filter(m=>m.kind==='pegasus');
  const players=encounters.slice(0,humanCount).map((encounter,id)=>{
    const x=encounter.at[0]*16;
    const mount={kind:'pegasus',rider:id,x,y:groundAt(x),vx:0,vy:0,
      face:1,grounded:true,flaps:0,flapWait:0};
    return {id,mount,assist:false,x,y:mount.y};
  });
  const state=createRaceWorld(race);
  state.state={...state.state,phase:'waitingForPegasi',
    anchor:184*16,checkpoint:'sanctuary'};
  stepRaceWorld(race,state,players);
  assert.equal(state.state.phase,'flightScroll');
  const touched=new Set();
  let entered=false;
  for(let tick=0;tick<1000;tick++){
    for(const player of players){
      const mount=player.mount;
      const flying=mount.x>210*16;
      const jumpPressed=flying&&(mount.grounded||
        mount.flapWait===0&&mount.y>820&&mount.vy>=0);
      const down=flying&&mount.y<785;
      const {action}=stepMountedMotion(mount,{right:true,left:false,
        down,jumpPressed,jump:jumpPressed},1,physics);
      const seat=seatFor('pegasus',mount.grounded?action:'jump');
      player.x=mount.x+seat.x*mount.face;
      player.y=mount.y+seat.y;
    }
    const step=stepRaceWorld(race,state,players);
    if(step.restarted)
      return {status:'collision',hit:step.hit,tick,players,state,touched,entered};
    for(const player of players)
      if(Math.abs(player.x-relicX)<19&&
         Math.abs(player.y-relicY)<26)touched.add(player.id);
    if(touched.size&&players.some(player=>
      Math.abs(player.x-exitX)<28&&Math.abs(player.y-exitY)<26))
      entered=true;
    if(state.state.phase==='finished')
      return {status:'finished',tick,players,state,touched,entered};
  }
  return {status:'timeout',players,state,touched,entered};
}

test('solo Pegasus safely flies all authored storm hazards to the physical exit',()=>{
  const route=flightRoute(1);
  assert.equal(route.status,'finished');
  assert.equal(route.state.state.anchor,344*16);
  assert.deepEqual([...route.touched],[0],
    'The rider must touch the actual Light pickup, not just reach an X threshold');
  assert.ok(route.entered,'The rider must reach the compiled exit after the Light');
  assert.ok(route.tick<1000);
  assert.equal(flightRoute(1).tick,route.tick);
});

test('two independent Pegasi complete the storm and both touch the Light',()=>{
  const route=flightRoute(2);
  assert.equal(route.status,'finished');
  assert.equal(route.state.state.anchor,344*16);
  assert.deepEqual([...route.touched].sort(),[0,1]);
  assert.ok(route.entered);
  assert.ok(route.players.every(player=>player.mount.kind==='pegasus'));
  assert.equal(flightRoute(2).tick,route.tick);
});
