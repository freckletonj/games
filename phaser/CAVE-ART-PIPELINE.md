# Luminous Grotto: geometry-first painted level prototype

The optional sixth chapter is code-authored in `src/cave-layout.js`. Its roof,
floor, bounded water, and shelves are authoritative for physics and rendering.
Players, creatures, pickups and the UI are excluded from all art guides.

## End-to-end workflow

```sh
npm install --prefix phaser
npm test --prefix phaser
node phaser/scripts/export-cave-guides.mjs --hires
npm run build --prefix phaser
python phaser/tests/cave_painted.py  # requires Playwright and Chromium
```

The exporter writes `dist/cave-guides/world-physical-rock.png`: a full,
2560×992, static-only reference bitmap in the level's actual aspect ratio.
It also writes an SVG equivalent, `manifest.json` and PNG/SVG guides for
every chunk and static depth plane. Purple = solid rock; cyan = bounded
swimmable water; amber = one-way shelves; dark blue = air.

The four canonical painted chunks cover `[0,48]`, `[44,92]`, `[88,136]`,
and `[132,160]` in absolute world cells. Each has a four-cell overlap.
The manifest gives each chunk's recommended 2× image-model output size,
as well as per-plane prompts and parallax values. With `--hires` the
per-chunk PNG control images are also 2×; the default is 1×.

Give an image model the master control first for artistic continuity.
Then provide each chunk's own PNG guide, the corresponding manifest prompt
and paintings of adjacent chunks as references. Request the exact listed
width and height, preserving the geometry, waterline and overlap edges.
Never add characters, signs, collectibles, projectiles, UI or movable effects.

Save the painted image output to, for example:

```text
phaser/assets/generated/cave-chunks/chunk-00-physical-rock.webp
phaser/assets/generated/cave-chunks/chunk-01-physical-rock.webp
phaser/assets/generated/cave-chunks/chunk-02-physical-rock.webp
phaser/assets/generated/cave-chunks/chunk-03-physical-rock.webp
```

PNG is also accepted. All four chunk files for a plane are required;
the build rejects incomplete planes. Optional planes are `distant-arches`,
`mist-and-crystals`, and `foreground-occlusion`, using the same filename
format. The esbuild step discovers and embeds any complete planes into
the single-file offline `dist/wonderwood-phaser.html` automatically.
No image model or network service is invoked at game runtime.

## Runtime behavior

Physical-rock art is drawn only within the exact authored roof, floor and
water polygons. New chunks crossfade over the preceding opaque chunk across
their shared four-cell overlap, avoiding see-through seams. The rock scroll
factor is 1 (fixed to physics). The distant plane uses scroll factor 0.16,
the mist plane 0.34; neither repeats a wallpaper tile. Optional foreground
art is clipped to the roof and drawn above the player for depth.
Press **G** while playing to compare physical contours to rendered painting.

The two existing generated WebP illustrations provide a complete fallback
when no per-chunk paintings are present. They are 1280×720 full-world
drafts, stretched to the 2560×992 authored world. They establish the
rendering concept, but are **not** genuine high-resolution per-chunk art;
that requires image-model outputs saved under `assets/generated/cave-chunks`.

## Validation and limitations

`npm test --prefix phaser` checks source masks, exported PNG pixel samples,
chunk geometry and swimming collision. The Playwright regression tests
actual player movement, loaded painted textures and offline resource usage
in the built HTML. GitHub Actions is configured to upload the HTML as
`wonderwood-phaser-playable` and guides as `luminous-grotto-guides`.

The cave is a side-scrolling heightfield with two underwater bowls and
one-way shelves, not a general polygon-tunnel collision system. Image
generation remains a human-driven external step; the pipeline deliberately
does not change collision when paintings are replaced.

## Local-only verification (GitHub Actions intentionally disabled)

PR #7 already provides the local-first verification scripts and a Chromium
workflow. Do **not** enable or rerun Actions. From a complete checkout with
Phaser/esbuild dependencies and Playwright/Chromium installed:

```sh
bash phaser/scripts/verify-cave-local.sh
# Before merging, include all five existing chapters' browser routes:
bash phaser/scripts/verify-cave-local.sh full
```

The wrapper runs the real standalone Phaser build, checks gameplay in Chromium,
generates the full-level and 2× cave painting guides, verifies the cave's live
physics/art alignment, and copies the **newly built** playable HTML to a unique
timestamp-and-content-hash filename. The output is a self-contained offline
HTML; no GitHub Actions artifacts are needed.

For a quick **independent layout/painting experiment**, a separate offline
HTML preview can be built without Phaser; unlike the standalone Phaser game,
its small canvas movement loop is not a validation of transformations, animal
AI, pickups, or campaign completion. Keep the two verification targets distinct.
