# Wonderwood — family-friendly magical creature adventure

**Version 3: playable forest build.** A two-player, offline 2D platformer about charming magical animals, catching them, and borrowing their abilities to solve puzzles. One HTML file contains the complete game, assets, and map. No npm packages, CDN, Python server, or network access needed to play.

## Play

Open **`dist/wonderwood.html`** in Firefox or another browser. Use arrow keys + Enter on menus. Click **PLAY FIRST FOREST** or select it with the keyboard. To rebuild after editing the source, install Node.js 20+ and run:

```sh
node scripts/build.mjs
```

The output is a standalone **1440×810 pixel-art canvas** bundled as `dist/wonderwood.html`. Source sprite frames are 64×80 pixels with original illustrated fantasy creature designs. Visual layers include moonlit skies, enchanted trees, lanterns, flowerbeds, glowing gems, particle effects and parallax. SFX are synthesized locally by the Web Audio API.

The first forest is a single 120×25 semantic pixel map, with three mandatory gems and eight optional star shards. Collecting all three opens the gate; star shards reward extra Stardrop snacks and a record of your collection, but are never required to finish.

## Controls

| Action | Player 1 | Player 2 | Standard controller |
| --- | --- | --- | --- |
| Move | A / D | J / L | D-pad or left stick |
| Jump / swim up / fly | W or Space | I | A / Cross |
| Swim down | S | K | Stick down |
| Throw selected food | F | O | B / Circle |
| Change food type | E | M | Right trigger |
| Throw catch orb | G | P | X / Square |
| Choose creature | Q | H | Right shoulder |
| Switch to selected creature / return to explorer | T | U | Y / Triangle |
| Wake / revive | R | Y | Left shoulder |
| **Return party to camp (never loses progress)** | **C** | **N** | Back / Select |
| Pause / menu | Escape | Escape | Keyboard Escape |

All eight captured forms appear as character portraits in each player's HUD. The highlighted portrait is the one selected for transformation; active forms have a different highlight. Press T or U to transform, switch to another unlocked creature, or toggle back to explorer. **Time remaining is saved separately for each player and creature** whenever that creature isn't active. Capturing more of the same kind adds more time to its bank.

The keyboard menu is fully operable with arrows and Enter, and connected standard controllers can navigate it with a D-pad/stick and confirm with A. The **Controller setup** menu lets you train arbitrary USB layouts, including independent buttons for cycling foods and returning to camp. Vibration works only when the Gamepad API, operating system, driver and controller support it.

## Magical forms

| Creature | Ability | Time from a capture | Favorite snack |
| --- | --- | ---: | --- |
| Springaroo | Midair double-jump | 36 s | Blushberry |
| Moonwing | Hold jump to fly | 30 s | Stardrop |
| Tidefox | Swim freely, ascend and dive | 42 s | Nectar mist |
| Cloudwhisp | Hold jump to float slowly | 34 s | Cloudmallow |
| Prismtail | Sprint at extraordinary speed | 32 s | Stardrop |
| Mossback | Deflect hostile attacks with armor | 45 s | Honeybomb |
| Glimmermoth | Passively calm nearby creatures | 32 s | Nectar mist |
| Emberkit | Press down on dry ground for a calming warmth burst | 30 s | Honeybomb |

Each animal has a **wariness meter**. Each successful snack hit lowers wariness. Favorite foods are 70% more effective. The catch probability ranges from 12% at maximum wariness to 98% at zero wariness. All animals respawn after five seconds, allowing retrying as often as desired.

### Five different snacks

- **Blushberry:** forgiving arcing throw; a great basic treat.
- **Stardrop:** faster, straight-shooting candy.
- **Nectar mist:** short-range spray that calms several creatures at once.
- **Honeybomb:** slow lob with an area-of-effect splash.
- **Cloudmallow:** gently floating treat for airborne creatures.

Snack baskets regenerate and replenish all five kinds. There are no ammo charges for magical catch orbs. Creatures attack using different patterns, including bursts of feathers, drifting bubbles, thorn arcs, gusts, sparks, seeds, star-light and embers. Being hit costs a heart. When health reaches zero, the explorer **lies asleep with drifting Zs** instead of blinking. A player can wake themselves with their revive key, or be revived by a teammate. The player is always placed on safe, dry ground before fainting from water.

## Puzzle route and anti-softlock rules

**The Canopy Gem** requires Springaroo's second jump. **The Sky Gem** requires Moonwing flight. **The River Gem** is underwater and best reached with Tidefox. Once the explorer physically touches a gem, it is picked up **regardless of their current form**; you never have to time the pickup to the final moment of a transformation. A forgiving rectangular pickup zone accommodates sprite size and jump animation.

Water is a hazard for non-swimmers: after a short exposure, they lose a heart and are returned to a previously recorded safe dry foothold. Even if the last heart is lost, they remain on shore asleep, and may revive immediately. A powered form that expires in water also rescues the explorer to shore.

The entire party can use the unlimited **Homeward spell** (`C` / `N`, controller Back, or Pause → Return everyone to camp) at **any time**. All gems, star shards, food, unlocked forms and remaining transformation times are preserved. This prevents becoming trapped on the far bank if a creature's magic expires. Creature spawns and snack baskets also replenish indefinitely. A camera leash prevents one co-op player disappearing beyond the screen while the other stays behind.

## AI-friendly level PNGs

Each pixel is a semantic tile, not rendered artwork. `src/games/animal-adventure/levels/first-forest.png` is the supplied map. The in-game **Load PNG map** option accepts imported maps. For an AI-generated grid with larger blocks, specify image pixels per logical tile. The parser takes a central majority vote of approximate palette colors, tolerating anti-aliasing and moderately imperfect output; unknown colors become empty and emit warnings. A green start and red exit are required. Use lossless PNG and clear color blocks for best results.

| Hex | Meaning | Hex | Meaning |
| --- | --- | --- | --- |
| `#FFFFFF` | Empty | `#101820` | Ground |
| `#5F5B85` | Jump-through ledge | `#176AD7` | Water |
| `#00ED31` | Player 1 | `#91FE54` | Player 2 |
| `#FF152B` | Exit | `#AAAAAA` | Checkpoint |
| `#FFDC12` | Springaroo | `#00EEEF` | Moonwing |
| `#EF851A` | Tidefox | `#9480ED` | Cloudwhisp |
| `#FF895D` | Prismtail | `#6B9C42` | Mossback |
| `#CE6DFF` | Glimmermoth | `#FC5D3E` | Emberkit |
| `#FF64BB` | Snack basket | `#F2F28A` | Optional star shard |
| `#E83C86` | Canopy Gem | `#B052FC` | Sky Gem |
| `#167B86` | River Gem | | |

The physics source of truth is `src/games/animal-adventure/game.js`: 16 world pixels/tile, 2.25 px/frame ordinary run speed, upward jump impulse 5.7 px/frame, downward gravity .27 px/frame², and normal jump apex ~60 world pixels (about 3.7 tiles). The level's ordinary ledge chain is tested with simulated keyboard jumps; exceptional gem routes require their associated creature powers. One-way platforms can be jumped through from below and landed on from above.

## Source architecture

- `src/platform/input.js`: action-based keyboard/gamepad, calibration, rumble, menu gamepad support.
- `src/platform/storage.js`: settings, profiles, local progress, portable save import/export.
- `src/platform/levels.js`: tolerant semantic PNG parser.
- `src/platform/art.js`: original 64×80 sprite frames, HD portraits, food icons.
- `src/platform/audio.js`: synthesized sound effects, no downloads.
- `src/games/animal-adventure/catalog.js`: creature and food data.
- `src/games/animal-adventure/game.js`: state, physics, puzzles, camera, combat, HUD, rendering.
- `src/main.js`: game selection menu, controller setup, settings, creature guide, pause and lifecycle.
- `scripts/build.mjs`: bundles HTML with all source and PNG data; no external requests.
- `tests/smoke.py`, `tests/playability.py`: headless Chromium browser regression checks using Playwright.

```sh
python tests/smoke.py
python tests/playability.py
```

## Browser persistence and testing limitations

Settings and wins use `localStorage`. The behavior of `localStorage` on `file://` URLs can differ across browsers and when a file is moved/renamed. Export your save before changing the path or use a stable `localhost` address if you need reliable save continuity. The self-contained game runs without a server; an optional local server is useful during development.

The automated tests exercise menus, real keyboard events, ordinary platform traversal, jump envelope, camera containment, creature capture ownership, per-form saved time, food switching, water rescue, gem collection, optional shards, win screen and return to menu. They ran under headless Chromium in the development environment. **Real Firefox/Linux USB input and rumble still require device-level testing.** The game is a substantial playable prototype with original procedural art, not a fully produced commercial title; it has one designed level and synthesized SFX rather than a full soundtrack.
