import test from 'node:test';
import assert from 'node:assert/strict';
import {PROGRESS_KEY,emptyProgress,readProgress,playChapter,completeChapter,writeProgress}
  from '../src/progress.js';

const chapters=['first-forest','crystal-coast','starfall-summit',
  'willow-wetlands','cloud-gardens'];
const storage=()=>({
  value:null,
  getItem(key){assert.equal(key,PROGRESS_KEY);return this.value;},
  setItem(key,value){assert.equal(key,PROGRESS_KEY);this.value=value;}
});

test('campaign progress survives a storage round trip and keeps best shards',()=>{
  const disk=storage();
  const initial=readProgress(disk,chapters);
  assert.deepEqual(initial,emptyProgress(chapters));
  let played=playChapter(initial,'first-forest');
  played=completeChapter(played,'first-forest',3);
  played=completeChapter(played,'first-forest',2);
  played=playChapter(played,'crystal-coast');
  writeProgress(disk,played);
  const resumed=readProgress(disk,chapters);
  assert.deepEqual(resumed.completed,['first-forest']);
  assert.equal(resumed.bestShards['first-forest'],3);
  assert.equal(resumed.lastPlayed,'crystal-coast');
  assert.equal(initial.completed.length,0,'Changes must not mutate old state');
});

test('saved progress only restores valid chapter ids and nonnegative shard counts',()=>{
  const disk=storage();
  disk.value=JSON.stringify({version:1,completed:['bad','first-forest','first-forest'],
    bestShards:{'first-forest':-3,'crystal-coast':7,bogus:99},
    lastPlayed:'missing-chapter'});
  const progress=readProgress(disk,chapters);
  assert.deepEqual(progress.completed,['first-forest']);
  assert.deepEqual(progress.bestShards,{'crystal-coast':7});
  assert.equal(progress.lastPlayed,'first-forest');
  disk.value=JSON.stringify({version:123,completed:['first-forest']});
  assert.deepEqual(readProgress(disk,chapters),emptyProgress(chapters));
});
