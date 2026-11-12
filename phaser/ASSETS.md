# Third-party assets and visual cohesion

The baseline Wonderwood game uses original generated painterly character sheets,
slope materials, props and chapter backgrounds from the repo's `src/assets/`.
The Phaser renderer **does not use the original low-resolution Kenney tree/pine/
bush PNGs as main scenery**. They clashed with the hand-painted sprites.

## Main illustrated environment collection: ArtByte (CC BY 4.0)

- **Pack:** [2D Platformer Forest Kit](https://opengameart.org/content/2d-platformer-forest-kit)
- **Creator:** ArtByte
- **License:** [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
- **Files incorporated:** `jungle-trees.png` (four illustrated tree variants),
  `jungle-misc.png` (mushrooms and vegetation cutouts),
  `platform-jungle.png` (repeatable natural platform edge).
- **Redistributable upstream copy:** `tilnewman/halloween` on GitHub at
  `media/image/map/jungle-*.png` and `media/image/platform-jungle.png`.
  The upstream project credits ArtByte and identifies the jungle artwork as
  CC BY 4.0 in `media/image/map/license.txt`.
- **Modifications:** Runtime cropping for named atlas frames; non-uniform
  **stretching is prohibited**. Phaser scales uniformly, repeats platform
  edges, and tints distant elements to match coast/summit atmospheres.
- **Credit:** "Forest environment artwork by ArtByte, CC BY 4.0" is included
  in the bundled HTML. Original art is available at the linked pack.

The source kit also provides a seamless layered background and tile atlas.
We intentionally continue to use Wonderwood's original chapter backgrounds
and slope surfaces for now; those were painted specifically for the current
world layouts. The borrowed **trees, vegetation and platform skins** make
a cohesive set of interactive-facing scenery without replacing collision data.

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
