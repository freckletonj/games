# Wonderwood — Magical Adventure Arcade

A two-player-capable, **single-file offline** magical animal platformer. Befriend imaginative creatures with treats, capture their one-player-owned transformation time, and use their powers to solve puzzles across **three large playable chapters**. Eight species have distinct behaviors. The game defaults to **solo** so an idle second player never holds back exploration.

## Play it

Open [`dist/wonderwood.html`](dist/wonderwood.html) in Firefox or Chromium. **No server, Node, downloads or internet connection are required to play the release file.** Select **Choose a Level** from the first menu; all three chapters are immediately accessible. You can complete one and continue to the next from its victory screen. Each completed chapter is tracked in the browser's save.

To rebuild after editing source (Node.js 20+):

```sh
node scripts/build.mjs
```

The output is a single bundled 1440×810 HTML canvas adventure containing the pixel artwork, sounds, JS and all three lossless semantic PNG maps. No npm dependencies or external requests. If browser storage is unstable for `file://` pages, open the file from a constant local address instead, or **Export Save** before moving it.

## Three chapters, different challenges

| Level | Map size | Adventure |
| --- | --- | --- |
| **Mosslight Meadow** | **260×42 tiles** | Learn the three core creature powers: **Springaroo double jump** for the Canopy Gem, **Moonwing flight** for the Moon Gem, **Tidefox diving** for the River Gem |
| **Crystal Coast** | **296×44 tiles** | Cross the luminous reefs. Win a **2.6-second Prismtail speed trial**, survive the crystal sentinels, and dive for the Pearl Gem |
| **Starfall Summit** | **320×46 tiles** | Reach the Zephyr Gem via **Cloudwhisp thermals**, befriend **two Emberkits** to awaken the Hearth Gem, then fly to the upper Aurora Gem |

Every chapter contains varied terrain, stepped and floating one-way ledges, water hazards, magical creature spawns, signposted areas, repeatable snack baskets, checkpoints, and hidden star shards. The mission objective and remaining shards appear discreetly in the compact upper-right HUD. A small prompt identifies the next relic. There is no penalty for revisiting an area.

**No soft locks:** creature spawns, food, and catch orbs are replenishable. Gems stay collected even after a transformation expires. `C` (P1) or `N` (P2) returns your party to the beginning without losing anything. **Escape → Warp to last checkpoint** skips replaying a long route. Fainted players sleep on solid ground and can wake themselves instantly.

## Controls

| Action | Player 1 | Player 2 | Standard controller |
| --- | --- | --- | --- |
| Move | A / D | J / L | Left stick or D-pad |
| Jump / fly / swim up | W / Space | I | South / A button |
| Swim down / use Emberkit warmth | S | K | Stick down |
| Throw selected treat | F | O | East / B button |
| Change treat | E | M | Right trigger |
| Throw capture orb | G | P | West / X button |
| Cycle selected creature | Q | H | Right shoulder |
| Transform / switch back | T | U | North / Y button |
| Wake / revive | R | Y | Left shoulder |
| Return everyone to camp | C | N | Back / Select |
| Pause / menu | Escape | Escape | Keyboard Escape |

Menus work with arrow keys + Enter, mouse or standard gamepad. The built-in **Controller Setup** reads arbitrary USB button/axis layouts and stores the mappings. Gamepad vibration is sent when supported by the browser, controller and driver.

## Creature behaviors and borrowed abilities

| Magical creature | What it does in the world | Transformation |
| --- | --- | --- |
| **Springaroo** | Hops toward visitors and fires thorn darts | A second midair jump |
| **Moonwing** | Swoops from the sky and spreads feathers | Hold Jump to fly |
| **Tidefox** | Darts through the tides and releases bubbles | Swim upward or dive freely |
| **Cloudwhisp** | Drifts in circling currents and releases gusts | Glide when holding Jump; ride sky thermals |
| **Prismtail** | Alerts, then dashes in a colored streak | Sprint much faster |
| **Mossback** | Defends its perch with seed volleys | Armor blocks enemy projectiles |
| **Glimmermoth** | Runs away from explorers; tosses starlight | Passive friendship aura |
| **Emberkit** | Stalks its territory, pounces and releases embers | Press Down on the ground for a calming burst |

Enemies signal their attacks with a clear **!** before throwing projectiles or dashing. Each has a wariness meter; reducing wariness with its favorite food makes capturing easier. Capture chance rises from 12% to 98%. Captures grant **time in that one form to the catching player**. Switching saves any unused time for later. The active transformation shows its **portrait, ability instructions and timer**, then contracts into a small HUD indicator.

The five foods have distinct trajectories: Blushberries arc, Stardrops shoot straight, Nectar sprays a calming cloud, Honeybombs splash in an area, and Cloudmallows float. Favorite foods are 70% more effective.

## Level authoring and AI-generated maps

The levels are lossless semantic bitmaps: **one pixel represents one tile** (16 world units). To inspect or edit existing maps, open:

- `src/games/animal-adventure/levels/first-forest.png`
- `src/games/animal-adventure/levels/crystal-coast.png`
- `src/games/animal-adventure/levels/starfall-summit.png`

The palette is exported as `WW.levels.colors` in `src/platform/levels.js`; the primary swatches include `#101820` ground, `#5f5b85` one-way platform, `#176ad7` water, `#8af1f9` Cloudwhisp thermal, `#00ed31` player start and `#ff152b` level exit. Distinct colors mark creature spawns, food, checkpoints, optional stars and relics.

The in-game **Load PNG Map** option accepts imperfect AI-generated color maps. The parser handles image scaling and moderate pixel/color noise by taking majority votes in each logical tile, snapping to the nearest semantic color and reporting unknown colors. It avoids brittle exact-color-only matching; level structures still need a start and an exit. For custom maps, any supported relic markers become goals automatically.

The three shipped maps are authored deterministically with `scripts/make-levels.py` (uses Python Pillow **only if you regenerate the maps**, not to build or play the game). Keeping the image source means new chapters can be edited with GIMP, Krita, Aseprite or generated by other software.

## Architecture

- `src/platform/`: controller abstraction, calibration, rumble, tolerant bitmap levels, procedural pixel sprites, SFX, and persistent settings
- `src/games/animal-adventure/catalog.js`: form/food properties
- `src/games/animal-adventure/chapters.js`: chapter names, goals, scripted events, hints and scenery themes
- `src/games/animal-adventure/game.js`: world physics, distinct creature AI, challenges, pickups, camera, rendering and small HUD
- `src/main.js`: reusable game menu, chapter selection, keyboard navigation, pause, level lifecycle, save controls
- `scripts/build.mjs`: packages all code and PNGs in one HTML file without dependencies

### Browser regression tests

```sh
python tests/smoke.py
python tests/playability.py
python tests/routes.py
```

These require Python Playwright and Chromium (`/usr/bin/chromium` in the reference environment). They cover all three chapters, reduced HUD, controller-independent keyboard menus, unique AI behaviors, transform help cards, time preservation, rescue, loot and goal gating, the sprint trial, Cloudwhisp lift, the Emberkit ritual, winning and progression. The routes test uses actual physics to show **normal jumps do not bypass the first chapter's key power challenges**, while double jump, flight and swimming do reach the relics.

**Known limitations:** This is a larger playable prototype with original procedural pixel art, not a fully art-directed commercial production. The build and input behavior were tested in headless Chromium; Linux/Firefox USB controllers and vibration still need on-device verification. Levels are designed and ability-tested, but actual family playtesting is essential to tune difficulty, fun, readability and pace. Single-file `file://` browser storage is browser-dependent; exported saves are strongly recommended.
