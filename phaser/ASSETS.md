# Third-party assets and visual cohesion

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

## Licensed environment source library: ArtByte (CC BY 4.0)

- **Pack:** [2D Platformer Forest Kit](https://opengameart.org/content/2d-platformer-forest-kit)
- **Creator:** ArtByte
- **License:** [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
- **Retained sources, not currently bundled into the standalone game:**
  `platform-jungle.png`, `jungle-trees.png` and `jungle-misc.png`.
  The game now renders biome-specific painted ledge silhouettes derived
  directly from collision geometry, and no longer shows the kit's
  mismatched bright jungle tiles or decorative props. The source PNGs
  remain in the repository for future use and license review.
- **Redistributable upstream copy:** `tilnewman/halloween` on GitHub at
  `media/image/map/jungle-*.png` and `media/image/platform-jungle.png`.
  The upstream project credits ArtByte and identifies the jungle artwork as
  CC BY 4.0 in `media/image/map/license.txt`.
- **Modifications:** Older commits cropped, scaled and tinted this source art.
  The current renderer instead uses its own painted ledge textures for all
  three biome families, preserving the source artwork unmodified in-repo.
- **Credit:** The provenance of the retained source pack remains in this
  file and in the project's third-party notice.

The source kit also provides a seamless layered background and tile atlas.
Wonderwood continues to use its original painted chapter backdrops and
slope surfaces. Every floating shelf is now generated from the **same
semantic platform geometry** as its collider and painted with its biome's
earth/stone palette. Distant haze scrolls at two independent fractions of
camera movement, behind the world and never as interactive scenery.

## Supplemental CC0 assets

Three small sky images (cloud1, cloud3, moonFull) from Kenney's
[Background Elements Remastered](https://kenney.nl/assets/background-elements-redux)
remain in use only at low opacity, as distant non-interactive sky elements.
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
- **ArtByte Forest Kit** — licensed and retained in the source tree but
  excluded from the current offline game. Reconsider only after verifying
  brushwork and scale in gameplay screenshots; never turn decorative art
  into misleading catchable silhouettes.

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

## Skywell Ascent (Chapter 7, legacy visual prototype)

The original procedural SVG scenic reference has been retired. Image models
should receive the full **colored physics guide**, not a second, hand-drawn
fake landscape. The guide and full-size solid/water RGBA masks are regenerated
from `phaser/src/cave-layout.js` by
`node phaser/scripts/export-cave-guides.mjs`. The optional
`skywell-vault-study` uses genuine, collision-backed rock polygons and is
awaiting an approved image-model painting.

## Skywell full-resolution physics-grounded painting (Chapter 7)

The runtime now embeds `phaser/assets/generated/skywell-ascent.webp` as
one **3520 × 2048** static image. An image model generated the original
**1644 × 957** scenery at its available native resolution. The source is
committed as `phaser/assets/generated/skywell-model-source.webp` (lossy
WebP conversion of the generator's original PNG, quality 90). The painting was
then resampled to authored world size and composed through the exact
`skywellLayout` floor, ceiling, water, shelf and climb-wall masks, to
prevent attractive but invented AI-painted terrain from becoming fake
collision geometry. The resulting WebP is approximately 500 KB. The procedural SVG
was removed because it could introduce false visual geometry. This WebP
remains a legacy draft, not an approved new-art pipeline output.

The source image was generated as static-only scenery; no character,
collectible or HUD was intentionally included. The authored physics remains
the sole collision authority. Regeneration instructions are in
`CAVE-ART-PIPELINE.md` and `scripts/compose-painted-cave.py`.
