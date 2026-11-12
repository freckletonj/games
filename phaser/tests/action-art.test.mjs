import test from 'node:test';
import assert from 'node:assert/strict';
import {EFFECT_FRAMES,paintedAction,powerFrame,setpieceFrame}
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
});

test('each species uses its own illustrated feeding pose and hero has real sleep art',()=>{
  assert.deepEqual(species.map(s=>paintedAction(s,'eat')?.frame),
    [0,1,2,3,4,5,6,7]);
  assert.equal(paintedAction('hero','sleep')?.frame,8);
  for(const s of species)
    assert.equal(paintedAction(s,'run'),null,'Run uses the original moving atlas');
  assert.equal(paintedAction('hero','eat'),null);
});
