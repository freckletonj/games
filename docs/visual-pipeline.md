# Wonderwood visual asset and image-to-level pipeline

> Working design for the [Mosslight Meadow vertical slice](../README.md). This PR remains a draft while the asset system and level workflow are implemented and verified.

## Invariants

- Keep the existing 16-world-unit logical tile, authored geometry, animal AI, player physics, and traversal gating.
- The **semantic map** owns collision and interaction. Generated scene artwork is decorative and must never silently change navigation.
- The offline `dist/wonderwood.html` remains playable without external requests. Sprite sheets, manifests, and scene assets must be embedded at build time.
- Existing browser regression tests stay green; extend them for asset alignment and semantic import.
- No generated concept is considered a playable level until geometry and progression have been validated.

## Art direction: Mosslight Meadow

Painterly, luminous storybook forest. Deep blue-green silhouettes in the distance; warm gold lanterns, saturated moss, coral-pink Springaroo, crisp readable gameplay surfaces. Distinct foreground, playable midground, and misty background. Use soft falloff in large scenery, but preserve high-contrast silhouettes for characters and ledges. Avoid pixel-art upscaling, generated text, baked-in UI, and visually plausible platforms with no corresponding geometry.

The initial characters are the explorer and Springaroo. Required poses for a minimal sheet: idle, run, rise, fall, land, interact and happy. Keep the foot position and character scale consistent across frames. Generate separate transparent layers where possible, then trim and pack them deterministically; do not rely on image-generation output having perfectly aligned cells.

## Source files and runtime interface

- `src/assets/characters/<kind>/sheet.png`: RGBA atlas, fixed cell grid.
- `src/assets/characters/<kind>/manifest.json`: `frameWidth`, `frameHeight`, `origin` (foot pivot), `animations` mapping states to frame indices and fps.
- `src/assets/tiles/<biome>/`: tiles, overlays, optional prop atlases and manifests.
- `src/assets/scenes/<biome>/`: parallax plates and vignette assets.
- `src/platform/art.js`: transition from shape rendering to manifest-driven draw calls; keep existing fallback during migration.
- `scripts/build.mjs`: embed manifests and binary assets into the single-file distribution.
- `scripts/compile-semantic-level.py`: compile a palette-coded PNG mask into the current `{width,height,grid,objects}` level structure and diagnostics.

The runtime drawing API should accept the existing `WW.art.draw(ctx,kind,x,y,frame,flip,playerId,pose)` signature while switching internally to manifest-defined animation states. For sprites, `origin` is measured in source-sheet pixels relative to the drawn frame; for collision, keep using the existing game physics rather than alpha bounds.

## Image to level: two-image workflow

1. Generate a **beauty plate** (background/foreground layers, landmarks, palette).
2. Generate or paint a separate **semantic mask** using the repository palette in `src/platform/levels.js` and `scripts/make-levels.py`. Never parse foreground detail as if it were reliable collision data.
3. Quantize/majority-vote the semantic image into tiles. Keep error diagnostics for unknown or ambiguous colors.
4. Snap shapes to the logical grid; remove tiny accidental holes and isolated fragments only when doing so is safe. Require deliberate markers for spawn, exit, companions, and the required relic.
5. Validate object overlap, solid ground beneath spawn, collision adjacency, reachable routes, and ability-gated objectives. Emit explicit failures instead of pretending a repair proved playability.
6. Export `level.json`, a corrected semantic PNG, and a validation report. Run the existing physics tests (including `tests/routes.py`) before accepting a generated map.

Initial semantic compiler implementation is intentionally conservative: deterministic interpretation and diagnostics first, automatic reachability-changing repairs after physics-aware tests exist.

## First-slice review checklist

- [x] External character sprite atlas and manifest in the running game
- [ ] High-resolution scene/tiles with foot-anchor and tile-edge alignment tests
- [x] Deterministic semantic PNG compiler and tests
- [ ] Repair/validation report; unreachable or invalid objectives fail loudly
- [x] Single-file offline build embeds assets
- [x] Browser smoke/playability/route tests pass
- [x] Chromium-generated screenshots of the painted Meadow pass

## Generation prompt guardrails

**Explorer animation plate:** “Side-view charming storybook fantasy explorer, full body, consistent left-facing pose, clean silhouette and foot pivot, richly illustrated fabric detail, soft directional rim lighting, transparent background, no text, no drop shadow on background, character remains entirely within each frame.”

**Springaroo animation plate:** “One coral-pink rabbit-kangaroo woodland companion with long expressive ears, broad jumping feet and curled tail, hand-painted 2D game art with crisp contours, character turnaround matched between all poses, identical ground baseline, transparent background, no labels and no scenery.”

**Meadow environment plate:** “Side-scrolling enchanted meadow with colossal lantern trees, amber bioluminescence, moss terraces, mushrooms and layered teal forest mist, readable separated background/foreground planes, deliberately clear playable surfaces, no characters, no UI or text.”

Make pose images individually when atlas generation is inconsistent. Normalize alpha, pivot and silhouette scale before packing. Treat generative imagery as artwork, **not** authoritative geometry.

## Second character-art pass

Tidefox (`tideling`), Moonwing (`skyling`), and Emberkit now have small, transparent **WebP** atlases under `src/assets/characters/<kind>/sheet.webp`. These are new painted images assembled from original AI-rendered Wonderwood illustrations, with eight animation-state variations on the same foot line. They replace in-world procedural drawing and are embedded by the offline builder; the build validates WebP's VP8X image dimensions just as it validates PNG sheets.

**Art-quality caveat:** the eight frames currently use pose transforms around one source illustration, not independently hand-illustrated walk/jump/flight cycles. The remaining Mossback, Prismtail, Glimmermoth, and Cloudwhisp still use the procedural fallback. Full pose art, more detailed background layers, and tile-seam cleanup are separate follow-ups; no geometry or AI logic changed.

To replace a creature with polished, independently painted frames, supply eight RGBA PNGs in `src/assets/characters/<kind>/poses/`: `idle-0.png`, `idle-1.png`, `run-0.png` through `run-3.png`, `jump.png`, and `hurt.png`. Then run:

```bash
python scripts/pack-character.py src/assets/characters/<kind>
node scripts/build.mjs
python tests/character_packer.py
```

The packer trims transparent margins and applies **one shared scale** to all eight poses, aligns feet to the same origin, and writes an RGBA `sheet.png` plus compatible `manifest.json`. The source PNGs must already have transparency and a clean isolated character; it deliberately does not attempt automatic background removal. Additional actions may reuse painted frames until bespoke poses exist.

## Try the first pipeline slice

Install Pillow (the dependency already used by `scripts/make-levels.py`), then run:

```bash
python -m pip install pillow
python scripts/compile-semantic-level.py path/to/mosslight-semantic.png --pixels-per-tile 4 --out generated/meadow-01.level.json
python tests/semantic_pipeline.py
node scripts/build.mjs
```

The compiler writes the gameplay JSON, `generated/meadow-01.level.semantic.png` (grid-snapped, one pixel per tile), and a `generated/meadow-01.level.report.json` diagnostics file. A missing/unsafe start or exit fails export. A passing static report is **not** proof of reachability or ability gating; those require physics-based tests. In the game, use **Load PNG map** and select the compiled `.json` file to try it. The existing built-in chapters are unchanged.

Generated painted sheets are now committed as `src/assets/characters/hero/sheet.png` and `src/assets/characters/springaroo/sheet.png`, each in a 4×2 grid with eight animation frames and explicit foot anchors. Painted terrain is in `src/assets/tiles/meadow/tiles.png` and the background is `src/assets/scenes/meadow/backdrop.webp`. The renderer and `scripts/build.mjs` use these image files directly. Unused vector prototype sheets, backdrop and terrain have been removed; the lantern-tree landmark is the last SVG still used at runtime and needs a painted replacement. New character atlases are discovered automatically from their manifest and PNG on each build, with frame-grid validation. This is a first art integration, not a guarantee of perfectly seamless tiles or frame registration.

The compiled `dist/wonderwood.html` is generated instead of tracked: full-resolution embedded images make it large. Run `node scripts/build.mjs` locally or download the **wonderwood-playable-preview** artifact from the PR's passing GitHub Actions run.

## Seam-aware terrain rendering

The 4×2 Meadow painting is a **source swatch atlas**, not a collection of eight
interchangeable complete tiles. The runtime samples the *interior* of the painted
ground, platform and water cells, assembles mirrored 128-unit painted swatches into world-anchored textures,
then overlays only those cliffs, grass caps, platform ends and
shorelines that the eight neighboring **semantic** cells expose. This avoids
repeating a baked waterline down every row, and keeps the interior of long pools
continuous. Both convex and concave corners are handled. Variants no longer
randomly substitute incompatible border art.

The semantic PNG still specifies collision, not visual corners. One palette
pixel (or an N×N block when using --pixels-per-tile) describes one 16-unit
world tile; edge and corner artwork is derived automatically at runtime. A
beauty illustration may be used as the background but must not stand in for
this mask. Browser regression checks compare the painted pixels across two
adjacent ground and water cells.

## Consistent in-game bitmap import

The browser loader and the Python compiler both center-sample blocks, classify
against the exact palette with RGB Euclidean distance <= 36, ignore unknown
samples during the vote, and reject masks with more than 10% unknown samples.
Both require exactly one start and exit with a solid landing tile directly below
and reject keys placed on the bottom row. A proxy is a semantic layout, *not* a
reference photo or an RGB illustration. A hand-painted beauty plate may be
composited behind it without changing movement.

## Screen-reviewed biome pass

Chromium screenshots showed that a mirrored **16-unit** rock swatch still looked
like a tiled mosaic. The repeat period is now 256 world units, assembled from
reflections of a 128-unit painted interior. The cliff, floating ledge and water
cap are independent layers, so submerged earth does not sprout a grass border.
The tiny procedural foreground flowers were removed whenever painted tiles load.

Until separate Coast and Summit plates exist, the painted panorama is also
cropped and color-graded for those chapters. This is better than the low-res
placeholder mountain triangles, but the chapters still need their own genuinely
different paintings. No art reuse changes movement, quests, or collision.

A compiled JSON can declare `"biome": "meadow" | "coast" | "summit"`; the
in-game PNG import form has the matching scenery selector. This lets the same
proxy collision layout be visualized with different painted backdrops and
terrain color treatments, without changing its gameplay cells.

The eight-neighbor renderer now handles the bottom-left and bottom-right
concave/convex shoreline and rock shoulders as well as the upper corners.
Browser tests compare each missing diagonal against an interior tile for
both water and ground, in addition to testing visible alpha continuity
across terrain cell boundaries.

## Illustrated gameplay props

Signs, checkpoint flags, gates, star shards and quest lights now render through
`src/platform/props.js`. They are layered, anti-aliased canvas art with stone
facets, wood grain, lantern lighting and biome-specific accents, replacing
single-color rectangular placeholders. This is a visual-only change: collision,
interactions, coordinates, objectives and checkpoint state still come from the
semantic level and gameplay logic. Locked and unlocked gate visuals have
distinctive lighting and color, checked by Chromium pixel regression tests.

## Wildlife illustration refinement

Mossback, Prismtail, Glimmermoth and Cloudwhisp now have volumetric
gradient-shaded silhouettes in the procedural fallback, with botanical shell
details, a refracted-color tail, translucent veined wings and layered cloud
lighting, respectively. This is an intermediate visual refinement, **not** a
claim that those four have independently painted, frame-by-frame sprite atlases.
They still use the same world-space pivots, animations and creature logic;
the next asset-production pass can replace them by adding normal character
atlases and manifests. Browser tests check four distinct visible silhouettes
and that their idle/run states differ.
