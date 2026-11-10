window.WW = window.WW || {};
WW.levels = (() => {
  // Keep these names and exact RGB values in sync with compile-semantic-level.py.
  const colors = {
    empty: '#ffffff', ground: '#101820', platform: '#5f5b85', water: '#176ad7', p1: '#00ed31', p2: '#91fe54', exit: '#ff152b',
    springaroo: '#ffdc12', skyling: '#00eeef', tideling: '#ef851a', snack: '#ff64bb', skyKey: '#b052fc', diveKey: '#167b86', springKey: '#e83c86',
    checkpoint: '#aaaaaa', cloudwhisp: '#9480ed', prismtail: '#ff895d', mossback: '#6b9c42', glimmermoth: '#ce6dff', emberkit: '#fc5d3e',
    starShard: '#f2f28a', thermal: '#8af1f9', prismKey: '#ffa03e', mossKey: '#82e561', cloudKey: '#c9adfb', emberKey: '#f54848'
  };
  const palette = Object.entries(colors).map(([name, hex]) =>
    ({name, rgb: [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))}));
  const kinds = new Set(['ground', 'platform', 'water', 'thermal']);
  const markers = new Set(Object.keys(colors).filter(name => name !== 'empty' && !kinds.has(name)));

  // Match the offline compiler's Euclidean threshold and transparent-pixel rule.
  // Unknown painted colors are NOT silently coerced into plausible terrain.
  function classify(r, g, b, a = 255) {
    if (a < 80) return {kind: 'empty', confidence: 1};
    let closest = null, best = Infinity;
    for (const {name, rgb} of palette) {
      const d = (r-rgb[0])**2 + (g-rgb[1])**2 + (b-rgb[2])**2;
      if (d < best) {best = d; closest = name;}
    }
    return best <= 36**2 ? {kind: closest, confidence: 1} : {kind: null, confidence: 0};
  }

  function validateMarkers(level) {
    const errors = [];
    for (const kind of ['p1', 'exit']) {
      const matches = level.objects.filter(obj => obj.kind === kind);
      if (matches.length !== 1) {
        errors.push(`Expected exactly one ${kind} marker; found ${matches.length}`);
        continue;
      }
      const {x, y} = matches[0];
      if (y + 1 >= level.height || !['ground', 'platform'].includes(level.grid[y + 1][x])) {
        errors.push(`${kind} at (${x}, ${y}) has no solid landing surface below`);
      }
    }
    for (const obj of level.objects) {
      if (obj.kind.endsWith('Key') && obj.y + 1 >= level.height) {
        errors.push(`${obj.kind} cannot be on the bottom row`);
      }
    }
    return errors;
  }

  // An N×N proxy-image block means one gameplay cell, NOT one visual sprite.
  // Edge/corner variants come from neighboring cells in the scenery renderer.
  function parseCanvas(image, pixelsPerTile = 1) {
    if (!Number.isInteger(pixelsPerTile) || pixelsPerTile < 1 || pixelsPerTile > 64 ||
        image.width % pixelsPerTile || image.height % pixelsPerTile) {
      throw Error('Image dimensions must be divisible by pixels-per-tile (1–64)');
    }
    const cols = image.width / pixelsPerTile, rows = image.height / pixelsPerTile;
    if (cols < 8 || rows < 6 || cols > 400 || rows > 80) {
      throw Error(`Level grid must be between 8×6 and 400×80 (found ${cols}×${rows})`);
    }
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, image.width, image.height).data;
    const grid = [], objects = [], warnings = [];
    let unknown = 0, samples = 0;
    const inset = pixelsPerTile >= 4 ? Math.max(1, Math.floor(pixelsPerTile / 5)) : 0;
    const stride = Math.max(1, Math.floor(pixelsPerTile / 8));
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) {
        const votes = new Map();
        for (let yy = inset; yy < pixelsPerTile - inset; yy += stride) {
          for (let xx = inset; xx < pixelsPerTile - inset; xx += stride) {
            const offset = ((y * pixelsPerTile + yy) * image.width + x * pixelsPerTile + xx) * 4;
            const result = classify(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
            samples++;
            if (result.kind === null) unknown++;
            else votes.set(result.kind, (votes.get(result.kind) || 0) + 1);
          }
        }
        const type = [...votes].sort((a, b) => b[1] - a[1])[0]?.[0] || 'empty';
        row.push(kinds.has(type) ? type : 'empty');
        if (markers.has(type)) objects.push({kind: type, x, y});
      }
      grid.push(row);
    }
    if (unknown) warnings.push(`${unknown}/${samples} samples had unknown colors; those samples were ignored during tile voting`);
    if (unknown > samples * .10) throw Error('More than 10% of semantic mask samples have unknown colors');
    const level = {grid, objects, warnings, width: cols, height: rows};
    const errors = validateMarkers(level);
    if (errors.length) throw Error(errors.join(' · '));
    return level;
  }

  function load(url, pixelsPerTile = 1) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        try {resolve(parseCanvas(image, pixelsPerTile));}
        catch (error) {reject(error);}
      };
      image.onerror = () => reject(Error('Could not open the PNG image'));
      image.src = url;
    });
  }

  async function loadJSON(url) {
    const response = await fetch(url);
    const level = await response.json();
    const {width, height, grid, objects} = level;
    if (!Number.isInteger(width) || !Number.isInteger(height) ||
        width < 8 || width > 400 || height < 6 || height > 80 ||
        !Array.isArray(grid) || grid.length !== height ||
        grid.some(row => !Array.isArray(row) || row.length !== width ||
          row.some(tile => !kinds.has(tile) && tile !== 'empty')) ||
        !Array.isArray(objects) ||
        objects.some(obj => !markers.has(obj.kind) ||
          !Number.isInteger(obj.x) || !Number.isInteger(obj.y) ||
          obj.x < 0 || obj.x >= width || obj.y < 0 || obj.y >= height)) {
      throw Error('Invalid compiled level JSON');
    }
    const errors = validateMarkers(level);
    if (errors.length) throw Error(errors.join(' · '));
    return {...level, warnings: level.warnings || []};
  }

  return {colors, classify, parseCanvas, load, loadJSON};
})();
