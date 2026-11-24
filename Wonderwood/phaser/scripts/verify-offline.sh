#!/usr/bin/env bash
# Install pinned offline dependencies, then use the same cave/game acceptance
# checks as the regular build. GitHub Actions remains disabled.
set -euo pipefail
cd "$(dirname "$0")/../.."

bash phaser/scripts/install-vendored.sh
bash phaser/scripts/verify-cave-local.sh "${1:-focused}"
