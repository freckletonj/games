# Single-image level authoring: Luminous Grotto

Luminous Grotto is a sixth chapter built from **one code-defined world, one
static guide image, and one complete painted background**. It deliberately has
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

`export-cave-guides.mjs` writes exactly three files to `dist/cave-guides/`:
`world-physical-rock.png` (the 3200 × 1792 static guide),
`world-physical-rock.svg` (editable vector representation), and
`manifest.json` (dimensions, painting path, suggested prompt).
The local verifier tests the code, exports the guide, bundles one offline
`dist/wonderwood-phaser.html`, runs Chromium checks using the existing
inline-browser adapter, and creates a uniquely named
`dist/wonderwood-cave-preview-*.html` for review. GitHub Actions remains
intentionally disabled.

Select **Luminous Grotto** (Chapter 6) in the HTML. Press **V** to overlay the
physical floor, roof, waterlines and platforms. **G** remains creature capture.

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
   The guide uses dark blue for navigable air, purple for physical rock,
   cyan for water, and amber for one-way ledges. Check the **entire**
   guide for visually unexpected floors or blocked pools before painting.
4. **Generate a single complete image.** Give the PNG guide and the
   `manifest.json` prompt to an image model. Ask for the highest practical
   resolution at the exact **3200:1792 aspect ratio**, or as close as the
   model supports. Keep every traversable rock edge, platform and waterline
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

This is presently a working **single chapter example**, not a generic
automatic image-to-chapter system. A second level needs a new layout,
chapter metadata and painting, plus explicit registration/selection in
`phaser/src/game.js` (as currently done for `grottoChapter`).
The guide exporter currently calls `compileCave()` with the default
Luminous Grotto layout; select the new layout explicitly when exporting
its guide. Keeping the same layout→guide→painting contract is more important
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
