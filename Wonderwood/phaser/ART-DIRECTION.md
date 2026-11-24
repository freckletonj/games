# Painting a Wonderwood chapter

The compiled level supplies the geometry. One cell equals 16 world pixels.
Author one continuous scene per chapter and register the painting to those
world coordinates. Keep creatures, pickups, exits, thermals, and UI as
separate gameplay elements.

## Export the material guide

Run from the repository root:

```sh
node phaser/scripts/export-art-guides.mjs
node phaser/scripts/export-cave-guides.mjs
```

For the surface chapters, each directory under `dist/art-guides/<chapter>/`
contains the same bitmap contract used in `dist/cave-guides/`.

| File | Purpose |
| --- | --- |
| `world-physical-rock.png` | Whole-scene image reference with navy air, purple ground and rock, cyan water, amber one-way ledges, and orange climb walls where present |
| `world-static-solid.png` | World-sized alpha mask for ground, rock, ledges, and climb walls |
| `world-static-water.png` | World-sized alpha mask for water, with air and solids transparent |

The surface exporter also writes annotated SVG, PNG, and JSON references
next to the chapter directories for inspection. Use the PNG inside each
chapter directory as the image model's input. It contains only materials.

## Register the painting

1. Condition the image model on the whole-scene guide. Prompt for one
   side-view panorama with readable ledge tops, shorelines, and ground
   edges. Use unambiguous distant scenery in air and keep interactive props
   out of the painting.
2. Inspect the composition against the full-resolution guide and align
   ground, ledges, and water to the actual mask. The existing surface
   art is preview resolution, fitted to the compiled coordinates. For
   native detail, refine overlapping views of that same approved
   composition and stitch before exporting game textures.
3. Store the finished WebP under `phaser/assets/generated/surface-scenes/`
   and register it in `phaser/assets/generated/approved-scene-art.json`.
   A single panorama may use more source pixels than the world. Keep the
   same aspect ratio and a maximum texture edge of 4096 pixels. The
   renderer fits it to the existing world size.
   The `scene` array lists strips from left to right. For paintings wider
   than 4096 pixels, cut the finished painting into contiguous strips.
   Record the seams against world coordinates. The renderer maps each
   strip's share of the source width to the same share of the world and
   scales all strips to the world height. Skywell uses the same
   registry and renderer with separate background, water, and solid layers.
4. Run `npm run check --prefix phaser`, open the standalone HTML, and use
   **V** to compare the art with collision at gameplay zoom. Check
   shorelines from both sides, ledge tops, and strip boundaries. Run the
   Chromium suites via `bash phaser/scripts/verify-cave-local.sh full` and
   check a downloaded build in Firefox when available.

See [the cave pipeline](CAVE-ART-PIPELINE.md) for separate alpha layer
extraction and overlap-aware painting refinement.

For a painted scene with moving objects, see the
[Clockwork Orchard workflow](DYNAMIC-SCENE-ART.md).

## First Forest refinement

First Forest uses a 3256 × 1144 painting in a 2368 × 832 world. Crop the
approved composition and material guide into three 912 × 832 regions at
world x-coordinates 0, 728, and 1456. Request high-resolution detail
refinement from the matching art and guide crop. Include the already
refined overlap on the left where available and preserve its composition
and lighting. Each of the three native returns was 1313 × 1198.

Downsample each accepted return to 1254 × 1144. Stitch at x-coordinates
0, 1001, and 2002, with 253 pixels of horizontal overlap. Use
`scripts/stitch-cave-painting.py` with its existing plan format and
`--max-seam-error 24`. The First Forest joins measured 18.74 and
14.22 in mean absolute RGB error for their most different channels.

Preserve the painted contacts with the registered source and the exact
material guide before encoding the panorama as WebP.

```sh
python phaser/scripts/protect-scene-edges.py \
  dist/art-guides/first-forest/world-physical-rock.png \
  approved-first-forest.webp stitched-first-forest.png protected-first-forest.png
```

The script feathers the approved painting around material boundaries
while keeping the refined bark, foliage, and rock interiors. Review the
protected result at 2× gameplay zoom and check that each ledge still has
one readable edge before replacing the registered texture.

## Crystal Coast refinement

Crystal Coast keeps its 4704 × 960 world and uses a 5145 × 1050 painting.
Crop the registered painting and guide into 1368 × 960 regions at x 0,
1112, 2224, and 3336. The four native returns were 1497 × 1051. Fit them
to 1497 × 1050 and use the approved crop's broad values and colors to
match lighting through each overlap. Protect terrain edges with a 28-world-pixel
margin before stitching. At x 0, 1216, 2432, and 3648 the 281-pixel overlaps
measured 11.88, 8.51, and 9.63 mean absolute RGB error in their highest channels.

At full scale the first stitched proof showed faint duplicate ledges.
Composite the approved painting around ledges out to 44 world pixels,
feathering to the refined art at 78. Check the shoreline, ledge, and strip
seams at 2×. Cut the final painting at source x 2240 and 4480, which match
world x 2048 and 4096, and export each strip as WebP.
