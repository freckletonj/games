# Adventure Town

A fresh voxel 3D game foundation based on the supplied Emberbrook proof of
concept. Explore a small riverside village, cross its bridge, and jump through
the mossy ruins. Move with WASD/arrows, hold Shift to run, Space to jump, and Q/E
to orbit. Drag to turn the camera and scroll to zoom. Touch controls are included.
This milestone has exploration and movement; there are no quests or combat.

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
styles and the selected GLB. The source version uses modules and fetches the
model, so serve `index.html` over HTTP rather than opening it as a local file.
The village block geometry, movement and camera come from the supplied prototype;
the model is now a standalone asset and code is split into model/world/renderer/
controller modules. The offline file is generated, not committed.

## The new asset loop

**Agent generates transparent reference → user commits TripoSplat PLY → agent
voxelizes, fits a rig and exports motion → inspect in the game → promote.**

The workflow and acceptance rules live in [AGENTS.md](AGENTS.md). Each asset has
its own `assets/<id>/` directory. The first new reference is ready in
[assets/next-adventurer](assets/next-adventurer/README.md); use its
`source/reference.png` in TripoSplat and commit the Gaussian export as
`incoming/model.ply` inside that directory. Its manifest and rig are intentionally
unfitted starting settings. The current game continues to use the imported asset.

```sh
python3 -m venv .venv
# Activate .venv, then:
python3 -m pip install -r tools/requirements.txt
python3 tools/convert_splat.py assets/next-adventurer --out experiments/next-adventurer-01
python3 tools/validate_asset.py experiments/next-adventurer-01/asset.glb
```

The converter currently supports standard uncompressed Gaussian PLY fields,
voxel surface extraction, configured humanoid skinning, and procedural in-place
Idle/Walk/Run/Jump clips. It has synthetic checks; **the new converter has not yet
been tested against a real TripoSplat export**. Fit orientation, crop and joints
against the real input and inspect motion before promoting a build.

Preview an unpromoted humanoid candidate at
`http://127.0.0.1:8000/?model=experiments/next-adventurer-01/asset.glb`.
This uses the normal village, player skinning and movement with the candidate
GLB, while the default player remains the imported asset.

After review, copy the accepted candidate GLB/report into that asset's `runtime/`,
update its status/review notes, and change `defaultModelPath` in `game/model.js`.
The bundler reads that same path, so the game and offline output select the same
asset. Rebuild and play-test both.

## Checks and boundaries

```sh
npm test
```

This builds the offline game and exercises its actual controller and CPU skinning
with a deterministic clock and a WebGL/DOM stub. It checks movement, jump/landing,
wall collision, bridge support, water reset, focus release and finite draw data.
Python checks both PLY encodings, exposed-face meshing, deterministic GLB export,
weights, bind pose, winding and animation structure. The tests require NumPy.
They do not establish visual quality, contact quality or actual GPU rendering.

The previous project is preserved byte-for-byte under
[`../old/Adventure Town/`](<../old/Adventure Town/>). Its GIF/multiview compiler and
rules are archived. Shared `asset-tools/` research is unchanged and is not a
dependency of the new game or workflow.

For optional real browser checks, install Playwright separately and run
`node tests/browser.cjs` after building. The test uses Playwright's installed
Chromium; `ADVENTURE_CHROMIUM` can select an explicit executable. It exercises
both the HTTP source and offline file, checks keyboard and mobile touch controls,
and writes temporary review captures under ignored `dist/review/`.
