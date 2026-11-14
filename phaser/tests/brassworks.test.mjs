import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {compileChapter} from '../src/campaign.js';
import {surfaceGroundAt} from '../src/surface-geometry.js';
import {machinePlatforms,stepMachines} from '../src/machines.js';
import {deckTopAt} from '../src/moving-platforms.js';
import {stepPlayerMotion} from '../src/player-motion.js';

const scope={};
scope.window=scope;
vm.createContext(scope);
vm.runInContext(readFileSync(new URL('../../src/platform/world-compiler.js',import.meta.url),'utf8'),scope);
const level=compileChapter({id:'brassworks'},scope.WW.worldCompiler);

function simulation(){
  const machines=machinePlatforms(level.machines);
  const groundAt=x=>surfaceGroundAt(level,x);
  const world={width:level.width*16,height:level.height*16,tile:16,
    groundAt,inWater:()=>false,thermalVolumes:[],platformSegments:level.platformSegments,
    movingPlatforms:machines};
  const p={x:72,y:groundAt(72),vx:0,vy:0,face:1,grounded:true,coyote:5,
    jumpBuffer:0,jumps:0,flaps:0,flapWait:0,powers:0,hover:0,breach:0,bloomWindow:0};
  let frame=0,launched=false;
  function tick(actions={}){
    stepMachines(machines,++frame);
    const result=stepPlayerMotion(p,{left:false,right:false,jump:false,jumpPressed:false,...actions},1,world);
    launched||=result.events.includes('piston');
  }
  function go(until,{right=false,jump=false,ticks=220}={}){
    for(let i=0;i<ticks;i++){
      if(until())return;
      tick({right,jump,jumpPressed:jump&&i===0});
    }
    assert.fail(`Route stuck at tick ${frame}: x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}, on=${p.onPlatform}`);
  }
  return {machines,p,tick,go,wasLaunched:()=>launched};
}

test('the belt carries an idle explorer and gears expose a curved, rotating tread',()=>{
  const {machines,p,go,tick}=simulation();
  go(()=>p.onPlatform==='feed-belt',{right:true});
  for(let i=0;i<30;i++)tick();
  const before=p.x;
  tick();
  assert.ok(Math.abs(p.x-before-1.35)<.01);
  const gear=machines[1],x=gear.home[0];
  assert.equal(deckTopAt(gear,x),gear.home[1]-62);
  assert.ok(deckTopAt(gear,x+40)>deckTopAt(gear,x));
  assert.equal(deckTopAt(gear,x+52),null);
  assert.ok(gear.beltSpeed>0);
  assert.ok(machines[2].beltSpeed<0);
});

test('an explorer can cross the gears and ride the timed piston to the exit',()=>{
  const {p,go,wasLaunched}=simulation();
  go(()=>p.x>=403,{right:true});
  go(()=>p.onPlatform==='gear-one',{right:true,jump:true,ticks:55});
  go(()=>p.x>=544,{right:true});
  go(()=>p.onPlatform==='gear-two',{right:true,jump:true,ticks:55});
  go(()=>p.x>=668,{right:true});
  go(()=>p.onPlatform==='gear-three',{right:true,jump:true,ticks:55});
  go(()=>p.x>=795,{right:true});
  go(()=>p.x>=872&&p.grounded,{right:true,jump:true,ticks:55});
  go(()=>p.x>=1019,{right:true});
  go(()=>p.onPlatform==='launch-piston',{right:true,jump:true,ticks:55});
  go(()=>wasLaunched());
  go(()=>p.x>=1464&&p.grounded,{ticks:70});
  const relic=level.objects.find(o=>o.kind==='springKey');
  go(()=>Math.abs(p.x-(relic.x+.5)*16)<19,{right:true});
  assert.ok(Math.abs((relic.y+.5)*16-12-p.y)<26);
  const exit=level.objects.find(o=>o.kind==='exit');
  go(()=>Math.abs(p.x-(exit.x+.5)*16)<19,{right:true});
  assert.ok(Math.abs(surfaceGroundAt(level,(exit.x+.5)*16)-12-p.y)<26);
});
