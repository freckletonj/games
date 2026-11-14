import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOUNTS,LOCATIONS,seatFor} from '../src/mounts.js';

const base=new URL('../../src/assets/characters/',import.meta.url);
test('both original illustrated mounts are compact, real eight-pose AVIF atlases',()=>{
  for(const kind of Object.keys(MOUNTS)){
    const manifest=JSON.parse(readFileSync(new URL(kind+'/manifest.json',base)));
    const image=readFileSync(new URL(kind+'/sheet.avif',base));
    assert.equal(manifest.frameWidth,160);
    assert.equal(manifest.frameHeight,160);
    assert.equal(manifest.columns,4);
    assert.ok(image.subarray(0,24).includes(Buffer.from('ftypavif')),
      kind+' must contain the original AVIF image');
    assert.ok(image.length>15000&&image.length<150000,kind);
    assert.deepEqual(manifest.animations.run.frames,[2,3,4,5]);
    assert.ok(manifest.animations.jump.frames.includes(6));
    for(const action of ['idle','run','jump']){
      assert.ok(Number.isFinite(manifest.seats[action].x));
      assert.ok(Number.isFinite(manifest.seats[action].y));
      assert.ok(seatFor(kind,action).y<0);
    }
  }
});
test('the two mounts are present in compatible world chapters',()=>{
  assert.ok(LOCATIONS['first-forest'].some(([kind])=>kind==='unicorn'));
  assert.ok(LOCATIONS['starfall-summit'].some(([kind])=>kind==='pegasus'));
  assert.ok(LOCATIONS['cloud-gardens'].some(([kind])=>kind==='pegasus'));
  assert.ok(!Object.keys(MOUNTS).some(kind=>kind==='springaroo'));
});
