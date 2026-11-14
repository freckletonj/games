# Working on Wonderwood

The current game is the Phaser campaign in `phaser/`. The original Canvas
game remains buildable with `node scripts/build.mjs`. Both use the shared
assets under `src/assets/`. See [the Phaser README](phaser/README.md) for
controls, build setup, and browser verification.

## Levels and art

- The five original chapter designs are in
  `src/games/animal-adventure/designs.json`. Phaser applies its Meadow layout
  in `phaser/src/meadow-design.js` before using the shared world compiler.
  The two playable caves are declared in `phaser/src/cave-layout.js`.
- Export full-scene PNG references from the compiled geometry with
  `node phaser/scripts/export-art-guides.mjs` and
  `node phaser/scripts/export-cave-guides.mjs`. Use the cave material masks
  to register painted layers to collision. Keep actors and pickups separate.
  The [art guide](phaser/ART-DIRECTION.md) describes the output.

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

- Start with a full local clone and check `git status` and the remote head
  before editing. Use filenames and sizes first, then bounded source and diff
  excerpts. In chat, tell the user which files and sizes you plan to preview.
- Keep generated HTML, PNGs, archives, and base64 out of model-visible tool
  output. Process files on disk and report sizes, hashes, and test summaries.
  The standalone HTML bundles the engine and art into a roughly 16 MB file.
- Deliver `dist/wonderwood-phaser.html` in chat as a file with a unique
  filename. Keep generated builds out of GitHub. For source changes, use
  authenticated Git when available or the connected GitHub app for bounded
  changes. Never paste access tokens into chat.
