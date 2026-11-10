window.WW = window.WW || {};
// Visuals only: the semantic grid in game.js is authoritative for collisions.
WW.scenery = (() => {
  const sources = window.WW_EMBEDDED_SCENES || {};
  const images = Object.fromEntries(Object.entries(sources).map(([name, source]) => {
    const image = new Image();
    image.src = source;
    return [name, image];
  }));

  const ready = name => images[name]?.complete && images[name].naturalWidth > 0;
  const url = name => sources[name] || '';

  function background(ctx, biome, cameraX) {
    if (biome !== 'meadow' || !ready('backdrop')) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    const offset = Math.min(40, Math.max(0, cameraX * .023));
    ctx.drawImage(images.backdrop, -offset, -8, 520, 292);
    ctx.restore();
    return true;
  }

  function landmark(ctx, biome, type, time) {
    if (biome !== 'meadow' || type !== 'tree' || !ready('lanternTree')) return false;
    ctx.save();
    ctx.rotate(Math.sin(time * .55) * .004);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(images.lanternTree, -91, -238, 182, 239);
    ctx.restore();
    return true;
  }

  // A mirrored repeat of ONE interior painted swatch is edge-continuous.
  // The original 4x2 atlas cells are art samples, not an autotile atlas:
  // using them whole as independent tiles bakes a fake edge into every cell.
  function swatch(ctx, image, column, x, y, height = 16, top = false) {
    const cw = image.naturalWidth / 4, ch = image.naturalHeight / 2;
    const sx = column * cw + cw * .22;
    const sy = top ? ch * .08 : ch * .27;
    const sh = top ? ch * .25 : ch * .46;
    const flipX = Math.floor(x / 16) % 2 !== 0;
    const flipY = !top && Math.floor(y / 16) % 2 !== 0;
    ctx.save();
    ctx.translate(x + (flipX ? 16 : 0), y + (flipY ? height : 0));
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(image, sx, sy, cw * .56, sh, 0, 0, 16, height);
    ctx.restore();
  }

  function sideShade(ctx, x, y, left, color) {
    const gradient = ctx.createLinearGradient(left ? x : x + 12, y, left ? x + 4 : x + 16, y);
    gradient.addColorStop(0, left ? color : 'transparent');
    gradient.addColorStop(1, left ? 'transparent' : color);
    ctx.fillStyle = gradient;
    ctx.fillRect(left ? x : x + 12, y, 4, 16);
  }

  // n/ne/e/se/s/sw/w/nw describe tiles of the SAME terrain kind.
  // All overlay strokes are clipped to the semantic cell, preserving collisions.
  function tile(ctx, biome, kind, x, y, variant, neighbors = {}, time = 0) {
    if (biome !== 'meadow' || !ready('tiles') ||
        !['ground', 'platform', 'water'].includes(kind)) return false;
    const image = images.tiles;
    const n = !!neighbors.n, e = !!neighbors.e, s = !!neighbors.s, w = !!neighbors.w;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.beginPath();
    ctx.rect(x, y, 16, 16);
    ctx.clip();

    if (kind === 'ground') {
      swatch(ctx, image, 1, x, y);
      if (!n) {
        swatch(ctx, image, 0, x, y, 6, true);
        const fade = ctx.createLinearGradient(0, y + 3, 0, y + 10);
        fade.addColorStop(0, '#5b997c30');
        fade.addColorStop(1, '#254c5900');
        ctx.fillStyle = fade;
        ctx.fillRect(x, y + 3, 16, 7);
      }
      if (!w) sideShade(ctx, x, y, true, '#182d3a66');
      if (!e) sideShade(ctx, x, y, false, '#a6d0b13d');
      if (!s) {
        ctx.fillStyle = '#1d36424d';
        ctx.fillRect(x, y + 13, 16, 3);
      }
      // Convex shoulders and concave corners are both determined by the map,
      // never by random atlas variants.
      ctx.strokeStyle = '#b4ddaf91';
      ctx.lineWidth = 1.5;
      if (!n && !w) {
        ctx.beginPath();ctx.moveTo(x, y + 6);ctx.quadraticCurveTo(x, y, x + 6, y);ctx.stroke();
      }
      if (!n && !e) {
        ctx.beginPath();ctx.moveTo(x + 10, y);ctx.quadraticCurveTo(x + 16, y, x + 16, y + 6);ctx.stroke();
      }
      ctx.strokeStyle = '#173b4977';
      if (n && w && !neighbors.nw) {
        ctx.beginPath();ctx.arc(x, y, 5, 0, Math.PI / 2);ctx.stroke();
      }
      if (n && e && !neighbors.ne) {
        ctx.beginPath();ctx.arc(x + 16, y, 5, Math.PI / 2, Math.PI);ctx.stroke();
      }
    } else if (kind === 'platform') {
      swatch(ctx, image, 2, x, y);
      if (!n) {
        ctx.fillStyle = '#d5f4d1a6';
        ctx.fillRect(x, y, 16, 2);
      }
      ctx.fillStyle = '#213c5473';
      ctx.fillRect(x, y + 13, 16, 3);
      if (!w) sideShade(ctx, x, y, true, '#294253a6');
      if (!e) sideShade(ctx, x, y, false, '#cee2d27a');
    } else {
      // A shared world-space painted swatch avoids the tiled "little ponds"
      // appearance. Only the actual top of a connected pool has a waterline.
      swatch(ctx, image, 3, x, y);
      ctx.fillStyle = '#176a9e26';
      ctx.fillRect(x, y, 16, 16);
      if (!n) {
        const surface = ctx.createLinearGradient(0, y, 0, y + 7);
        surface.addColorStop(0, '#c7fff2af');
        surface.addColorStop(.4, '#65cfd570');
        surface.addColorStop(1, '#287eb000');
        ctx.fillStyle = surface;
        ctx.fillRect(x, y, 16, 7);
        // Continuous phase across every tile in the same water row.
        ctx.strokeStyle = '#e1fff0c7';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let dx = -1; dx <= 17; dx++) {
          const wx = x + dx;
          const wy = y + 1.5 + Math.sin(wx * .12 + time * 1.7) * .45;
          if (dx === -1) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      }
      if (!w) sideShade(ctx, x, y, true, '#9ce9db8c');
      if (!e) sideShade(ctx, x, y, false, '#9ce9db8c');
      if (!s) {
        ctx.fillStyle = '#073b6580';
        ctx.fillRect(x, y + 14, 16, 2);
      }
      if (!n && !w) {
        ctx.fillStyle = '#d8fff4a1';
        ctx.beginPath();ctx.arc(x, y, 3, 0, Math.PI / 2);ctx.fill();
      }
      if (!n && !e) {
        ctx.fillStyle = '#d8fff4a1';
        ctx.beginPath();ctx.arc(x + 16, y, 3, Math.PI / 2, Math.PI);ctx.fill();
      }
      if (n && w && !neighbors.nw) {
        ctx.strokeStyle = '#a2e9dd8c';
        ctx.beginPath();ctx.arc(x, y, 4, 0, Math.PI / 2);ctx.stroke();
      }
      if (n && e && !neighbors.ne) {
        ctx.strokeStyle = '#a2e9dd8c';
        ctx.beginPath();ctx.arc(x + 16, y, 4, Math.PI / 2, Math.PI);ctx.stroke();
      }
    }

    ctx.restore();
    return true;
  }

  return {background, landmark, tile, url, ready};
})();
