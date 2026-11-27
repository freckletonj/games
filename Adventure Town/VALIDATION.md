# Validation log

Current status: the eight real town splats are converted and enabled for a test
drive. Their runtime blobs are delivered separately for user commit. Earlier
entries below describe previous milestones, before those PLYs arrived.

## Reset baseline — 2026-11-26 (historical)

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

## Real TripoSplat town batch — 2026-11-26

All eight original PLYs from main commit `6599627a9b0eebb826194d1449447a85198516d0`
were converted. Each has 65,536 standard 3DGS Gaussians. The eight reference hashes
match their manifests and generation records. Original source bytes, the imported
adventurer, the archive and unrelated games are unchanged.

The intake reader now accepts ±infinity for opacity logits (alpha 1/0), while
rejecting opacity NaNs and nonfinite geometry. Per-asset transforms make these
exports upright and forward-facing. A 0.5-voxel Gaussian filter and blended DC
colors reduce porous surfaces and speckle. Coarser fitted grids produce 119,980
triangles across the eight unique static GLBs. The outdoor scene has 180,750
triangles including instances, authored terrain and the player.

All eight actual GLBs pass the structural audit. Per-asset reports record source,
configuration and runtime hashes, mesh counts and bounds. Reference/front/side/
oblique/rear contact sheets were inspected. Cottages, shop facades, produce,
bottles, table legs, the hearth opening and mossy rock shape remain readable.
The grocery rear has a dark/open region, the workbench back is dark, tiny details
soften and source lighting remains baked in. These are test-drive assets with
user art acceptance pending; source point projections are diagnostics, not
faithful Gaussian rendering.

`npm test` passes, including opacity endpoints in both PLY encodings, rejection
of invalid nonfinite values, equal-density color blending, deterministic export,
static and skinned GLB validation, the real controller, all five building entry/
exit pairs, swimming/bank exits, climbing onto a low rock, and landing on each
next boulder with position/height assertions. A separate synthetic static bundle
continues to pass independently of the real art. TripoSplat inference remains
stubbed in CLI tests; the actual PLYs were generated by the user.

The complete real Chromium suite passes with all eight assets loaded: HTTP
modules, standalone offline HTML without network requests, WebGL, keyboard
walk/run/jump/landing, orbit/zoom/respawn, all three room types and return doors,
grocery/potion interactions, bank-to-bank swimming, candidate static loading,
and mobile touch jump/entry/exit. No page errors occurred. Desktop interiors,
outdoors, swimming and narrow mobile frames were inspected. The tour uses short
waypoints to follow the authored paths rather than steering into roadside lamps.
WebGL was software-backed here; these checks establish functionality and visual
placement, not a frame-rate guarantee on every device.

The runtime ZIP contains only the eight GLBs and eight mesh review PNGs, at their
repository paths. It was checked for archive integrity and matching GLB hashes.
Small code/settings/reports/review notes are committed separately. The standalone
HTML embeds the exact runtime GLBs and imported character and is ready to play;
source builds require the user to extract and commit the runtime ZIP first.

## Playtest corrections — 2026-11-26

The hearth/grocery were rebuilt from unchanged original PLYs using finer grids
and more selective color weights. Their comparison PNGs include old/revised
meshes and an orthographic Gaussian composite of the actual PLY, oblique and
rear. This confirms the grocery's lower rear is absent in the original too.
An explicitly authored wall/gable in `game/world.js` closes the opening; no
source recovery is claimed. Its roof seam was checked in the offline game.
The six other static GLB hashes match the previous batch exactly. All eight
GLBs pass the structural audit; the two changed reports record new hashes.

Swimming uses positive 1.35-radian forward tilt with a lower render offset.
Regression checks compare actual skinned head/foot centroids to ensure the head
leads along travel and stays above water. The face points toward the water.
This is still a tilted Walk/Idle animation rather than a dedicated swim clip.
The controller/shore behavior is unchanged.

`npm test` passes, including a new overlapping-splat occupancy regression and
the swim pose checks. The full Chromium HTTP/offline/interiors/swimming/mobile
suite passed, and dedicated offline views of the repaired rear and swimming
pose were inspected. Rendering here uses software WebGL.

Small code/config/docs/reports are committed directly. The new handoff ZIP
contains all eight static GLBs and the two updated comparison PNGs. It does not
contain code or browser screenshots. Extract at the repository root and commit
the resulting runtime files; the standalone HTML already embeds the fixes.
