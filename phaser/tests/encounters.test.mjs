import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {encounter,validateEncounters} from '../src/encounters.js';
import meadow from '../levels/first-forest.json' with {type:'json'};

const root=new URL('../../',import.meta.url);

test('three reusable encounters validate on the actual semantic meadow',()=>{
  assert.deepEqual(meadow.sections.map(s=>s.prefab),
    ['befriend-creature','ability-ascent','rest-and-exit']);
  assert.equal(validateEncounters(meadow),true);
  const context={};context.window=context;vm.createContext(context);
  vm.runInContext(readFileSync(new URL(
    'src/platform/world-compiler.js',root),'utf8'),context);
  const world=context.WW.worldCompiler.compile(meadow);
  assert.equal(world.width,148);
  assert.ok(world.objects.some(o=>o.kind==='springKey'));
  assert.ok(world.objects.some(o=>o.kind==='exit'));
});

test('unknown prefab and absent prerequisite are rejected',()=>{
  assert.throws(()=>encounter('unknown','x',[0,12],{}),/Unknown encounter/);
  const broken=structuredClone(meadow);
  broken.creatures=broken.creatures.filter(([kind])=>kind!=='springaroo');
  // Keep the introductory encounter's reward valid so this checks the
  // next encounter's prerequisite independently of reward validation.
  broken.sections[0].reward='glimmermoth';
  assert.throws(()=>validateEncounters(broken),/needs springaroo/);
});

test('reject gaps, invalid recovery, misleading routes and missing rewards',()=>{
  const gap=structuredClone(meadow);
  gap.sections[1].range[0]=62;
  assert.throws(()=>validateEncounters(gap),/contiguous/);
  const noCheckpoint=structuredClone(meadow);
  noCheckpoint.sections[1].recovery=80;
  assert.throws(()=>validateEncounters(noCheckpoint),/checkpoint/);
  const impossible=structuredClone(meadow);
  impossible.sections[1].expectedRoute=[72,120,107];
  assert.throws(()=>validateEncounters(impossible),/route/);
  const noRelic=structuredClone(meadow);
  noRelic.relic=['springKey',142,19];
  assert.throws(()=>validateEncounters(noRelic),/reward is outside/);
});
