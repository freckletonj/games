# Reset validation — 2026-11-26

The supplied Emberbrook GLB was extracted without modification; its SHA-256 is
recorded in its asset manifest. All 52 files of the former Adventure Town were
compared with the original Git blobs after moving to `old/Adventure Town/` and
matched byte-for-byte. The shared asset-tools research and Wonderwood were not
changed.

`npm test` passed. Its runtime checks exercise the real bundled controller,
physics, animation sampling and CPU skinning with a deterministic clock and
render stub. The pipeline checks build standard 3DGS fixtures in both supported
PLY encodings, export deterministic skinned GLBs, verify bind matrices/weights/
winding/animation keys, and run a newly exported GLB through that same runtime.
The fixtures are synthetic test data, not generated game assets.

Real headless Chromium checks also passed for both HTTP modules and the offline
HTML: WebGL rendering, keyboard walk/run/jump/landing, camera buttons, respawn,
mobile touch jump, no JavaScript page errors, and no network requests during
offline play. Desktop and narrow mobile renders were inspected. The browser used
software-backed WebGL in this environment; these checks do not establish
performance on every target device or continuous collision-free animation.

The new reference was generated with genuine RGBA transparency and inspected.
Opaque silhouette bounds leave margins on all sides. The initial rig/settings
remain an unfitted preset. No real TripoSplat PLY has been supplied, and the new
converter's appearance/deformation on that export is still unproven. The next
step is the committed `assets/next-adventurer/incoming/model.ply`, followed by
format inspection, fitting, conversion and visual review before promotion.
