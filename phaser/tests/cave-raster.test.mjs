import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {compileCave} from '../src/cave-layout.js';
import {caveArtManifest} from '../src/cave-art-guide.js';
import {caveGuidePng} from '../scripts/cave-png.mjs';

function decodeGuide(bytes){
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  const imageSize=width*4+1;
  let offset=8,data=null;
  while(offset<bytes.length){
    const length=bytes.readUInt32BE(offset);
    const type=bytes.toString('ascii',offset+4,offset+8);
    if(type==='IDAT')data=bytes.subarray(offset+8,offset+8+length);
    offset+=12+length;
  }
  const pixels=inflateSync(data);
  assert.equal(pixels.length,imageSize*height);
  const at=(x,y)=>Array.from(pixels.subarray(y*imageSize+1+x*4,
    y*imageSize+5+x*4));
  return {width,height,at};
}

test('whole-level bitmap contains the exact semantic cave roof, water and floor',()=>{
  const level=compileCave();
  const image=decodeGuide(caveGuidePng(level));
  assert.equal(image.width,2560);
  assert.equal(image.height,992);
  assert.deepEqual(image.at(2,100),[128,92,119,255]);
  assert.deepEqual(image.at(2,520),[24,45,64,255]);
  assert.deepEqual(image.at(2,900),[128,92,119,255]);
  assert.deepEqual(image.at(40*16,37*16),[35,136,175,255]);
  assert.deepEqual(image.at(15*16,37*16),[24,45,64,255]);
});

test('2x chunk guide stays at exactly the same world coordinates',()=>{
  const level=compileCave(),chunks=caveArtManifest(level).chunks;
  const c=chunks[1];
  const image=decodeGuide(caveGuidePng(level,{
    from:c.from,to:c.to,scale:2
  }));
  assert.equal(image.width,(c.to-c.from)*32);
  assert.equal(image.height,1984);
  const localX=(50-c.from)*32,localY=37*32;
  assert.deepEqual(image.at(localX,localY),[35,136,175,255]);
});

test('foreground image mask leaves playable air transparent',()=>{
  const level=compileCave();
  const image=decodeGuide(caveGuidePng(level,{
    from:0,to:48,layer:'foreground-occlusion'
  }));
  assert.equal(image.at(0,400)[3],0);
  assert.equal(image.at(0,100)[3],220);
});
