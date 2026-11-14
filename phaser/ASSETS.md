# Third-party assets and visual cohesion

## Surface chapter panoramas

The five paintings in `phaser/assets/generated/surface-scenes/` were
created with OpenAI image generation, conditioned on each chapter's
compiled material guide and the existing Skywell painting as a style
reference. The ground profiles and shorelines were fitted to the exact
guide. The draft ledges were cleaned up and painted ledge detail was
aligned to the compiled one-way spans. The last four scenes are stored
as contiguous strips cut from one finished composition per chapter.

| Chapter | Generated source | Registered world |
| --- | --- | --- |
| Mosslight Meadow | 2115 × 744 | 2368 × 832 |
| Crystal Coast | 2172 × 724 | 4704 × 960 |
| Starfall Summit | 2172 × 724 | 4960 × 1184 |
| Willow Wetlands | 2172 × 724 | 5184 × 992 |
| Cloud Gardens | 2172 × 724 | 5408 × 1280 |

The registered dimensions describe placement. These are resized preview
paintings, with scope for a later native-detail art pass.

## Luminous Grotto single-image painting (PR #8)

`phaser/assets/generated/luminous-grotto-single.png` is the approved
**1672 × 941** single-frame cave painting generated using OpenAI image
generation during the November 12, 2026 Luminous Grotto prototype.
It was not imported from ArtByte, Kenney, or a third-party image search.
The 3200 × 1792 static guide can be regenerated from
`phaser/src/cave-layout.js` as described in
[CAVE-ART-PIPELINE.md](CAVE-ART-PIPELINE.md). The existing painting predates
that final guide, so the appearance of some water/rock boundaries is not
perfectly collision-aligned; this known issue is accepted for the
initial proof of concept. Actors, items, effects and UI are separate
existing gameplay assets; they are not part of the cave painting.

The baseline Wonderwood game uses original generated painterly character sheets,
slope materials, props and chapter backgrounds from the repo's `src/assets/`.
The Phaser renderer **does not use the original low-resolution Kenney tree/pine/
bush PNGs as main scenery**. They clashed with the hand-painted sprites.

## Historical ArtByte attribution

Earlier Wonderwood revisions used cropped, scaled and tinted images from
ArtByte’s [2D Platformer Forest Kit](https://opengameart.org/content/2d-platformer-forest-kit)
under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The original
source PNGs are available in Git history. The current Phaser scenes align their painted ledges to the compiled platform spans.

## Supplemental CC0 assets

Three small sky images (cloud1, cloud3, moonFull) from Kenney's
[Background Elements Remastered](https://kenney.nl/assets/background-elements-redux)
remain in use at low opacity in the title screen.
Their license is [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
Mirror: https://github.com/shorepine/kenney/tree/main/2d/Background%20Elements%20Remastered

## Other whole-game candidates evaluated

- [Tio Aimar's 2D Platformer series](https://opengameart.org/content/2d-platformer-forest-pack)
  (CC0): matching forest, desert, snow and objects packs. Strong choice if
  we decide to adopt a completely uniform replacement art direction.
- [Ansimuz SunnyLand Forest](https://ansimuz.itch.io/sunnyland-forest)
  (CC0): an unusually complete set of tilemaps, characters, animations,
  enemies and a Phaser demo. However, its pixel-art style conflicts with
  Wonderwood's current painterly character assets.
- [GameArt2D Freebies](https://www.gameart2d.com/freebies.html)
  (CC0 for Freebies only): coordinated non-pixel characters, tiles and UI.
  Paid items have a different license and are **not** considered CC0.

All new asset provenance is recorded here. Do not import art from image
search or a commercial asset marketplace without verifying redistribution
rights for that specific file. This game remains original Wonderwood
gameplay and characters rather than a reskin of an existing game's code.

## Animation and creature asset audit (Mosslight Meadow)

The existing **hero, Springaroo, Glimmermoth, Emberkit and Mossback**
use hand-painted, internally consistent 8-pose character sheets from
`src/assets/characters/` (the core scenes reuse all nine form atlases).
Those assets retain character identity when the hero transforms.

They now share an action contract that includes explicit animation timing,
consistent foot origins and velocity-dependent secondary motion. A future
external character must provide at least stable idle/move/hurt poses,
a documented foot pivot, consistent facings and a redistributable license.
Preferred size is a compact, atlas-friendly frame set for the offline HTML.

We evaluated existing candidates rather than downloading an unrelated
character style indiscriminately:

- **LudicArts Forest Fiends** — hand-painted walking tree and mushroom
  creatures with 10-frame walk/idle/dizzy/hurt animations; CC BY 4.0,
  https://opengameart.org/content/forest-fiends-free-character-pack.
  Excellent match for *additional forest NPCs* but the offered ZIP is 79 MB
  on OpenGameArt; cannot inline it as-is. Not bundled.
- **SpriteCanvas Mushroom** — compact CC0 animated monster, 5 actions,
  80 aligned frames with a Phaser-ready JSON atlas,
  https://spritecanvas.com/free-sprite-sheets/mushroom/.
  A strong candidate for a first distinct gentle forest enemy; it has a
  more rendered appearance and must be tested in context before adoption.
  Not bundled.

The critical distinction: **external pack candidates are researched, not
claimed as imported**. The visible gameplay art reuses the original
Wonderwood character sprites, original biome illustrations, and subtle Kenney skies.

## Original painted mounts returned from PR #6

`src/assets/characters/unicorn/` and
`src/assets/characters/pegasus/` are the **original original-Wonderwood
painted, transparent AVIF sheets and manifests** authored in
[PR #6](https://github.com/freckletonj/games/pull/6), not outside assets
or drawn procedural horse silhouettes. Both have four gallop frames,
idle, jump/flight, a recovery frame, 160×160 frame cells and calibrated
saddle positions. They are embedded in the offline Phaser HTML directly.
The protagonist is rendered separately while riding.

The original Pegasus sheet contains a full painted extended-wing
flight pose and a folded-wing gallop frame but **not** a full
frame-by-frame wingbeat animation. The Phaser rendering alternates those
existing silhouettes with subtle bobbing to communicate tapping wingbeats,
pending any further authored flight poses. This is not presented as
an entirely new illustrated wing animation.

The berry lure sprite also reuses the original `flora.webp` artwork:
a tight crop and alpha mask of its purple berry cluster. No separate
unlicensed berry image is imported.

## Skywell Ascent — selected Ancient Sanctuary artwork

The authored rock, ledges, climbing walls and water are defined by
`phaser/src/cave-layout.js`. Export the **complete colored physics guide**
and matching full-world RGBA masks with
`node phaser/scripts/export-cave-guides.mjs`. The renderer does not draw
individual scenic wedges or procedural fake-rock platforms.

The user chose the warm, sculptural sanctuary painting from the two image
generations. The original generator's PNG had **1644 × 957** pixels. A
faithful high-quality WebP copy lives at
`assets/generated/skywell-ancient/skywell-ancient-source.webp`, with
original SHA-256 recorded in `art-provenance.json`.

The playable Skywell level uses three full-world **3520 × 2048** WebP
assets from that single composition: `painted-solid.webp`,
`painted-water.webp` and `painted-background.webp`. The code-authored
solid and water masks define the alpha channels. Open air is the complement
of both masks, with no alpha overlap. All three draw in the original world
coordinates with **no parallax**, preserving accurate geometry alignment.

The accepted *style* is not yet native-resolution final art: its RGB was
resampled from the 1644 × 957 source, so final detail must later come from
overlapping world-space image-model refinement. The rejected
opaque Skywell draft, its source copy, and the obsolete wedge compositor
were removed from the working tree. Their history remains in Git, rather
than being loaded or kept as redundant assets.

Regenerate or validate the alpha against freshly exported materials with
`scripts/bake-selected-skywell.py`. The separate
`skywell-vault-study` contains extra physical polygons and must never
borrow these layers without repainting its changed geometry.
