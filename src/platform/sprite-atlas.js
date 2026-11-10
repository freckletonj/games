window.WW = window.WW || {};
// Assets are embedded by scripts/build.mjs, so the single HTML works offline.
WW.spriteAtlas = (() => {
  const atlases = Object.fromEntries(Object.entries(window.WW_EMBEDDED_ATLASES || {}).map(([name, entry]) => {
    const image = new Image();
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(entry.source);
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
    const {frameWidth: w, frameHeight: h, worldScale: scale, origin} = manifest;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (flip) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, cell * w, 0, w, h,
      -origin.x * scale, -origin.y * scale, w * scale, h * scale);
    if (playerId !== null) {
      ctx.fillStyle = playerId === 0 ? '#ffd57f' : '#b4a0ff';
      ctx.fillRect(-5, -8, 10, 2);
    }
    ctx.restore();
    return true;
  }

  return {draw};
})();
