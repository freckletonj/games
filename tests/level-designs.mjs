// Fast headless compiler tests; no browser, third-party modules, or network.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context = {};
context.window = context;
vm.createContext(context);
vm.runInContext(readFileSync('src/platform/world-compiler.js', 'utf8'), context);
const compiler = context.WW.worldCompiler;
const designs = JSON.parse(readFileSync('src/games/animal-adventure/designs.json', 'utf8'));
assert.equal(Object.keys(designs).length, 5);

for (const [id, design] of Object.entries(designs)) {
  const chapter = {id, biome: design.biome};
  const world = compiler.compile(design, chapter);
  assert.equal(world.surface.length, design.width + 1);
  assert.equal(world.grid.length, design.height);
  assert.equal(world.objects.filter(o => o.kind === 'p1').length, 1);
  assert.equal(world.objects.filter(o => o.kind === 'exit').length, 1);
  assert.equal(world.objects.filter(o => o.kind === design.relic[0]).length, 1);
  assert.ok(world.diagnostics.valid);
  assert.equal(world.sections.at(-1).range[1], world.width);
  assert.equal(world.diagnostics.sectionReports.length, design.sections.length);
  assert.equal(world.waterBodies.length, design.water.length);
  assert.equal(world.diagnostics.metrics.motifs, design.motifs.length);
  assert.equal(world.diagnostics.metrics.terrainFeatures, design.terrainFeatures.length);
  assert.equal(world.setpieces.length, design.setpieces.length);
  assert.equal(world.diagnostics.metrics.setpieces, design.setpieces.length);
  assert.ok(world.setpieces.length >= 4, id + ' needs interactive route choices');
  for (const piece of world.setpieces) {
    const section = design.sections.find(s => s.id === piece.section);
    assert.ok(section && piece.x >= section.range[0] && piece.x < section.range[1]);
    assert.ok(Number.isFinite(piece.y), piece.id + ' missing compiled height');
  }
  assert.ok(world.platformSegments.length > design.ledges.length + design.bridges.length);
  assert.ok(world.diagnostics.metrics.waterCells > 0);
  for (const basin of world.waterBodies) {
    // A pool may not protrude above either adjoining bank.
    assert.ok(basin.surface >= world.surface[basin.start] - 0.001);
    assert.ok(basin.surface >= world.surface[basin.end] - 0.001);
    assert.ok(basin.bottom > basin.surface);
    // Basin endpoints cannot form unsupported vertical water walls.
    assert.notEqual(world.grid[Math.ceil(basin.surface)]?.[basin.start], 'water');
  }
  for (const section of design.sections) {
    if (section.requires) {
      assert.ok(design.creatures.some(c => c[0] === section.requires &&
        c[1] < section.range[0]), section.id + ' lacks an early form source');
    }
  }
  console.log('PASS ' + id + ': ' + world.sections.length +
    ' authored challenge sections, ' + world.diagnostics.metrics.waterCells + ' water cells');
}

const meadow=compiler.compile(designs['first-forest']);
assert.equal(meadow.grid[34][150],'platform','The lower lilypond bridge should remain walkable');
assert.equal(meadow.grid[34][165],'platform','The lilypond bridge should reach the far bank');
assert.equal(meadow.grid[30][220],'platform','The sheltered lantern bridge should remain walkable');
assert.ok(designs['first-forest'].stars.some(([x,y])=>x===158&&y===23),
  'The challenging upper lily route must retain a visible optional reward');
const original = designs['first-forest'];
const badGate = structuredClone(original);
badGate.sections[0].requires = 'tideling';
assert.ok(compiler.analyze(badGate).errors.some(e => e.includes('no earlier encounter')));
const brokenProgress = structuredClone(original);
brokenProgress.sections[1].range[0] += 1;
assert.ok(compiler.analyze(brokenProgress).errors.some(e => e.includes('noncontiguous')));
const brokenWater = structuredClone(original);
brokenWater.water[0][2] = 10;
brokenWater.water[0][3] = 2;
assert.ok(compiler.analyze(brokenWater).errors.some(e => e.includes('no depth')));
const brokenFeature = structuredClone(original);
brokenFeature.terrainFeatures[0].radius = 3;
assert.ok(compiler.analyze(brokenFeature).errors.some(e => e.includes('Invalid terrain feature')));
const brokenMotif = structuredClone(original);
brokenMotif.motifs[0].x = 250;
assert.ok(compiler.analyze(brokenMotif).errors.some(e => e.includes('Invalid motif')));
const misplaced = structuredClone(original);
misplaced.setpieces[0].x = 150;
assert.ok(compiler.analyze(misplaced).errors.some(e=>e.includes('Invalid setpiece')));
const floatingBloom = structuredClone(original);
floatingBloom.setpieces[0].y = 20;
assert.ok(compiler.analyze(floatingBloom).errors.some(e=>e.includes('omit y')));
const coast = structuredClone(designs['crystal-coast']);
coast.setpieces.find(s=>s.kind==='bubbleVent').y = 6;
assert.ok(compiler.analyze(coast).errors.some(e=>e.includes('deep-water')));
const summit = structuredClone(designs['starfall-summit']);
summit.setpieces.find(s=>s.kind==='windRing').y = 70;
assert.ok(compiler.analyze(summit).errors.some(e=>e.includes('open air')));
const painted = structuredClone(original);
painted.art = {foreground:[{asset:'meadow_scene_01',x:0,y:0,width:480,height:270}]};
assert.equal(compiler.compile(painted).art.foreground[0].asset,'meadow_scene_01');
painted.art.foreground[0].asset='../unsafe';
assert.ok(compiler.analyze(painted).errors.some(e=>e.includes('Invalid painted panel')));
const missingWorld = structuredClone(original);
missingWorld.version = 999;
assert.equal(compiler.analyze(missingWorld).valid, false);
console.log('PASS schema validation, ability gating, nonfloating pools and deterministic compilation');
