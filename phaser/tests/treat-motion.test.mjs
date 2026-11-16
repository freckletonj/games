import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceTreatFlight,treatLanding,TREAT_FLIGHT_TICKS,TREAT_ARC_HEIGHT}
  from '../src/treat-motion.js';

function treat(){
  return {startX:100,startY:450,x:196,y:500,face:1,age:0,landed:false};
}

test('berry lands at the exact intended point after 34 simulation ticks',()=>{
  const food=treat();
  let previousX=100;
  for(let i=0;i<TREAT_FLIGHT_TICKS-1;i++){
    const at=advanceTreatFlight(food);
    assert.ok(at.x>previousX);
    assert.equal(at.landed,false);
    previousX=at.x;
  }
  const landed=advanceTreatFlight(food);
  assert.equal(landed.x,196);
  assert.ok(Math.abs(landed.y-500)<1e-8);
  assert.equal(landed.rotation,0);
  assert.equal(landed.landed,true);
});
test('the throw has a clearly visible airborne arc',()=>{
  const food=treat();
  const half=advanceTreatFlight(food,TREAT_FLIGHT_TICKS/2);
  assert.equal(half.x,148);
  assert.equal(half.y,475-TREAT_ARC_HEIGHT);
  assert.equal(half.landed,false);
});
test('pausing means no tick, so the fruit remains in flight',()=>{
  const food=treat();
  const before=advanceTreatFlight(food,7);
  // The paused game does not call the fixed-step update.
  assert.equal(food.age,7);
  assert.equal(food.landed,false);
  const after=advanceTreatFlight(food,0);
  assert.deepEqual(after,before);
  advanceTreatFlight(food,27);
  assert.equal(food.landed,true);
});
test('multiple simulation steps and individual steps yield the same landing',()=>{
  const a=treat(),b=treat();
  for(let i=0;i<34;i++)advanceTreatFlight(a,1);
  const after=advanceTreatFlight(b,34);
  assert.equal(a.age,b.age);
  assert.equal(after.x,a.x);
  assert.equal(after.y,a.y);
  assert.equal(a.landed,b.landed);
});


test('fruit lands on the first platform it actually crosses while falling',()=>{
  const floor=()=>500;
  const ledges=[
    {kind:'platform',x:8,length:2,y:29},
    {kind:'platform',x:9,length:2,y:27}
  ];
  const cast=treat();
  const findLanding=(from,to)=>treatLanding(from,to,ledges,[],floor,16);
  while(!cast.landed)advanceTreatFlight(cast,1,findLanding);
  assert.equal(cast.y,27*16);
  assert.ok(cast.x>=9*16&&cast.x<=11*16);
  assert.equal(findLanding({x:145,y:442},{x:150,y:428}),null);
  assert.equal(findLanding({x:180,y:426},{x:183,y:440}),null);
});

test('a berry can land on a moving deck in the same frame it crosses its top',()=>{
  const deck={id:'lift',kind:'vertical',size:[84,12],position:[160,432],previous:[158,435]};
  const hit=treatLanding({x:160,y:430},{x:162,y:435},[],[deck],()=>500,16);
  assert.deepEqual(hit,{x:162,y:432,deck});
});
