// Verify that every AI art job matches the renderer's native 16:9 viewport,
// includes both a clean geometry mask and an annotated composition guide,
// and is connected to the deterministic level compiler.
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

const designs=JSON.parse(readFileSync('src/games/animal-adventure/designs.json','utf8'));
const output=JSON.parse(readFileSync('dist/art-jobs.json','utf8'));
const count=Object.values(designs).reduce((n,d)=>n+d.sections.length,0);
assert.equal(output.version,1);
assert.ok(output.jobs.length>=count,'Each challenge needs at least one art camera');
assert.ok(output.jobs.some(job=>job.view==='upper'&&job.biome==='summit'),
  'Aerial chapters need an elevated camera mask');
for(const job of output.jobs){
  assert.deepEqual(Object.keys(job.viewport),['x','y','width','height']);
  assert.equal(job.viewport.width,480);
  assert.equal(job.viewport.height,270);
  assert.equal(job.output.width,960);
  assert.equal(job.output.height,540);
  assert.ok(job.backgroundPrompt.includes(job.biome));
  assert.ok(job.foregroundPrompt.includes(job.challenge));
  const mask='dist/'+job.mask,annotated='dist/'+job.annotated;
  assert.ok(existsSync(mask)&&existsSync(annotated),job.id+' missing mask');
  const a=readFileSync(mask,'utf8'),b=readFileSync(annotated,'utf8');
  assert.ok(a.includes('<polygon') && a.includes('viewBox="'));
  assert.ok(!a.includes('<text '),'Diffusion masks must not contain UI or labels');
  assert.ok(!a.includes('NaN')&&!b.includes('NaN'));
}
console.log('PASS: '+output.jobs.length+' camera-locked art masks and image prompts');
