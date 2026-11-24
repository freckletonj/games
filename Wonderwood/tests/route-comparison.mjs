// Verify feedback comparisons distinguish progress improvements from regressions.
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync,unlinkSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
mkdirSync('dist',{recursive:true});
const a='dist/__route_before.json',b='dist/__route_after.json';
const section=(id,crossed,furthestProgress)=>({id,crossed,furthestProgress,notes:[]});
writeFileSync(a,JSON.stringify({worlds:[{id:'meadow',sections:[
  section('pond',false,.3),section('canopy',true,.9),section('trail',false,.4)
]}]}));
writeFileSync(b,JSON.stringify({worlds:[{id:'meadow',sections:[
  section('pond',false,.62),section('canopy',false,.5),
  section('trail',false,.4),section('new-route',true,1)
]}]}));
execFileSync(process.execPath,['scripts/compare-route-reports.mjs',a,b],{stdio:'pipe'});
const result=JSON.parse(readFileSync('dist/route-comparison.json','utf8'));
assert.deepEqual(result.summary,{improved:1,regressed:1,unchanged:1,added:1,removed:0});
assert.ok(result.changes.some(c=>c.section==='meadow/pond'&&c.delta>.3));
assert.ok(result.changes.some(c=>c.section==='meadow/canopy'&&c.verdict==='regressed'));
unlinkSync(a);unlinkSync(b);unlinkSync('dist/route-comparison.json');
console.log('PASS: stable local challenge progression and route regression comparison');
