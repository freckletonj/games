window.WW = window.WW || {};
// Sprite sheets are embedded by scripts/build.mjs for offline, single-file play.
WW.spriteAtlas = (() => {
  const portraits = {};
  const atlases = Object.fromEntries(Object.entries(window.WW_EMBEDDED_ATLASES || {}).map(([name, entry]) => {
    const image = new Image();
    image.src = entry.image;
    return [name, {image, manifest: entry.manifest}];
  }));

  function draw(ctx, name, x, y, frame = 0, flip = false, playerId = null, pose = {}) {
    const asset = atlases[name];
    if (!asset || !asset.image.complete || !asset.image.naturalWidth) return false;
    const {manifest, image} = asset;
    const state = manifest.animations[pose.action] || manifest.animations.idle;
    const seconds = pose.time ?? frame / 3;
    const index = Math.floor(Math.max(0, seconds) * state.fps) % state.frames.length;
    const cell = state.frames[index];
    const {frameWidth: w, frameHeight: h, worldScale: scale, origin, columns} = manifest;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (flip) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = true;
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
    if (!asset || !asset.image.complete || !asset.image.naturalWidth) return null;
    const {frameWidth:w, frameHeight:h} = asset.manifest;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(asset.image, 0, 0, w, h, 0, 0, 128, 128);
    portraits[name] = canvas.toDataURL('image/png');
    return portraits[name];
  }

  return {draw,portrait};
})();
