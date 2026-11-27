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

## Town exploration and static assets — 2026-11-26

The player GLB and retired project are unchanged. The new-character reference is
deferred. Five existing buildings now lead to three furnished cutaway room
layouts, with return doors and small grocery/potion/hearth interactions. The river
is swimmable with shore exits, and a second crossing uses five jumpable stones.

`npm test` passes the actual controller/skinning checks plus all building entry/
exit pairs, indoor bounds, buoyancy, both bank exits and jumps across every
stepping-stone gap. Static conversion is tested with a synthetic standard 3DGS
PLY: configured world height, vertex colors, exposed-face mesh, no skin or
animation, and structural validation. The player converter still passes.

Real Chromium tours passed HTTP and offline play, keyboard movement/jump/landing,
entry and return through cottage/grocery/potion-shop doors, grocery and potion
interactions, bank-to-bank swimming, loading a synthetic candidate static GLB
through the real scenery preview URL, and mobile touch jumping/door actions. No
JavaScript page errors occurred; offline play made no network requests. Desktop
interiors and swimming were visually inspected. WebGL used software rendering
in this environment, so this is not a device performance guarantee.

Eight reference PNGs were generated, visually inspected and checked for genuine
RGBA alpha and uncropped opaque silhouettes. The reference ZIP contains only
those PNGs at their actual repository paths. Prompts, hashes, manifests, static
conversion settings, runtime slots and PLY destinations are code-side commits.
No TripoSplat export has been provided for these objects. Their runtime paths
remain null, the town uses explicit placeholders, and neither reconstruction
quality nor fit of a real splat has been established yet.
