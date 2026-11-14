# Wonderwood integration acceptance

[PR #9](https://github.com/freckletonj/games/pull/9) consolidates
[#7](https://github.com/freckletonj/games/pull/7)'s Phaser campaign and
[#8](https://github.com/freckletonj/games/pull/8)'s geometry-authored caves.
The original Canvas game remains available. The consolidation excludes the
experimental Phaser GitHub Actions workflow.

## Local verification

- A full clone succeeded on Linux x86_64 with Node 24 and Python 3.12.
  `npm install --prefix phaser --no-package-lock --no-audit --no-fund`
  installed the pinned dependencies. In a separate clean worktree,
  `bash phaser/scripts/install-vendored.sh` verified all three archive
  checksums and reproduced the same build. The offline installer remains usable.
- `bash phaser/scripts/verify-cave-local.sh full` passed using local headless
  Chromium with software WebGL and Playwright Firefox. All 119 Node tests passed,
  the mechanics report ran, all five campaign PNGs exported, and the cave guide
  exporter produced both playable cave references and the separate vault study.
  Pillow confirmed that the five campaign PNG dimensions and material colors
  matched their manifests. All three committed Skywell alpha layers matched the
  freshly exported physics masks.
- Chromium passed the offline and co-op smoke, both painted cave checks, mount
  and movement tests, creature bounce, water slope, all five original chapter
  spawn/render checks, and the complete Mosslight Meadow keyboard route.
  A separate Chromium keyboard run passed all ten Skywell wall jumps, collected
  the lantern, reached the exit, and recorded completion. It used Playwright's
  controlled clock to time key presses without changing game state.
- Firefox opened the exact standalone file through `file://` and passed the
  Skywell movement, geometry overlay, and co-op smoke with zero HTTP requests.
  The gameplay screenshot showed the selected art at the expected waterline and
  terrain slope. The Skywell painting is still sourced from a 1644 × 957
  composition and scaled to the 3520 × 2048 world.
- `node scripts/build.mjs` and `python tests/offline_launch.py` passed for the
  original Canvas game. Its offline HTML rendered, accepted movement, and opened
  all five chapters.

## Standalone delivery

`npm run build --prefix phaser` generates `dist/wonderwood-phaser.html`.
The verified artifact is 15,840,464 bytes, with SHA-256
`de85aa020634218126ecca3777be1605ee3d89d737880aa9e65d01dd198162d1`.
The standalone HTML is delivered as a separate download. The repository ignores
the HTML, generated guide images, screenshots, and verification reports.

## Authoring

Run `node phaser/scripts/export-art-guides.mjs` for full-scene PNGs of the five
JSON-authored chapters and `node phaser/scripts/export-cave-guides.mjs` for the
two code-authored caves. See [Art direction](phaser/ART-DIRECTION.md) for bitmap
colors and output paths. The bitmaps derive from the compiled level geometry.
The selected Skywell illustration is registered to the physics masks, and
interactive objects are rendered separately.
