import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {compileCave,skywellLayout} from '../src/cave-layout.js';
import {caveArtManifest} from '../src/cave-art-guide.js';

test('Luminous Grotto ships one registered high-resolution painting',()=>{
  const here=dirname(fileURLToPath(import.meta.url));
  const catalog=JSON.parse(readFileSync(resolve(here,'../assets/generated/approved-scene-art.json')));
  const manifest=caveArtManifest(compileCave());
  assert.deepEqual(catalog['luminous-grotto'].scene,[manifest.painting]);
  const image=readFileSync(resolve(here,'../../',manifest.painting));
  assert.equal(image.toString('ascii',8,16),'WEBPVP8 ');
  const width=image.readUInt16LE(26)&0x3fff;
  const height=image.readUInt16LE(28)&0x3fff;
  assert.deepEqual([width,height],[3000,1680]);
  assert.equal(width*manifest.world.height,height*manifest.world.width);
  assert.ok(image.length>20000);
  assert.equal(manifest.schema,'wonderwood-physics-painted-cave-v2');
  assert.equal(manifest.dynamicExcluded,true);
  assert.equal(Object.hasOwn(manifest,'chunks'),false);
  assert.equal(Object.hasOwn(manifest,'planes'),false);
});

test('chosen Ancient Sanctuary painting is a real native-alpha, world-aligned three-layer asset',()=>{
  const here=dirname(fileURLToPath(import.meta.url));
  const root=resolve(here,'../assets/generated');
  const catalog=JSON.parse(readFileSync(resolve(root,'approved-scene-art.json')));
  const selected=catalog['skywell-ascent'];
  assert.ok(selected);
  assert.equal(selected.backgroundScrollFactor,1,
    'one global composition may not parallax against its collider');
  const provenance=JSON.parse(readFileSync(resolve(
    root,'skywell-ancient/art-provenance.json')));
  assert.deepEqual(provenance.sourcePixels,[1644,957]);
  assert.deepEqual(provenance.refinement.pixels,[3520,2048]);
  assert.deepEqual(provenance.worldPixels,[3520,2048]);
  assert.equal(provenance.geometry,'compileCave(skywellLayout)');
  assert.deepEqual(Object.keys(selected).sort(),[
    'background','backgroundScrollFactor','solid','water'
  ]);
  for(const material of ['background','water','solid']){
    const bytes=readFileSync(resolve(here,'../../',selected[material]));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.equal(bytes.toString('ascii',12,16),'VP8X',
      'transparent material image must use an alpha-enabled WebP container');
    assert.ok((bytes[20]&16)>0,'WebP alpha feature flag required');
    assert.equal(bytes.readUIntLE(24,3)+1,3520);
    assert.equal(bytes.readUIntLE(27,3)+1,2048);
    assert.ok(bytes.length>20000,material+' is missing actual painted pixels');
  }
  const source=readFileSync(resolve(root,'skywell-ancient/skywell-ancient-source.webp'));
  assert.equal(source.toString('ascii',12,16),'VP8 ');
  assert.equal(source.readUInt16LE(26)&0x3fff,1644);
  assert.equal(source.readUInt16LE(28)&0x3fff,957);
  const refined=readFileSync(resolve(here,'../../',provenance.refinement.source));
  assert.equal(refined.toString('ascii',12,16),'VP8 ');
  assert.equal(refined.readUInt16LE(26)&0x3fff,3520);
  assert.equal(refined.readUInt16LE(28)&0x3fff,2048);
});
