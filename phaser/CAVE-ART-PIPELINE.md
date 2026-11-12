# Luminous Grotto: single-image level authoring

The sixth chapter follows the approved HTML trial: one software-defined level,
one smooth static guide, one full-level generated image, and one playable
Phaser scene. No tiling, image chunks, seam blending, or parallax planes.

## One authoritative geometry definition

Edit `phaser/src/cave-layout.js`. Floor and roof are smooth cubic splines;
the water regions, ledges, and object anchors are code-authored in the same
file. Movement, swimming, collision overlay and exported guide use that
exact geometry. Dynamic players, creatures, pickups, and UI stay separate.

The world is **3200 x 1792 pixels**. The approved background is the original
**1672 x 941 model-generated PNG** at
`phaser/assets/generated/luminous-grotto-single.png`. It is drawn exactly
once across the entire world with scroll factor 1. No decorative image
controls physics. Use **V** in game to compare the image against the collision splines.
The G key remains available for the existing creature-capture action.

## Authoring and local verification

```sh
npm install --prefix phaser
npm test --prefix phaser
node phaser/scripts/export-cave-guides.mjs
npm run build --prefix phaser
bash phaser/scripts/verify-cave-local.sh
```

The guide exporter writes only three files to `dist/cave-guides/`:
`world-physical-rock.png` (a 3200 x 1792 static-only control image),
`world-physical-rock.svg` (editable vector guide), and `manifest.json`.

Feed the *whole* guide to an image model and request one complete 16:9
side-view painting, preserving roof, floor, water and ledge positions.
Exclude actors, animals, pickups, signs, projectiles, effects and UI.
Replace only `phaser/assets/generated/luminous-grotto-single.png` and
rebuild. The result is `dist/wonderwood-phaser.html`, one offline game file.

The local verification script builds that HTML, tests Node simulation,
runs real Chromium keyboard tests with the inline browser adapter,
exports the guide and copies the playable file under a unique name.
Use `bash phaser/scripts/verify-cave-local.sh full` to include the
original five chapters' browser regression suites.
GitHub Actions remains intentionally disabled; no CI is needed.

## What this trial does and does not prove

The painting is exactly the one approved in the standalone demo. It was
not regenerated from this newly exported guide, so small visual/collision
misalignments remain possible; toggle G to inspect them.
The playable engine retains the side-scrolling heightfield physics model
and existing Phaser creature/transform systems. Arbitrary polygon caves
and multiple simultaneous levels at the same x position are out of scope.
