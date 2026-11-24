import test from 'node:test';
import assert from 'node:assert/strict';
import {landingY,orbHitsAnimal} from '../src/physics.js';

const platform=[{kind:'platform',x:8,y:15,length:8}];
test('land on walkable slopes without floating over downward ramps',()=>{
  assert.equal(landingY(200,201,0.5,true,25,206,[],16),206);
  assert.equal(landingY(200,201,0.5,true,25,195,[],16),195);
  assert.equal(landingY(180,191,6,false,25,200,[],16),null);
  assert.equal(landingY(199,203,4,false,25,201,[],16),201);
});
test('one-way ledges catch from above and never from below',()=>{
  assert.equal(landingY(239,244,5,false,150,400,platform),240);
  assert.equal(landingY(251,253,2,false,150,400,platform),null);
  assert.equal(landingY(245,236,-9,false,150,400,platform),null);
  assert.equal(landingY(238,245,7,false,100,400,platform),null);
});
test('swept capture orb cannot miss a ready creature on a slow frame',()=>{
  assert.equal(orbHitsAnimal(78,590,114,594,100,609),true);
  assert.equal(orbHitsAnimal(78,590,114,594,100,670),false);
  assert.equal(orbHitsAnimal(78,590,114,594,160,609),false);
  assert.equal(orbHitsAnimal(95,596,95,596,100,609),true);
});
