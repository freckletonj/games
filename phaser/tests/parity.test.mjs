import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {meadowDesign} from '../src/meadow-design.js';
import {bindings} from '../src/input.js';

const root=new URL('../../',import.meta.url);
const originals=JSON.parse(readFileSync(new URL('src/games/animal-adventure/designs.json',root),'utf8'));
const meadow=meadowDesign(originals['first-forest']);
const species=new Set(['springaroo','tideling','skyling','mossback','prismtail',
  'glimmermoth','cloudwhisp','emberkit']);
test('all eight catchable species remain authored in the canonical campaign',()=>{
  const encountered=new Set(Object.values(originals).flatMap(level=>level.creatures.map(([kind])=>kind)));
  assert.deepEqual([...encountered].sort(),[...species].sort());
});
test('all five chapters introduce their mandatory traversal form before the light',()=>{
  const required={springKey:'springaroo',diveKey:'tideling',skyKey:'skyling'};
  for(const [name,source] of Object.entries(originals)){
    const design=name==='first-forest'?meadow:source;
    const form=required[design.relic[0]];
    assert.ok(form,name+' relic ability');
    assert.ok(design.creatures.some(([kind,x])=>kind===form&&x<design.relic[1]),
      name+' must offer '+form+' before the light');
  }
});
test('first meadow light is within the real two-jump elevation envelope',()=>{
  const ledge=meadow.ledges.find(([x,y,w])=>x<=106&&x+w>106&&y===24);
  assert.ok(ledge);
  const heightWorld=(ledge[1]-meadow.relic[2])*16;
  const jump1=5.4**2/(2*.34);
  const jump2=6.6**2/(2*.34);
  assert.ok(heightWorld<jump1+jump2-10,'leave a margin for human timing');
});
test('the two standard controller layouts retain all essential game actions',()=>{
  for(const keys of bindings)
    for(const action of ['left','right','jump','food','capture','transform','recall','revive'])
      assert.ok(keys[action].length>0,'missing '+action);
});
