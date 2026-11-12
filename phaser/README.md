# Wonderwood / Phaser 4

A playable, parallel Phaser 4 remake, created **from main**. The established
Canvas game remains intact while this implementation earns gameplay parity.
Five canonical JSON worlds are compiled through the existing deterministic
`world-compiler.js`. Painted source assets are reused, with a small CC0 Kenney
background set. No CDN, external images or fetches are needed to play.

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
E change fruit; C recall to checkpoint.

Player 2 (when enabled): J/L move, I jump, K dive, O food/power, P capture,
U transform, M fruit, N recall.

Connected gamepads: left stick or D-pad to move; A jump/swim/flap;
B food/power; X capture; Y transform; triggers cycle fruit;
Back recalls; Start opens/closes pause. Second pad controls player 2.
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
