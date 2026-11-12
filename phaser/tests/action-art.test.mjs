import test from 'node:test';
import assert from 'node:assert/strict';
import {EFFECT_FRAMES,paintedAction,powerFrame,setpieceFrame,enemyTellFrame,
  paintedFootOrigin,PROP_FEET,SETPIECE_FEET,ILLUSTRATION_FRAME_HEIGHT}
  from '../src/action-art.js';

const species=['springaroo','tideling','skyling','mossback','prismtail',
  'glimmermoth','cloudwhisp','emberkit'];

test('all power effects select an authored frame from the original painted atlas',()=>{
  assert.deepEqual(Object.values(EFFECT_FRAMES),[0,1,2,3,4,5,6,7]);
  for(const kind of species){
    assert.ok(Number.isInteger(powerFrame(kind)),kind);
    assert.ok(powerFrame(kind)>=0&&powerFrame(kind)<8,kind);
  }
  assert.equal(powerFrame('prismtail'),EFFECT_FRAMES.bubble);
  assert.equal(powerFrame('mossback'),EFFECT_FRAMES.honey);
  assert.equal(powerFrame('skyling'),EFFECT_FRAMES.gust);
  assert.equal(powerFrame('tideling'),EFFECT_FRAMES.splash);
  assert.equal(setpieceFrame('bounceBloom'),EFFECT_FRAMES.petal,
    'Springboards must not display the trapped-creature bubble artwork');
  assert.equal(setpieceFrame('bubbleVent'),EFFECT_FRAMES.bubble);
  assert.equal(enemyTellFrame('prismtail'),EFFECT_FRAMES.bubble);
  assert.equal(enemyTellFrame('emberkit'),EFFECT_FRAMES.spark);
  assert.equal(enemyTellFrame('springaroo'),null);
});

test('each species uses its own illustrated feeding pose and hero has real sleep art',()=>{
  assert.deepEqual(species.map(s=>paintedAction(s,'eat')?.frame),
    [0,1,2,3,4,5,6,7]);
  assert.equal(paintedAction('hero','sleep')?.frame,8);
  for(const s of species)
    assert.equal(paintedAction(s,'run'),null,'Run uses the original moving atlas');
  assert.equal(paintedAction('hero','eat'),null);
});

test('illustrated prop and setpiece baselines stay planted on authored ground',()=>{
  assert.equal(ILLUSTRATION_FRAME_HEIGHT,270);
  for(const [kind,bottom] of Object.entries({...PROP_FEET,...SETPIECE_FEET})){
    const origin=paintedFootOrigin(kind);
    assert.ok(origin>0.5&&origin<1,kind);
    assert.ok(Math.abs(origin*270-bottom)<1e-7,kind);
  }
  assert.equal(paintedFootOrigin('snack'),229/270);
  assert.equal(paintedFootOrigin('checkpoint'),243/270);
  assert.equal(paintedFootOrigin('exit'),246/270);
  assert.equal(paintedFootOrigin('bounceBloom'),162/270);
  assert.equal(paintedFootOrigin('starShard'),1,
    'Floating collectible stars deliberately keep their original pivot');
});
