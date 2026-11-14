#!/usr/bin/env bash
# Linux x64 offline build, numerical QA, and a fresh playable HTML.
set -euo pipefail
cd "$(dirname "$0")/../.."

bash phaser/scripts/install-vendored.sh
npm test --prefix phaser
npm run quality --prefix phaser
npm run build --prefix phaser

# Sandbox forbids file:// navigation; inject unchanged offline HTML.
python -u phaser/scripts/run-playwright-inline.py phaser/tests/smoke.py
if [[ "${1:-focused}" == full ]]; then
  for suite in gameplay dynamics creature_bounce water-slope mounts complete_meadow chapters; do
    python -u phaser/scripts/run-playwright-inline.py "phaser/tests/$suite.py"
  done
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
digest="$(sha256sum dist/wonderwood-phaser.html | cut -c1-8)"
output="dist/wonderwood-preview-${stamp}-${digest}.html"
cp dist/wonderwood-phaser.html "$output"
printf '\nVerified self-contained HTML: %s\n' "$output"
