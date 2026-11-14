#!/usr/bin/env bash
# Verified, uniquely named single-file HTML. No GitHub Actions required.
set -euo pipefail
cd "$(dirname "$0")/../.."

bash phaser/scripts/verify-local.sh "${1:-focused}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
nonce="$(node -e "process.stdout.write(require('node:crypto').randomBytes(4).toString('hex'))")"
destination="dist/wonderwood-preview-${stamp}-${nonce}.html"
cp dist/wonderwood-phaser.html "$destination"
test -s "$destination"
printf 'Playable offline HTML: %s\n' "$destination"
