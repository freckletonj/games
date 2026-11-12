# Wonderwood / Phaser 4

A playable, parallel Phaser 4 remake, created **from main**. The established
Canvas game remains intact while this implementation earns gameplay parity.
Five canonical JSON worlds are compiled through the existing deterministic
`world-compiler.js`. Painted source assets are reused alongside the ArtByte illustrated
forest kit (CC BY 4.0, attributed in the HTML), with subtle CC0 Kenney sky art. No CDN, external images or fetches are needed to play.

## Build

From `phaser/`:

```sh
npm install
npm test
npm run build
```

Open `../dist/wonderwood-phaser.html` directly in Chromium or Firefox.
The build inlines **Phaser 4 itself**, compiled code, all nine painted character
atlases, backgrounds, sprite sheets, levels, and the CC0 additions. CI publishes
this exact standalone HTML as a downloadable artifact.

## Controls

Player 1: A/D or arrows move; W/Space jump/flap/swim; S/Down dive;
F offer fruit / creature ability; G capture distracted animals; T change form;
E change fruit; C recall to checkpoint; R revive after a knockout;
H return to chapter selection.

Player 2 (when enabled): J/L move, I jump, K dive, O food/power, P capture,
U transform, M fruit, N recall, Y revive.

Connected gamepads: left stick or D-pad to move; A jump/swim/flap;
B food/power; X capture; Y transform; triggers cycle fruit;
Back recalls; left shoulder revives; Start opens/closes pause. Second pad controls player 2.
Keyboard 2 toggles local co-op. On title: left/right selects world,
A or Space begins. Escape/Start pauses; R returns to chapter selection.

## Migration status

This is a **new, real Phaser renderer and game loop**, not the old Canvas
game drawn into a Phaser texture. Movement, simple creature AI, treats,
trust/capture, transformations, collectibles, checkpoints, water, camera,
and two-player follow bubbles are implemented in Phaser.

It is a substantial **playable foundation**, not exact feature parity with the
large Canvas implementation: complex creature tactics, the custom Wonder
Trails, visual direction per encounter, and the unicorn/Pegasus from draft
PR #6 still need subsequent porting. Source is deliberately small and
separated into input, assets and scene implementation; the old game and its
regression suite remain untouched for comparisons.

Playability/visual review is essential before declaring this a replacement
for the current game's full campaign.

## Art system and gameplay verification

The [asset manifest](ASSETS.md) inventories exactly where the illustrated
ArtByte platform, tree and vegetation frames come from and their CC BY 4.0
attribution. Forest, Coast, and Summit reuse the same **uniformly scaled**
illustrated silhouettes with cool/warm tint differences; artwork is always
visual-only and uses the original heightfield for foot placement and collision.

The standalone Chromium suite in `tests/gameplay.py` now exercises a full
keyboard-driven **feed twice → capture orb → transform → double jump → pause →
recall** loop in the game itself (no direct player-state cheating). Pure
physics tests cover slope snapping, one-way platform collision and swept
projectile contact, and a browser smoke visits the built offline HTML.

`tests/chapters.py` loads all five chapters in the real browser and saves
per-chapter screenshots. License notices are embedded into the standalone
HTML and ArtByte attribution is visible in the footer.

## Mosslight Meadow vertical slice

The Phaser remake now uses a curated three-act, 148-cell version of
Mosslight Meadow. It is derived from the same validated semantic JSON, but
shortens the original 260-cell first chapter without changing legacy levels:

1. **Picnic Trail:** a visible, glowing Springaroo encounter, treats and a
   safe opening, with an optional Glimmermoth.
2. **Canopy Ascent:** a checkpoint, a telegraphed Emberkit dash, Springaroo's
   double-jump, high paths and a meaningful light relic.
3. **Lantern Grove:** a soft landing, optional Mossback, another checkpoint,
   bloom bounce and the illuminated exit.

All authored platforms and slope surfaces still come from the compiler,
not from the painted scenery. The meadow compiler is unit-tested.

## One animation contract for every character

`src/animation.js` maps standardized semantic actions to the nine existing
painted 4×2 sprite atlases: idle, run, jump, fall, land, feed, capture,
transform, eat, happy, alert, hurt, stunned, dash, flap, glide, swim and sleep.
The per-character frame pivots and proportional scaling are preserved.
Small additive run bounce, landing squash, jump stretch, flight, swim and
reaction motion is **secondary** to authored frames; it never replaces an
entire animation with an arbitrary duplicated static pose.

`tests/animation.test.mjs` checks all character manifests and every action,
including frame safety and anchored squash/stretch. The Chromium gameplay
test checks real movement, feeding, capture, transformation and double jumps.

This is deliberately not a new asset-for-every-creature exercise. The
existing high-resolution creature illustrations share one stronger aesthetic
than a mixture of generic pixel art, and form-changing play relies on
recognizing those species. Future character packs must clear the
licensing-and-animation criteria in [ASSETS.md](ASSETS.md).

## Feature-parity verification

The Phaser implementation now carries over the original **12-second**
befriending window, **17-second** captured-creature respawn, finite fruit,
picnic-basket refills, checkpoint healing and player knockouts/revival. Action
keys remain aligned with the legacy game; R (or controller left shoulder)
revives at the checkpoint, and H opens the chapter menu. The eight distinct
forms still use only the most recently captured species, like the original.
The Tidefox breaches near water surfaces, Moonwing recharges wingbeats in
thermals, and Glimmermoth slows its fall rather than gaining altitude.

The new **visual language** also distinguishes elemental creature powers,
warns about incoming dashes with a readable directional lane, gives
objectives and campfires restrained animated glows, and adds translucent
water ripples. Ground textures darken at depth rather than repeating the
same high-contrast motif down the entire screen.

See [PARITY.md](PARITY.md) for verified behavior and remaining scope. The
Chromium integration test exercises real feeding, capture, transformation,
double jumping, game pause, checkpoint recall and picnic-basket restocking;
unit tests cover creature timing, input and skill gating. Hardware controllers
and the complete campaign are not yet verified.
