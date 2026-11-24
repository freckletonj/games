import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const phaser=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
const legacy=readFileSync(new URL('../../src/games/animal-adventure/game.js',
  import.meta.url),'utf8');

// Both renderers handle every chapter's key through one common pickup branch.
// Keeping these checks at the actual pickup sites prevents an event or puzzle
// requirement from silently making a reachable key uncollectible.
function pickupBranch(source,start,end){
  const from=source.indexOf(start);
  assert.ok(from>=0,start+' must exist');
  const until=source.indexOf(end,from+start.length);
  assert.ok(until>from,end+' must follow the key branch');
  return source.slice(from+start.length,until);
}

test('Phaser keys are collectible on contact in every chapter, regardless of puzzles',()=>{
  const block=pickupBranch(phaser,
    "}else if(item.kind===this.chapter.key){",
    "}else if(item.kind==='exit'");
  assert.match(block,/^\s*item\.used=true;item\.visual\.destroy\(\)/);
  assert.match(block,/this\.shared\.relic=true/);
  assert.doesNotMatch(block,/\b(?:if|continue|return)\b/);
  assert.doesNotMatch(block,/puzzle|boulder|seal/i);
});

test('legacy chapter gems are collectible without challenge or trial completion',()=>{
  const block=pickupBranch(legacy,
    'else if(goalKinds.has(item.kind)){',
    "else if(item.kind==='starShard')");
  assert.match(block,/^\s*WW\.audio\.play\('gem'\);item\.used=true;shared\.keys\[item\.kind\]=true/);
  assert.doesNotMatch(block,/\b(?:if|continue|return)\b/);
  assert.doesNotMatch(block,/challenge|sprint|trail|emberkit/i);
});
