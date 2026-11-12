import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCave,caveLayout,caveContainsWater,caveCeilingHit} from '../src/cave-layout.js';
import {caveMaskSvg,caveArtManifest} from '../src/cave-art-guide.js';

test('cave contours share the collision geometry used to paint the guide',()=>{
  const level=compileCave();
  const svg=caveMaskSvg(level,{from:0,to:48});
  assert.equal(level.width,160);
  assert.equal(level.objects.find(o=>o.kind==='p1').x,4);
  assert.ok(svg.includes('viewBox="0 0 768 992"'));
  assert.ok(svg.includes('0.0,656.0')); // floor start: 41 * 16
  assert.ok(svg.includes('0.0,400.0')); // ceiling start: 25 * 16
  assert.ok(svg.includes('464.0,576.0')); // water start: x29, y36
  assert.ok(!svg.includes('tideling'));
  assert.ok(!svg.includes('starShard'));
  assert.ok(!svg.includes('p1'));
  assert.equal(level.cave.groundAt(0),41*16);
  assert.equal(level.cave.ceilingAt(0),15*16);
});

test('water is a bounded polygon, not a column suspended beyond rock',()=>{
  const level=compileCave();
  assert.equal(caveContainsWater(level,40*16,37*16),true);
  assert.equal(caveContainsWater(level,40*16,30*16),false);
  assert.equal(caveContainsWater(level,15*16,39*16),false);
  assert.equal(caveContainsWater(level,40*16,49*16),false);
  assert.equal(caveCeilingHit(level,20*16,10*16),true);
  assert.equal(caveCeilingHit(level,20*16,25*16),false);
});

test('seam overlap is explicit, art layers share the same chunk coordinates',()=>{
  const level=compileCave();
  const manifest=caveArtManifest(level,{chunkCells:48,overlapCells:4});
  assert.deepEqual(manifest.chunks.map(c=>[c.from,c.to]),
    [[0,48],[44,92],[88,136],[132,160]]);
  assert.equal(manifest.dynamicExcluded,true);
  for(const chunk of manifest.chunks)for(const plane of manifest.planes){
    const svg=caveMaskSvg(level,{from:chunk.from,to:chunk.to,layer:plane.id});
    assert.ok(svg.includes('viewBox="'+chunk.from*16+' 0 '+
      (chunk.to-chunk.from)*16+' 992"'));
    assert.ok(!svg.includes('starShard'));
  }
});

test('invalid polygons, intersecting shelves and pools fail validation',()=>{
  assert.throws(()=>compileCave({...caveLayout,
    ceiling:[[0,40],[160,40]]}),/clearance/);
  assert.throws(()=>compileCave({...caveLayout,
    pools:[...caveLayout.pools,{id:'bad',from:62,to:98,surface:39}]}),
    /water chamber|Overlapping/);
  assert.throws(()=>compileCave({...caveLayout,
    shelves:[{x:40,y:50,length:4}]}),/Shelf intersects/);
});
