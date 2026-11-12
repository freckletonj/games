import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../',import.meta.url);
const designs = JSON.parse(readFileSync(new URL('src/games/animal-adventure/designs.json',root),'utf8'));
const scope = {};
scope.window = scope;
vm.createContext(scope);
vm.runInContext(readFileSync(new URL('src/platform/world-compiler.js',root),'utf8'),scope);
test('all five canonical levels compile for the Phaser renderer',()=>{
  assert.equal(Object.keys(designs).length,5);
  for(const [id,spec] of Object.entries(designs)){
    const level=scope.WW.worldCompiler.compile(spec);
    assert.equal(level.width,spec.width,id);
    assert.equal(level.surface.length,level.width+1,id);
    assert.ok(level.objects.some(o=>o.kind==='p1'),id);
    assert.ok(level.objects.some(o=>o.kind===spec.relic[0]),id);
    assert.ok(level.objects.some(o=>o.kind==='exit'),id);
    assert.ok(level.platformSegments.length>0,id);
  }
});
