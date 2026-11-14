#!/usr/bin/env bash
# PR #8 local verification; GitHub Actions is intentionally disabled.
set -euo pipefail
cd "$(dirname "$0")/../.."

npm test --prefix phaser
npm run quality --prefix phaser
node phaser/scripts/export-art-guides.mjs
node phaser/scripts/export-cave-guides.mjs
# The actual selected painting must agree with the *current* physics masks.
python -u phaser/scripts/bake-selected-skywell.py --verify
npm run build --prefix phaser
test -s dist/wonderwood-phaser.html
test -s dist/cave-guides/world-physical-rock.png

# Uses real Chromium with unchanged offline HTML (works when file:// is blocked).
python -u phaser/scripts/run-playwright-inline.py phaser/tests/smoke.py
python -u phaser/scripts/run-playwright-inline.py phaser/tests/cave_painted.py
python -u phaser/scripts/run-playwright-inline.py phaser/tests/skywell_painted.py

if [[ "${PLAYWRIGHT_FIREFOX:-0}" == 1 ]]; then
  python -u phaser/tests/skywell_firefox.py
fi

if [[ "${1:-focused}" == full ]]; then
  for suite in gameplay dynamics creature_bounce water-slope mounts complete_meadow chapters; do
    python -u phaser/scripts/run-playwright-inline.py "phaser/tests/$suite.py"
  done
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
digest="$(sha256sum dist/wonderwood-phaser.html | cut -c1-8)"
preview="dist/wonderwood-cave-preview-${stamp}-${digest}.html"
cp dist/wonderwood-phaser.html "$preview"
printf 'Fresh layered-art Phaser preview: %s\n' "$preview"
