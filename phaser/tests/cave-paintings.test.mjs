import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {compileCave,caveContainsWater} from '../src/cave-layout.js';
import {caveArtManifest} from '../src/cave-art-guide.js';
import {caveArtworkCrop} from '../src/cave-renderer.js';

const here=dirname(fileURLToPath(import.meta.url));
const asset=name=>readFileSync(resolve(here,'../assets/generated/'+name));

test('AI-generated static cave paintings are shipped locally as valid WebP assets',()=>{
  for(const name of ['luminous-grotto-rock.webp','luminous-grotto-ambient.webp']){
    const image=asset(name);
    assert.ok(image.length>20000,name+' must contain real painted image data');
    assert.equal(image.toString('ascii',0,4),'RIFF');
    assert.equal(image.toString('ascii',8,12),'WEBP');
  }
});

test('painting source crops cover the physical cave without gaps or repeating tiles',()=>{
  const level=compileCave();
  const {chunks}=caveArtManifest(level,{chunkCells:48,overlapCells:0});
  let physicalX=0,sourceX=0;
  for(const chunk of chunks){
    const crop=caveArtworkCrop(chunk,level,1280,720);
    assert.equal(chunk.pixelBounds.x,physicalX);
    assert.ok(Math.abs(crop.x-sourceX)<1e-8);
    assert.ok(crop.width>0);
    assert.equal(crop.y,0);
    assert.equal(crop.height,720);
    sourceX=crop.x+crop.width;
    physicalX+=chunk.pixelBounds.width;
  }
  assert.equal(physicalX,level.width*16);
  assert.equal(sourceX,1280);
});

test('painted water is still governed by water-body collision geometry',()=>{
  const level=compileCave();
  for(const chamber of level.waterBodies){
    const x=(chamber.start+chamber.end)*8;
    assert.equal(caveContainsWater(level,x,chamber.surface*16+12),true);
    assert.equal(caveContainsWater(level,x,chamber.surface*16-12),false);
    assert.equal(caveContainsWater(level,x,level.cave.groundAt(x)+12),false);
  }
});
