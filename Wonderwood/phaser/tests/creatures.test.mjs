import test from 'node:test';
import assert from 'node:assert/strict';
import {feedTrust,tickDistraction,DISTRACTION_SECONDS,RESPAWN_SECONDS} from '../src/creatures.js';

test('two favorite treats or three ordinary treats make friends',()=>{
  assert.equal(feedTrust(feedTrust(0,'berry','berry'),'berry','berry'),100);
  assert.equal(feedTrust(feedTrust(0,'berry','star'),'berry','star'),72);
  assert.equal(feedTrust(72,'berry','nectar'),100);
  assert.equal(feedTrust(90,'berry','berry'),100);
});
test('a creature has exactly 12 seconds to be captured, then settles back',()=>{
  let state=tickDistraction(100,DISTRACTION_SECONDS,11.95);
  assert.equal(state.trust,100);
  assert.ok(state.seconds>0);
  state=tickDistraction(state.trust,state.seconds,.1);
  assert.equal(state.seconds,0);
  assert.equal(state.trust,0);
  assert.equal(tickDistraction(60,0,1).trust,60);
  assert.equal(RESPAWN_SECONDS,17);
});
