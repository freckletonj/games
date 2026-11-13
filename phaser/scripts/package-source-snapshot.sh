#!/usr/bin/env bash
# Portable exact-commit source bundle for environments that cannot git clone.
# This is a transport artifact, not the source of truth; HEAD remains canonical.
set -euo pipefail
cd "$(dirname "$0")/../.."

revision="$(git rev-parse --verify HEAD)"
mkdir -p dist
name="games-source-${revision:0:12}"
archive="dist/$name.zip"
git archive --format=zip --prefix="$name/" --output="$archive" "$revision"
sha256sum "$archive" > "$archive.sha256"
printf 'Source snapshot: %s\nChecksum file: %s.sha256\n' "$archive" "$archive"
printf 'Upload the ZIP to the build conversation if GitHub downloads are blocked.\n'
