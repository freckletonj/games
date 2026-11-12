# Reproducible offline build dependencies

Three version-pinned binary archives are intended to be committed once so a
Linux x86_64 sandbox can build Wonderwood without npm/CDN or GitHub Actions.
The bootstrap and checksum manifest are already committed on this PR.
The tarballs are supplied in the companion one-time vendor ZIP until they
are checked into the repository.

* phaser-4.2.1-runtime.tgz: Original Phaser 4.2.1 ESM browser runtime,
  package metadata and MIT license. Unused source/docs omitted.
* esbuild-0.25.12.tgz: Original esbuild 0.25.12 JavaScript API (MIT).
* linux-x64-0.25.12.tgz: Original esbuild native Linux x64 binary (MIT).

Build once the tarballs are committed:

    bash phaser/scripts/verify-offline.sh
    bash phaser/scripts/verify-offline.sh full

The second invocation also runs the seven extended real-input Chromium suites.
The vendor archives are BUILD-ONLY: Phaser is already embedded once in the
standalone HTML. The bootstrap explicitly targets Linux x86_64; use ordinary
npm installation for other platforms.

SHA-256 digests are in SHA256SUMS. Retain upstream license notices on upgrade.
