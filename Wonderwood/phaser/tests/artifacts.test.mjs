import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
test('Phaser build script guarantees inline runtime instead of a CDN',()=>{
  const script=readFileSync(path.join(root,'phaser/scripts/build.mjs'),'utf8');
  assert.match(script,/bundle:true/);
  assert.match(script,/\.png.*dataurl/);
  assert.match(script,/javascript\+'<\/script>/);
  assert.match(script,/wonderwood-phaser\.html/);
});

test('standalone build exposes explicit loading and startup failures',()=>{
  const script=readFileSync(path.join(root,'phaser/scripts/build.mjs'),'utf8');
  assert.match(script,/ww-startup/);
  assert.match(script,/unhandledrejection/);
  assert.match(script,/Still loading/);
});
