# Adventure Town: voxel asset workflow

Read this file and `README.md` before changing this project. Adventure Town is a
3D voxel/pixelated exploration game. The first playable area is Emberbrook.
The previous project is preserved in `../old/Adventure Town/`; its acquisition
rules and compiler are historical, not the workflow for this project.

## Scope and style

The next user-requested expansion includes shop surfaces, more town residents,
and Wonderwood-style creature friendship: berries → orb capture → transformation
→ traversal/puzzle abilities. See `docs/ASSET_BATCH_03.md` and
`docs/CREATURE_FRIENDSHIP.md`. Batch 03 is reference/intake work only; its
`creature-reference` manifests are not supported converter/runtime kinds.
Fit conversion settings and rigs to actual returned PLYs. Quadruped and bird rigs
need deliberate implementation before promotion; do not use humanoid or static
surrogates. Shop floors, wall dimensions, doors and collision remain authored.
This requested creature scope supersedes the older other-rigs exclusion below
only for this expansion. It does not authorize unrelated game systems.

The current milestone is an explorable town: enterable cottages/grocery/potion
shop, furnished cutaway interiors, swimming and stepping-stone jumping, plus
one repeatable static-asset handoff. Read `docs/TOWN_ASSETS.md`. Preserve the
supplied Emberbrook model as an imported baseline. Do not add combat, quests, inventory, multiplayer, engines,
services, or a new asset family without discussing it with the user.

Use crisp cubic steps, readable silhouettes, flat vertex colors, restrained
palettes, nearest-neighbor presentation, +Y up, and +Z forward. Keep the human
player one world unit tall, with feet at Y=0 and the horizontal origin centered.
World collision is authored separately from the render mesh. The initial village
uses simple block geometry from the supplied proof of concept; new designed
assets follow the image/splat workflow below.

## Ownership and handoff

| Stage | Owner | Files and exit condition |
| --- | --- | --- |
| Reference | Agent | Create `assets/<id>/source/reference.png`, real RGBA transparency, one isolated object; deliver a repository-path ZIP for the user to commit the PNGs; save the actual prompt in `source/PROMPT.md` and describe silhouette/pose in the asset README. |
| Splat | User | Unzip the reference-image handoff at the repository root, run each accepted image through TripoSplat and commit `assets/<id>/incoming/model.ply`, retaining the original Gaussian properties. Record export settings if available. |
| Conversion | Agent | Inspect the actual PLY, fit `asset.json` (and `rig.json` for humanoids), build into a new `experiments/<id>-<attempt>/`, and audit the candidate GLB. |
| Review | Agent and user | Compare image, splat, voxel mesh, and animation. Inspect multiple angles, then move/run/jump in the real game. Record what was tested and what remains wrong. |
| Promotion | Agent, then user | Stage the reviewed GLB in `runtime/asset.glb`; commit small code/config/reports and select its runtime path. Deliver GLBs and binary review images in a uniquely named ZIP with repository-relative paths. The user extracts and commits those blobs. Also deliver a standalone offline HTML for immediate play. |

The first eight static objects have completed the real reference → TripoSplat →
voxel round trip. Their status is `ready-for-test-drive`, not final art approval.
The runtime GLBs and binary review sheets are delivered to the user in an asset
ZIP; the catalog expects those paths. Extract that ZIP before source play or
building from a checkout that lacks the runtime files. The standalone HTML
already embeds them and can be tested immediately. Keep the imported Emberbrook
adventurer; `next-adventurer` remains deferred.

The second batch adds four static assets (grocery counter, apothecary cabinet,
lantern and well) plus two fitted humanoid shopkeepers. They are
`ready-for-test-drive`; the user commits their runtime binaries from the ZIP.
See `docs/ASSET_BATCH_02.md`. `game/town-characters.js` owns NPC placements;
`game/characters.js` shares the humanoid parser/skinner with the player and
updates slow NPC Idle poses at 10 Hz. The offline build embeds those GLBs.
New rigs may specify a relaxed `arm_rest_angle`, an interpolated lower-arm gate,
a tapered `shoulder_blend` and `hip_blend_height`; fit these to each actual mesh.
Inspect full cycles and check stretched faces, not just bone or weight validity.

**Commit small code and normal text files directly. Roundtrip large binary files
through the user in both directions.** Generate transparent references, deliver
them as a ZIP, then pull the user's committed PNGs and original PLYs. Review,
clean up and convert those actual inputs; send the resulting runtime blobs back
in another ZIP for the user to commit. Verify the committed blobs and hashes
before claiming they are in Git. Do not push large binaries through GitHub tool
calls, ask the user to apply code patches, or treat a delivered ZIP as a commit.

Each asset owns its reference, original splat, rig settings, conversion settings,
runtime output, and review notes. Do not overwrite another asset to add one.
Keep source images and original PLY bytes unchanged. Do not manufacture a
turntable, reconstruct from guessed multiview sheets, hand-sculpt a replacement
character, or quietly import the archived pipeline as the new workflow.

## Reference image requirements

Use image generation for the reference, with actual transparent alpha including
limb gaps. A checkerboard painted into the RGB is not transparency. Keep the whole
object visible with margins. Prefer a nearly frontal three-quarter view, soft
uniform lighting, and a neutral pose. Humanoids need separated legs and an A-pose
with visible arm/torso clearance. Avoid loose accessories and overlapping limbs
for the first successful round trip. Inspect the output before handing it off.
The actual prompt for each object is recorded in its `source/PROMPT.md`.
Generate exteriors and individual interior props separately; keep floors, rooms,
doors and collision authored so spaces remain navigable.

## Local TripoSplat generation

`tools/generate_splats.py` is a standalone CLI for the user's existing TripoSplat
environment. See `docs/TRIPOSPLAT.md`. It constructs the official pipeline once,
processes the `awaiting-splat` queue sequentially, honors each manifest's reference
and splat paths, skips existing PLYs, and records `generation.json`. Keep the
TripoSplat ML dependencies out of the game runtime and NumPy conversion tools.
Do not add weight downloads, API fallbacks, retries or automatic promotion.
Use `--dry-run` to inspect the queue without loading models; `--overwrite` is an
explicit request to regenerate an existing original. Ignore partial PLY files.

## PLY intake and conversion

Run commands from `Adventure Town/`. Use Python 3.11+ and Node 20+.

```sh
python3 -m venv .venv
# Activate .venv using your shell's normal command.
python3 -m pip install -r tools/requirements.txt
python3 tools/convert_splat.py assets/river-boulder --out experiments/river-boulder-01
python3 tools/validate_asset.py experiments/river-boulder-01/asset.glb
npm test
```

Preview static candidates in their actual town slots with
`http://127.0.0.1:8000/?scenery=river-boulder&candidate=experiments/river-boulder-01/asset.glb`.
The existing `?model=...` option is for a skinned player GLB only. Use the
`scenery` route for houses/props and do not fit a humanoid rig to buildings.

The output directory must be new; builds never overwrite an accepted runtime.
The converter accepts vertex-only, uncompressed ASCII or binary little-endian
**standard 3DGS** PLY: `x/y/z`, `f_dc_0..2`, `opacity`, `scale_0..2`, `rot_0..3`.
Opacity is a logit (±infinity is valid for alpha 1/0; NaN is invalid), scales are logarithms, and source quaternions are WXYZ.
Confirm these semantics against the actual TripoSplat export before converting.
A mesh PLY, RGB point cloud, compressed splat, renamed ZIP, or Git LFS pointer
is not that format. Report an incompatible header; implement a deliberate adapter
only against a known sample. Do not silently guess a format or add fallback APIs.

Inspect bounds, outliers, orientation, and limb gaps first. Set `source_to_game`
(an orthonormal 3×3 matrix), optional source-space `crop` bounds, voxel resolution,
opacity floor, density threshold, sigma extent, optional `voxel_filter_sigma`
(in voxel units), color quantization and grid limit
in **that asset's** `asset.json`. For humanoids only, fit every joint and region gate in `rig.json` to
the actual voxel geometry. Joint positions are in normalized game coordinates.
L/R labels in this first rig refer to negative/positive model X respectively.
Keep parent joints before children; the runtime requires contiguous joint node
indices beginning at zero. No universal rig fit is promised.

The recipe samples oriented Gaussian density, optionally low-passes it at voxel
scale to reduce pinholes, takes the maximum density for occupancy, blends DC
colors using density weights, quantizes colors, emits only exposed cube faces,
normalizes height and, for humanoids, fits four normalized segment weights. Static assets use
`world_height` in their manifest and export in game units with no rig. The
recipe discards higher spherical harmonics
and does not reproduce Gaussian alpha compositing. It is a stylization recipe,
not a faithful Gaussian renderer or recovered topology. Fine features, cavities,
shadows baked into source colors and noisy floaters may need iteration.

Humanoids export `Idle`, `Walk`, `Run`, `Jump` (case sensitive), generated as
in-place procedural tests. The game owns motion/gravity. Other character rigs
and trained motion remain out of scope. Town assets use
`kind: "static"`; their reviewed runtime paths are configured in
`game/town-assets.js` and loaded by `game/scenery.js`. A null path is an explicit
unconverted placeholder. A configured but broken path is an error. The offline
build embeds accepted scenery as well as the player.

## Acceptance and truthful status

`validate_asset.py` checks finite packed data, index ranges, outward winding,
unit normals, normalized byte colors and weights, bind-pose transforms, unit
quaternions, uniform animation key times and the four clip names. The runtime is
a deliberately narrow GLB reader, not a general glTF loader. Do not feed it
compressed geometry, textures, strided/sparse data or arbitrary node transforms.

Passing the audit is structural evidence only. Before promotion, inspect front,
back, sides and obliques; compare silhouette, face, palette and proportions to the
reference. For humanoids, watch complete idle/walk/run/jump cycles for detached limbs, stretching,
wrong attachments, foot drift and intersections. Verify scale, facing, landing,
swimming/shore exits, room entrances/exits and frame rate in the game. For static
scenery check visual/collision agreement, door alignment and room clearance.
Record screenshots/contact sheets and
review notes for the actual candidate when browser tools are available. State
explicitly if a browser or a real PLY could not be tested. Synthetic tests are
converter checks, never proof of TripoSplat asset quality.

`emberbrook-adventurer` is `imported-runtime`: its GLB was extracted byte-for-byte
from the user's HTML. Its source image, PLY and original converter are absent.
Do not label that conversion reproducible. `next-adventurer` is `deferred`.
Use `candidate-needs-visual-review` for fresh builds and `ready-for-test-drive`
after agent visual/game review. Record remaining limitations and let the user
judge the art in play; do not equate structural validity with art approval.

## Development and delivery

```sh
npm run dev       # http://127.0.0.1:8000 (Python static server)
npm run build     # dist/adventure-town.html; double-click to play offline
npm test          # real controller/skinning with render stub; synthetic PLY tests
```

Keep gameplay in `game/`, conversion in `tools/`, and data in `assets/<id>/`.
Use simple functions and explicit per-asset settings. Do not bake asset-specific
repairs into the shared compiler. No AI service, Python conversion, npm packages,
or network is required to play the exported offline HTML. WebGL is required.
Keep `dist/`, environments, caches and experimental attempts out of Git.

When large images/PLYs/GLBs are awkward to exchange through GitHub calls, provide
a uniquely named ZIP whose entries use the real repository-relative paths.
Include exact extraction/commit instructions and what the recipient must supply.
Commit relevant code/docs/config/tests directly as requested by the user; do not
make them apply a whole-project ZIP. The user uploads large asset blobs only.
Read the committed files before continuing conversion. Do not
claim an upload or commit happened without checking it. Keep the archive under
`old/` untouched, including canonical source bytes; do not maintain it in parallel.

## Lessons from the first playtest

Compare source splat rendering with the converted mesh before attributing a
missing wall to TripoSplat. Point projections alone do not establish surface
coverage. The grocery rear opening is present in a Gaussian composite of the
original PLY and is explicitly repaired by authored infill in `game/world.js`.
Keep source bytes unchanged and label authored repairs; never call them recovered
geometry. Inspect the final wall at the roof seam in the real game.

Do not use one aggressive detail budget for every object. Hearth and grocery
now use 48 height samples, 32 color levels, filter sigma 0.25, `density_mode:
"alpha_union"` at threshold 0.5, and `color_weight_power: 4`. Alpha union
accumulates overlapping splat support; color power favors local contributions
to retain edges. Other assets retain their existing settings. These are volume
sampling choices, not exact view-dependent Gaussian compositing.

Swimming must be head-first along +Z before yaw, with the face toward the water.
Test actual skinned head/feet positions and inspect the pose at the waterline;
checking buoyancy alone does not verify swimming appearance.
