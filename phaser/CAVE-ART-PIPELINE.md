# Physics-first painted level authoring

The game should be visually authored as **one coherent scene**, with collision
and gameplay designed and validated in code. The painter never invents
physical surfaces. The final world-locked solid painting is one transparent
image layer, even if it was refined using multiple overlapping image-model
requests during authoring.

The compiled level geometry supplies the material guide and masks. Luminous Grotto and Skywell Ascent are playable caves. The separate vaulted study adds polygonal overhangs and overlapping crops for future native-resolution art. See the [static art contract](STATIC-ART-CONTRACT.md) for the layer requirements.

## Export the geometry without generating fake scenic objects

```sh
node phaser/scripts/export-cave-guides.mjs
```

This exports the current Luminous Grotto and Skywell, plus a third **authoring
study** under `dist/cave-guides/skywell-vault-study/`. The study extends
Skywell with three irregular ceiling-connected rock polygons whose collision
is tested as real 2D geometry. It is not registered as a playable chapter
until matching, approved artwork exists.

The study directory includes:

| Output | Purpose |
| --- | --- |
| `world-physical-rock.png` | Complete 3520 × 2048 guide: rock purple, open air navy, water cyan, climb walls orange, one-way ledge bodies gold |
| `world-static-solid.png` | Same-size RGBA rock, ledges and walls; transparent water and air |
| `world-static-water.png` | Same-size RGBA water; transparent physical rock and air |
| `world-physical-rock.svg` | Editable, exact-coordinate semantic reference |
| `manifest.json` | Art provenance, dimensions and layer semantics |
| `refinement/plan.json` | Nine overlap-aware, world-coordinate image-model crop requests |
| `refinement/x*-y*-guide.png` | Region-specific guides **sampled from the exact global geometry** |

The PNG generator uses the same `level.materialColumn(x)(y)` as the physics
grid and water tests. A polygon drawn as rock in the guide is a collider,
not a decorative vector that can be walked through. The physics model never
uses image pixels to decide where the player can stand.

## Paint a whole scene, then refine at native resolution

1. Design the level: solid geometry, physical platforms, water, player and
   transformed-creature movement, checkpoints and goals. Use the normal
   movement engine to prove an unbroken route. Don't encode actors or items
   into the guide.
2. Supply **the entire** material-filled PNG plus the semantic prompt to an
   image model. Ask it to paint one complete cavern environment, respecting
   the exact topology. The result is the composition reference, not a valid
   high-resolution final game texture if its native size is smaller.
3. For each entry in `refinement/plan.json`, condition the model on that
   exact full-resolution crop **and** the approved global composition and
   previously generated neighboring crops. Request the patch's specified
   native width and height; never stretch a small returned image and claim
   new detail. Save each approved output beside the guide using the
   `painting` filename from the plan.
4. Assemble **one** world-sized static painting, with overlap checks:

   ```sh
   python phaser/scripts/stitch-cave-painting.py \
     dist/cave-guides/skywell-vault-study/refinement/plan.json \
     --output dist/painted-layers/skywell-vault-study/whole-scene.png
   ```

   The assembler checks all adjacent painting overlaps and rejects
   inconsistent color/geometry. A numerical seam pass does **not** replace
   visual approval of physical borders, material continuity and style.
5. Split the **approved full scene** by the code-generated transparency
   masks, not by newly generated wedge art or Photoshop-like brush strokes:

   ```sh
   python phaser/scripts/extract-painted-layers.py \
     dist/painted-layers/skywell-vault-study/whole-scene.png \
     --guide-dir dist/cave-guides/skywell-vault-study \
     --output phaser/assets/generated/skywell-vault-study
   ```

   Pillow is used **only during authoring**. This process does not resize
   image pixels, invent a rock edge, draw an SVG in-game, or alter color.

If using a distant parallax painting, it must be independently authored
without deceptive walkable surfaces. It is **not** a blurred copy of rock,
which would render a second misaligned copy of the physical cave.

## Put the approved RGBA images into the actual HTML build

Only assets named in
`phaser/assets/generated/approved-scene-art.json` are activated. For playable Skywell, the registry now selects the user's **Ancient Sanctuary**
painting as a **preview-quality composited scene**, with world-locked air,
water, and solid RGBA images and backgroundScrollFactor=1. The image was
generated at 1644 × 957 and resampled to 3520 × 2048; this is NOT genuine
native full-world detail. The vaulted rock study still lacks matching art. After art approval, add a record for the **registered, actual
playable chapter ID** with `solid` and `water` paths; `background` is
optional:

```json
{
  "skywell-ascent": {
    "solid": "phaser/assets/generated/skywell-ascent/painted-solid.png",
    "water": "phaser/assets/generated/skywell-ascent/painted-water.png",
    "background": "phaser/assets/generated/skywell-ascent/painted-background.png"
  }
}
```

That example is for a painting generated against **skywell-ascent geometry**.
Do **not** register vaulted-study paintings under that ID: the shapes differ.
First explicitly make the vaulted layout the playable chapter or register a
new chapter ID, then use the matching art record. The build embeds all
approved images in the single HTML and fails if a registered file is missing.
The renderer locks solid and water to the world; parallax is applied only
to a distinct background. It does not draw individual rock and ledge vectors
during normal gameplay; **V** shows a diagnostic overlay only.

## Verification

```sh
python phaser/tests/art_stitch.py
bash phaser/scripts/verify-cave-local.sh full
```

The authoring scripts require Pillow. The browser suite requires
Playwright Chromium. With Playwright Firefox installed, set
`PLAYWRIGHT_FIREFOX=1` to test the downloaded-file origin too.

The polygon model supports solid overhangs above the heightfield.
Independent walkable tunnels below the heightfield would require
additional collision support.

## User-selected Ancient Sanctuary painting for playable Skywell

The second image-model variation, featuring the warm stone sanctuary and
golden shafts of light, is integrated into **skywell-ascent** (Chapter 7)
at `phaser/assets/generated/skywell-ancient/`:

- `skywell-ancient-source.webp`: faithful WebP copy of the selected
  1644 × 957 generated image.
- `painted-solid.webp`: the whole-world solid rock, one-way ledge, and
  climb-wall image, with alpha derived only from `compileCave(skywellLayout)`.
- `painted-water.webp`: the same composition, clipped to code-defined
  water material.
- `painted-background.webp`: the same composition, clipped to traversable
  air and **world-locked**. This is not an independent parallax painting.
- `art-provenance.json`: generation/source dimensions and alpha provenance.

The **approved-scene-art.json** registry explicitly selects these images.
The actual game renderer loads and draws all three; there are no vector
scenery sprites in normal play. The earlier opaque Skywell image and wedge compositor were removed from
the working tree; their provenance is preserved in Git history.

The selected original is smaller than the world. Its resampling enables
pixel-aligned inspection at 3520 × 2048, but is not an acceptable replacement
for the later nine native-detail refinement crops. Run
`python phaser/scripts/bake-selected-skywell.py --verify` after exporting
guides to confirm that all three alpha channels still match compiled physics.
Use `--write` if the authored Skywell geometry changes.

**Never install this image under the vaulted study:** its three extra
polygon solids are not represented in the chosen painting.
