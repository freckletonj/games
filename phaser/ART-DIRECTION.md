# Wonderwood art contract and merge-facing visual QA

The compiled world is authoritative: **1 semantic cell = 16 world pixels**.
The Phaser camera uses 2× zoom. Large painterly assets may be authored at
2× pixel density and displayed at 0.5× their texture dimensions; this is
critical for ledges, where the visible top must agree with collision.

## Layer and scale contract

| Role | Approximate scene depth | Visual treatment |
| --- | ---: | --- |
| Panoramic painting | -100 | Chapter-specific, subdued, overscanned to avoid frame gaps |
| Distant atmospheric light | -95 to -86 | Broad translucent washes; no apparent collision edges |
| Vista/landmark | -43 to -35 | Behind terrain; desaturated and smaller than actors |
| Continuous solid terrain | -29 | Organic, slope-clipped color/material; compiler supplies outline |
| One-way landing shelves | -18 | Flat at collision y; painted tapered underside; no false width |
| Functional creatures | 12–24 | Native painted atlas, visible foot pivot and ground shadow |
| Explorer | 30+ | Original form identity, clear face direction and silhouette |
| Contact/ability VFX | 37+ | Brief and localized; never masquerade as a collectible |

Source textures must not be stretched non-uniformly. A sprite that is larger
or brighter than nearby creatures will be read as interactive: keep natural
dressing muted and subordinate to pickup, hazard and ability silhouettes.
New creature poses must preserve the existing manifest frame origins.

## Chapter palettes and art direction

Mosslight Meadow: moss greens and warm gold, diffuse canopy leaves and
low-contrast shafts of sunlight. Its Chapter 1-only art lives in
`phaser/src/meadow-art.js` and uses supersampled transparent canvases.

Crystal Coast: sea-glass cyan, muted turquoise and blue-grey shore stone.
Starfall Summit: slate/lavender rock and frosted highlights. Willow
Wetlands and Cloud Gardens currently reuse coast/summit backdrop families:
**chapter-exclusive panoramas remain a merge-quality gap**.

The style is painterly with softened edges and coherent light, not pixel
art, flat iconography, generic white outlines or dense procedural particles.
Decorative art must never conceal a landing zone, enemy tell, waterline
or objective marker.

## Geometry-constrained painting input

Generate consistent source masks via:

```sh
node phaser/scripts/export-art-guides.mjs
```

The command writes each chapter's `dist/art-guides/<chapter>.svg` and
`<chapter>.json`. The SVG contains independently addressable
**solid terrain, water, platform-top, object-anchor and goal-route** layers
at exactly the semantic compiler coordinates. The JSON preserves pixel
positions, platform collision spans, vistas and encounter sections.

Use the masks as constraints for layered illustration/inpainting. Keep
the gameplay geometry, platform widths and water surfaces fixed. Do not
generate a single poster containing visual platforms with different
collision locations. Paint separately at higher resolution and render
with known scale and source provenance. The editable guides are published
as a CI artifact, alongside the playable build and screenshots.

## Quality gates

1. Keep the full no-state-mutation Meadow route, idle standing on both
   upper platforms, actual creature-back bounce and mount/swim regressions.
2. Inspect matching camera positions for opening, slopes, ledges, water,
   transformation, objective and mounted flight in the Chromium artifacts.
3. Check alternate 640×360 and portrait HUD/menu presentations. Track
   background gaps and overlapping text, not merely overall image quality.
4. Test painterly soil and ledge textures against WebGL texture dimension
   limits. The soil now uses contiguous 768px strips; each chapter's strip
   extents are checked in CI and old scene textures are freed on exit.
5. New art needs recorded authorship/license, palette rationale and
   an in-context screenshot before being added. The source inventory is
   `phaser/ASSETS.md`.

These automated gates do **not** prove subjective quality or controller
ergonomics. Physical controllers, human playtesting and full campaign
completion are still required before merge.
