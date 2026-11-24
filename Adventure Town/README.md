# Adventure Town

A small 3D game project and an image-driven voxel character pipeline. The game currently consists of a playable character test ground; there is no story, combat system, or level progression yet. The canonical character is the orange-haired adventurer with goggles, a scarf and a backpack.

The aim is to scale asset creation by using image/video generation for art, deterministic reconstruction and rigging for game assets, and LLMs for orchestration, inspection and targeted refinement. Do not hand-author voxel sculptures as the default workflow.

## Run the game

Install Node.js 20.19+ or 22.12+, then enter this game's directory from the repository root:

```sh
cd "Adventure Town"
npm install
npm run dev
```

Open the local URL printed by Vite. Use WASD or arrow keys to move, and Space to play the attack animation. The game loads the committed rigged GLB; Python and image generation are not needed to play. `npm run build` creates a deployable `dist/` directory; `npm run preview` serves that build.

Three.js is used as a lightweight runtime for the test scene. The assets themselves are standard glTF 2.0 GLBs and are not tied to Three.js. No engine-specific asset data is required by the Python pipeline.

## Repository layout

```text
characters/
  adventurer/
    character.json       # source paths, angles and reconstruction settings
    README.md            # identity, baseline metrics, known limitations
    source/              # canonical GIF, contact sheet, rig configuration, prompt
    generated/           # static and animated GLBs, previews and numerical reports
  <new-character>/       # same layout, independent source and configuration
tools/asset_pipeline/    # shared Python reconstruction, skinning, export, validation
game/                    # browser game code and UI
docs/                    # character acquisition, workflow, architecture
index.html
package.json
AGENTS.md
```

## Rebuild a character

Run these commands from `Adventure Town/`. Python 3.11+ is recommended. Create a virtual environment and activate it, then install the pipeline dependencies:

```sh
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -r tools/asset_pipeline/requirements.txt
python tools/asset_pipeline/build_character.py characters/adventurer
```

The build script reads `character.json`, reconstructs the voxel volume from the transparent turntable, fits the configured rig, exports the GLB and runs the animation audit. Outputs go into that character's `generated/` directory. The source GIF is not modified.

To experiment without replacing the canonical build:

```sh
python tools/asset_pipeline/build_character.py characters/adventurer --height 96 --out experiments/adventurer-96
```

Audit the committed asset without rebuilding:

```sh
python tools/asset_pipeline/validate_rig.py characters/adventurer/generated
```

## Add more characters

Follow [the character creation guide](docs/CHARACTER_CREATION.md) and [the default acquisition prompt](docs/ACQUISITION.md). The [pipeline design notes](docs/PIPELINE.md) explain what works and what still needs research. See the [canonical adventurer](characters/adventurer/README.md) for a complete example.

Commit the canonical source, per-character configuration and approved generated outputs together. Keep exploratory builds in `experiments/` (ignored by Git); do not add obsolete versions of the same character to the repository. `node_modules/`, virtual environments, caches and `dist/` are not committed. There is no license chosen yet; set one before publishing the project if appropriate.
