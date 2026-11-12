import test from 'node:test';
import assert from 'node:assert/strict';
import {ATTACKS,tickCreatureRespawn,stepCreatureMotion,creatureAction,stepCreatureThreat}
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
  assert.equal(creatureAction(p,null,result.diff),'happy',
    'A friendly, stationary creature must look ready to be captured');
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

test('Prismtail warns longer then hops, while Emberkit stays on the ground',()=>{
  const prism=animal('prismtail');
  stepCreatureThreat(prism,{x:130,y:500},false,1);
  assert.equal(prism.windup,ATTACKS.prismtail.windup);
  assert.ok(prism.windup>ATTACKS.emberkit.windup);
  assert.equal(prism.face,1);
  for(let i=0;i<46;i++)stepCreatureThreat(prism,null,false,1);
  assert.equal(prism.windup,0);
  assert.ok(prism.dash>0);
  let minimumHeight=500;
  for(let i=0;i<30;i++){
    stepCreatureMotion(prism,null,1,0,world);
    minimumHeight=Math.min(minimumHeight,prism.y);
  }
  assert.ok(minimumHeight<480,'The hop must clear the floor');
  assert.ok(Math.abs(prism.y-500)<1,'The hop must finish back on terrain');

  const ember=animal('emberkit');
  stepCreatureThreat(ember,{x:130,y:500},false,1);
  for(let i=0;i<34;i++)stepCreatureThreat(ember,null,false,1);
  assert.ok(ember.dash>0);
  for(let i=0;i<15;i++){
    stepCreatureMotion(ember,null,1,0,world);
    assert.equal(ember.y,500,'Emberkit remains a ground dash');
  }
});

test('an enemy locks its telegraphed attack direction even if its patrol target moves',()=>{
  const prism=animal('prismtail');
  stepCreatureThreat(prism,{x:130,y:500},false,1);
  stepCreatureMotion(prism,{x:20,y:500},1,0,world);
  assert.equal(prism.attackFace,1);
  assert.equal(prism.face,1);
  prism.stun=1;
  stepCreatureMotion(prism,null,1,0,world);
  assert.equal(prism.windup,0);
  assert.equal(prism.dash,0);
});
