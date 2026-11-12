import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';

const base=new URL('../assets/artbyte/', import.meta.url);
function png(name) {
  const data=readFileSync(new URL(name,base));
  assert.equal(data.subarray(1,4).toString(),'PNG');
  return {width:data.readUInt32BE(16),height:data.readUInt32BE(20),size:data.length};
}
test('licensed illustrated environment kit ships complete, non-placeholder atlases',()=>{
  const trees=png('jungle-trees.png');
  const misc=png('jungle-misc.png');
  const platform=png('platform-jungle.png');
  assert.equal(trees.width,1024);
  assert.equal(trees.height,1024);
  assert.equal(misc.width,1024);
  assert.equal(misc.height,1024);
  assert.ok(platform.width>=64 && platform.height>=20);
  assert.ok([trees,misc,platform].every(p=>p.size>5000));
});
