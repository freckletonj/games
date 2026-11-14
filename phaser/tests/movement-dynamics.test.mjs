import test from 'node:test';
import assert from 'node:assert/strict';
import {landingY,safeHorizontalX,orbStep,orbHitsAnimal} from '../src/physics.js';
import {triggerBloom,tryBloomBoost,BLOOM_WINDOW,BLOOM_BOOST} from '../src/springboard.js';
import {MOUNTS,LOCATIONS,seatFor,mountState} from '../src/mounts.js';

test('steep underwater banks block horizontal tunnelling',()=>{
  const floor=x=>x<140?480:480-(x-140)*3.6;
  assert.ok(Math.abs(safeHorizontalX(132,178,482,floor,true)-140)<1);
  assert.ok(safeHorizontalX(132,178,460,floor,true)>140);
  assert.equal(landingY(520,522,2,false,156,430,[]),430,
    'a body inside a sloping wall must not fall forever');
});
test('shallow slopes are still walkable and foot snap is stable',()=>{
  const slope=x=>470-(x-100)*.12;
  assert.equal(safeHorizontalX(100,146,470,slope,false),146);
  assert.equal(landingY(470,472,2,true,146,slope(146),[]),slope(146));
});
test('the orb follows a slow ballistic arc and bounces up to 3 times',()=>{
  let orb={x:40,y:460,vx:3,vy:-2.1,bounces:0,life:160};
  let turns=0,lastX=orb.x;
  for(let i=0;i<120;i++){
    const next=orbStep(orb,480);
    assert.ok(next.x>lastX,'No auto-aiming or reversing');
    lastX=next.x;
    if(next.bounces>orb.bounces)turns++;
    orb=next;
  }
  assert.ok(turns>=2);
  assert.ok(orb.vx<3);
  assert.ok(orbHitsAnimal(65,461,78,467,73,482));
});
test('bloom launches automatically; a generous late press gives a higher jump',()=>{
  const p={vy:0,grounded:true,coyote:5,jumps:0,jumpBuffer:0,bloomBoosts:0};
  triggerBloom(p);
  assert.equal(p.bloomWindow,BLOOM_WINDOW);
  assert.ok(p.vy<0);
  assert.equal(tryBloomBoost(p,false),false);
  p.bloomWindow=1;
  assert.equal(tryBloomBoost(p,true),true);
  assert.equal(p.vy,BLOOM_BOOST);
  assert.equal(p.bloomBoosts,1);
  assert.equal(tryBloomBoost(p,true),false);
  triggerBloom(p,true);
  assert.equal(p.bloomBoosts,2,'An early buffered press also earns a boost');
});
test('mounts have distinct movement, favorites and saddle offsets',()=>{
  assert.ok(MOUNTS.unicorn.speed>MOUNTS.pegasus.speed);
  assert.equal(MOUNTS.pegasus.kind,'flight');
  assert.deepEqual(LOCATIONS['first-forest'],[['unicorn',48]]);
  assert.ok(seatFor('unicorn','run').y<0);
  assert.equal(mountState('unicorn',100),'ready');
  assert.equal(mountState('pegasus',60),'interested');
});
