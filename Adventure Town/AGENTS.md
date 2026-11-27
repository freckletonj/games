# Adventure Town: voxel asset workflow

Read this file and `README.md` before changing this project. Adventure Town is a
3D voxel/pixelated exploration game. The first playable area is Emberbrook.
The previous project is preserved in `../old/Adventure Town/`; its acquisition
rules and compiler are historical, not the workflow for this project.

## Scope and style

Keep this first milestone small: a playable village, a working animated player,
and one repeatable asset handoff. Preserve the supplied Emberbrook model as an
imported baseline. Do not add combat, quests, inventory, multiplayer, engines,
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
| Reference | Agent | Create `assets/<id>/source/reference.png`, real RGBA transparency, one isolated object; save the actual prompt in `source/PROMPT.md` and describe silhouette/pose in the asset README. |
| Splat | User | Run the accepted image through TripoSplat and commit `assets/<id>/incoming/model.ply`, retaining the original Gaussian properties. Record export settings if available. |
| Conversion | Agent | Inspect the actual PLY, fit `asset.json` and `rig.json`, build into a new `experiments/<id>-<attempt>/`, and audit the candidate GLB. |
| Review | Agent and user | Compare image, splat, voxel mesh, and animation. Inspect multiple angles, then move/run/jump in the real game. Record what was tested and what remains wrong. |
| Promotion | Agent | Put the reviewed GLB in the asset's `runtime/asset.glb`, commit source/config/report together, and select it with `defaultModelPath` in `game/model.js`. Rebuild the offline game. |

The immediate handoff is `assets/next-adventurer/source/reference.png` →
`assets/next-adventurer/incoming/model.ply`. Its configuration is a starting
preset, **not** a fitted or approved asset. Until that PLY arrives, retain the
Emberbrook adventurer in the game. Do useful independent work, then state the
exact missing file; never invent a splat or claim this new reference is playable.

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
The prompt for the first new character is in that asset's `source/PROMPT.md`.

## PLY intake and conversion

Run commands from `Adventure Town/`. Use Python 3.11+ and Node 20+.

```sh
python3 -m venv .venv
# Activate .venv using your shell's normal command.
python3 -m pip install -r tools/requirements.txt
python3 tools/convert_splat.py assets/next-adventurer --out experiments/next-adventurer-01
python3 tools/validate_asset.py experiments/next-adventurer-01/asset.glb
npm test
```

Preview an unpromoted humanoid candidate at
`http://127.0.0.1:8000/?model=experiments/next-adventurer-01/asset.glb`.
This uses the normal village, player skinning and movement with the candidate
GLB, while the default player remains the imported asset.

The output directory must be new; builds never overwrite an accepted runtime.
The converter accepts vertex-only, uncompressed ASCII or binary little-endian
**standard 3DGS** PLY: `x/y/z`, `f_dc_0..2`, `opacity`, `scale_0..2`, `rot_0..3`.
Opacity is a logit, scales are logarithms, and source quaternions are WXYZ.
Confirm these semantics against the actual TripoSplat export before converting.
A mesh PLY, RGB point cloud, compressed splat, renamed ZIP, or Git LFS pointer
is not that format. Report an incompatible header; implement a deliberate adapter
only against a known sample. Do not silently guess a format or add fallback APIs.

Inspect bounds, outliers, orientation, and limb gaps first. Set `source_to_game`
(an orthonormal 3×3 matrix), optional source-space `crop` bounds, voxel resolution,
opacity floor, density threshold, sigma extent, color quantization and grid limit
in **that asset's** `asset.json`. Fit every joint and region gate in `rig.json` to
the actual voxel geometry. Joint positions are in normalized game coordinates.
L/R labels in this first rig refer to negative/positive model X respectively.
Keep parent joints before children; the runtime requires contiguous joint node
indices beginning at zero. No universal rig fit is promised.

The recipe samples oriented Gaussian density, takes the strongest Gaussian per
voxel, quantizes DC colors, emits only exposed cube faces, normalizes height,
and fits four normalized segment weights. It discards higher spherical harmonics
and does not reproduce Gaussian alpha compositing. It is a stylization recipe,
not a faithful Gaussian renderer or recovered topology. Fine features, cavities,
shadows baked into source colors and noisy floaters may need iteration.

Humanoids export `Idle`, `Walk`, `Run`, `Jump` (case sensitive), generated as
in-place procedural tests. The game owns motion/gravity. Other rigs and trained
motion are out of scope until a real humanoid passes review. Static assets can
use `kind: "static"` for conversion, but the current player loader requires a
skinned humanoid and cannot be used to render a static prop without integration.

## Acceptance and truthful status

`validate_asset.py` checks finite packed data, index ranges, outward winding,
unit normals, normalized byte colors and weights, bind-pose transforms, unit
quaternions, uniform animation key times and the four clip names. The runtime is
a deliberately narrow GLB reader, not a general glTF loader. Do not feed it
compressed geometry, textures, strided/sparse data or arbitrary node transforms.

Passing the audit is structural evidence only. Before promotion, inspect front,
back, sides and obliques; compare silhouette, face, palette and proportions to the
reference. Watch complete idle/walk/run/jump cycles for detached limbs, stretching,
wrong attachments, foot drift and intersections. Verify scale, facing, landing,
river reset and frame rate in the game. Record screenshots/contact sheets and
review notes for the actual candidate when browser tools are available. State
explicitly if a browser or a real PLY could not be tested. Synthetic tests are
converter checks, never proof of TripoSplat asset quality.

`emberbrook-adventurer` is `imported-runtime`: its GLB was extracted byte-for-byte
from the user's HTML. Its source image, PLY and original converter are absent.
Do not label that conversion reproducible. `next-adventurer` is `awaiting-splat`.
Use `candidate-needs-visual-review` for fresh builds; only document a reviewed
asset as accepted, with the evidence and remaining limitations.

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
The user can unzip and push; read the committed files before continuing. Do not
claim an upload or commit happened without checking it. Keep the archive under
`old/` untouched, including canonical source bytes; do not maintain it in parallel.
