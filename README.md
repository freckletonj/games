# Wonderwood — magical family co-op adventure

**Playable prototype, second iteration.** A self-contained, offline 2D side-scroller about befriending fantasy creatures and borrowing their powers to solve traversal puzzles.

Feed wary creatures with snacks, throw a magic orb to attempt a catch, then **spend your own single-use transformation charge** for 22 seconds of magic. More snacks make captures likelier; at maximum wariness the odds are 12%, and at zero wariness they are 98%. Each captured creature respawns after seven seconds so a missed or expired transformation never soft-locks the level. Snack bushes replenish after 13 seconds.

### First Forest: the three-gem puzzle

- **Springaroo** (pink, star-crowned marsupial): jump again in midair. Reach the **Canopy Gem** above the ordinary ledge path; it cannot be collected with just one jump.
- **Moonwing** (luminous lunar bird): hold jump to fly. Reach the **Sky Gem** on the otherwise inaccessible high cloud ledge.
- **Tidefox** (aquatic fox-otter spirit): swim and dive. Retrieve the **River Gem** from the flooded lake, then swim through to the far bank.

The gate opens only when all three gems have been found. Non-swimmers sink in deep water, lose one heart and return to their last safe foothold. Players sleep when they lose all hearts; player 1 can revive themselves, and either player can revive a nearby teammate without spending anything. Both players are kept visible with a shared-camera leash; moving too far ahead displays a reminder.

## Play and build

**For playing, open `dist/wonderwood.html` directly in Firefox**; no server, internet connection, or installation is necessary. All graphics, JS, CSS, and the level are embedded. The canvas renders internally at **960×540**, twice the previous resolution, with new 32×40 procedural sprite originals and extra parallax/glow details.

To rebuild from the editable source, use Node.js 20+ (no npm dependencies):

```sh
node scripts/build.mjs
```

For local development with source files, from the repository root:

```sh
python3 -m http.server 8000
# Visit http://localhost:8000/ after building, or /dist/wonderwood.html
```

`index.html` is a build template; do not open it unbuilt. `dist/wonderwood.html` is the complete self-contained game.

## Controls

| Action | Player 1 | Player 2 | Standard gamepad |
| --- | --- | --- | --- |
| Move | A / D | J / L | Left stick / D-pad |
| Jump, double-jump, swim up, fly | W / Space | I | A / Cross |
| Swim down | S | K | Stick down |
| Throw snack | F | O | B / Circle |
| Throw magic orb | G | P | X / Square |
| Change selected form | Q | H | RB |
| Transform yourself | T | U | Y / Triangle |
| Revive yourself (player 1) or nearby teammate | R | Y | LB |
| Pause | Escape | Escape | Escape |

Select a type with Q/H or RB before transforming; each player's selected type and available charges appear separately in the HUD. Use **Map controller** in the menu for unusual USB layouts; mappings and vibration preferences are saved locally. Rumble requires Gamepad API haptic support from the controller, driver and browser, so it may not be available on every Linux/Firefox combination.

## Physics and level-design contract

The simulation uses a 16-world-pixel tile grid and 60 Hz normalized frame units. These constants in `src/games/animal-adventure/game.js` describe the ordinary player:

| Property | Value |
| --- | ---: |
| Run velocity | 2.25 world px/frame (135 px/s) |
| Jump launch velocity | 5.7 px/frame upward |
| Gravity | 0.27 px/frame² downward |
| Normal jump peak | ~60 world px (~3.7 tiles) |
| Normal jump air-time on level ground | ~42 frames |
| Normal full-jump horizontal reach | ~95 world px (~6 tiles) |
| Springaroo's second upward launch | 5.5 px/frame |
| Shared-camera maximum player separation | 408 world px |
| Non-swimmer exposure before water rescue | 0.9 seconds |

The map's ordinary ledges are **one-way**: players jump through them from below and land on top. The first three ledges have been checked with automated traversal inputs, not merely placed by eye. The magical puzzles are deliberately *outside* the ordinary jump envelope. The canopy gem can be reached on the second Springaroo jump from the lower platform. The lake is not a walkable floor.

### AI-friendly level PNGs

Each bitmap pixel is a **semantic tile**, not a rendered picture. The built-in level is `src/games/animal-adventure/levels/first-forest.png` (120×25 cells). The menu can import a PNG; for an enlarged AI-generated tile map, set the *Pixels per tile* option. The parser tolerates approximate colors and uses a center-region vote to reduce blurred edges and compression noise. Unknown colors become empty, with warnings; missing required start or exit markers stop the launch. Generate an explicit tile palette map first and produce decorative imagery separately.

| Color | Meaning |
| --- | --- |
| `#FFFFFF` | Empty |
| `#101820` | Solid ground |
| `#5F5B85` | Jump-through platform |
| `#176AD7` | Deep water |
| `#00ED31` | Player 1 spawn |
| `#91FE54` | Player 2 spawn |
| `#FF152B` | Exit |
| `#FFDC12` | Springaroo spawn |
| `#00EEEF` | Moonwing spawn |
| `#EF851A` | Tidefox spawn |
| `#FF64BB` | Regenerating snack bush |
| `#E83C86` | Canopy Gem |
| `#B052FC` | Sky Gem |
| `#167B86` | River Gem |
| `#AAAAAA` | Checkpoint marker |

## Architecture

- `src/platform/input.js` — reusable action-based keyboard/gamepad mapping, calibration, vibration and re-connection.
- `src/platform/storage.js` — settings, controller profiles, win count, JSON save export/import.
- `src/platform/levels.js` — tolerant semantic-PNG parser.
- `src/platform/art.js` — larger animated sprite atlas generated from vector/pixel drawing primitives; magical creature appearances live here.
- `src/games/animal-adventure/game.js` — rules, physics, camera, captures, transformations, combat, level win condition and renderer.
- `src/main.js` — shared menu and game lifecycle.
- `scripts/build.mjs` — zero-dependency single-HTML builder.
- `tests/smoke.py` and `tests/playability.py` — browser tests (Python Playwright + Chromium).

```sh
python tests/smoke.py
python tests/playability.py
```

The playability test checks menu flow, 2× resolution, ordinary jump, double jump, reachable ledges, a genuine orb catch, per-player transformations, camera leash, water rescue, underwater key, sky key, canopy key, completed level, and post-win Escape behavior.

## Saves, limitations and next steps

`localStorage` behavior for a directly opened `file://` game varies by browser and may differ between file paths. Use Settings → Export Save / Import Save before moving or renaming a build; a fixed `localhost` origin is still the most reliable option for persistence.

This is an **early playable prototype**, not a finished content-rich game. Art is still procedural rather than hand-drawn spritesheet animation; there is one handcrafted level; audio, controller rumble, and Linux Firefox behavior have not been physically verified. The automated playability checks run in headless Chromium and do not replace real hardware or family playtesting. Next improvements should follow observations from actually playing, especially tuning throw aim, enemy attack difficulty, water traversal timing and camera feel.
