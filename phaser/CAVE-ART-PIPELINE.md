# Physics-first painted level authoring

The game should be visually authored as **one coherent scene**, with collision
and gameplay designed and validated in code. The painter never invents
physical surfaces. The final world-locked solid painting is one transparent
image layer, even if it was refined using multiple overlapping image-model
requests during authoring.

## Which version is authoritative?

The last commit before the November 12 conversation was
`09bba5146abd`: **Luminous Grotto**, one code-defined scene, one complete
material guide, one full-world painting. Earlier PR #8 history
(`5b3e4eee401d`) had also explored high-resolution overlapping chunks and
parallax planes; those were removed to simplify the initial proof. The
subsequent Skywell level demonstrated wall-jumping but drifted into an
unacceptable 1644 × 957 image stretched to 3520 × 2048, with isolated
geometric overlays. That artwork is a **legacy draft, not final visual art**.

The current reconstruction combines the sound parts:

- A *single semantic physical model*, not geometry inferred from a painting.
- One full-world, material-filled image to condition a **global composition**.
- Real **2D rock polygons** for overhangs and undersides in the new vaulted
  authoring study; the older levels retain their tested heightfield physics.
- Optional overlapping, high-resolution **authoring** crops, all derived
  from the same world coordinate system and global art reference. They are
  assembled before being used in the game; there are no runtime tile seams.
- A single world-locked **static-solid RGBA painting**, a separate world-locked
  water plane, and optionally a genuinely distinct *noninteractive* distant
  painting allowed to parallax. Players and collectible objects are sprites.

The technical contracts are in [STATIC-ART-CONTRACT.md](STATIC-ART-CONTRACT.md).

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
| `refinement/plan.json` | Six overlap-aware, world-coordinate image-model crop requests |
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
`phaser/assets/generated/approved-cave-art.json` are activated. The
initial registry is `{}` because no new high-resolution painting has yet
passed review. After art approval, add a record for the **registered, actual
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

## Verification and merge gate

```sh
npm test --prefix phaser
python phaser/tests/art_stitch.py
bash phaser/scripts/verify-cave-local.sh full
PLAYWRIGHT_FIREFOX=1 bash phaser/scripts/verify-cave-local.sh full
```

The authoring scripts require Pillow; the browser suites require Playwright
Chromium and (optionally) Firefox. This PR is deliberately draft and GitHub
Actions must stay disabled. The tests for polygon contact, material masks,
cropped-overlap coordinates and a continuous 10-wall-jump route are included,
but a finished vaulted image and a complete exact-head browser validation
have **not** been produced by this art-restoration pass.

The present polygon model handles additional solid overhangs while preserving
the existing heightfield foundation. It does **not yet** support independent
stacked walkable tunnels carved below the ground heightfield, or guarantee
that every optional path is reachable in every creature form.

## Reproducible checkouts

Direct checkout remains the preferred method. When a tool environment can
read GitHub through an app but cannot `git clone` to its local filesystem,
run `bash phaser/scripts/package-source-snapshot.sh` in a working checkout,
and upload the exact-commit checksummed ZIP to that environment. Do not
commit a second giant source ZIP after every source edit; keep the Git branch
authoritative. The pinned dependency archives are already vendored under
`phaser/vendor/` for offline Linux x86_64 builds.
