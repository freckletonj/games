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
| Whole chapter traversal to relic and gate without cheating | **Not yet proven** | Need continuous-input route solver and human playtesting |
| Single standalone HTML, no runtime network | Verified | Offline Chromium smoke and CI artifact |

Mosslight Meadow is the intentional first **gold-standard vertical slice**:
three acts, coherent illustrated scenery, a guided Springaroo, a telegraphed
enemy, reachable high light, checkpoints and gentle lantern-grove exit.
Keep the original source world untouched to compare feel and route coverage.
