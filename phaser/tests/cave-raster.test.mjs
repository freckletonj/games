import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {compileCave,skywellLayout} from '../src/cave-layout.js';
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

test('one authored static layer has alpha only where geometry is physical',()=>{
  const level=compileCave(skywellLayout),range={from:24,to:31};
  const full=bitmap(caveGuidePng(level,range));
  const solids=bitmap(caveGuidePng(level,{...range,layer:'static-solid'}));
  const water=bitmap(caveGuidePng(level,{...range,layer:'static-water'}));
  assert.deepEqual([solids.w,solids.h],[112,2048]);
  assert.deepEqual([water.w,water.h],[112,2048]);
  assert.deepEqual(solids.at(0,100),[128,92,119,255]);
  assert.deepEqual(solids.at(0,1200),[0,0,0,0],
    'air stays genuinely transparent, not a dimmed version of the model');
  assert.deepEqual(water.at(0,1200),[0,0,0,0]);
  assert.deepEqual(water.at(0,1650),[35,136,175,255]);
  assert.deepEqual(solids.at(0,1650),[0,0,0,0]);
  assert.deepEqual(solids.at((28-24)*16,1600),[255,157,99,255],
    'climbing wall is part of the *same* static scene, not a sprite overlay');
  assert.deepEqual(water.at((28-24)*16,1600),[0,0,0,0]);
  assert.deepEqual(solids.at(16,99*16+8),[246,196,118,255],
    'one-way shelves have a visible stone body beneath their collision top');

  for(let y=0;y<full.h;y+=7)for(let x=0;x<full.w;x+=3){
    const solid=solids.at(x,y),wet=water.at(x,y),guide=full.at(x,y);
    assert.ok(!(solid[3]&&wet[3]),'no pixel can be rock and water');
    if(solid[3])assert.deepEqual(solid,guide);
    if(wet[3])assert.deepEqual(wet,guide);
  }
});

test('transparent layer raster is permitted only for explicit materials',()=>{
  const level=compileCave(skywellLayout);
  assert.throws(()=>caveGuidePng(level,{layer:'distant-arches'}),
    /Invalid cave guide/);
});
