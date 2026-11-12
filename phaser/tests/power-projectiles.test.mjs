import test from 'node:test';
import assert from 'node:assert/strict';
import {PROJECTILE_POWERS,HONEY_PUDDLE_TICKS,launchPower,stepPower,
  powerHitsCreature,applyPowerHit,honeyPuddleCatches}
  from '../src/power-projectiles.js';

const animal=(x=125,y=500)=>({
  kind:'mossback',x,y,captured:false,flying:false,
  stun:0,bubble:0,bubbleRise:0,knockVX:0,windup:.5,dash:.4
});
const groundAt=()=>500;

test('five useful forms launch actual world-space projectiles, not instant hits',()=>{
  assert.deepEqual(Object.keys(PROJECTILE_POWERS).sort(),
    ['mossback','prismtail','skyling','cloudwhisp','emberkit'].sort());
  for(const form of Object.keys(PROJECTILE_POWERS)){
    const shot=launchPower(form,100,490,1,0);
    assert.equal(shot.owner,0);
    assert.ok(shot.x>100&&shot.life>40,form);
    const before=shot.x;
    const moved=stepPower(shot,1,groundAt,2000);
    assert.ok(shot.x>before&&shot.life<PROJECTILE_POWERS[form].life,form);
    assert.equal(moved.expired,false,form);
  }
  assert.equal(launchPower('springaroo',100,490,1,0),null);
  assert.equal(launchPower('tideling',100,490,1,0),null);
});

test('all projectiles have bounded reach, including a shot that misses',()=>{
  for(const form of Object.keys(PROJECTILE_POWERS)){
    const shot=launchPower(form,100,450,1,0);
    let ended=false;
    for(let i=0;i<105;i++){
      const state=stepPower(shot,1,groundAt,2000);
      if(state.expired){ended=true;break;}
    }
    assert.ok(ended,form);
    assert.ok(shot.x<550,form);
  }
});

test('swept collision hits a moving target in the projectile path, not behind it',()=>{
  const shot=launchPower('prismtail',100,490,1,0);
  const before=shot.x;
  stepPower(shot,8,groundAt,2000);
  assert.equal(powerHitsCreature(shot,before,shot.y,animal(133,500)),true);
  assert.equal(powerHitsCreature(shot,before,shot.y,animal(180,500)),false);
  assert.equal(powerHitsCreature(shot,before,shot.y,animal(100,450)),false);
});

test('bubble, honey, wind and spark have distinct semantic effects',()=>{
  for(const form of Object.keys(PROJECTILE_POWERS)){
    const target=animal();
    const shot=launchPower(form,100,490,1,0);
    const effect=applyPowerHit(shot,target);
    assert.equal(target.windup,0,form);
    assert.equal(target.dash,0,form);
    assert.ok(target.stun>1.3,form);
    assert.equal(target.bubble>0,form==='prismtail',form);
    assert.equal(target.knockVX>0,form==='skyling'||form==='cloudwhisp',form);
    assert.equal(effect,form==='prismtail'?'bubble':
      form==='mossback'?'honey':
      ['skyling','cloudwhisp'].includes(form)?'gust':'spark',form);
  }
});

test('a missed honey shot creates a finite grounded sticky field',()=>{
  assert.ok(HONEY_PUDDLE_TICKS>=120);
  assert.equal(honeyPuddleCatches({x:125},animal(130,500),groundAt),true);
  assert.equal(honeyPuddleCatches({x:125},animal(180,500),groundAt),false);
  const airborne=animal(130,475);airborne.flying=true;
  assert.equal(honeyPuddleCatches({x:125},airborne,groundAt),false);
});

test('simulated projectile trajectory is independent of rendering chunk size',()=>{
  for(const kind of Object.keys(PROJECTILE_POWERS)){
    const a=launchPower(kind,100,430,1,0),b=launchPower(kind,100,430,1,0);
    for(let tick=0;tick<14;tick++)stepPower(a,1,groundAt,2000);
    stepPower(b,14,groundAt,2000);
    assert.ok(Math.abs(a.x-b.x)<.001,kind);
    assert.ok(Math.abs(a.y-b.y)<2.5,kind);
    assert.equal(a.life,b.life);
  }
});

test('all five offensive forms hit an ordinary nearby creature through actual flight',()=>{
  for(const form of Object.keys(PROJECTILE_POWERS)){
    const shot=launchPower(form,100,500,1,0);
    const target=animal(175,500);
    let hitAt=-1;
    for(let tick=1;tick<=100;tick++){
      const result=stepPower(shot,1,groundAt,2000);
      if(powerHitsCreature(shot,result.fromX,result.fromY,target)){
        hitAt=tick;
        applyPowerHit(shot,target);
        break;
      }
      if(result.expired)break;
    }
    assert.ok(hitAt>=8&&hitAt<45,
      form+' should travel visibly to an ordinary in-range target');
    assert.ok(target.stun>0,form);
  }
});

test('projectiles stop at uphill walls rather than travelling through terrain',()=>{
  const hill=x=>x<135?500:450;
  for(const kind of Object.keys(PROJECTILE_POWERS)){
    const shot=launchPower(kind,100,500,1,0);
    let stopped=false;
    for(let tick=0;tick<50;tick++){
      const {ground}=stepPower(shot,1,hill,2000);
      if(ground){stopped=true;break;}
    }
    assert.equal(stopped,true,kind);
    assert.ok(shot.x<135,kind+' crossed an uphill wall');
  }
});
