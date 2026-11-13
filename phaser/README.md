# Wonderwood / Phaser 4

A playable, parallel Phaser 4 remake, created **from main**. The established
Canvas game remains intact while this implementation earns gameplay parity.
Five canonical JSON worlds are compiled through the existing deterministic
`world-compiler.js`. Original Wonderwood painted assets are reused with subtle CC0 Kenney skies.
The CC BY 4.0 ArtByte source kit remains licensed and archived in-repo,
but is not currently loaded in the self-contained game. No CDN, external images or fetches are needed to play.

## Reusable offline build (Linux x86_64)

Three version-pinned vendored archives (approximately 5.9 MB total)
provide Phaser 4.2.1 and esbuild 0.25.12 without npm/CDN access.
Once the archives under `phaser/vendor/` have been checked in, every
Linux x64 checkout can regenerate the playable HTML entirely offline:

```sh
bash phaser/scripts/verify-offline.sh
# Include the seven extended real-input Chromium gameplay suites:
bash phaser/scripts/verify-offline.sh full
```

This checks SHA-256 hashes, installs the build tools in ignored
`node_modules`, runs unit tests and quality metrics, creates a fresh
self-contained HTML, and verifies real gameplay in Chromium. The output
has a uniquely named `dist/wonderwood-preview-*.html`. The inline
browser test adapter is necessary only in environments where browser
URL navigation is blocked. Normal `npm install` remains available for
other platforms. GitHub Actions stays disabled.

## Luminous Grotto: one-image authored level (Chapter 6)

The optional sixth chapter demonstrates **one code-authored cave → one
static geometry guide → one model-painted full-level image**, with no tiles
or chunk stitching. It retains the existing Phaser movement, creatures and
transformations. See the [step-by-step level authoring guide](CAVE-ART-PIPELINE.md)
for the exact export/build commands, image-generation prompt, V-key collision
overlay, and the accepted painted-water / rising-floor mismatch. The original
five chapters keep their existing level/rendering pipelines.

## Build

From `phaser/`:

```sh
npm install
npm test
npm run build
```

Open `../dist/wonderwood-phaser.html` directly in Chromium or Firefox.
The build inlines **Phaser 4 itself**, compiled code, all nine painted character
atlases, backgrounds, sprite sheets, levels, and the CC0 additions. Use the local preview script to package this self-contained HTML; GitHub Actions
is intentionally disabled.

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
Trails, visual direction per encounter, and more ambitious per-encounter illustrations remain future work; the
original painted Unicorn and Pegasus mounts have already been ported. Source is deliberately small and
separated into input, assets and scene implementation; the old game and its
regression suite remain untouched for comparisons.

Playability/visual review is essential before declaring this a replacement
for the current game's full campaign.

## Art system and gameplay verification

The [asset manifest](ASSETS.md) records provenance for original Wonderwood
art, retained CC BY source packs, and CC0 sky assets. Forest, Coast, and
Summit use distinct **painted ledge materials** whose flat landing tops
match the compiler's platform collision coordinates. Soft, two-speed
atmospheric washes parallax behind the terrain and interactive actors.
Art remains purely visual; the original heightfield determines collision.

The standalone Chromium suite in `tests/gameplay.py` now exercises a full
keyboard-driven **feed twice → capture orb → transform → double jump → pause →
recall** loop in the game itself (no direct player-state cheating). Pure
physics tests cover slope snapping, one-way platform collision and swept
projectile contact, and a browser smoke visits the built offline HTML.

`tests/chapters.py` loads all five chapters in the real browser and saves
per-chapter screenshots and asserts that each chapter builds both
atmospheric layers. License notices remain embedded in the standalone HTML.

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

## Playable end-to-end chapter test

`tests/complete_meadow.py` plays the entirety of Mosslight Meadow
from menu to the next chapter using only ordinary keyboard inputs.
It earns Springaroo, takes the genuine upper ledges, touches the key,
then walks through the end gate. The test deliberately reads positions
and objective state but never modifies them, and exports two milestone
screenshots. This closes the initial route-completion testing gap
without pretending the remaining four chapters have equivalent coverage.

## Movement dynamics and the returning painted mounts

- **Bounce Blooms:** touching a bloom automatically launches the explorer.
  Tap Jump again within a generous 22-simulation-frame (~0.37 second)
  window for a noticeably higher leap. A buffered press at contact works,
  too. The animation and message show the timing. The same behavior applies
  to keyboard and standard gamepad A.
- **Waterline walls:** swept horizontal collision against the continuous
  heightfield prevents swimming into an uphill bank or falling below terrain.
  A descending character that starts marginally within a slope also snaps
  to the supporting surface instead of tunnelling through it.
- **Painted fruit:** berry treats now display an isolated *actual blackberry
  bunch* from the existing painted flora atlas, instead of a miniature
  complete bush. Treats throw roughly 96 world units, with a visible
  arcing flight before wildlife can collect them.
- **Capture orb:** fixed, slow 3-unit/frame horizontal motion and a genuine
  gravity-and-ground bouncing arc. It never secretly auto-aims at a fed
  creature. A swept hit test retains reliability on low-FPS devices.
- **Unicorn and Pegasus:** the original painted 4×2 AVIF atlases and saddle
  anchors from [PR #6](https://github.com/freckletonj/games/pull/6)
  are included directly in the standalone build. These are **rideable
  mounts, not capture forms**. Two favorite treats earn trust; approach
  and press **T / Y** to ride or dismount. Unicorn gallops faster and
  leaps higher. Pegasus takes off with Jump, then gains height through
  repeated **wingbeat taps**; Down descends. The actual player sprite
  is positioned independently at the saddle. Mounted exploration is
  optional and never changes the key-form requirement for the light.

Unit tests cover bloom timing, uphill-water collision and orb
trajectories. Browser tests cover standard gameplay, chapter rendering,
and the full first Meadow route; physical gamepad confirmation remains
necessary.

## Modularization in progress

The playable Phaser scene delegates the terrain and atmosphere layers to
`src/world-renderer.js`, so texture choices and biome composition can be
iterated without editing player physics. Mounted acceleration, gravity,
collisions and wingbeat cooldown are simulated by the deterministic,
Phaser-independent `stepMountedMotion` function in `src/mounts.js`.
Unit tests cover Unicorn/Pegasus movement independently of browser timing.

Mosslight Meadow now declares three reusable encounter prefabs as
**validated metadata on its existing semantic level sections**, not as
a second map format. See [ENCOUNTERS.md](ENCOUNTERS.md) for the
authoring contract, validation limits, and the next LLM-level-generation
steps.

The core `game.js` still contains explorer movement, creature AI and
interaction orchestration. Those are explicitly next in the PR TODO
roadmap; this extraction intentionally preserves the already-tested
controller, bloom, water and full-Meadow input sequences. Fixed-timestep
conversion requires separate testing and has not been made in this pass.

## Deterministic gameplay step (60 Hz)

Phaser's render/update callback now feeds a bounded **60 Hz simulation clock**
(`src/fixed-clock.js`) and advances explorers, mounts, wildlife, food
lifetimes and setpiece timers in one-tick increments. At most four ticks
are processed per render callback after a stall; discarded time is
intentional to avoid a runaway catch-up loop. Button *pressed* events
are latched across no-tick render frames and consumed only once when a
slow frame requires multiple simulation ticks. Pause clears pending
simulation debt.

The shared movement and creature rules live in `src/player-motion.js` and
`src/creature-motion.js` and return semantic animation/effect events;
Phaser's scene is responsible for visuals and UI. Dedicated unit tests
cover double jumping, surface breaching, wingbeats and updraft recharge,
springboard boosts, attack warnings, stun, creature respawns and
render-refresh-rate invariance. The browser suites still exercise those
mechanics with real input from the standalone HTML.

This provides reproducible **simulation stepping**, not a guarantee that
wall-clock tween animations, render FPS and physics are visually identical.
Actual hardware-controller and campaign-wide QA remain necessary.

## Interaction and illustrated-ground pass

- Berry/nectar/stardrop throwing uses the **fixed 60 Hz simulation**:
  a 34-tick ballistic presentation with authored landing location. Wildlife
  sees the treat only after landing. Pausing the game now freezes airborne
  treats instead of allowing Phaser's independent tween clock to complete
  a throw in the background. Unit and Chromium tests cover this.
- **Enemy tells are now species-specific:** Emberkit retains a short amber
  floor rush, while Prismtail warns for longer with a visible lavender
  arc, then hops over the ground before landing. Both lock their direction
  during the announced attack so the visual warning matches the motion.
  Stuns and treats still interrupt aggression. These attacks remain
  nonviolent and avoidable rather than causing damage on ordinary contact.
- Fully friendly wildlife plays its **happy/waiting** animation even if
  the patrol target is elsewhere; this makes the capture window legible.
- **Soil painting** uses a broader biome-specific earth gradient, low-opacity
  original rock material, organic large-scale strata and a muted grass
  edge instead of repeating a high-contrast 64-pixel rock tile. Platform
  lips are shallower and pickups gently animate. Collision is unchanged:
  no painted surface is ever treated as collision geometry.

These refinements are aimed at control readability and moment-to-moment
world cohesion, not a redesign of campaign logic. The existing full Meadow
playthrough and multi-biome browser suites remain regression gates.

### Biome-specific visual materials

The meadow, coast and summit now draw **erosion-tapered floating ledges**
from the same semantic collision spans, with separate painted soil,
sea-stone and frosted-stone palettes. The bright jungle ledge bitmap and
unrelated decorative cutouts no longer appear in the playable bundle.
The sky retains its original chapter backdrop with two independently
scrolling, subdued atmospheric layers. Actor gait responds to speed,
takeoff stretch eases into flight, and Pegasus wingbeats have a less
abrupt illustrated cadence plus a brief painted wind cue. No new
third-party license or gameplay collision change is involved.


### Chapter 1: platform alignment, painted canopy and creature rebound

The illustrated ledges are painted on a 2×-resolution canvas **and displayed
at 0.5× scale**. This is essential: allowing Phaser to display a supersampled
canvas at full size made the drawn platforms twice as wide as their actual
one-way collision spans. The regression suite now checks the alignment of
every displayed ledge in all five chapters and keeps the player stationary
on both upper Meadow platforms for a full second.

Mosslight Meadow now adds two chapter-exclusive, 2048×512 transparent
illustration layers in `src/meadow-art.js`: soft watercolor canopy leaves and
warm dappled sunbeams. Their movement is gentle, at different fractions of
camera motion, and entirely behind the gameplay plane. This art is generated
from deterministic canvas brushwork at runtime, so there are no new
third-party assets, fake platforms, or source-bitmap stretches. The other
four chapters are unchanged.

Landing feet-first on the back of a creature retains the automatic soft hop
and opens a 14-tick (~0.23s at 60Hz) opportunity to **tap Jump again** for
a stronger spring. A held button does not retrigger it, the boost consumes
the normal extra-jump budget, and it is available without a transformation.
Unit tests verify the single-use timing and a Chromium integration test
uses real keyboard input to land on the first Springaroo and earn the boost.

## Measurable gameplay quality gates

The deterministic 60 Hz gameplay rules can now be probed without a canvas,
random input timing or an LLM judging a video. Run `npm test --prefix phaser`
for regression assertions, or `npm run quality --prefix phaser` to write
`dist/phaser-mechanics-quality.json`. The local verification command generates that report beside the playable bundle. Both commands use `tests/quality-scenarios.mjs`, which directly
calls the production movement, orb, lure selection and creature functions.
The JSON contains world-unit trajectories/speeds for capture orb hills,
ground and underwater slopes, unreachable-vs-reachable food, bubble rise and
release, hover duration, running speed bonus, and water-vent ascent.

Tests assert *behavioral* thresholds (rebound height, slope speed, animal
reacquisition, airborne duration, ability strength), not only that an input
event fired. The browser suite additionally verifies the live Scene's orb
launch/rebound and measures uphill water-shore traversal speed under real
keyboard input. Browser `window.__wonderwoodPhaser.snapshot()` exposes
read-only orb velocities, animal bubble height/target, and vent locations
for further observations; it never grants an ability or teleports a player.

To reproduce a bug, build a small deterministic world and action trace in
`tests/quality-scenarios.mjs`, record its metrics in `qualityReport()`,
then make a `gameplay-quality.test.mjs` threshold fail. Fix the production
rule and check both the scenario report and the real-input Chromium test.
Metrics are a guardrail, not a substitute for human judgments of the
illustration, encounter delight, or subjective game feel.

## Action and interaction fidelity

The Phaser version reuses the existing painted `effects.webp` and
`states.webp` atlases for bubble, honey, gust, spark, petal, splash,
eight species-specific eating poses, and the explorer's sleep pose.
Ordinary locomotion remains on the painted character atlases;
intermediate wingbeats and several distinct action keyframes still need
dedicated art.

Mossback, Prismtail, Skyling, Cloudwhisp and Emberkit cast **real**
fixed-clock projectiles with finite ranges, swept creature contact and
terrain collision. Honey can leave a temporary sticky puddle. Prismtail
creates a floating trapped-creature bubble, wind applies eased physical
knockback, and knockback/hostile dashes respect steep terrain. Hover and
swimming/double-jump operate through their own movement controls.
The creature-target and projectile rules are in `src/power-projectiles.js`,
`src/creature-motion.js` and `src/gameplay-rules.js`.

Actual ground-distance speed is capped on inclines for explorers,
Unicorn, Pegasus and grounded wildlife. Rooted scenery uses measured
illustration foot anchors instead of the transparent bottom padding of
the source atlases, so baskets, gates, checkpoints and vents meet the
terrain. The on-screen help tracks the active transformation.

`tests/action-art.test.mjs`, `tests/power-projectiles.test.mjs`, and
`tests/gameplay-quality.test.mjs` guard art mapping, impact, projectiles,
inclines, bubble lift, swim currents, hovering and target selection.
The deterministic quality report uses **schema version 2**, including
impact travel ticks for all five offensive powers and slope speeds for
both mounts. These metrics are regression limits, not a substitute for
watching actual gameplay.

## Build, package and test locally (CI is deliberately disabled)

GitHub Actions has been disabled by the repository owner to avoid
excessive automatic runs. **Do not reactivate it, rerun its failures or
treat its status as a merge-readiness signal.**

From a checkout with Node.js, npm, Python and Chromium available:

```sh
npm install --prefix phaser
python -m pip install playwright
python -m playwright install chromium
bash phaser/scripts/verify-local.sh
bash phaser/scripts/package-preview.sh
```

`verify-local.sh` runs focused Node regressions, writes the numeric
quality report, bundles `dist/wonderwood-phaser.html` and boots that
**fresh** offline HTML in real Chromium with `tests/smoke.py`.
`package-preview.sh` performs the same verification and copies the HTML
to a **uniquely named** `dist/wonderwood-preview-*.html` suitable for
sharing without stale-file caching. Use either command with `full`
before a merge decision to run all Node and Chromium gameplay routes,
including chapter completion. Browser checks use real keyboard input.

If the build host has no network access, provide a ZIP of the PR branch
and the npm package tarballs for Phaser 4.2.1, esbuild 0.25.12, and the
corresponding esbuild platform executable. Extract those into
`phaser/node_modules` before invoking the verification command.
A pre-existing playable HTML from an older commit is **not** proof the
current source builds. Keep PR #7 in draft until its new bundle has
passed local Chromium checks and visual review.

## Skywell Ascent: code-defined climbing cavern (Chapter 7)

The second one-image authored chapter is a vertical, wall-jumpable cave.
`phaser/src/cave-layout.js` defines its rock, pools, ledges and **real
climbing-wall collision faces**; `skywell-painting.js` builds a single
high-resolution geometry-aligned procedural illustration. The separate
color-filled reference and image-model prompt export to
`dist/cave-guides/skywell-ascent/`. Use **V** to overlay the physical
materials, including solid walls. A final diffusion-model painting has
**not yet been generated or integrated**. See
[CAVE-ART-PIPELINE.md](CAVE-ART-PIPELINE.md) for the new workflow.
