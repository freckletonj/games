window.WW = window.WW || {};
// Read-only visual assets. Physics and level semantics remain in game.js and levels.js.
WW.scenery = (() => {
  const sources = window.WW_EMBEDDED_SCENES || {};
  const images = Object.fromEntries(Object.entries(sources).map(([name, source]) => {
    const image = new Image();
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    return [name, image];
  }));

  function ready(name) {
    return images[name]?.complete && images[name].naturalWidth > 0;
  }

  function url(name) {
    return sources[name] ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sources[name]) : '';
  }

  // Wide panoramic image, with a bounded camera pan so no empty edges become visible.
  function background(ctx, biome, cameraX) {
    if (biome !== 'meadow' || !ready('backdrop')) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    const offset = Math.min(40, Math.max(0, cameraX * .023));
    ctx.drawImage(images.backdrop, -offset, -8, 520, 292);
    ctx.restore();
    return true;
  }

  // Drawn relative to a landmark's ground anchor, already translated by game.js.
  function landmark(ctx, biome, type, time) {
    if (biome !== 'meadow' || type !== 'tree' || !ready('lanternTree')) return false;
    ctx.save();
    ctx.rotate(Math.sin(time * .55) * .004);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(images.lanternTree, -91, -238, 182, 239);
    ctx.restore();
    return true;
  }

  // Art is snapped to the current 16-unit gameplay grid, without changing collision.
  function tile(ctx, biome, kind, x, y, variant, exposed) {
    if (biome !== 'meadow' || !ready('tiles')) return false;
    const index = kind === 'ground' ? (exposed ? 0 : 1) + (variant % 2) * 4
      : kind === 'platform' ? 2 + (variant % 2) * 4
      : kind === 'water' ? 3 + (variant % 2) * 4 : -1;
    if (index < 0) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(images.tiles, index * 64, 0, 64, 64, x, y, 16, 16);
    ctx.restore();
    return true;
  }

  return {background, landmark, tile, url, ready};
})();
