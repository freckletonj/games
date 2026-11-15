import test from 'node:test';
import assert from 'node:assert/strict';
import {BLOOM_COOLDOWN,bloomFrame} from '../src/springboard.js';
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
  assert.equal(setpieceFrame('bubbleVent'),EFFECT_FRAMES.bubble);
  assert.equal(enemyTellFrame('prismtail'),EFFECT_FRAMES.bubble);
  assert.equal(enemyTellFrame('emberkit'),EFFECT_FRAMES.spark);
  assert.equal(enemyTellFrame('springaroo'),null);
});

test('feeding stays in the actor atlas and each playable form has fainted art',()=>{
  const forms=['hero','princess','steampunk',...species,'gravelback','flintfist'];
  const fainted=forms.map(form=>paintedAction(form,'sleep'));
  assert.ok(fainted.every(art=>art.texture==='fainted'));
  assert.equal(new Set(fainted.map(art=>art.frame)).size,forms.length);
  for(const form of forms)assert.equal(paintedAction(form,'eat'),null);
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
  assert.equal(paintedFootOrigin('honeyPuddle'),241/270);
  assert.equal(paintedFootOrigin('starShard'),1,
    'Floating collectible stars deliberately keep their original pivot');
});


test('the bloom plays rooted squash and release frames before resuming its idle loop',()=>{
  assert.deepEqual([0,.15,.25,.35].map(t=>bloomFrame(0,BLOOM_COOLDOWN-t)),[4,5,6,7]);
  assert.equal(bloomFrame(1,0),3);
});


test('the three explorer float rows share a waterline and distinct four-frame clips',()=>{
  const floaters=['hero','princess','steampunk'].map(kind=>paintedAction(kind,'float'));
  assert.deepEqual(floaters.map(art=>art.frame),[0,4,8]);
  for(const art of floaters){
    assert.equal(art.texture,'floaters');
    assert.equal(art.originY,190/256);
    assert.deepEqual(art.clip.frames,[0,1,2,3]);
  }
  assert.equal(paintedAction('tideling','float'),null);
});
