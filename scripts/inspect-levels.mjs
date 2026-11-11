// Deterministic, offline AI feedback: validate authored designs and emit an
// SVG contact sheet plus JSON diagnostics. No browser or image model required.
// Usage: node scripts/inspect-levels.mjs
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import vm from 'node:vm';

const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(readFileSync('src/platform/world-compiler.js', 'utf8'), sandbox);
const compiler = sandbox.WW.worldCompiler;
const designs = JSON.parse(readFileSync('src/games/animal-adventure/designs.json', 'utf8'));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('"', '&quot;');
const colors = {meadow: ['#bfe9d7', '#476b5d'], coast: ['#aedfe9', '#5c7c86'],
  summit: ['#c9caee', '#686b91']};
const out = [], reports = [];

for (const [index, [id, design]] of Object.entries(designs).entries()) {
  const analysis = compiler.analyze(design);
  if (!analysis.valid) {
    console.error(id, analysis.errors.join('; '));
    process.exitCode = 1;
    continue;
  }
  const level = compiler.compile(design, {id, biome: design.biome});
  reports.push({id, ...level.diagnostics, sections: design.sections,
    basins: level.waterBodies});
  const yBase = 32 + index * 210, scaleX = 920 / level.width, scaleY = 1.65;
  const px = x => 40 + x * scaleX;
  const py = y => yBase + 20 + y * scaleY;
  const [sky, soil] = colors[design.biome];
  out.push('<g>');
  out.push('<rect x="26" y="' + yBase + '" width="948" height="193" rx="12" fill="' + sky + '"/>');
  out.push('<text x="42" y="' + (yBase + 16) + '" fill="#21344a" font-size="12" font-weight="bold">' +
    escape(id) + '</text>');
  for (const [i, section] of design.sections.entries()) {
    const width = (section.range[1] - section.range[0]) * scaleX;
    const fill = i % 2 ? '#b0dcd8' : '#e0f0cc';
    out.push('<rect x="' + px(section.range[0]) + '" y="' + (yBase + 174) +
      '" width="' + width + '" height="8" fill="' + fill + '"/>');
    out.push('<text x="' + (px(section.range[0]) + 3) + '" y="' + (yBase + 189) +
      '" fill="#31435a" font-size="7">' + escape(section.id) + '</text>');
  }
  // Draw water in world coordinates using the canonical surface, not independent
  // tile rectangles. The geometry under it is then drawn as continuous land.
  for (const basin of level.waterBodies) {
    const coordinates = [];
    for (let x = basin.start; x <= basin.end; x++) {
      coordinates.push(px(x) + ',' + py(Math.max(level.surface[x], basin.surface)));
    }
    out.push('<polygon points="' +
      px(basin.start) + ',' + py(basin.surface) + ' ' +
      px(basin.end) + ',' + py(basin.surface) + ' ' +
      coordinates.reverse().join(' ') +
      '" fill="#4caad0" fill-opacity="0.8"/>');
    out.push('<path d="M' + px(basin.start) + ' ' + py(basin.surface) +
      ' H' + px(basin.end) + '" stroke="#eefcfa" stroke-width="1.7"/>');
  }
  const ridge = level.surface.map((y, x) => px(x) + ',' + py(y)).join(' ');
  out.push('<polygon points="' + px(0) + ',' + py(level.height) + ' ' +
    ridge + ' ' + px(level.width) + ',' + py(level.height) +
    '" fill="' + soil + '"/>');
  out.push('<polyline points="' + ridge + '" fill="none" stroke="#edffc9" stroke-width="2"/>');
  for (const {x, y, length} of level.platformSegments) {
    out.push('<path d="M' + px(x) + ' ' + py(y) + ' H' + px(x + length) +
      '" stroke="#ececd2" stroke-width="3" stroke-linecap="round"/>');
  }
  for (const item of level.objects) {
    if (!['p1','exit',design.relic[0],'checkpoint'].includes(item.kind)) continue;
    const fill = {p1:'#40e38e',exit:'#f48b78',checkpoint:'#ffffff'}[item.kind] || '#ffd873';
    out.push('<circle cx="' + px(item.x) + '" cy="' + py(item.y) +
      '" r="3" fill="' + fill + '" stroke="#253347" stroke-width=".7"/>');
  }
  out.push('</g>');
}
mkdirSync('dist', {recursive:true});
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1100" viewBox="0 0 1000 1100">' +
  '<rect width="1000" height="1100" fill="#eef1f5"/>' +
  '<text x="28" y="23" font-size="16" fill="#26394b" font-weight="bold">Wonderwood · Semantic Level Atlas</text>' +
  out.join('\n') + '</svg>\n';
writeFileSync('dist/preview-levels.svg', svg);
writeFileSync('dist/level-diagnostics.json', JSON.stringify(reports, null, 2) + '\n');
for (const report of reports) {
  console.log(report.id + ': ' + report.metrics.sections + ' sections; ' +
    report.metrics.waterCells + ' water cells; ' +
    report.warnings.length + ' advisory notes');
}
if (process.exitCode) throw Error('Semantic level inspection failed');
console.log('Wrote dist/preview-levels.svg and dist/level-diagnostics.json');
