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
   The `scene` array lists strips from left to right. For worlds wider than
   4096 pixels, cut the finished painting into contiguous native-sized
   strips, currently 2048 pixels wide except the last strip. This fits
   common WebGL limits and keeps the art continuous. Skywell uses the same
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
