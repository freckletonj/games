import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {compileCave} from '../src/cave-layout.js';
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
