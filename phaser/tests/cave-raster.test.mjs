import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {compileCave} from '../src/cave-layout.js';
import {caveGuidePng} from '../scripts/cave-png.mjs';

function bitmap(bytes){
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
  const row=w*4+1;
  let offset=8,data;
  while(offset<bytes.length){
    const size=bytes.readUInt32BE(offset);
    if(bytes.toString('ascii',offset+4,offset+8)==='IDAT')
      data=bytes.subarray(offset+8,offset+8+size);
    offset+=12+size;
  }
  const pixels=inflateSync(data);
  assert.equal(pixels.length,row*h);
  return {w,h,at:(x,y)=>Array.from(pixels.subarray(
    y*row+1+x*4,y*row+5+x*4))};
}

test('a single PNG guide encodes the same smooth static physics at full size',()=>{
  const level=compileCave(),image=bitmap(caveGuidePng(level));
  assert.deepEqual([image.w,image.h],[3200,1792]);
  assert.deepEqual(image.at(0,100),[128,92,119,255]);
  assert.deepEqual(image.at(0,650),[24,45,64,255]);
  assert.deepEqual(image.at(0,1500),[128,92,119,255]);
  assert.deepEqual(image.at(900,1100),[35,136,175,255]);
  assert.deepEqual(image.at(2100,1100),[35,136,175,255]);
  assert.deepEqual(image.at(1490,1100),[128,92,119,255]);
  assert.deepEqual(image.at(500,200),[128,92,119,255]);
});
