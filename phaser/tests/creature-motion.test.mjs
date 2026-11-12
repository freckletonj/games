import test from 'node:test';
import assert from 'node:assert/strict';
import {tickCreatureRespawn,stepCreatureMotion,creatureAction,stepCreatureThreat}
  from '../src/creature-motion.js';

const animal=(kind='emberkit')=>({
  kind,x:100,y:500,homeX:100,homeY:500,face:1,flying:false,
  captured:false,respawn:0,stun:0,bubble:0,trust:0,distraction:0,
  attack:0,windup:0,dash:0,attackFace:1
});
const world={width:1000,groundAt:()=>500};

test('befriended wildlife holds position for capture and eventually becomes wild',()=>{
  const p=animal('springaroo');
  p.trust=100;p.distraction=12;
  const before=p.x;
  let result=stepCreatureMotion(p,null,1,0,world);
  assert.equal(p.x,before);
  assert.equal(result.friendly,true);
  assert.equal(creatureAction(p,null,result.diff),'run',
    'Existing pose priority favors a distant patrol target, even when stationary');
  result=stepCreatureMotion(p,null,12*60,0,world);
  assert.equal(p.distraction,0);
  assert.equal(p.trust,0);
});

test('telegraphed threat must finish its windup before the actual dash',()=>{
  const p=animal();
  stepCreatureThreat(p,{x:130,y:500},false,1);
  assert.equal(p.windup,.55);
  assert.equal(p.dash,0);
  for(let i=0;i<35;i++)stepCreatureThreat(p,null,false,1);
  assert.equal(p.windup,0);
  assert.ok(p.dash>0);
  const before=p.x;
  stepCreatureMotion(p,null,1,0,world);
  assert.ok(p.x>before,'Dash travels in announced direction');
});

test('food redirects wildlife but stun prevents movement and hostile warning',()=>{
  const p=animal('prismtail');
  const food={x:220,y:500};
  stepCreatureMotion(p,food,1,0,world);
  assert.ok(p.x>100);
  p.stun=2;p.windup=.3;p.dash=.2;
  const before=p.x;
  stepCreatureMotion(p,food,1,0,world);
  assert.equal(p.x,before);
  assert.equal(p.windup,0);
  assert.equal(p.dash,0);
  stepCreatureThreat(p,{x:130,y:500},false,1);
  assert.equal(p.windup,0);
});

test('captured creatures return exactly once when their simulation timer expires',()=>{
  const p=animal('glimmermoth');
  p.captured=true;p.respawn=17;p.trust=100;p.distraction=9;
  p.x=250;p.y=430;
  assert.equal(tickCreatureRespawn(p,16*60),'waiting');
  assert.equal(p.captured,true);
  assert.equal(tickCreatureRespawn(p,60),'returned');
  assert.equal(p.captured,false);
  assert.equal(p.x,p.homeX);
  assert.equal(p.y,p.homeY);
  assert.equal(p.trust,0);
  assert.equal(tickCreatureRespawn(p,1),'active');
});
