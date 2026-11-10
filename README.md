# Wonderwood — a little world worth exploring

A dependency-free, offline 2D creature adventure for one or two players. Three chapters, three distinct traversal companions, one hidden light to recover per chapter, and animals with different motives.

**Play:** Run `node scripts/build.mjs` from the repository root, then open `dist/wonderwood.html` in Firefox or Chromium. No server, npm packages, or internet connection are needed. Pull request builds also publish a **wonderwood-playable-preview** artifact in GitHub Actions containing the complete standalone HTML.

## The loop

**Explore → leave food → watch an animal approach and eat → catch a distracted companion → unlock a traversal power → retrieve one light → return to the gate.**

Food is not a weapon. Press F to toss selected fruit. It arcs, settles on terrain, and remains for up to 24 seconds. Nearby creatures smell food and approach to eat it. Favorites add 60 trust; other food adds 36. At 100 trust (two favorites or three other treats), a capturable creature becomes DISTRACTED for 12 seconds. An accurately aimed G orb succeeds without randomness. Feed a creature enough, then throw an orb while it is distracted.

Only three species unlock transformations. Their abilities remain available for the **entire chapter**, without time limits:

| Companion | Power | Chapter |
| --- | --- | --- |
| Springaroo | Double jump | Mosslight Meadow: the Canopy Light |
| Tidefox | Swim and dive | Crystal Coast: the Pearl Light |
| Moonwing | Hold Jump to fly | Starfall Summit: the Aurora Light |

Other animals are wildlife, not inventory. Mossbacks wander, Prismtails sprint away, Glimmermoths flee, Cloudwhisps drift, and Emberkits chase intruders inside their territory. Wild animals can eat, but cannot be captured. None indiscriminately fire projectiles.

The new authored 2D levels include changing terrain elevation, floating paths, shallow crossings, large illustrated landmarks, treasure, repeatable picnic baskets, and healing checkpoints. An objective guide points to a companion first, then to the chapter light, then home. Completed chapters are saved in this browser.

## Controls

| Action | Player 1 | Player 2 | Controller |
| --- | --- | --- | --- |
| Move | A / D, arrows | J / L | Stick / D-pad |
| Jump / fly / swim up | W / Space | I | South / A |
| Swim down | S | K | Stick down |
| Leave fruit | F | O | East / B |
| Change fruit | E | M | Trigger |
| Throw capture orb | G | P | West / X |
| Choose companion | Q | H | Right shoulder |
| Transform / revert | T | U | North / Y |
| Revive | R | Y | Left shoulder |
| Recall to camp | C | N | Back / Select |
| Pause | Escape | Escape | Escape |

Movement uses acceleration, braking, buffered jumps, coyote time, variable jump heights, and camera anticipation. Contact with territorial Emberkits can cause damage even midair, with visible knockback and brief invulnerability. Controller vibration is optional.

## Developer guide

- **src/games/animal-adventure/worlds.js** — built-in chapter geometry, encounters, ledges, water and landmark locations. This is the authored level source of truth.
- **src/games/animal-adventure/chapters.js** — story, objectives and environmental hints.
- **src/games/animal-adventure/catalog.js** — companions, wildlife, and foods.
- **src/games/animal-adventure/game.js** — physics, creature AI, edible lures, capture states, collectibles, camera, rendering and HUD.
- **src/assets/** — painted sprite sheets, Meadow scenery and landscape tiles (embedded into the offline build).
- **src/platform/** — sprite and landscape drawing, audio, input, persistence, and custom map importing.
- **src/main.js** and **src/style.css** — menu, chapter flow and interface.
- **scripts/build.mjs** — builds the single-file offline game.

Existing bitmap examples in **src/games/animal-adventure/levels/** remain available for users of the custom Load PNG Map feature, but they are no longer the built-in chapter maps.

Build with Node.js 20+: **node scripts/build.mjs**. The standalone file is generated rather than version-controlled, because the full-resolution artwork makes the compiled HTML large.

Run browser regression tests after installing Python Playwright and its Chromium browser:

    python -m pip install playwright
    python -m playwright install chromium
    python tests/smoke.py
    python tests/playability.py
    python tests/routes.py
    python tests/game_feel.py

GitHub Actions runs the same suite on pull requests. The traversal suite checks that the three chapter lights require their intended power using actual player physics.

**Status:** This is a playable iteration, not a finished commercial release. Dedicated animation art, encounter pacing and real-device playtesting remain important. The standalone HTML, browser storage and vibration should be tested on actual browsers and controllers before a public release.
