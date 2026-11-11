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
  for(const piece of world.setpieces){
    assert.equal(piece.target.length,2);
    assert.ok(piece.target[1]<piece.y-1,
      id+'/'+piece.id+' should guide a player to a higher foothold');
  }
  for(const section of world.diagnostics.sectionReports){
    assert.equal(section.intendedRoutes.length,section.interactions);
    assert.ok(!section.notes.some(n=>n.includes('landing')),
      id+'/'+section.id+' has disconnected bloom: '+section.notes.join('; '));
  }
  for(const piece of world.setpieces.filter(p=>p.kind==='bounceBloom')){
    const [x,y]=piece.target;
    assert.ok(world.platformSegments.some(segment=>
      segment.kind==='platform'&&x>=segment.x&&x<segment.x+segment.length&&
      segment.y===y),id+'/'+piece.id+' must launch toward a real shelf');
    assert.ok((piece.y-y)*16<=100||piece.requires==='springaroo',
      id+'/'+piece.id+' cannot promise more height than its spring offers');
  }
  assert.equal(world.diagnostics.metrics.setpieces, design.setpieces.length);
  assert.equal(world.vistas.length, design.sections.length);
  assert.equal(world.goalRoute.length,design.goalRoute.length);
  assert.ok(world.goalRoute.length>=3);
  assert.deepEqual(Array.from(world.goalRoute.at(-1)),design.relic.slice(1));
  assert.equal(world.dressing.length, design.dressing.length);
  assert.equal(world.diagnostics.metrics.vistas, design.vistas.length);
  assert.equal(world.diagnostics.metrics.dressing, design.dressing.length);
  for (const section of world.diagnostics.sectionReports)
    assert.equal(section.visualBeats.length,1,
      id + '/' + section.id + ' needs one authored scene composition');
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

const wetlands=compiler.compile(designs['willow-wetlands']);
assert.deepEqual(
  designs['willow-wetlands'].vistas.map(v=>v.kind),
  ['willow-arch','lily-garden','elder-tree','sunken-ruin','firefly-ruins'],
  'Wetland chapter must read as a river journey, not repeated ocean reefs'
);
assert.equal(wetlands.vistas[1].y,wetlands.waterBodies[0].surface,
  'Lily lagoon scenery must sit on the true waterline, not the lake bottom');
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
const missingDestination=structuredClone(original);
delete missingDestination.setpieces[0].target;
assert.ok(compiler.analyze(missingDestination).errors.some(e=>e.includes('target must be')));
const unreachableDestination=structuredClone(original);
unreachableDestination.setpieces[0].target=[250,20];
assert.ok(compiler.analyze(unreachableDestination).errors.some(e=>e.includes('target must be')));
const floatingBloom = structuredClone(original);
floatingBloom.setpieces[0].y = 20;
assert.ok(compiler.analyze(floatingBloom).errors.some(e=>e.includes('omit y')));
const coast = structuredClone(designs['crystal-coast']);
coast.setpieces.find(s=>s.kind==='bubbleVent').y = 6;
assert.ok(compiler.analyze(coast).errors.some(e=>e.includes('deep-water')));
const summit = structuredClone(designs['starfall-summit']);
summit.setpieces.find(s=>s.kind==='windRing').y = 70;
assert.ok(compiler.analyze(summit).errors.some(e=>e.includes('open air')));
const floatingGoal=structuredClone(original);
floatingGoal.goalRoute[0]=[101,21];
assert.ok(compiler.analyze(floatingGoal).errors.some(e=>e.includes('real authored ledge')));
const brokenGoal=structuredClone(original);
brokenGoal.goalRoute[2]=[110,20];
assert.ok(compiler.analyze(brokenGoal).errors.some(e=>e.includes('Invalid goalRoute')));
const brokenVista=structuredClone(original);
brokenVista.vistas[0].section='nowhere';
assert.ok(compiler.analyze(brokenVista).errors.some(e=>e.includes('Invalid vista')));
const brokenDressing=structuredClone(original);
brokenDressing.dressing[0].asset='not-real';
assert.ok(compiler.analyze(brokenDressing).errors.some(e=>e.includes('Invalid scene dressing')));
const painted = structuredClone(original);
painted.art = {foreground:[{asset:'meadow_scene_01',x:0,y:0,width:480,height:270}]};
assert.equal(compiler.compile(painted).art.foreground[0].asset,'meadow_scene_01');
painted.art.foreground[0].asset='../unsafe';
assert.ok(compiler.analyze(painted).errors.some(e=>e.includes('Invalid painted panel')));
const missingWorld = structuredClone(original);
missingWorld.version = 999;
assert.equal(compiler.analyze(missingWorld).valid, false);
console.log('PASS schema validation, ability gating, nonfloating pools and deterministic compilation');
