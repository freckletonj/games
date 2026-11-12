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

## First static-only generated art integration

Two image-model-painted, **static-only** cavern paintings now ship as local WebP:
`assets/generated/luminous-grotto-rock.webp` and
`assets/generated/luminous-grotto-ambient.webp`. Both were generated from
a structural guide showing **only** the authored ceiling, floor, two bounded
water chambers and ledges. They intentionally have no characters, HUD,
creatures, collectibles, projectiles, signs, bubbles, or moving effects.

The rock painting is divided into non-overlapping 48-cell-wide runtime chunks.
Their crop boundaries are computed from the absolute world span, not from a
repeating texture pattern. The painterly source is drawn **only** inside masks
formed from the same roof, floor and water coordinates that the simulation
uses. Waterlines and solid shelves remain geometry-driven. The second
painting provides a subdued atmospheric backdrop; a second lighter parallax
plane remains procedural. All assets are embedded by esbuild in the one-file
offline HTML. No image-generation service is invoked at runtime.

These are **first-pass, full-level 16:9 paintings**, encoded at 1280x720 for
this prototype. The physical world is 2560x992; therefore the artistic image
is stretched to the canonical world-space guide coordinates. Geometry masks
make collision exact but cannot guarantee that **internal painted features**
match the physical boundary pixel-for-pixel. The next quality pass should
generate each 768x992 chunk from its own exact-aspect static guide, blend
4-cell overlaps and reject visible collision/art mismatch. The artist must
never decide or move colliders.

The artwork comes from model-generated scenery, not from baked gameplay
screenshots. Keeping dynamic objects out of the generation prompt prevents
duplicate creatures and HUD elements during player movement.

### Reproducibility checks

`npm test --prefix phaser` verifies the packaged WebP blobs, no-gap source
crops and water physics. The existing Phaser workflow now also runs
`phaser/tests/cave_painted.py` against the exact built standalone HTML:
it checks both art textures load without external requests, four terrain
chunks span the world, and a real keyboard input moves the real player in
Chromium. The script saves `dist/phaser-grotto-painted.png` for visual
comparison.

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

**Limitations:** this remains a vertical slice, not final production
art. The generated rock detail is substantially richer than the procedural
placeholder but the 16:9 source is resampled to the physical world ratio,
so detailed edge registration is approximate; the occlusion guide is
intentionally conservative. Player collision uses a
continuous floor and roof; complex overhangs, tunnels, variable vertical
walkable chambers at the same x coordinate, and full wall contact for
projectiles require a generalized polygon collision engine later. The
existing player keeps the stage's 2D sideways-scroll perspective, not
full volumetric 3D caves. Existing gameplay browser tests must still be
run locally on the actual built HTML before treating the level as finished.
