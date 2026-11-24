import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOUNTS,LOCATIONS} from '../src/mounts.js';

const base=new URL('../../src/assets/characters/',import.meta.url);
test('mount clips reference painted frames and their matching saddle anchors',()=>{
  const rider=JSON.parse(readFileSync(new URL('../assets/generated/riders.json',import.meta.url)));
  for(const kind of Object.keys(MOUNTS)){
    const manifest=JSON.parse(readFileSync(new URL(kind+'/manifest.json',base)));
    const image=readFileSync(new URL(kind+'/'+manifest.image,base));
    assert.equal(image.toString('ascii',8,16),'WEBPVP8X');
    const width=1+image.readUIntLE(24,3);
    const height=1+image.readUIntLE(27,3);
    const frameCount=width/manifest.frameWidth*height/manifest.frameHeight;
    assert.equal(width,manifest.columns*manifest.frameWidth);
    assert.equal(manifest.seats.length,frameCount);
    assert.equal(manifest.riderFrames.length,frameCount);
    for(const clip of Object.values(manifest.animations)){
      for(const frame of clip.frames){
        const [x,y]=manifest.seats[frame];
        assert.ok(Math.abs(x)<manifest.frameWidth/2&&y<0&&y>=-manifest.origin.y);
        const riderFrame=manifest.riderFrames[frame];
        assert.ok(Number.isInteger(riderFrame)&&riderFrame>=0&&riderFrame<rider.columns);
      }
    }
    assert.equal(new Set(manifest.animations.run.frames).size,4);
    assert.equal(new Set(manifest.animations.jump.frames).size,2);
    if(kind==='pegasus')assert.equal(new Set(manifest.animations.flap.frames).size,4);
  }
});
test('the two mounts are present in compatible world chapters',()=>{
  assert.ok(LOCATIONS['first-forest'].some(([kind])=>kind==='unicorn'));
  assert.ok(LOCATIONS['starfall-summit'].some(([kind])=>kind==='pegasus'));
  assert.ok(LOCATIONS['cloud-gardens'].some(([kind])=>kind==='pegasus'));
  assert.ok(!Object.keys(MOUNTS).some(kind=>kind==='springaroo'));
});
