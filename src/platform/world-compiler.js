// Pure, deterministic semantic-to-geometry compiler.
// Run unchanged in the offline browser and in Node's headless level-inspector.
window.WW = window.WW || {};
WW.worldCompiler = (() => {
  const terrainKinds = new Set(['ground', 'platform', 'water', 'thermal']);
  const creatures = new Set(['springaroo', 'tideling', 'skyling', 'mossback',
    'prismtail', 'glimmermoth', 'cloudwhisp', 'emberkit']);
  const setpieceKinds = new Set(['bounceBloom', 'windRing', 'bubbleVent']);
  const vistaKinds = new Set(['root-arch', 'elder-tree', 'lily-garden',
    'firefly-ruins', 'shell-cove', 'reef-arch', 'tide-temple',
    'sunken-ruin', 'pearl-shrine', 'willow-arch', 'moon-gate',
    'wind-temple', 'floating-garden', 'aurora-spire']);
  const vistaRoles = new Set(['establish', 'teach', 'challenge', 'rest', 'reveal', 'reward']);
  const dressingKinds = new Set(['flowers', 'mushrooms', 'stones', 'reeds',
    'shells', 'moonStone', 'berryBush']);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const integer = n => Number.isInteger(n);
  const finite = n => typeof n === 'number' && Number.isFinite(n);

  function ridgeAt(points, x) {
    for (let i = 1; i < points.length; i++) {
      if (x <= points[i][0]) {
        const [ax, ay] = points[i - 1], [bx, by] = points[i];
        return ay + (by - ay) * (x - ax) / (bx - ax);
      }
    }
    return points[points.length - 1][1];
  }

  // Broad, tapered terrain gestures let authors sculpt a more memorable
  // silhouette without forcing a model to hand-place hundreds of grid cells.
  function terrainAt(spec, x) {
    let y = ridgeAt(spec.ridge, x);
    for (const feature of spec.terrainFeatures || []) {
      const distance = Math.abs(x - feature.center);
      if (distance < feature.radius) {
        const taper = (1 + Math.cos(Math.PI * distance / feature.radius)) / 2;
        y -= feature.lift * taper;
      }
    }
    return y;
  }

  function analyze(spec) {
    const errors = [], warnings = [];
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
      return {valid: false, errors: ['Expected a semantic level object'], warnings};
    }
    const {width, height} = spec;
    if (!integer(width) || width < 32 || width > 400 ||
        !integer(height) || height < 20 || height > 80) {
      errors.push('width must be 32..400 and height 20..80');
    }
    if (spec.version !== 1) errors.push('Unsupported design version (expected 1)');
    if (typeof spec.id !== 'string' || !spec.id) errors.push('Missing level id');
    if (!['meadow', 'coast', 'summit'].includes(spec.biome)) errors.push('Unknown biome');

    const ridge = spec.ridge;
    if (!Array.isArray(ridge) || ridge.length < 2 ||
        ridge.some(p => !Array.isArray(p) || p.length !== 2 || !finite(p[0]) ||
          !finite(p[1]) || p[1] < 1 || p[1] >= height) ||
        ridge[0]?.[0] !== 0 || ridge.at(-1)?.[0] !== width ||
        ridge.some((p, i) => i && p[0] <= ridge[i - 1][0])) {
      errors.push('ridge must be strictly ascending [x,y] points from x=0 to width');
    }
    const groups = {
      water: 4, bridges: 3, ledges: 3, thermals: 4,
      creatures: 2, stars: 2
    };
    for (const [name, minLength] of Object.entries(groups)) {
      if (spec[name] === undefined && name === 'thermals') continue;
      if (!Array.isArray(spec[name])) {
        errors.push(name + ' must be an array');
        continue;
      }
      if (spec[name].some(p => !Array.isArray(p) || p.length < minLength ||
        p.slice(0, minLength).some((v, i) => name === 'creatures' && i === 0
          ? !creatures.has(v) : !finite(v)))) {
        errors.push('Invalid ' + name + ' entry');
      }
    }
    if (!Array.isArray(spec.relic) || spec.relic.length !== 3 ||
        !['springKey', 'diveKey', 'skyKey'].includes(spec.relic[0]) ||
        !finite(spec.relic[1]) || !finite(spec.relic[2])) {
      errors.push('relic must be [knownKey, x, y]');
    }
    for (const name of ['checkpoints', 'snacks']) {
      if (!Array.isArray(spec[name]) || spec[name].some(n => !integer(n) || n < 0 || n >= width)) {
        errors.push(name + ' must be valid x positions');
      }
    }
    if (!Array.isArray(spec.landmarks) || spec.landmarks.some(p =>
      !p || !integer(p.x) || p.x < 0 || p.x >= width || typeof p.type !== 'string')) {
      errors.push('landmarks must have x and type');
    }
    if (!Array.isArray(spec.sections) || !spec.sections.length) {
      errors.push('sections must describe the level progression');
    } else {
      let last = 0;
      const ids = new Set();
      for (const section of spec.sections) {
        if (!section || typeof section.id !== 'string' || ids.has(section.id) ||
            !Array.isArray(section.range) || section.range.length !== 2 ||
            !integer(section.range[0]) || !integer(section.range[1]) ||
            section.range[0] !== last || section.range[1] <= last ||
            section.range[1] > width || typeof section.challenge !== 'string' ||
            typeof section.goal !== 'string') {
          errors.push('Invalid or noncontiguous section at x=' + last);
          break;
        }
        ids.add(section.id);
        if (section.requires && !creatures.has(section.requires)) {
          errors.push('Unknown required form for ' + section.id);
        } else if (section.requires && Array.isArray(spec.creatures) &&
            !spec.creatures.some(c => c[0] === section.requires && c[1] < section.range[0])) {
          errors.push(section.id + ' requires ' + section.requires +
            ' but has no earlier encounter');
        }
        last = section.range[1];
      }
      if (last !== width) errors.push('sections must cover the full width');
    }
    // Art never changes collision. Validate its coordinate system and
    // referenced asset names so authored bitmap panels cannot silently stretch
    // or accidentally become executable image paths.
    if(spec.art!==undefined){
      if(!spec.art || Array.isArray(spec.art) || typeof spec.art!=='object' ||
          Object.keys(spec.art).some(layer=>!['background','foreground'].includes(layer))){
        errors.push('art must have only background and foreground layers');
      }else{
        for(const [layer,panels] of Object.entries(spec.art)){
          if(!Array.isArray(panels) || panels.length>200){
            errors.push('art.'+layer+' must be an array of up to 200 panels');
            continue;
          }
          for(const panel of panels){
            if(!panel || typeof panel.asset!=='string' ||
                !/^[a-zA-Z0-9_-]+$/.test(panel.asset) ||
                !['x','y','width','height'].every(k=>finite(panel[k])) ||
                panel.width<=0 || panel.height<=0 ||
                (panel.parallax!==undefined &&
                  (!finite(panel.parallax)||panel.parallax<0||panel.parallax>1))){
              errors.push('Invalid painted panel in art.'+layer);
            }
          }
        }
      }
    }
    for (const feature of spec.terrainFeatures || []) {
      if (!feature || !integer(feature.center) || feature.center < 0 ||
          feature.center > width || !integer(feature.radius) ||
          feature.radius < 8 || feature.radius > 50 || !finite(feature.lift) ||
          Math.abs(feature.lift) > 8) {
        errors.push('Invalid terrain feature: expected center, radius 8..50, lift -8..8');
      }
    }
    // High-level platform motifs let an LLM author meaningful traversals
    // without enumerating each tiny physics tile. Every motif belongs to a
    // named challenge section so reports identify the intended experience.
    for (const motif of spec.motifs || []) {
      const section = spec.sections?.find(s => s.id === motif.section);
      if (!['arc','staircase','ripples'].includes(motif.type) ||
          !section || typeof motif.id !== 'string' || !motif.id ||
          !integer(motif.x) || !integer(motif.y) ||
          !integer(motif.count) || motif.count < 2 || motif.count > 12 ||
          !integer(motif.dx) || motif.dx < 4 || motif.dx > 24 ||
          !integer(motif.width) || motif.width < 3 || motif.width > 12 ||
          !integer(motif.rise) || Math.abs(motif.rise) > 15 ||
          motif.x < section?.range[0] ||
          motif.x + (motif.count - 1) * motif.dx + motif.width > section?.range[1] ||
          motif.y - Math.abs(motif.rise) < 1 ||
          motif.y + Math.abs(motif.rise) >= height) {
        errors.push('Invalid motif ' + (motif.id || '?') +
          ': require a valid section, shape and in-bounds platforms');
      }
    }
    // Location-specific scene compositions convey progression and visual
    // landmarks independently of collision or interaction mechanics.
    if (spec.vistas !== undefined && !Array.isArray(spec.vistas))
      errors.push('vistas must be an array');
    const vistas = Array.isArray(spec.vistas) ? spec.vistas : [];
    if (vistas.length > 30) errors.push('Too many vistas (max 30)');
    const vistaIds = new Set();
    for (const vista of vistas) {
      const section = spec.sections?.find(s => s.id === vista?.section);
      if (!vista || typeof vista.id !== 'string' || !vista.id ||
          vistaIds.has(vista.id) || !vistaKinds.has(vista.kind) ||
          !vistaRoles.has(vista.role) || !section ||
          !integer(vista.x) || vista.x < section?.range[0] ||
          vista.x >= section?.range[1] || vista.x < 4 || vista.x >= width-4 ||
          !integer(vista.span) || vista.span < 12 || vista.span > 34 ||
          (vista.y !== undefined &&
           (!finite(vista.y) || vista.y < 5 || vista.y >= height-2))) {
        errors.push('Invalid vista ' + (vista?.id || '?') +
          ': expected unique id, known kind, role, section, x and span');
      } else vistaIds.add(vista.id);
    }
    if (spec.dressing !== undefined && !Array.isArray(spec.dressing))
      errors.push('dressing must be an array');
    const dressing = Array.isArray(spec.dressing) ? spec.dressing : [];
    if (dressing.length > 90) errors.push('Too much scene dressing (max 90)');
    for (const prop of dressing) {
      if (!prop || !integer(prop.x) || prop.x < 1 || prop.x >= width-1 ||
          !dressingKinds.has(prop.asset) || !finite(prop.scale) ||
          prop.scale < .6 || prop.scale > 1.65) {
        errors.push('Invalid scene dressing: x, asset and scale must be authored');
      }
    }
    // Author named playable beats instead of executable arbitrary scripts.
    if (spec.setpieces !== undefined && !Array.isArray(spec.setpieces))
      errors.push('setpieces must be an array');
    const pieces = Array.isArray(spec.setpieces) ? spec.setpieces : [];
    const ids = new Set();
    for (const piece of pieces) {
      const section = spec.sections?.find(s => s.id === piece?.section);
      if (!piece || typeof piece.id !== 'string' || !piece.id ||
          ids.has(piece.id) || !setpieceKinds.has(piece.kind) ||
          !section || !integer(piece.x) ||
          piece.x < section?.range[0] || piece.x >= section?.range[1] ||
          piece.x < 2 || piece.x >= width - 2) {
        errors.push('Invalid setpiece ' + (piece?.id || '?') +
          ': expected unique id, known kind, section and x inside its section');
        continue;
      }
      ids.add(piece.id);
      const destination=piece.target;
      const sourceY=piece.kind==='bounceBloom'?terrainAt(spec,piece.x):piece.y;
      if(!Array.isArray(destination)||destination.length!==2||
         !integer(destination[0])||!finite(destination[1])||
         destination[0]<section.range[0]||destination[0]>=section.range[1]||
         Math.abs(destination[0]-piece.x)>10||
         destination[1]<3||destination[1]>=height-2||
         destination[1]>=sourceY-1){
        errors.push(piece.id+': target must be an elevated nearby destination in this section');
      }
      const basin = Array.isArray(spec.water) ? spec.water.find(b =>
        Array.isArray(b) && piece.x >= b[0] && piece.x < b[1]) : null;
      if (piece.kind === 'bounceBloom' && (piece.y !== undefined || basin)) {
        errors.push(piece.id + ': bounceBloom must be on dry ground; omit y');
      } else if (piece.kind === 'windRing' &&
                 (!finite(piece.y) || piece.y < 3 || piece.y >= height - 2 ||
                  (Array.isArray(ridge) && ridge.length > 1 &&
                   piece.y >= terrainAt(spec, piece.x) - 2))) {
        errors.push(piece.id + ': windRing must be in open air');
      } else if (piece.kind === 'bubbleVent' &&
                 (!basin || !finite(piece.y) || piece.x - basin[0] < 8 ||
                  basin[1] - piece.x < 8 ||
                  (Array.isArray(ridge) && ridge.length > 1 &&
                   piece.y <= Math.max(basin[2], terrainAt(spec, basin[0]),
                     terrainAt(spec, basin[1])) + 2) ||
                  piece.y >= basin[2] + basin[3] - 2)) {
        errors.push(piece.id + ': bubbleVent needs a central deep-water location');
      }
    }
    if (pieces.length > 50) errors.push('Too many setpieces (max 50)');
    if (Array.isArray(spec.water) && Array.isArray(ridge) && ridge.length > 1 &&
        errors.every(error => !error.startsWith('ridge'))) {
      let previousEnd = -1;
      for (const [a, b, top, depth] of spec.water) {
        if (!integer(a) || !integer(b) || a < 0 || b > width || a >= b ||
            a < previousEnd || !finite(top) || !finite(depth) || depth <= 0 ||
            top + depth >= height) {
          errors.push('Invalid or overlapping water basin near x=' + a);
          continue;
        }
        const waterline = Math.max(top, terrainAt(spec, a), terrainAt(spec, b));
        if (top + depth <= waterline + 1) {
          errors.push('Water basin at x=' + a + ' has no depth below its banks');
        }
        if (waterline > top + 2) {
          warnings.push('Water at x=' + a + '..' + b +
            ' lowered to the terrain banks to avoid a floating water wall');
        }
        previousEnd = b;
      }
    }
    return {valid: errors.length === 0, errors, warnings};
  }

  function compile(spec, chapter = null) {
    const report = analyze(spec);
    if (!report.valid) throw Error(spec?.id + ': ' + report.errors.join(' | '));
    const {width, height} = spec, points = spec.ridge;
    const surface = Array.from({length: width + 1}, (_, x) => terrainAt(spec, x));
    const basins = spec.water.map(([start, end, top, depth]) => ({
      start, end, surface: Math.max(top, surface[start], surface[end]),
      bottom: top + depth
    }));
    // Interpolate each shoreline into a bowl instead of stamping a rectangular
    // trench. A lake surface cannot be higher than either adjoining bank.
    for (const basin of basins) {
      const shore = Math.min(8, (basin.end - basin.start) / 3);
      for (let x = basin.start; x <= basin.end; x++) {
        const t = clamp(Math.min(x - basin.start, basin.end - x) / shore, 0, 1);
        const eased = t * t * (3 - 2 * t);
        const depth = Math.max(0, basin.bottom - surface[x]);
        surface[x] += depth * eased;
      }
    }

    const grid = Array.from({length: height}, () => Array(width).fill('empty'));
    const objects = [], platformSegments = [];
    const floorAt = x => Math.min(height - 1, Math.ceil(Math.max(surface[x], surface[x + 1])));
    const stamp = (kind, x, y) => objects.push({kind, x, y});
    const platform = (x, y, length, kind = 'platform', style = 'ledge') => {
      platformSegments.push({x, y, length, kind, style});
      for (let i = x; i < Math.min(width, x + length); i++) {
        if (i >= 0 && y >= 0 && y < height) grid[y][i] = kind;
      }
    };
    for (let x = 0; x < width; x++) {
      const floor = floorAt(x);
      const pool = basins.find(b => x >= b.start && x < b.end);
      // A coarse cell touching dry bank cannot be classified as a whole
      // water column just because the adjacent downhill corner is wet.
      if (pool && Math.min(surface[x], surface[x + 1]) > pool.surface + .35) {
        const waterTop = Math.ceil(pool.surface);
        for (let y = waterTop; y < floor; y++) grid[y][x] = 'water';
      }
      for (let y = floor; y < height; y++) grid[y][x] = 'ground';
    }
    for (const [x, y, length] of spec.bridges) platform(x, y, length, 'platform', 'bridge');
    for (const [x, y, length] of spec.ledges) platform(x, y, length, 'platform', 'ledge');
    for (const [x, y, w, h] of spec.thermals || []) {
      for (let row = y; row < y + h; row++) platform(x, row, w, 'thermal');
    }
    for (const motif of spec.motifs || []) {
      for (let i = 0; i < motif.count; i++) {
        const t = i / (motif.count - 1);
        const offset = motif.type === 'arc'
          ? -motif.rise * Math.sin(Math.PI * t)
          : motif.type === 'staircase'
            ? -motif.rise * t
            : (i % 2 ? motif.rise : -motif.rise);
        platform(motif.x + motif.dx*i, Math.round(motif.y + offset),
          motif.width, 'platform', 'step');
      }
    }
    // Optional shelves offer meaningful underwater routes instead of an empty
    // column of water; deeper platforms remain independently traversable.
    for (const basin of basins) {
      for (let x = basin.start + 8; x < basin.end - 7; x += 15) {
        platform(x, Math.floor((basin.surface + basin.bottom) / 2), 5, 'platform', 'shelf');
      }
    }
    stamp('p1', 4, floorAt(4) - 1);
    stamp('p2', 6, floorAt(6) - 1);
    stamp('exit', width - 5, floorAt(width - 5) - 1);
    stamp(...spec.relic);
    for (const [kind, x, explicitY] of spec.creatures) {
      const aerial = ['skyling', 'cloudwhisp', 'glimmermoth'].includes(kind);
      stamp(kind, x, explicitY ?? floorAt(x) - (aerial ? 4 : 1));
    }
    for (const x of spec.checkpoints) stamp('checkpoint', x, floorAt(x) - 1);
    for (const x of spec.snacks) stamp('snack', x, floorAt(x) - 1);
    for (const [x, y] of spec.stars) stamp('starShard', x, y);
    const vistas = (spec.vistas || []).map(vista => ({
      ...vista, y: vista.y === undefined
        ? (surface[vista.x] + surface[vista.x + 1]) / 2 : vista.y
    }));
    const dressing = (spec.dressing || []).map(prop => ({
      ...prop, y: (surface[prop.x] + surface[prop.x + 1]) / 2
    }));
    const setpieces = (spec.setpieces || []).map(piece => ({
      id: piece.id, kind: piece.kind, section: piece.section, x: piece.x,
      target:piece.target,
      y: piece.kind === 'bounceBloom'
        ? (surface[piece.x] + surface[piece.x + 1]) / 2 : piece.y
    }));
    const waterCells = grid.reduce((count, row) =>
      count + row.filter(cell => cell === 'water').length, 0);
    // Localized feedback is more useful to an LLM than a global quality score:
    // point to the named section and count the actual choices it contains.
    const sectionReports = spec.sections.map(section => {
      const [a, b] = section.range;
      const within = x => x >= a && x < b;
      const encounters = spec.creatures.filter(c => within(c[1])).length;
      const checkpoints = spec.checkpoints.filter(within).length;
      const platforms = platformSegments.filter(p => within(p.x)).length;
      const waterRegions = basins.filter(p => p.start < b && p.end > a).length;
      const visualBeats = vistas.filter(vista => within(vista.x));
      const decorations = dressing.filter(prop => within(prop.x)).length;
      const interactions = setpieces.filter(piece => within(piece.x));
      const kinds = Object.fromEntries([...setpieceKinds].map(kind =>
        [kind, interactions.filter(piece => piece.kind === kind).length]));
      const notes = [];
      if (b-a >= 65 && encounters === 0 && platforms < 2 && !waterRegions && !interactions.length) {
        notes.push('Long section has little authored interaction; consider a choice or encounter');
      }
      if (vistas.length && visualBeats.length === 0)
        notes.push('Section lacks a distinctive staged visual landmark');
      if (section.requires && !platforms && !waterRegions) {
        notes.push('Ability-gated section has no local traversal features');
      }
      return {id: section.id, challenge: section.challenge, from: a, to: b,
        requires: section.requires || null, encounters, checkpoints, platforms,
        waterRegions, interactions: interactions.length, setpieceKinds: kinds,
        intendedRoutes:interactions.map(p=>({from:p.x,to:p.target,mechanic:p.kind})),
        visualBeats: visualBeats.map(v => ({id:v.id,kind:v.kind,role:v.role})),
        decorations, notes};
    });
    for (const section of sectionReports) for (const note of section.notes) {
      report.warnings.push(section.id + ': ' + note);
    }
    const diagnostics = {...report, sectionReports, metrics: {
      width, height, sections: spec.sections.length, waterCells,
      ledges: spec.ledges.length, motifs: (spec.motifs || []).length,
      terrainFeatures: (spec.terrainFeatures || []).length,
      setpieces: setpieces.length, vistas: vistas.length,
      dressing: dressing.length, creatures: spec.creatures.length
    }};
    return {width, height, grid, objects, chapter, biome: spec.biome,
      landmarks: spec.landmarks, surface, waterBodies: basins,
      platformSegments, setpieces, vistas, dressing,
      waterZones: spec.water, sections: spec.sections, art:spec.art,
      decorSeed: spec.id, diagnostics, warnings: report.warnings};
  }
  return {analyze, compile};
})();
