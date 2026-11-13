import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {compileCave,skywellLayout} from '../src/cave-layout.js';
import {caveArtManifest} from '../src/cave-art-guide.js';

test('one approved static painting ships as a valid full-level PNG',()=>{
  const here=dirname(fileURLToPath(import.meta.url));
  const image=readFileSync(resolve(here,
    '../assets/generated/luminous-grotto-single.png'));
  assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(image.readUInt32BE(16),1672);
  assert.equal(image.readUInt32BE(20),941);
  assert.ok(image.length>20000);
  const manifest=caveArtManifest(compileCave());
  assert.equal(manifest.schema,'wonderwood-single-image-cave-v1');
  assert.equal(manifest.dynamicExcluded,true);
  assert.equal(Object.hasOwn(manifest,'chunks'),false);
  assert.equal(Object.hasOwn(manifest,'planes'),false);
});

test('Skywell ships the model-painted full-world WebP as a real embedded asset',()=>{
  const here=dirname(fileURLToPath(import.meta.url));
  const bytes=readFileSync(resolve(here,'../assets/generated/skywell-ascent.webp'));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(bytes.length>100000,'a placeholder tiny graphic is not production art');
  const manifest=caveArtManifest(compileCave(skywellLayout));
  assert.equal(manifest.painting,'phaser/assets/generated/skywell-ascent.webp');
  assert.equal(manifest.paintingStatus,'physics-masked-model-painting');
});
