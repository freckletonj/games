import test from 'node:test';
import assert from 'node:assert/strict';
import {TICK_MS,MAX_TICKS_PER_FRAME,simulationTicks,
  queueInputEdges,withoutInputEdges} from '../src/fixed-clock.js';

test('30, 60 and 120 fps render schedules deliver the same 60 simulation ticks',()=>{
  for(const fps of [30,60,120]){
    let pending=0,ticks=0;
    for(let frame=0;frame<fps;frame++){
      const result=simulationTicks(pending,1000/fps);
      ticks+=result.ticks;pending=result.remaining;
    }
    assert.equal(ticks,60,`Unexpected simulation ticks at ${fps} Hz`);
  }
});

test('a tab stall is bounded to four ticks and does not accumulate debt',()=>{
  const after=simulationTicks(0,1400);
  assert.equal(after.ticks,MAX_TICKS_PER_FRAME);
  assert.equal(after.remaining,0);
  assert.deepEqual(simulationTicks(0,0),{ticks:0,remaining:0});
});

test('a pressed edge remains queued across a no-tick render',()=>{
  const zero=simulationTicks(0,TICK_MS/2);
  assert.equal(zero.ticks,0);
  const queued=queueInputEdges({},{
    jump:true,jumpPressed:true,right:false,rightPressed:false
  });
  const next=queueInputEdges(queued,{
    jump:true,jumpPressed:false,right:true,rightPressed:true
  });
  const second=simulationTicks(zero.remaining,TICK_MS/2);
  assert.equal(second.ticks,1);
  assert.equal(next.jumpPressed,true);
  assert.equal(next.rightPressed,true);
  const later=withoutInputEdges(next);
  assert.equal(later.jump,true);
  assert.equal(later.right,true);
  assert.equal(later.jumpPressed,false);
  assert.equal(later.rightPressed,false);
});

test('fixed step partitions a sequence with no lingering frame debt',()=>{
  let pending=0,ticks=0;
  for(const delta of [8,9,6,10,22,13,15,17]){
    const result=simulationTicks(pending,delta);
    ticks+=result.ticks;
    pending=result.remaining;
    assert.ok(pending>=0&&pending<TICK_MS);
  }
  assert.equal(ticks,6);
  assert.ok(pending<TICK_MS);
});
