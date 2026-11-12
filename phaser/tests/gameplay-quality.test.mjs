import test from 'node:test';
import assert from 'node:assert/strict';
import {qualityReport} from './quality-scenarios.mjs';
import {chooseCreatureLure,advanceBubbleLift} from '../src/gameplay-rules.js';

const metrics=qualityReport();

test('capture orb has visible multi-bounce trajectory and clears a real uphill bank',()=>{
  const orb=metrics.captureOrb;
  assert.ok(orb.bounces>=2,`orb bounced only ${orb.bounces} times`);
  assert.ok(orb.postBounceApex>25,`orb rebound only ${orb.postBounceApex.toFixed(1)}px`);
  assert.ok(orb.climbedHill,`orb stopped at x=${orb.maxX.toFixed(1)}`);
  assert.ok(orb.remainingLife>0);
});

for(const [name,run] of Object.entries(metrics.slope)){
  test(`${name} stays at predictable surface speed on a steep incline`,()=>{
    assert.ok(run.travelX>65,`blocked on the hill: ${JSON.stringify(run)}`);
    assert.ok(run.maxSurfaceSpeed<=3.0,
      `surface speed spike: ${JSON.stringify(run)}`);
    assert.ok(Math.abs(run.endGroundError)<4,
      `lost contact with terrain: ${JSON.stringify(run)}`);
    assert.equal(run.grounded,true);
  });
}

test('wildlife ignores inaccessible fruit and changes to a reachable newer berry',()=>{
  const result=metrics.berryTargeting;
  assert.equal(result.ignoredUnreachable,true,result);
  assert.equal(result.selectedNear,true,result);
  assert.equal(result.walkedTowardNear,true,result);
  const a={x:100,homeX:100,homeY:500,flying:false};
  assert.equal(chooseCreatureLure(a,[{x:120,y:500,landed:false}],()=>500),null,
    'An airborne treat must not redirect AI before landing');
});

test('bubble attack actually lifts an animal high, then returns it to ground',()=>{
  const result=metrics.bubbleAttack;
  assert.ok(result.lift>120,`bubble only lifted ${result.lift}px`);
  assert.ok(result.airborneTicks>130,`bubble lasted only ${result.airborneTicks} ticks`);
  assert.equal(result.remainingBubble,0);
  assert.ok(Math.abs(result.restingY-500)<1,result);
  const a={bubble:0,bubbleRise:100};
  assert.ok(advanceBubbleLift(a,1)<100,
    'Released creatures descend rather than teleport to the floor');
});

test('Glimmermoth hover remains slow for more than two seconds',()=>{
  const result=metrics.glimmermothHover;
  assert.ok(result.remainingHover>.9,result);
  assert.ok(result.descent>35&&result.descent<125,result);
  assert.ok(result.maxFallingSpeed<=.91,result);
});

test('Emberkit has a modest, measured speed bonus',()=>{
  const ratio=metrics.emberkitSpeed.distanceRatio;
  assert.ok(ratio>1.1&&ratio<1.2,`unexpected sprint ratio: ${ratio}`);
});

test('water vents provide a meaningful controlled lift within their authored column',()=>{
  const result=metrics.waterVent;
  assert.ok(result.activeTicks>18,result);
  assert.ok(result.lift>75,`vent barely moved player: ${JSON.stringify(result)}`);
  assert.equal(result.rejectsDryPlayer,true);
  assert.equal(result.rejectsDistantPlayer,true);
});

test('all quality metrics are valid numeric JSON for automatic tuning',()=>{
  const json=JSON.stringify(metrics);
  assert.ok(json.length>400);
  assert.deepEqual(JSON.parse(json),metrics);
});
