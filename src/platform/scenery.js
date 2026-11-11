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
    const source={meadow:'backdrop',coast:'coastBackdrop',summit:'summitBackdrop'}[biome];
    if(!source||!ready(source))return false;
    ctx.save();
    ctx.imageSmoothingEnabled=true;
    const offset=Math.min(40,Math.max(0,cameraX*.023));
    ctx.drawImage(images[source],-offset,-8,520,292);
    ctx.restore();
    return true;
  }

  function landmark(ctx, biome, type, time) {
    const types = {
      tree:['lanternTree',154,198],
      crystal:['crystal',108,126],
      reef:['reef',115,100],
      observatory:['observatory',117,145],
      island:['island',129,116],
      pond:['pond',118,71],
      lantern:['lantern',62,91],
      shells:['shells',110,78]
    };
    const asset=types[type];
    if(!asset)return false;
    ctx.save();
    ctx.translate(0,Math.sin(time*.8)*.65);
    const drawn=WW.illustrations.draw(ctx,asset[0],0,1,asset[1],asset[2],.97);
    ctx.restore();
    return drawn;
  }

  // Mirrored swatches repeat seamlessly in WORLD coordinates. Surface caps use
  // a 16-unit-high strip so their painted highlight starts at the same height
  // on every ledge, regardless of the platform's world Y position.
  function makePaint(image, column, top, x0, y0, width, height, tone) {
    const cw = image.naturalWidth / 4, ch = image.naturalHeight / 2;
    const px = 128, py = top ? 16 : 128;
    const canvas = document.createElement('canvas');
    canvas.width = px * 2;
    canvas.height = top ? py : py * 2;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    for (let row = 0; row < (top ? 1 : 2); row++) for (let col = 0; col < 2; col++) {
      g.save();
      g.translate(col ? px * 2 : 0, row ? py * 2 : 0);
      g.scale(col ? -1 : 1, row ? -1 : 1);
      g.drawImage(image, column * cw + cw * x0, ch * y0, cw * width, ch * height, 0, 0, px, py);
      g.restore();
    }
    if (tone) {
      // Keep the original painting's luminosity and brush texture while
      // giving each biome actual materials, not a blanket hue rotation that
      // can turn coastal water purple and alpine stone green.
      g.save();
      g.globalCompositeOperation = 'color';
      g.globalAlpha = .82;
      g.fillStyle = tone;
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.restore();
    }
    return g.createPattern(canvas, 'repeat');
  }

  const materialTones = {
    meadow: {},
    coast: {
      ground: '#9c8774', groundTop: '#c0b69b',
      platform: '#9aafb6', platformTop: '#c6d5ce', water: '#3e9fbe'
    },
    summit: {
      ground: '#666386', groundTop: '#aca5c5',
      platform: '#7e81a6', platformTop: '#c9c6dd', water: '#568bb5'
    }
  };
  const edgeTones = {
    meadow: {rim:'#b4ddaf91',corner:'#173b4977',left:'#182d3a66',right:'#a6d0b13d'},
    coast: {rim:'#d7e6c091',corner:'#456c7877',left:'#273f5066',right:'#c2e5dd50'},
    summit: {rim:'#d0c8e791',corner:'#3d426677',left:'#20284366',right:'#d2c9f050'}
  };
  const paints = {};
  function textures(biome) {
    if (!paints[biome]) {
      const image = images.tiles;
      const tones = materialTones[biome] || materialTones.meadow;
      paints[biome] = {
        ground: makePaint(image, 1, false, .15, .28, .70, .63, tones.ground),
        groundTop: makePaint(image, 0, true, .12, .19, .76, .28, tones.groundTop),
        platform: makePaint(image, 2, false, .16, .36, .68, .46, tones.platform),
        platformTop: makePaint(image, 2, true, .16, .23, .68, .22, tones.platformTop),
        water: makePaint(image, 3, false, .19, .51, .62, .43, tones.water)
      };
    }
    return paints[biome];
  }

  function sideShade(ctx, x, y, left, color) {
    const gradient = ctx.createLinearGradient(left ? x : x + 12, y, left ? x + 4 : x + 16, y);
    gradient.addColorStop(0, left ? color : 'transparent');
    gradient.addColorStop(1, left ? 'transparent' : color);
    ctx.fillStyle = gradient;
    ctx.fillRect(left ? x : x + 12, y, 4, 16);
  }

  // Neighbor flags represent same-kind cells; north is the actual terrain
  // above. Collisions always follow the untouched semantic grid.
  function tile(ctx, biome, kind, x, y, variant, neighbors = {}, time = 0) {
    if (!ready('tiles') || !['ground', 'platform', 'water'].includes(kind)) return false;
    const p = textures(biome), edge = edgeTones[biome] || edgeTones.meadow;
    const n = !!neighbors.n, e = !!neighbors.e, s = !!neighbors.s, w = !!neighbors.w;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.beginPath();
    ctx.rect(x, y, 16, 16);
    ctx.clip();
    ctx.fillStyle = p[kind];
    ctx.fillRect(x, y, 16, 16);

    if (kind === 'ground') {
      if (!n && neighbors.north === 'water') {
        // Submerged soil is not a grassy surface beneath an inland pool.
        const silt = ctx.createLinearGradient(0, y, 0, y + 10);
        silt.addColorStop(0, '#2d9bb3a3');
        silt.addColorStop(1, '#265c7100');
        ctx.fillStyle = silt;
        ctx.fillRect(x, y, 16, 10);
      } else if (!n) {
        ctx.fillStyle = p.groundTop;
        ctx.fillRect(x, y, 16, 7);
        const fade = ctx.createLinearGradient(0, y + 3, 0, y + 10);
        fade.addColorStop(0, '#5b997c30');
        fade.addColorStop(1, '#254c5900');
        ctx.fillStyle = fade;
        ctx.fillRect(x, y + 3, 16, 7);
      }
      if (!w) sideShade(ctx, x, y, true, edge.left);
      if (!e) sideShade(ctx, x, y, false, edge.right);
      if (!s) {ctx.fillStyle = '#1d36424d'; ctx.fillRect(x, y + 13, 16, 3);}
      ctx.strokeStyle = edge.rim;
      ctx.lineWidth = 1.5;
      if (!n && !w) {
        ctx.beginPath(); ctx.moveTo(x, y + 6);
        ctx.quadraticCurveTo(x, y, x + 6, y); ctx.stroke();
      }
      if (!n && !e) {
        ctx.beginPath(); ctx.moveTo(x + 10, y);
        ctx.quadraticCurveTo(x + 16, y, x + 16, y + 6); ctx.stroke();
      }
      ctx.strokeStyle = edge.corner;
      if (n && w && !neighbors.nw) {
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI / 2); ctx.stroke();
      }
      if (n && e && !neighbors.ne) {
        ctx.beginPath(); ctx.arc(x + 16, y, 5, Math.PI / 2, Math.PI); ctx.stroke();
      }
      if (s && w && !neighbors.sw) {
        ctx.beginPath(); ctx.arc(x, y + 16, 5, -Math.PI / 2, 0); ctx.stroke();
      }
      if (s && e && !neighbors.se) {
        ctx.beginPath(); ctx.arc(x + 16, y + 16, 5, Math.PI, 3 * Math.PI / 2); ctx.stroke();
      }
      // Bottom convex cliff shoulders are rock, never painted grass.
      if (!s && !w) {
        ctx.beginPath(); ctx.moveTo(x, y + 10);
        ctx.quadraticCurveTo(x, y + 16, x + 6, y + 16); ctx.stroke();
      }
      if (!s && !e) {
        ctx.beginPath(); ctx.moveTo(x + 10, y + 16);
        ctx.quadraticCurveTo(x + 16, y + 16, x + 16, y + 10); ctx.stroke();
      }
    } else if (kind === 'platform') {
      if (!n) {ctx.fillStyle = p.platformTop; ctx.fillRect(x, y, 16, 7);}
      ctx.fillStyle = '#213c5473';
      ctx.fillRect(x, y + 13, 16, 3);
      if (!w) sideShade(ctx, x, y, true, '#294253a6');
      if (!e) sideShade(ctx, x, y, false, '#cee2d27a');
    } else {
      ctx.fillStyle = '#176a9e26';
      ctx.fillRect(x, y, 16, 16);
      if (!n) {
        const surface = ctx.createLinearGradient(0, y, 0, y + 7);
        surface.addColorStop(0, '#c7fff2af');
        surface.addColorStop(.4, '#65cfd570');
        surface.addColorStop(1, '#287eb000');
        ctx.fillStyle = surface;
        ctx.fillRect(x, y, 16, 7);
        // A single wave phase across a pool; never a new crest per cell.
        ctx.strokeStyle = '#e1fff0c7';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let dx = -1; dx <= 17; dx++) {
          const wx = x + dx, wy = y + 1.5 + Math.sin(wx * .12 + time * 1.7) * .45;
          if (dx === -1) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      }
      if (!w) sideShade(ctx, x, y, true, '#9ce9db8c');
      if (!e) sideShade(ctx, x, y, false, '#9ce9db8c');
      if (!s) {ctx.fillStyle = '#073b6580'; ctx.fillRect(x, y + 14, 16, 2);}
      ctx.fillStyle = '#d8fff4a1';
      if (!n && !w) {ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI / 2); ctx.fill();}
      if (!n && !e) {ctx.beginPath(); ctx.arc(x + 16, y, 3, Math.PI / 2, Math.PI); ctx.fill();}
      ctx.strokeStyle = '#a2e9dd8c';
      if (n && w && !neighbors.nw) {ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI / 2); ctx.stroke();}
      if (n && e && !neighbors.ne) {ctx.beginPath(); ctx.arc(x + 16, y, 4, Math.PI / 2, Math.PI); ctx.stroke();}
      if (s && w && !neighbors.sw) {ctx.beginPath(); ctx.arc(x, y + 16, 4, -Math.PI / 2, 0); ctx.stroke();}
      if (s && e && !neighbors.se) {ctx.beginPath(); ctx.arc(x + 16, y + 16, 4, Math.PI, 3 * Math.PI / 2); ctx.stroke();}
      if (!s && !w) {ctx.beginPath(); ctx.arc(x, y + 16, 3, -Math.PI / 2, 0); ctx.stroke();}
      if (!s && !e) {ctx.beginPath(); ctx.arc(x + 16, y + 16, 3, Math.PI, 3 * Math.PI / 2); ctx.stroke();}
    }
    ctx.restore();
    return true;
  }

  return {background, landmark, tile, url, ready};
})();
