import test from 'node:test';
import assert from 'node:assert/strict';
import {meadowDesign} from '../src/meadow-design.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../../',import.meta.url);
const originals=JSON.parse(readFileSync(new URL('src/games/animal-adventure/designs.json',root)));
const context={};context.window=context;
vm.createContext(context);
vm.runInContext(readFileSync(new URL('src/platform/world-compiler.js',root),'utf8'),context);
test('Mosslight Meadow is a compact, semantically valid three-act adventure',()=>{
  const spec=meadowDesign(originals['first-forest']);
  assert.equal(spec.width,148);
  assert.equal(spec.sections.length,3);
  assert.equal(spec.creatures[0][1],10);
  assert.deepEqual(spec.relic,['springKey',112,19]);
  assert.deepEqual(spec.goalRoute.at(-1),[112,19]);
  const report=context.WW.worldCompiler.analyze(spec);
  assert.deepEqual(Array.from(report.errors),[]);
  const world=context.WW.worldCompiler.compile(spec);
  assert.equal(world.width,148);
  assert.ok(world.platformSegments.length>=8);
  assert.ok(world.objects.some(item=>item.kind==='springKey'));
  assert.ok(world.objects.some(item=>item.kind==='exit'));
  assert.equal(originals['first-forest'].width,260,'Never change the legacy level design');
});
