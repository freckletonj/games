# Validation log

## Batch 03 and creature friendship · 2026-11-27

All nine actual PLYs from user commit `1f0bb0122c7e606722175a37d9edf7ad4c1cfa52`
were verified as standard 3DGS, 65,536 vertices each, with reference/generation
hashes matching. Source PNG/PLY bytes remain unchanged. Springaroo uses an explicit
crop and fitted facing; Tidefox and Moonwing have fitted facing. The other new
inputs retain their complete source bounds. See `docs/ASSET_BATCH_03_INTAKE.md`.

Four static conversions and five individually fitted rigs are enabled. Static
same-color coplanar merging preserves the voxel surface while reducing repeated
wall/prop cost. Final triangle counts are panel 4,848, bench 6,612, bush 9,206,
orb 7,202, gardener 13,256, Springaroo 14,800, Tidefox 15,216, Moonwing 13,288 and
Flintfist 19,476. All nine pass structural validation; rebuilding all nine from the unchanged original PLYs and final settings reproduces the reviewed GLBs byte-for-byte. Dedicated quadruped/bird
rigs use explicit anatomy fits, soft weight regions and per-asset smoothing;
there is no automatic rigging or claimed topology recovery.

Actual Gaussian composites and mesh front/side/back/oblique views were inspected.
The five characters have 12 actual software-WebGL renders per clip, full-cycle
GIFs and motion sheets. Full-cycle finite skinning and edge-strain checks include
the existing two shopkeepers and all five new rigs. Remaining approximations
include source lighting, small joint creases and procedural foot drift;
Springaroo's inferred rear is coarse/asymmetric and the orb's rear is dark.
These are `ready-for-test-drive`, pending user art approval.

`npm test` covers the complete real controller, all four two-berry/orb/form
encounters, wall-blocked orbs, opportunity expiry and pause, simulated gamepad
X/RB/Y, clearance-safe form switching, the double-jump garden landing, no third
jump or airborne form reset, four finite wingbeats, dive/surface and under-bridge
clearance, physical pushing and seal removal, room persistence and respawn.
Real character skinning, static merging, synthetic PLY conversion and the
TripoSplat generation CLI are also exercised. No physical pad was available.

Chromium exercises HTTP modules and standalone offline play, existing controls,
WebGL silhouette pixels, focus/pause, all interior types, shop actions, swimming,
candidate scenery and narrow mobile doors. Additional checks feed/catch/transform
with keyboard and touch and reach the garden landing by double jump. No page
errors occurred; offline play makes no network requests. Shop, outdoor, transformed,
garden and touch renders were inspected. Software WebGL is functional evidence,
not a target-device performance benchmark.

The grocery/potion floors and backing walls remain authored; low converted
panels decorate the cutaways without blocking doors. Garden/ruin obstacles are
optional prototypes with authored geometry/collision, not generated obstacle art
or a mandatory progression campaign. The current caught slot replaces its prior
form when another animal is caught; no collection inventory was introduced.

Small code/config/reports/reviews are committed directly. The separate runtime
ZIP carries only the nine GLBs and binary review material, at repository-relative
paths, for user extraction and commit. The play ZIP embeds the exact same GLBs.
Original assets, imported player and `old/` remain unchanged.

## Exploration and controls polish · 2026-11-26

The six northern ledges now connect to the watchtower viewing deck. A deterministic
test starts on grass and reaches every landing and the deck using the real jump,
run, gravity and collision code. Existing river crossings, moss ruins and all five
building entrances retain their authored collision and asset files.

Jump presses are buffered for 120 ms and ledge grace lasts 100 ms. Regression
checks cover both windows, grace expiry, and held-button behavior. Pause stops
simulation, effects and draw calls; focus loss pauses automatically. Keyboard
resume clears held movement. The pause dialog traps keyboard focus on Resume.
Standard-mapped controller tests cover deadzone, analog speed, run, single jumps,
Start-button edges and disconnect. These use simulated controller input; a physical
gamepad has not been tested here.

Static triangles are grouped spatially and culled conservatively against the
orthographic view. Large terrain faces have separate batches so they cannot
inflate building bounds. At the starting desktop view, diagnostics submit 149,517
of 180,987 world/player triangles, about 17% fewer than drawing the whole scene.
Character lighting is computed once per unique vertex instead of per triangle
corner. HUD/map updates run at 10 Hz, and scenery downloads run concurrently.
These are work reductions, not a hardware frame-rate guarantee.

The hidden-player pass uses the world's depth buffer before drawing the normal
player, avoiding self-occlusion artifacts. A real WebGL pixel test verifies amber
stipple appears behind a wall and is absent when the player is in front. View
culling tests retain tall objects, screen-edge geometry and cell-spanning triangles.

`npm test` passes with the real assets and synthetic converter fixtures. Real
Chromium checks pass for HTTP modules, the offline build with no network requests,
pause/resume and dialog focus, movement/camera, all interior types, shop actions,
swimming, candidate scenery, and narrow mobile touch controls/doors. No page or
WebGL errors occurred. Browser rendering is software-backed; desktop/mobile
captures were inspected. Existing conversion quality limitations below still apply.

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


## Second town asset round trip (2026-11-27)

All six user-committed references and original PLYs were read from revision
`a5e68c3a29c3b861757c515a13a94922f7584711`. Reference SHA-256 values match the
original handoff and generation records. Each PLY is the expected binary
little-endian vertex-only standard 3DGS export with 65,536 Gaussians. Original
PNGs and PLYs, the first eight runtime GLBs and the imported player are unchanged.

The new grocery counter, apothecary cabinet, six reused lanterns and plaza well
replace authored visuals with fitted converted meshes and separate collision.
Two individually fitted 15-joint characters stand in the grocery and potion
shop, using relaxed Idle loops. Both export Idle/Walk/Run/Jump. The offline
build embeds twelve static assets, the two shopkeepers and the imported player.

Six structural GLB audits passed. Agent review compared each reference with
orthographic DC Gaussian alpha composites and front/oblique/side/rear WebGL
mesh renders. Character review covered 24 rendered phases per clip, including
full-cycle GIFs. The first rig fits exposed misplaced hand/waist vertices and
hard shoulder/hip seams; fitted gates and continuous weight transitions removed
the conspicuous spikes. The real-mesh regression samples whole cycles, finite
skinning, loop closure, same-side leg weights and triangle-edge strain. Maximum
sampled stretch is 2.784× for the grocer and 2.112× for the herbalist, below a 3×
spike guard. Small voxel creases and in-place procedural foot drift remain.

`npm test` passes the controller, real NPC rigs, synthetic PLY conversion and
TripoSplat CLI tests. The two new GLBs were also used as candidate player models
for the full controller/skinning check. Chromium checks passed HTTP and offline
play with network blocked, real WebGL silhouette pixels, pause/focus, keyboard
movement/camera, touch doors and controls, all interior types, both contextual
shop interactions, bank-to-bank swimming and candidate scenery. The shop tests
assert the expected grocer/herbalist is present. Actual grocery/potion views and
full motion loops were inspected. Browser rendering is software-backed and
these observations are not a hardware frame-rate benchmark.

The source-data rebuilds of both final rigs matched the reviewed GLBs
byte-for-byte. Per-asset `runtime/report.json` records exact source, reference,
config, rig, compiler and runtime hashes and mesh counts; `runtime/REVIEW.md`
records remaining limitations. All six are `ready-for-test-drive`, not final
user art approval. New binary outputs are delivered by runtime ZIP for user
extraction/commit; the separate play ZIP contains a standalone offline HTML.
