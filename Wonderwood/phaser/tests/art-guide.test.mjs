import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {artGuide} from '../src/art-guide.js';
import {artGuidePng} from '../scripts/art-guide-png.mjs';

test('exported art masks preserve compiler coordinates without mutating gameplay',()=>{
  const level={
    width:4,height:50,biome:'meadow',surface:[30,31,30,29,28],
    waterBodies:[{start:1,end:3,surface:28}],
    platformSegments:[{kind:'platform',x:1,y:24,length:2}],
    objects:[{kind:'p1',x:0,y:29},{kind:'springaroo',x:2,y:27}],
    goalRoute:[[1,24],[2,23]],vistas:[],sections:[]
  };
  const before=JSON.stringify(level);
  const guide=artGuide(level,{id:'first-forest',name:'Mosslight Meadow'});
  assert.deepEqual(guide.data.platforms,[{x:16,y:384,width:32}]);
  assert.equal(guide.data.width,64);
  assert.equal(guide.data.height,800);
  assert.ok(guide.svg.includes('id="solid-terrain"'));
  assert.ok(guide.svg.includes('id="swim-water"'));
  assert.ok(guide.svg.includes('id="collision-platform-tops"'));
  assert.ok(guide.svg.includes('x="16" y="384"'));
  assert.ok(guide.svg.includes('data-kind="springaroo" cx="40"'));
  const png=artGuidePng(level,guide.data);
  assert.equal(png.readUInt32BE(16),64);
  assert.equal(png.readUInt32BE(20),800);
  const rows=inflateSync(png.subarray(41,41+png.readUInt32BE(33)));
  const pixel=(x,y)=>{
    const offset=y*(64*4+1)+1+x*4;
    return [...rows.subarray(offset,offset+4)];
  };
  assert.deepEqual(pixel(8,472),[24,45,64,255]);
  assert.deepEqual(pixel(8,488),[246,244,239,255]);
  assert.deepEqual(pixel(24,456),[32,173,198,255]);
  assert.deepEqual(pixel(24,384),[248,181,70,255]);
  assert.equal(JSON.stringify(level),before);
});
