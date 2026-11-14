import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {campaign,compileChapter,surfaceDesigns} from '../src/campaign.js';

const root=new URL('../../',import.meta.url);
const scope={};
scope.window=scope;
vm.createContext(scope);
for(const path of ['src/platform/world-compiler.js',
  'src/games/animal-adventure/chapters.js'])
  vm.runInContext(readFileSync(new URL(path,root),'utf8'),scope);
const chapters=campaign(scope.WW.chapters);
const compiler=scope.WW.worldCompiler;
const registry=JSON.parse(readFileSync(new URL(
  'phaser/assets/generated/approved-scene-art.json',root),'utf8'));

test('every playable chapter compiles and has registered art',()=>{
  assert.equal(chapters.length,7);
  assert.deepEqual(Object.keys(registry).sort(),chapters.map(chapter=>chapter.id).sort());
  for(const chapter of chapters){
    const level=compileChapter(chapter,compiler);
    assert.equal(level.surface.length,level.width+1,chapter.id);
    assert.ok(level.objects.some(o=>o.kind==='p1'),chapter.id);
    assert.ok(level.objects.some(o=>o.kind===chapter.key),chapter.id);
    assert.ok(level.objects.some(o=>o.kind==='exit'),chapter.id);
    assert.ok(level.platformSegments.length>0,chapter.id);
  }
});

test('surface paintings cover each world at 1:1 with contiguous WebP textures',()=>{
  for(const chapter of scope.WW.chapters){
    const level=compileChapter(chapter,compiler);
    let totalWidth=0;
    for(const file of registry[chapter.id].scene){
      const image=readFileSync(new URL(file,root));
      assert.equal(image.toString('ascii',8,16),'WEBPVP8 ',file);
      const width=image.readUInt16LE(26)&0x3fff;
      const height=image.readUInt16LE(28)&0x3fff;
      assert.ok(width>0&&width<=4096,file);
      assert.equal(height,level.height*16,file);
      totalWidth+=width;
    }
    assert.equal(totalWidth,level.width*16,chapter.id);
  }
});

test('surface guide classifies platform tops and ignores traversable thermals',()=>{
  const level=compileChapter({id:'cloud-gardens'},compiler);
  assert.equal(level.width,surfaceDesigns['cloud-gardens'].width);
  const ledge=level.platformSegments.find(p=>p.kind==='platform');
  const ledgeColumn=level.materialColumn(ledge.x*16+.5);
  assert.equal(ledgeColumn(ledge.y*16-.5),'air');
  assert.equal(ledgeColumn(ledge.y*16+.5),'shelf');
  const thermal=level.thermalVolumes[0];
  assert.ok(thermal);
  const airInThermal=Array.from({length:thermal.width*16},(_,x)=>
    level.materialColumn(thermal.x*16+x+.5)(thermal.y*16+.5));
  assert.ok(airInThermal.includes('air'));
  const pool=level.waterBodies[0];
  const center=level.materialColumn((pool.start+pool.end)*8);
  assert.equal(center(pool.surface*16+.5),'water');
  assert.equal(center(pool.bottom*16+.5),'rock');
});
