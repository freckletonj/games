# Working on Wonderwood

The current game is the Phaser campaign in `phaser/`. The original Canvas
game remains buildable with `node scripts/build.mjs`. Both use the shared
assets under `src/assets/`. See [the Phaser README](phaser/README.md) for
controls, build setup, and browser verification.

## Levels and art

- The Phaser campaign's chapter catalog and compiler are in
  `phaser/src/campaign.js`. The compact Meadow is declared in
  `phaser/levels/first-forest.json`. The other four surface chapters use
  `src/games/animal-adventure/designs.json`; the caves use
  `phaser/src/cave-layout.js`.
- Export full-scene geometry guides with `node phaser/scripts/export-art-guides.mjs`
  and `node phaser/scripts/export-cave-guides.mjs`. Use the material masks to
  register static art to collision. Keep actors and pickups separate.
  See [art direction](phaser/ART-DIRECTION.md) for the shared workflow.

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
