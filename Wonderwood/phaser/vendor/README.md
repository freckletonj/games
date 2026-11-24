# Reproducible offline build dependencies

These three version-pinned npm archives build Wonderwood on Linux x86_64
without downloading packages.

- `esbuild-0.25.12.tgz`: esbuild JavaScript API (MIT), committed directly
- `linux-x64-0.25.12.tgz.part00` through `.part07`: original Linux x64
  esbuild binary (MIT), split into eight byte-for-byte Git blobs
- `phaser-4.2.1.tgz.part00` through `.part32`: original full Phaser
  4.2.1 npm package (MIT), split into thirty-three byte-for-byte Git blobs

The larger uploads exceeded the available per-request GitHub connector size.
Parts are real binary bytes, not base64 text. They are named with zero-padded
indices so concatenating them in filename order recreates the **exact**
original archives. All 41 part Git SHAs were checked against the local bytes.
The whole-archive SHA-256 values in `SHA256SUMS` are verified *before*
extracting anything; the installer fails if any part is missing or corrupted.

Run once per Linux x86_64 checkout:

```sh
bash phaser/scripts/install-vendored.sh
```

This reassembles the two large `.tgz` files into `phaser/vendor/`, verifies
the three upstream SHA-256 digests, and extracts packages into
`phaser/node_modules/`. The generated whole archives and installed modules
are ignored by Git; the committed parts remain the permanent source.

Build and verify the real game after installation:

```sh
bash phaser/scripts/verify-cave-local.sh full
```

Or run `bash phaser/scripts/verify-offline.sh full` to install the archives and run
the same build and browser suites. Art-mask verification additionally requires Python Pillow. Browser tests
also require Playwright and its Chromium installation; Firefox acceptance
can be enabled separately with
`PLAYWRIGHT_FIREFOX=1` and Playwright Firefox installed.

The archives contain their upstream license notices. These vendored packages
are build-time dependencies; esbuild embeds the Phaser runtime into the
finished self-contained HTML. On platforms other than Linux x86_64, use
normal npm installation rather than this vendored native esbuild binary.
