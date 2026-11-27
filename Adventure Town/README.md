# Adventure Town

A fresh voxel 3D game foundation based on the supplied Emberbrook proof of
concept. Explore a small riverside village, cross its bridge or swim across the river, hop the stepping boulders, and jump
through the mossy ruins. Enter any cottage, the grocery or the potion shop with
**F** (or the contextual touch button), then return through the room doorway. Move with WASD/arrows, hold Shift to run, Space to jump, and Q/E
to orbit. Drag to turn the camera and scroll to zoom. Touch controls are included.
The rooms have furniture and small contextual interactions. There is no shopping
system, inventory, quest progression or combat in this milestone.

The current player is the **exact rigged GLB extracted from the user's Emberbrook
HTML**: 6,782 vertices, 3,682 triangles, 15 joints, and Idle/Walk/Run/Jump clips.
It is a playable imported baseline. The original PLY and reconstruction recipe
were not included, so this import does not establish a reproducible conversion.

## Play and develop

From the repository root:

```sh
cd "Adventure Town"
npm run dev
```

Open `http://127.0.0.1:8000`. Python 3 and Node 20+ are enough; there is no npm
install step and no external runtime engine. WebGL is required.

```sh
npm run build
```

Double-click `dist/adventure-town.html` to play offline. It embeds all code,
styles, the character and all eight converted town assets. The source version uses modules and fetches the
model, so serve `index.html` over HTTP rather than opening it as a local file.
The village block geometry, movement and camera come from the supplied prototype;
the model is now a standalone asset and code is split into model/world/renderer/
controller modules. The offline file is generated, not committed.

## The new asset loop

**Agent generates transparent PNGs → image ZIP to user → user commits PNGs and
TripoSplat PLYs → agent reviews/voxelizes → runtime ZIP to user → play and commit.**

The workflow and acceptance rules live in [AGENTS.md](AGENTS.md). The current
batch is **eight town objects**, detailed in [the town asset guide](docs/TOWN_ASSETS.md):
cottage/grocery/potion shop exteriors, produce shelf, potion workbench, dining
table, hearth and boulder. The user has committed the eight reference PNGs and
original splats. Their first
voxel conversions are now enabled in the town, with per-asset reports and visual
review notes. Extract the **runtime asset ZIP at the repository root** and commit
its GLBs/review PNGs before running the source checkout. Small code/config/docs
are committed by the agent. The standalone HTML is ready to play without
extracting anything. The existing adventurer stays; the new character is deferred.

To generate the PLYs in your existing TripoSplat environment, run from the
repository root:

```sh
python "Adventure Town/tools/generate_splats.py" --weights /path/to/ckpts
```

This loads the weights once, processes pending references sequentially, and saves
into each asset's `incoming/` directory for new references. See [the CLI guide](docs/TRIPOSPLAT.md)
for the weight layout, selecting asset IDs, resuming and settings. For the later
voxel conversion, use this game's directory and its NumPy environment:

```sh
python3 -m venv .venv
# Activate .venv, then:
python3 -m pip install -r tools/requirements.txt
python3 tools/convert_splat.py assets/river-boulder --out experiments/river-boulder-01
python3 tools/validate_asset.py experiments/river-boulder-01/asset.glb
```

After a real PLY arrives, inspect and fit orientation/crop/density/scale, then
preview its voxel mesh in the game using
`http://127.0.0.1:8000/?scenery=river-boulder&candidate=experiments/river-boulder-01/asset.glb`.
Static objects export without a rig. Reviewed models go in the asset's `runtime/`
and are enabled in `game/town-assets.js`. The offline build embeds them too.
Rooms, collision and door triggers are authored separately from the visual mesh.

These are actual 3D voxel meshes from the committed Gaussian splats, with flat
vertex colors. The hearth and grocery have a finer, more selective second conversion to retain
small details and colors. The original grocery splat has an open lower rear; the
town closes it with an explicitly authored wall. The original PLY is unchanged.
The character now swims head-first and face-down, at a fitted waterline.
See per-asset `runtime/REVIEW.md` for comparisons and remaining approximations.

## Checks and boundaries

```sh
npm test
```

This builds the offline game and exercises its actual controller and CPU skinning
with a deterministic clock and a WebGL/DOM stub. It checks movement, jump/landing,
wall collision, bridge support, swimming/shore exits, all room transitions,
stepping-stone jumps, focus release and finite draw data.
Python checks both PLY encodings, exposed-face meshing, deterministic GLB export,
weights, bind pose, winding, animation structure and static export at game scale. The tests require NumPy.
They do not establish visual quality, contact quality or actual GPU rendering.

The previous project is preserved byte-for-byte under
[`../old/Adventure Town/`](<../old/Adventure Town/>). Its GIF/multiview compiler and
rules are archived. Shared `asset-tools/` research is unchanged and is not a
dependency of the new game or workflow.

For optional real browser checks, install Playwright separately and run
`node tests/browser.cjs` after building. The test uses Playwright's installed
Chromium; `ADVENTURE_CHROMIUM` can select an explicit executable. It exercises
both the HTTP source and offline file, tours the three interior types, swims
bank-to-bank, previews a candidate static GLB, and checks mobile touch controls,
and writes temporary review captures under ignored `dist/review/`.
