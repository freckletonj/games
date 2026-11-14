# Working on Wonderwood

The current game is the Phaser campaign in `phaser/`. The original Canvas
game remains buildable with `node scripts/build.mjs`. Both use the shared
assets under `src/assets/`. See [the Phaser README](phaser/README.md) for
controls, build setup, and browser verification.

## Level generation

Use the declarative layout and bitmap guide workflow for new Wonderwood
levels. [Stonewake Hollow](phaser/STONEWAKE-ART.md) is the end-to-end example.

1. Author the route first. Put the terrain, platforms, encounters, checkpoints,
   goals, and interactive objects in a chapter spec under `phaser/levels/`
   and register it in `phaser/src/campaign.js`. Use the authored geometry and
   object states for collision and progression. The shared legacy surface
   specs live in `src/games/animal-adventure/designs.json`, and the existing
   cave layouts live in `phaser/src/cave-layout.js`.
2. Export the bitmap guides with `node phaser/scripts/export-art-guides.mjs`
   or `node phaser/scripts/export-cave-guides.mjs`. Give the image model the
   composed geometry guide and a style reference for the initial panorama.
   Use the material masks and world coordinates to align the painting
   with the playable terrain.
3. Separate moving objects from the scenery. Crop each object with margins
   and ask the image model for a true-alpha cutout. Cut slightly larger
   transparent holes in the panorama and have the model repaint them.
   Blend the repaired patches back into the original canvas and keep the
   authored origins and pivots for runtime sprites. Keep creatures and
   pickups separate from the scenery.
4. Use the same guide-first approach for animation. Declare sprite poses,
   frame order, and a common anchor, then export a bitmap guide and have
   the model paint aligned alpha frames. For breakable objects, declare
   fragment shapes, hit order, remaining collision, and debris motion.
   Register the painted pieces to those shapes so the visible and playable
   states advance together.
5. Keep reusable painting inputs and packing recipes with the chapter.
   Register the finished art in
   `phaser/assets/generated/approved-scene-art.json`. Test the intended
   route with the production fixed-tick rules. Check that alternate forms
   or actions cannot skip required steps and that checkpoints let players
   recover from a failed attempt. Inspect the built game at gameplay
   zoom and toggle **V** to compare the art against collision.

See [art direction](phaser/ART-DIRECTION.md) for the shared conventions,
[Clockwork Orchard](phaser/DYNAMIC-SCENE-ART.md) for moving platforms, and
[The Brassworks](phaser/BRASSWORKS-ART.md) for alpha cutouts and scene repair. See [character animation](phaser/CHARACTER-ART.md)
for the explorer, mount, and rider pose plans.

## Build and verify

- From the repo root, run `npm install --prefix phaser` and
  `npm run build --prefix phaser`. For an offline Linux x86_64 build, use
  `bash phaser/scripts/install-vendored.sh` in place of npm install.
- Run `npm test --prefix phaser` for fast checks and
  `bash phaser/scripts/verify-cave-local.sh full` for browser and art
  verification. The full suite needs Python, Pillow, and Playwright Chromium.
  With Playwright Firefox installed, set `PLAYWRIGHT_FIREFOX=1` to also
  check the actual `file://` build. Use local checks for this workflow.

## Git and large files

- Work in a local clone and check the branch and working tree before editing.
- Keep large files on disk or transfer them as files. Large model-visible
  payloads, including bundled HTML and base64, consume the context window
  and shorten how long a chat can continue. Use targeted excerpts or a short
  summary when inspecting them.
- Deliver `dist/wonderwood-phaser.html` in chat as a file with a unique
  filename. Keep generated builds out of GitHub. For source changes, use
  authenticated Git when available or the connected GitHub app for bounded
  changes. Never paste access tokens into chat.
