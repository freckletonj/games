# Luminous Grotto: geometry-first image-model painting experiment

The playable optional sixth chapter is authored in `src/cave-layout.js`.
It is deliberately **not another heightfield-only painted landscape**: its
physical cave ceiling, physical floor, submerged pools and one-way shelves
share the same authored cell coordinates as the exported color-wireframe SVG
guides. Objects and creatures are separate runtime data.

## Pipeline

```sh
cd phaser
npm test
node scripts/export-cave-guides.mjs
npm run build
```

The exporter writes `dist/cave-guides/manifest.json` plus four static mask
layers per chunk. Chunks are 48 cells wide with 4-cell overlaps, all in
**absolute world coordinates** and 16 pixels per unit cell.

Feed the corresponding SVG mask and the manifest's per-plane prompt to an
image model; request a painting in the exact SVG pixel dimensions.
The physical-rock mask shows rock in purple, submerged water in cyan, and
one-way ledge tops in amber. Foreground masks isolate ceiling occlusion.
Do not send object positions, enemy sprites, collectible anchors or HUD into
the diffusion image inputs. The world image should remain static art.

Generated output should retain exactly the original pixel dimensions, not
auto-crop or scale. Blend overlapping painted chunks in the overlap strip.
The prototype renderer currently paints a deterministic cave texture in
bounded canvases, a proof that the coordinate mapping works without waiting
for image-model credentials or making online inference a build requirement.
Its shelves and waterlines match the physics coordinates. Image swapping and
seam blending are a subsequent integration task, not yet shipped.

The physical cave geometry is authoritative regardless of artwork. The
ceilings block the player, and the water chamber controls swimming. The
existing ground-heightfield locomotion drives the cave floor. The new
chapter is selectable in the ordinary chapter menu, at the end of the
existing campaign. The original five chapters are unchanged.

### What to evaluate

Walk down the entrance into the first flooded bowl, befriend a Tidefox,
transform to swim and dive, then travel through the dry connecting island
into the deeper sanctuary. Take the Grotto Pearl and return through the
right-hand exit. Check that the cave's ceiling blocks upward travel and
that no water extends beyond the rock geometry. Compare the exported SVG
guides to screenshots of the geometry at identical x coordinates.

**Limitations:** this is a vertical slice, not finished commissioned
diffusion artwork. The current procedural rock coloring has texture and
atmospheric lighting but not the detail an image model can provide; the
occlusion guide is intentionally conservative. Player collision uses a
continuous floor and roof; complex overhangs, tunnels, variable vertical
walkable chambers at the same x coordinate, and full wall contact for
projectiles require a generalized polygon collision engine later. The
existing player keeps the stage's 2D sideways-scroll perspective, not
full volumetric 3D caves. Existing gameplay browser tests must still be
run locally on the actual built HTML before treating the level as finished.
