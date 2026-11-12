#!/usr/bin/env bash
# Offline build dependencies for Linux x86_64. Run once per checkout.
set -euo pipefail
cd "$(dirname "$0")/../.."

if [[ "$(uname -s)" != Linux || "$(uname -m)" != x86_64 ]]; then
  echo 'Vendored esbuild binary supports Linux x86_64; use npm install on other platforms.' >&2
  exit 1
fi

sha256sum -c phaser/vendor/SHA256SUMS

for package in phaser esbuild @esbuild/linux-x64; do
  mkdir -p "phaser/node_modules/$package"
done

tar -xzf phaser/vendor/phaser-4.2.1-runtime.tgz -C phaser/node_modules/phaser --strip-components=1
tar -xzf phaser/vendor/esbuild-0.25.12.tgz -C phaser/node_modules/esbuild --strip-components=1
tar -xzf phaser/vendor/linux-x64-0.25.12.tgz -C phaser/node_modules/@esbuild/linux-x64 --strip-components=1
chmod +x phaser/node_modules/@esbuild/linux-x64/bin/esbuild

node -e "console.log('Offline esbuild',require('./phaser/node_modules/esbuild').version)"
echo 'Offline Phaser and esbuild ready. No network access needed.'
