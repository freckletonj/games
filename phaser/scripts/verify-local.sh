#!/usr/bin/env bash
# Run from any directory after: npm install --prefix phaser
# GitHub Actions is intentionally disabled for this repo; verify locally.
set -euo pipefail
cd "$(dirname "$0")/../.."

if [[ "${1:-focused}" == full ]]; then
  npm test --prefix phaser
else
  node --test \
    phaser/tests/power-projectiles.test.mjs \
    phaser/tests/gameplay-quality.test.mjs \
    phaser/tests/player-motion.test.mjs \
    phaser/tests/creature-motion.test.mjs \
    phaser/tests/animation.test.mjs \
    phaser/tests/action-art.test.mjs
fi

npm run quality --prefix phaser
npm run build --prefix phaser
test -s dist/wonderwood-phaser.html

if [[ "${1:-focused}" == full ]]; then
  for script in smoke gameplay dynamics creature_bounce water-slope mounts complete_meadow chapters; do
    python "phaser/tests/$script.py"
  done
fi

echo "Local Wonderwood verification passed; playable dist/wonderwood-phaser.html"
