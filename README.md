# Wonderwood — family adventure arcade

A self-contained, offline-friendly 2D co-op game. Feed grumpy animals to reduce their wariness, catch them with magic orbs, and spend **one timed transformation charge** to borrow each animal's ability. Fly as a bird to find the sky key; dive as an otter to retrieve the river key. Both keys open the forest gate.

## Run and build

No npm packages, browser libraries, or internet are required. Node.js 20+ is needed only to build the one-file release:

```sh
node scripts/build.mjs
```

Open **`dist/wonderwood.html`** directly in Firefox or Chromium. All scripts, CSS, sprites, and the level PNG are embedded in the file. No Python launcher is needed. For local development of the separate source files (including `src/games/.../levels/first-forest.png`):

```sh
python3 -m http.server 8000
# Open http://localhost:8000/
```

The source `index.html` is deliberately an unbuilt template and cannot run directly. Serve the built file or the source with `python -m http.server`. A Chromium smoke test is provided in `tests/smoke.py` (requires Python Playwright).

## Controls

| Action | Player 1 keyboard | Player 2 keyboard | Standard gamepad |
|---|---|---|---|
| Move | A / D | J / L | Left stick / D-pad |
| Dive down | S | K | Down |
| Jump / swim up / fly | W or Space | I | A / Cross |
| Throw snack | F | O | B / Circle |
| Throw capture orb | G | P | X / Square |
| Cycle selected form | Q | H | RB |
| Activate selected form | T | U | Y / Triangle |
| Revive | R | Y | LB |
| Pause | Escape | Escape | Escape |

Gamepads are assigned to player slots automatically as detected. Keyboard input always remains available. Use **Map controller** from the menu once per controller model for unusual layouts. Each action is learned from a button or axis movement and saved by the controller ID. The menu is intentionally simple. Rumble on hits, pickups and captures uses Gamepad vibration haptics when supported; some Linux/Firefox/controller combinations don't support rumble.

**Parent-safe recovery:** Player 1 may revive themselves with Revive even when fainted; player 1 can revive any fainted teammate by moving close and pressing Revive. No consumable required. Players lose no collected forms or keys when they faint.

## Level PNG format

The source map is an actual **104 × 24 pixel PNG** in `src/games/animal-adventure/levels/first-forest.png`. A pixel represents a 16 × 16 world tile. It is parsed at runtime and embedded in the release by the build script. The game also supports loading your own PNG files from the main menu.

| RGB hex | Meaning |
|---|---|
| `#FFFFFF` | Empty / sky |
| `#101820` | Solid grass/dirt tile |
| `#176AD7` | Water |
| `#00ED31` | Player 1 spawn (required) |
| `#91FE54` | Player 2 spawn |
| `#FF152B` | Exit gate (required) |
| `#FFDC12` | Rabbit spawn |
| `#00EEEF` | Bird spawn |
| `#EF851A` | Otter spawn |
| `#FF64BB` | Snack pickup (+5) |
| `#B052FC` | Sky key (requires bird) |
| `#167B86` | River key (requires otter) |
| `#AAAAAA` | Checkpoint marker |

The parser does **not** expect exact color matches. It tolerates moderate RGB drift, blur and some anti-aliasing using nearest-palette matching. For generated images that use blocks larger than a pixel, enter **Pixels per tile** in the import menu; a center-region weighted vote determines each tile. Completely unknown hues resolve to empty terrain and are logged rather than arbitrarily becoming walls/enemies. Image dimensions must yield an 8–400 tile wide, 6–80 tile high grid. Missing player start or exit prevents launching.

For reliable AI-generated maps, ask for a **flat-color, orthogonal tile grid using only the hex palette**, zero labels, no gradients, and no decorations. An AI-created *illustration* of a map cannot be unambiguously reconstructed as gameplay metadata; create a semantic map first and use artistic generation for the visuals separately. Thin isolated markers may disappear under block voting, so spawn/goal markers should fill their entire grid cell.

In the first iteration a single PNG encodes terrain and objects. Later we can support `terrain.png` + `objects.png` layers for stacking objects on terrain, without changing the renderer.

## Code organization

- `src/platform/input.js` — reusable action-based keyboard/gamepad mapping, calibration and optional rumble.
- `src/platform/storage.js` — settings, controller profiles and progress; JSON export/import.
- `src/platform/levels.js` — robust color-based PNG parser and validation.
- `src/platform/art.js` — generated pixel sprite atlas with four animation frames per creature.
- `src/games/animal-adventure/game.js` — game rules, animals, collisions, projectiles, camera, renderer and win condition.
- `src/main.js` — arcade menu, settings, level import and game lifecycle.
- `scripts/build.mjs` — zero-dependency single-HTML build.

The shared `WW` namespace is kept deliberately small. Additional games can live under `src/games/<game-name>/` and register their own `start(level)` function. The menu can select a registered game when added. A future 3D renderer does not need to inherit the 2D game's physics.

## Saves and direct HTML launch

Settings and win count live in browser `localStorage`. On `file://` URLs, storage isolation/persistence is browser-dependent, and different paths/renames can create different save origins. Use **Settings → Export save** periodically, especially before replacing a release file; **Import save** restores it. To keep a stable origin, run the built file from a fixed `http://localhost` address with `python3 -m http.server` in the `dist` directory.

## Known limitations

This is the first playable vertical slice. Artwork is generated by code rather than external sprite-sheet PNGs, audio is not implemented, there is one puzzle level, the water/ground physics are intentionally simple, and controller vibration needs hardware testing on your Linux setup. The color parser tolerates imperfect semantic tile maps; it is not a general-purpose image segmentation AI.