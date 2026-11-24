// Regression: optional diffusion-painted PNG panels must be embedded in the
// one-file offline HTML. No PNG stays in the repository or final distribution.
import assert from 'node:assert/strict';
import {writeFileSync, unlinkSync, readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const filename = 'src/assets/scenes/panels/__ci_scene_panel.png';
const sample = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y7yG8sAAAAASUVORK5CYII=';
writeFileSync(filename, Buffer.from(sample, 'base64'));
execFileSync(process.execPath, ['scripts/build.mjs'], {stdio:'inherit'});
const html = readFileSync('dist/wonderwood.html', 'utf8');
assert.ok(html.includes('"__ci_scene_panel":"data:image/png;base64,' + sample),
  'The optional scene panel was not embedded in the standalone game');
unlinkSync(filename);
console.log('PASS: diffusion scene panels are embedded as data URLs in the offline game');
