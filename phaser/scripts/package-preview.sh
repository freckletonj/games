#!/usr/bin/env bash
# Build and verify the real playable cave chapters, then package a unique offline HTML.
set -euo pipefail
cd "$(dirname "$0")/../.."

bash phaser/scripts/verify-cave-local.sh "${1:-focused}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
nonce="$(node -e "process.stdout.write(require('node:crypto').randomBytes(4).toString('hex'))")"
destination="dist/wonderwood-preview-${stamp}-${nonce}.html"
cp dist/wonderwood-phaser.html "$destination"
test -s "$destination"
printf 'Playable standalone game (not the art inspector): %s\n' "$destination"
absolute="$(cd "$(dirname "$destination")" && pwd)/$(basename "$destination")"
printf 'Open directly to Skywell in Firefox: file://%s#skywell-ascent\n' "$absolute"
