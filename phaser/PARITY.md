# Phaser 4 feature-parity audit

Status: **partial parity, playable vertical slice**. Comparison source:
the original game README and `src/games/animal-adventure/game.js` on main.
This is an engineering ledger, not a claim that automated tests prove fun.

| Original behavior | Phaser state | Evidence |
| --- | --- | --- |
| Five semantic worlds compiled from JSON | Implemented | `tests/worlds.test.mjs`, `tests/chapters.py` |
| Eight catchable animal species | Implemented | `tests/parity.test.mjs` |
| Feed two favorite / three other treats | Implemented | `tests/creatures.test.mjs`, `tests/gameplay.py` |
| Only distracted animals can be captured for 12 sec | Implemented | `src/creatures.js`, `tests/creatures.test.mjs` |
| Captured wildlife returns after 17 sec | Implemented | `src/game.js`, timer simulation; browser expiry test still useful |
| Latest captured species replaces former transformation | Implemented | `src/game.js` |
| Springaroo double jump | Implemented | `tests/gameplay.py` |
| Tidefox underwater swimming and surface breach | Implemented, needs water route tests | `src/game.js` |
| Moonwing wingbeats; thermal refill | Implemented, needs aerial route tests | `src/game.js` |
| Mossback honey / Prismtail bubble / Cloudwhisp gust / Emberkit stun | Implemented, approximate combat feel | `src/game.js` |
| Glimmermoth slow-fall hover | Implemented | `src/game.js` |
| Telegraph before damaging enemy dash; head-stomp | Implemented, enemy tactics simplified | `src/game.js` |
| Picnic baskets restock finite fruit | Implemented | `tests/gameplay.py` |
| Checkpoint restores hearts | Implemented; needs dedicated integration assertion | `src/game.js` |
| Knockout, personal revive / nearby co-op revive | Implemented, needs damage/revive browser test | `src/game.js`, `tests/input.test.mjs` |
| Second local player + follow bubble | Implemented, partial parity | `tests/smoke.py` |
| Saved campaign completion / best shards | Not yet ported | Original `WW.storage` |
| Wonder Trails, ring timing and co-op relays | Not yet ported | Original campaign feature |
| Creature pursuit/fleeing, species-specific attack lanes | Partial | Emberkit/Prismtail dash first; more behaviors pending |
| Co-op instant revive & controller hardware rumble | Revive supported; rumble not yet ported | Hardware test required |
| Whole first chapter traversal to relic and gate without cheating | **Verified on one scripted route** | `tests/complete_meadow.py` crosses three acts with real key presses, jumps, relic contact and gate transition |
| Single standalone HTML, no runtime network | Verified | Offline Chromium smoke and CI artifact |

Mosslight Meadow is the intentional first **gold-standard vertical slice**:
three acts, coherent illustrated scenery, a guided Springaroo, a telegraphed
enemy, reachable high light, checkpoints and gentle lantern-grove exit.
Keep the original source world untouched to compare feel and route coverage.

## Scripted first-chapter completion proof

`phaser/tests/complete_meadow.py` is a non-cheating real-input browser
regression: starts at the menu, feeds the first Springaroo twice, captures
and transforms, crosses the terrain and enemy encounter, double-jumps
onto two existing one-way ledges, physically touches the elevated light,
then walks to the gate and verifies that Crystal Coast starts. No
setters, state mutation, transport or granted forms are used. It also
exports screenshots at light pickup and next-chapter entry.

This proves a reproducible input sequence succeeds on one real Chromium
run; it does **not** establish that every alternative route is possible,
that every species transformation is equally balanced, or that humans
will find the level intuitively. Other chapters still need this test.

## Specific movement fixes and mount parity

| Mechanic | Phaser behavior | Verification |
| --- | --- | --- |
| Bounce bloom timing | Automatic bounce + forgiving second Jump press in ~0.37 seconds | `src/springboard.js`, `tests/movement-dynamics.test.mjs` |
| Underwater uphill wall | Swept x collision blocks ground tunnelling; descending ground snap | `src/physics.js`, shoreline unit test |
| Berry feed | Crop of existing painted berry bunch; longer physically animated throw | `src/game.js`; full Meadow feeding test |
| Capture orb | Nonhoming, slow, gravity-driven and bounces on terrain | `src/physics.js`, orb trajectory unit test |
| Unicorn | Original PR #6 painted AVIF; 2 favorite treats then T/Y to board; fast leap | `src/mounts.js`, asset manifest tests |
| Pegasus | Original PR #6 painted AVIF; 2 star treats, T/Y board, repeated Jump flaps, Down descends | `src/mounts.js`, asset manifest tests |

The original PR #6 mount **skill courses and timed mount challenges** are
not included yet; the goal is to validate riding and collision first. New
Pegasus poses would further improve the wingbeat cycle.

## Timing and simulation integrity

- Player motion is extracted to `src/player-motion.js` with no Phaser
  dependencies. Creature locomotion, respawn and attack windups are in
  `src/creature-motion.js`. Each has direct tests that operate on simple
  game-state records.
- A bounded 60 Hz clock drives all gameplay logic, not a variable
  frame-size multiplier. It queues input edges across fast render frames
  and consumes pressed events only once across low-FPS catch-up steps.
- The visual tween clock still uses Phaser's time; only gameplay physics,
  collectible lifetimes and AI motion have fixed simulation steps.
