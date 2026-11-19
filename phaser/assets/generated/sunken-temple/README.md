# Sunken Temple: generated painted candidate (PR #19)

These WebP textures are AI image-model artwork integrated as a reviewable
visual candidate. They replace the old graybox painting **without changing**
authored terrain, collision, timers, buoyancy, valves, water masks, or route
progression.

## Source and registration

- **Painting generation:** image-model-created hand-painted temple panorama,
  2172 × 724 source pixels (global side-view composition).
- **Static runtime layers:** `background.webp` and `solid.webp`, each
  **3584 × 1024 world pixels**. The background is derived only from atmospheric
  source pixels so it cannot depict stale water or false fixed platforms.
  The painted rock texture was world-registered against the compiled
  heightfield and material guides; `solid.webp` uses the **exact compiled
  static-solid alpha** including the stone weir and one-way shelves.
- **Moving objects:** independently image-model-painted source-sheet cutouts,
  matte-extracted into true-alpha `raft.webp`, `crate.webp`,
  `valve.webp`, `sluice-gate.webp`, `wheel-gate.webp`,
  `waterwheel.webp`, and `bridge.webp`.
  The registered sprite ID → texture mapping is in
  `../approved-scene-art.json`. Reuse preserves the authored pivots and
  sizes in `src/temple-scene.js` and `levels/sunken-temple.json`.
- **Dynamic rendering:** four independently clipped basins and live water
  surfaces stay in `src/temple-scene.js`, **not** in the static textures.
  Gates, raft/crate support, rotation and bridge visibility use the
  60 Hz production rules.

This is real generated imagery, *not* the earlier hand-authored SVG study.
The original image-model return has fewer pixels than the 3584-pixel world.
The high-resolution runtime files are **geometry-registered resampling**, not
new model-native fine detail. A later overlapping-crop detail pass is needed
before claiming genuinely native-detail final art. The moving sprite sheet
was originally an image-model presentation sheet with a light background;
its sprites were independently cropped and alpha-matted before registration.
Fine edge cleanup and final human aesthetic approval are still required.

## Validation

Run:

```sh
node phaser/scripts/export-future-chapter-guides.mjs sunken-temple
python phaser/tests/temple_painted_art.py
npm test --prefix phaser
npm run build --prefix phaser
```

The mask verification compares every pixel of the painted solid's alpha
against `dist/future-chapter-guides/sunken-temple/world-static-solid.png`
and ensures no collision material overlaps the static water alpha.
The full offline game and ordinary browser input still need visual inspection
at gameplay zoom with **V**, especially the crate socket, moving raft edges,
opening gates and both final bridges. Existing unrelated gameplay-test
failures must be resolved before the chapter is considered release-ready.
