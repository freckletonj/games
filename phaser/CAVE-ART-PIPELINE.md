> **Art pipeline update:** [STATIC-ART-CONTRACT.md](STATIC-ART-CONTRACT.md)
> supersedes the low-resolution resize/tint/paint-wedges workflow described
> below. The legacy compositor is retained only to reproduce the existing
> draft asset. The new exporter produces one full-world semantic image and
> physics-derived RGBA solid and water masks, and the extraction script
> operates on an approved **native-resolution whole-scene painting**.
> No such replacement artwork has yet been approved or integrated into the
> playable Phaser runtime.
>
# Code-authored single-image caves: Luminous Grotto and Skywell Ascent

Luminous Grotto (Chapter 6) and Skywell Ascent (Chapter 7) each have
**one code-defined world, one fully colored material guide, and one full-level
illustration**. The Luminous painting is model-generated; Skywell uses a fully integrated, geometry-masked, image-model-generated
painting. A deterministic SVG remains only as the exportable art reference. It deliberately has
no tiles, chunk stitching, or parallax planes. Phaser's normal player,
creature, collectible, and transformation systems remain separate.

## How the prototype works

The code-defined geometry in `phaser/src/cave-layout.js` is authoritative.
`compileCave` turns the smooth Catmull–Rom/Hermite roof and floor control
points into collision surfaces, swimming regions, one-way platforms, and
object anchors. The guide exporter samples exactly the same geometry.
`phaser/src/cave-renderer.js` displays the painting once at world origin;
the art is never used for collision.

The authored world is **3200 × 1792 world pixels** (200 × 112 cells, 16
pixels per cell). The currently approved painting is a **1672 × 941** PNG
at `phaser/assets/generated/luminous-grotto-single.png`, displayed at the
full world dimensions. It is an approved visual prototype, not an exact
regeneration from the final geometry guide.

## Reproduce and test locally

Run from the repository root with Node, Phaser 4, esbuild, Python Playwright
and Chromium installed:

```sh
npm install --prefix phaser
node phaser/scripts/export-cave-guides.mjs
bash phaser/scripts/verify-cave-local.sh
# Include all the older chapters' real-input browser regressions:
bash phaser/scripts/verify-cave-local.sh full
```

`export-cave-guides.mjs` writes three Luminous files to `dist/cave-guides/`:
`world-physical-rock.png` (the 3200 × 1792 static guide),
`world-physical-rock.svg` (editable vector representation), and
`manifest.json` (dimensions, painting path, suggested prompt).
The same exporter also writes
`dist/cave-guides/skywell-ascent/world-physical-rock.png`,
`world-physical-rock.svg`, `world-painted-reference.svg` and
`manifest.json`. The separate skywell manifest requests **the highest native
resolution available from the image model** and lists exact static-only
geometry constraints. The local verifier tests the code, exports the guides,
bundles one offline
`dist/wonderwood-phaser.html`, runs Chromium checks using the existing
inline-browser adapter, and creates a uniquely named
`dist/wonderwood-cave-preview-*.html` for review. GitHub Actions remains
intentionally disabled.

Select **Luminous Grotto** (Chapter 6) or **Skywell Ascent** (Chapter 7)
in the HTML. The Grotto camera now uses 1.25× zoom and Skywell uses 1.4×,
instead of the old 0.82× Grotto framing. Press **V** to inspect
the material-filled physical floor, roof, basins, platforms and climbable
wall faces over the illustration. **G** remains creature capture.

## Make or regenerate the next painting

1. **Design gameplay first.** Edit `caveLayout` in
   `phaser/src/cave-layout.js`. Its `width` and `height` are in 16px
   cells. Define `ceiling` and `floor` as sorted `[x,y]` control points
   (positive y is downward), with enough physical clearance between them.
   `compileCave` rejects invalid contours.
2. **Define static physical features.** Pools use
   `{id,from,to,surface}`, where x bounds and the horizontal water surface
   are in cells. Water exists only below that surface **and above the actual
   floor**. Shelves use `{x,y,length}` for their real landing tops.
   The `objects` array places players, creatures, keys, pickups, checkpoints
   and exits; these are *dynamic game entities*, not background pixels.
3. **Export the guide.** Run `node phaser/scripts/export-cave-guides.mjs`.
   The guides use dark blue for navigable air, purple for physical rock,
   cyan for **fully filled water**, gold for one-way ledges, and orange for
   **solid climbable wall faces**. Both the PNG and SVG come from the same
   compiled physics geometry, with rock covering water below each floor. Check the **entire**
   guide for visually unexpected floors or blocked pools before painting.
4. **Generate a single complete image.** Give the PNG guide and the
   `manifest.json` prompt to an image model. Ask for the model's **maximum native output resolution** at the
   exact aspect ratio of the selected level (Grotto **3200:1792**;
   Skywell **3520:2048**), or the closest available ratio. Do not substitute
   a low-resolution image and simply upscale it. Keep every traversable rock edge, platform and waterline
   in the same location. No tiling, crops or separate visual planes.
5. **Keep dynamic objects out.** Do not generate the player, creatures,
   pickups, goal, signs, HUD or moving effects into the painting.
   Place only static scenery, such as wet rock, moss, crystals, light shafts
   and static waterfall surroundings.
6. **Integrate one asset.** Save the returned PNG as
   `phaser/assets/generated/luminous-grotto-single.png`. Build again.
   Esbuild embeds this image directly into the standalone HTML.
7. **Playtest with V enabled.** Check movement and swim routes across
   the full level, compare every painted shore/ledge to its actual collider,
   and check that the exit/goal can be reached through normal inputs.
   When physics changes, export a **new guide** and repaint; never use
   artwork as the collision source.

Suggested image-model prompt, used together with the exported guide:

> One cohesive, high-quality, hand-painted 2D side-view magical water
> cave. Preserve the guide's exact roof, floor, exposed rock islands,
> water surfaces, pool boundaries and marked landing ledges. Elaborate
> with mossy limestone, luminous minerals, scenic waterfalls and soft
> cave light *without moving physical boundaries*. Show static scenery
> only, no player, creatures, pickups, UI, effects, captions or text.
> One full image, not tiles. Do not paint swimmable water through solid rock.

Image generation is an **authoring step**, not an in-game service or a
function of the exporter. The generated image's pixel dimensions need not
be 3200 × 1792, but preserving the world aspect ratio avoids anisotropic
scaling and improves geometry alignment.

## Adding another code-authored chapter

This is a working **two-chapter example**, not a generic automatic
image-to-chapter system. Skywell demonstrates the second authored chapter:
`skywellLayout` in `cave-layout.js`, `skywell-chapter.js`,
`skywell-painting.js`, and explicit chapter registration in `game.js`.
The guide exporter compiles **both** level specs. For future levels,
register a new spec, picture and chapter explicitly rather than inferring
collision from paintings. Keeping the same layout→guide→painting contract is more important
than building another generalized renderer.

## Known issue, intentionally deferred

A physically rising floor interrupts a section that *looks* swimmable in
the approved painting. **We are not changing that geometry in this pass.**
The art was made before the final guide and does not perfectly reflect it;
water is bounded by the code-defined floor, whatever the pixels suggest.
A later iteration should adjust the authored floor or repaint the *single*
image against an updated guide, and verify the intended swim route.

The current collision representation is one heightfield roof and floor
per x coordinate, not arbitrary overlapping tunnel polygons. The entire
pearl-to-exit route still needs a real-input completion test.

## Merge procedure

PR #8 is **stacked on PR #7**, which supplies the Phaser engine.
Keep GitHub Actions off. Before merging, run
`bash phaser/scripts/verify-cave-local.sh full` on a complete checkout
at PR #8's *exact head*, inspect its new HTML in Chromium, and confirm
the painting's provenance. Previous visual review used a verified PR #7
runtime plus PR #8 cave logic, **not a fresh esbuild of PR #8's exact head**.
PR #8 currently targets PR #7's feature branch, **not main**. Either
merge #8 into #7 and later merge #7 to main, or first merge #7 to main,
retarget/rebase #8 to main, then merge #8. Verify the resulting branch
before the final main merge; do not assume merging #8 now lands it on main.
The accepted water-art mismatch is documented and not a surprise blocker.

## Skywell Ascent: climbable walls and image-model handoff

Skywell is a 220 × 128-cell / **3520 × 2048 world-pixel** level. It has
26 elevated physical shelves (including intermediate climbing perches and an optional Moonwing upper loop) and 10 narrow, **solid** climbing walls.
Running into a wall below its top blocks crossing. Jump beside it and tap
jump again while airborne to rebound upward from the wall. The wall jump
has an 11-tick cooldown and works for every form. Glimmermoth is near
the dry starting area; its hover helps to reach the upper lantern.
The collectible is placed above the high route, with a checkpoint on the
lower route. **These placements are prototypes; a full player-input
completion route has not yet been proven.**

The runtime now paints Skywell from the 3520 × 2048, full-world,
model-generated, geometry-masked WebP. The exported SVG illustration from
`skywellPaintingSvg` remains a separate authoring reference and is not
runtime art. It shares roof, floor, filled water,
shelf and wall boundaries with the gameplay code.

To regenerate or improve the **integrated AI-generated painting**:

1. Export the Skywell PNG/SVG materials and inspect the colored fills.
2. Give the image model the Skywell PNG, optional SVG illustration and
   `dist/cave-guides/skywell-ascent/manifest.json`. Select the model's
   largest native resolution and the nearest 55:32 aspect ratio.
3. Reject outputs moving any solid boundary or showing dynamic actors,
   objects, key, exit or UI. If artwork clashes with collision, change
   the code and re-export instead of altering physics to match pixels.
4. Save the approved result to
   `phaser/assets/generated/skywell-ascent.webp` using the compositor below.
   The game already imports this exact file; rebuild to embed it in the
   standalone HTML. Keep the single full-level image and `paintCave` logic.
5. Run `bash phaser/scripts/verify-cave-local.sh full` and play the new
   HTML through the high route with **V** enabled. Do not merge based
   only on PNG/SVG tests or a screenshot.

This iteration intentionally keeps the single-image renderer. Per-layer
parallax, tiled diffusion refinement and arbitrary stacked tunnel polygons
would require additional explicit physics and image-layer contracts; they
have not been implemented or implied by the illustration.

## Integrated Skywell model-generated painting (current PR head)

The production runtime now embeds **one 3520 × 2048 WebP**, at
`phaser/assets/generated/skywell-ascent.webp`, rather than loading the
procedural SVG reference. This was produced from an image-model source
(**1644 × 957 native pixels**, the maximum returned by the generator).
The native source is retained as
`phaser/assets/generated/skywell-model-source.webp` (quality-90 conversion
of the original generator PNG)
with the independent geometry-alignment compositor in
`phaser/scripts/compose-painted-cave.py`. The native source is not falsely
claimed to have been generated at 3520 × 2048; the compositor outputs a
full-size 3520 × 2048 bitmap, with the model's texture preserved and actual
solid rock, air, water, ledge and climbing-wall materials enforced from code.

Use `python -m pip install pillow numpy` if these optional authoring
dependencies are absent, then from the repository root run:

```sh
python phaser/scripts/compose-painted-cave.py phaser/assets/generated/skywell-model-source.webp
node phaser/scripts/export-cave-guides.mjs
npm run build --prefix phaser
bash phaser/scripts/verify-cave-local.sh full
```

The generated artwork must contain no player, creatures, collectibles, gate,
text or UI. Do not treat image-model platforms as collision: this compositor
relegates unapproved shapes to a blurred distant backdrop and explicitly
highlights only physically registered ledges and wall faces. The full-
resolution static painting is the only runtime Skywell scenery texture.

## Playable HTML versus physics-only inspector

The exported `world-painted-reference.svg` and standalone alignment
inspector are authoring aids, **not** runnable game previews. For the
self-contained Phaser game, run `npm run build --prefix phaser` and open
`dist/wonderwood-phaser.html#skywell-ascent`. The URL fragment selects
Skywell on the chapter menu; click **Begin adventure**. For a distinct
verified download, run `bash phaser/scripts/package-preview.sh focused`.

Firefox may restrict `localStorage` on downloaded `file://` pages.
The standalone build now uses a session-only progress ledger for those
origins. Hosted HTTP(S) builds retain persistent progress. The loading
screen displays errors rather than failing silently, and the optional
`PLAYWRIGHT_FIREFOX=1` local verification checks the real Firefox
file-origin path (run `python -m playwright install firefox` first).
The inline Chromium adapter retains hash fragments and uses the bundled
artwork and real engine, not a replacement physics simulator.

The new browser smoke includes star-treat selection, both Glimmermoth
feedings, capture, transformation and a physical wall-jump. The pure
simulation tests separately prove the 10-wall route reaches the lantern
and exit. **Browser tests and a complete real-game finish are still required
on the exact PR head before merging.**
