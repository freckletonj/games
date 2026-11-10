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
