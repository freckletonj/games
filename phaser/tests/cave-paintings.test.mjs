import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {compileCave} from '../src/cave-layout.js';
import {caveArtManifest} from '../src/cave-art-guide.js';

test('one local static painting ships as a valid WebP, separate from game actors',()=>{
  const here=dirname(fileURLToPath(import.meta.url));
  const image=readFileSync(resolve(here,
    '../assets/generated/luminous-grotto-rock.webp'));
  assert.equal(image.toString('ascii',0,4),'RIFF');
  assert.equal(image.toString('ascii',8,12),'WEBP');
  assert.ok(image.length>20000);
  const manifest=caveArtManifest(compileCave());
  assert.equal(manifest.schema,'wonderwood-single-image-cave-v1');
  assert.equal(manifest.dynamicExcluded,true);
  assert.equal(Object.hasOwn(manifest,'chunks'),false);
  assert.equal(Object.hasOwn(manifest,'planes'),false);
});
