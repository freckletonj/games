#!/usr/bin/env bash
# Local verification for PR #8. GitHub Actions is intentionally disabled.
set -euo pipefail
cd "$(dirname "$0")/../.."

# PR #7's local-first script verifies the Phaser build and gameplay;
# the cave script adds its own geometry/image-model pipeline checks.
if [[ "${1:-focused}" == full ]]; then
  bash phaser/scripts/verify-local.sh full
else
  npm test --prefix phaser
  npm run quality --prefix phaser
  npm run build --prefix phaser
  python phaser/tests/smoke.py
fi

node phaser/scripts/export-cave-guides.mjs --hires
python phaser/tests/cave_painted.py
test -s dist/wonderwood-phaser.html
test -s dist/cave-guides/world-physical-rock.png
test -s dist/cave-guides/manifest.json
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
digest="$(sha256sum dist/wonderwood-phaser.html | cut -c1-8)"
preview="dist/wonderwood-cave-preview-${stamp}-${digest}.html"
cp dist/wonderwood-phaser.html "$preview"
printf 'Verified offline Phaser cave build: %s\n' "$preview"
