window.WW = window.WW || {};
// Sprite sheets are embedded by scripts/build.mjs for offline, single-file play.
WW.spriteAtlas = (() => {
  const portraits = {};
  const atlases = Object.fromEntries(Object.entries(window.WW_EMBEDDED_ATLASES || {}).map(([name, entry]) => {
    const image = new Image();
    const asset={image, manifest:entry.manifest, ready:false};
    image.addEventListener('load', () => {
      asset.image=WW.paintCleanup(image);
      asset.ready=true;
      const src = portrait(name);
      for (const element of document.querySelectorAll(`img[data-sprite="${name}"]`)) {
        element.src = src;
      }
    });
    image.src = entry.image;
    return [name, asset];
  }));

  function draw(ctx, name, x, y, frame = 0, flip = false, playerId = null, pose = {}) {
    const asset = atlases[name];
    if (!asset?.ready) return false;
    const {manifest, image} = asset;
    const action = pose.action || 'idle';
    const state = manifest.animations[action] || manifest.animations.idle;
    const seconds = Math.max(0, pose.time ?? frame / 3);
    const index = Math.floor(seconds * state.fps) % state.frames.length;
    const cell = state.frames[index];
    const {frameWidth: w, frameHeight: h, worldScale: scale, origin, columns} = manifest;

    // Subtle secondary animation adds life to painted frames without moving the foot pivot.
    const stride = seconds * state.fps * Math.PI / 2;
    const breath = Math.sin(seconds * 3);
    let stretchX = 1, stretchY = 1, lean = 0, rise = 0;
    if (action === 'idle') {
      stretchX -= breath * .008;
      stretchY += breath * .013;
    } else if (action === 'run') {
      stretchX += Math.sin(stride) * .025;
      stretchY -= Math.sin(stride) * .019;
      lean = Math.cos(stride) * .028;
      rise = -Math.abs(Math.sin(stride)) * 1.1;
    } else if (action === 'jump') {
      stretchX = .96;
      stretchY = 1.05;
      rise = -1.1;
    } else if (action === 'fall') {
      stretchX = 1.04;
      stretchY = .96;
    } else if (action === 'eat') {
      stretchX = 1.035;
      stretchY = .95;
    } else if (action === 'happy') {
      rise = -Math.abs(Math.sin(seconds * 7)) * 1.7;
      lean = Math.sin(seconds * 4) * .025;
    } else if (action === 'hurt') {
      lean = Math.sin(seconds * 23) * .045;
      stretchY = .97;
    } else if (action === 'sleep') {
      stretchX = 1.065;
      stretchY = .83;
    } else if (action === 'alert') {
      stretchY = 1.035;
    }

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (playerId !== null && pose.grounded) {
      ctx.fillStyle = 'rgba(14,36,47,.23)';
      ctx.beginPath();
      ctx.ellipse(0, .4, 12, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (flip) ctx.scale(-1, 1);
    ctx.translate(0, rise);
    ctx.transform(stretchX, 0, lean, stretchY, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, cell % columns * w, Math.floor(cell / columns) * h, w, h,
      -origin.x * scale, -origin.y * scale, w * scale, h * scale);
    if (playerId !== null) {
      ctx.fillStyle = playerId === 0 ? '#ffd57f' : '#b4a0ff';
      ctx.fillRect(-5, -8, 10, 2);
    }
    ctx.restore();
    return true;
  }

  function portrait(name) {
    if (portraits[name]) return portraits[name];
    const asset = atlases[name];
    if (!asset?.ready) return null;
    const {frameWidth:w, frameHeight:h, columns, animations} = asset.manifest;
    const frame = animations.idle.frames[0];
    const sx = frame % columns * w, sy = Math.floor(frame / columns) * h;
    // Crop the transparent cell padding without stretching wide creatures into
    // squares. The portrait and in-world sprite now retain the same silhouette.
    const source = document.createElement('canvas');
    source.width = w;
    source.height = h;
    const sourceCtx = source.getContext('2d', {willReadFrequently:true});
    sourceCtx.drawImage(asset.image, sx, sy, w, h, 0, 0, w, h);
    const pixels = sourceCtx.getImageData(0, 0, w, h).data;
    let left=w, top=h, right=0, bottom=0;
    for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
      if (pixels[(y*w+x)*4+3] <= 12) continue;
      left=Math.min(left,x);right=Math.max(right,x);
      top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    const width=right-left+1, height=bottom-top+1;
    const scale=Math.min(112/width,112/height);
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(asset.image, sx+left, sy+top, width, height,
      (128-width*scale)/2, (128-height*scale)/2, width*scale, height*scale);
    portraits[name] = canvas.toDataURL('image/png');
    return portraits[name];
  }

  return {draw,portrait};
})();
