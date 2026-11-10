# Wonderwood — a little world worth exploring

A dependency-free, offline 2D creature adventure for one or two players. Three chapters, eight catchable creatures with distinct behaviors, three essential traversal transformations, and one hidden light to recover per chapter.

**Play:** Run `node scripts/build.mjs` from the repository root, then open `dist/wonderwood.html` in Firefox or Chromium. No server, npm packages, or internet connection are needed. Pull request builds also publish a **wonderwood-playable-preview** artifact in GitHub Actions containing the complete standalone HTML.

## The loop

**Explore → leave food as an explorer → catch a distracted creature → transform into your latest friend → use its power to outwit wildlife → retrieve the light → return to the gate.**

Food is not a weapon. While in **explorer form**, press F to toss selected fruit. It arcs, settles on terrain, and remains for up to 24 seconds. Creatures smell food and approach to eat it. Favorites add 60 trust; other food adds 36. At 100 trust (two favorites or three other treats), **any species** becomes DISTRACTED for 12 seconds. An accurately aimed G orb captures it without randomness. Press T to transform into the **last creature you caught**, or revert. Catching a different species replaces the previous form (including an active transformation). While transformed, **F uses that creature's power instead of throwing food**; revert with T to feed again.

All eight species can be transformed into. Only three are required to reach their chapter's light; unlike the smaller encounter powers, they change major traversal physics:

| Companion | Power | Chapter |
| --- | --- | --- |
| Springaroo | Double jump | Mosslight Meadow: the Canopy Light |
| Tidefox | Swim and dive | Crystal Coast: the Pearl Light |
| Moonwing | Hold Jump to fly | Starfall Summit: the Aurora Light |

The other five transformations provide situational, cooldown-limited abilities:

| Creature | F ability | Encounter role / strategy |
| --- | --- | --- |
| Mossback | Honey glob: briefly immobilizes wildlife | Slow, predictable wanderer. Run around or hop over. |
| Prismtail | Bubble trap: briefly lifts an animal | Runs away, then telegraphs a straight dash. Jump or step aside. |
| Glimmermoth | Short hover: slows falling briefly, never lifts | Flees nearby explorers. Lure it, then give it room. |
| Cloudwhisp | Wind blast: pushes and stuns an animal | Winds up a gust along a marked line. Get behind it or move out of the lane. |
| Emberkit | Short stunning spark | Chases and telegraphs a damaging dash. Leap over it, stomp its head, or distract it. |

All creatures have recognizable patrols and non-random attack tells. Head-stomping from above gives the explorer a bounce and temporarily knocks the animal out; it returns after a short rest. Bubbles carry an animal upward briefly; honey holds it still; wind knocks it back and stuns it. These are friendly, temporary setbacks, not lethal attacks. You can also run past or use food to avoid confrontations. Captured animals return to their habitats later.

The new authored 2D levels include changing terrain elevation, floating paths, shallow crossings, large illustrated landmarks, treasure, repeatable picnic baskets, and healing checkpoints. An objective guide points to a companion first, then to the chapter light, then home. Completed chapters are saved in this browser.

## Controls

| Action | Player 1 | Player 2 | Controller |
| --- | --- | --- | --- |
| Move | A / D, arrows | J / L | Stick / D-pad |
| Jump / fly / swim up | W / Space | I | South / A |
| Swim down | S | K | Stick down |
| Leave fruit (explorer) / use creature power (transformed) | F | O | East / B |
| Change fruit | E | M | Trigger |
| Throw capture orb | G | P | West / X |
| Transform / revert | T | U | North / Y |
| Revive | R | Y | Left shoulder |
| Recall to camp | C | N | Back / Select |
| Pause | Escape | Escape | Escape |

Movement uses acceleration, braking, buffered jumps, coyote time, variable jump heights, and camera anticipation. Emberkit contact and Prismtail's active dash can cost hearts, with brief invulnerability; Cloudwhisp gusts cause knockback rather than heart loss. Enemies visibly wind up before their attacks. Controller vibration is optional.

## Developer guide

- **src/games/animal-adventure/worlds.js** — built-in chapter geometry, encounters, ledges, water and landmark locations. This is the authored level source of truth.
- **src/games/animal-adventure/chapters.js** — story, objectives and environmental hints.
- **src/games/animal-adventure/catalog.js** — companions, wildlife, and foods.
- **src/games/animal-adventure/game.js** — physics, creature AI, edible lures, capture states, collectibles, camera, rendering and HUD.
- **src/assets/** — transparent painted atlases for all eight creatures, independent Meadow/Coast/Summit backdrops, the painted lantern-tree landmark, and seamless terrain textures (all embedded into the offline build).
- **src/platform/** — sprite and landscape drawing, audio, input, persistence, and custom map importing.
- **src/main.js** and **src/style.css** — menu, chapter flow and interface.
- **scripts/build.mjs** — builds the single-file offline game.
- **scripts/pack-character.py** — aligns eight independently painted PNG poses to one foot pivot and exports a character atlas/manifest.

### Construct a level from a proxy bitmap

Paint a **semantic PNG mask**, not the final illustration: each image pixel is a
16-unit game tile by default. Use pure RGB colors: white `#ffffff` for air,
near-black `#101820` for ground, slate `#5f5b85` for platforms, and blue
`#176ad7` for water. Place exactly one bright-green `#00ed31` player-start
pixel and one red `#ff152b` exit pixel, each immediately above ground or a
platform. The full palette (creatures, pickups, powers, thermals) lives in
`src/platform/levels.js`. For a 4× (or any 1–64×) proxy image, paint solid
4×4 blocks per tile and set **Pixels per tile** accordingly in the level loader.

Open **Load PNG map** on the title screen to play directly from the mask, or use
`python scripts/compile-semantic-level.py input.png --pixels-per-tile 4 --biome coast --out output.json`
to produce an importable JSON level, a snapped semantic PNG and a diagnostic
report. Masks must be 8–400 tiles wide and 6–80 tiles tall, have exact divisible
dimensions, and use recognizable palette colors; unknown pixels are tolerated
only up to 10% of samples. Neither route interprets painted scenery as
collision. The renderer derives all terrain edges, corners and waterlines from
the resulting grid so level art stitches without painting manual corner tiles.
Choose Meadow, Coast, or Summit scenery in the PNG loader, or save that choice
inside compiled JSON with the CLI's `--biome` option.

Existing bitmap examples in **src/games/animal-adventure/levels/** remain available for users of the custom Load PNG Map feature, but they are no longer the built-in chapter maps.

Build with Node.js 20+: **node scripts/build.mjs**. The standalone file is generated rather than version-controlled, because the full-resolution artwork makes the compiled HTML large.

Run browser regression tests after installing Python Playwright and its Chromium browser:

    python -m pip install playwright
    python -m playwright install chromium
    python tests/smoke.py
    python tests/playability.py
    python tests/routes.py
    python tests/game_feel.py
    python tests/creature_mechanics.py
    python tests/painted_illustrations.py

GitHub Actions runs the same suite on pull requests. The traversal suite checks that the three chapter lights require their intended power using actual player physics. `tests/creature_mechanics.py` additionally checks every capturable form, latest-catch replacement, spell consequences, safe head-stomps and hazard windup.

**Status:** This is a playable iteration, not a finished commercial release. Dedicated animation art, encounter pacing and real-device playtesting remain important. The standalone HTML, browser storage and vibration should be tested on actual browsers and controllers before a public release.

### Illustrated scenery, pickups, and powers

The four transparent 720×540 WebP sheets in `src/assets/illustrations/` are
embedded directly by `scripts/build.mjs`: `props.webp` (gates, checkpoints,
signpost, basket, star, relic), `effects.webp` (honey, bubbles, gusts, petals,
splash, stun spark), `landmarks.webp` (trees, reefs, crystals, observatories,
ponds, islands and lanterns), and `flora.webp` (flowers, berry bushes, reeds,
mushrooms and stones). Each sheet uses a 4-column by 2-row atlas; frame names
and indexing are defined in `src/platform/illustrations.js` and shared by
`src/platform/props.js`, `src/platform/scenery.js`, and the game renderer.

All eight animal species use their original painted animation atlases. The
obsolete procedural creature, food, and prop art has been replaced; terrain
continues to use seamless bitmap swatches and semantic neighbor geometry.
The offline bundle performs no image fetches. Run
`python tests/painted_illustrations.py` after building to verify 32 decoded
transparent sprites and produce `dist/preview-illustrations.png`.

### Painted visual assets

Mossback, Prismtail, Glimmermoth and Cloudwhisp now have transparent painted
8-pose WebP atlases. The lantern tree is painted WebP instead of SVG, and Coast
and Summit have original illustrated backgrounds rather than color-shifted
Meadow crops. `node scripts/build.mjs` embeds every asset in the offline HTML.

Flying and hovering creatures have no baked drop shadows. Ground wildlife
shadows are projected onto the supporting terrain surface instead of following
an airborne body's position. Gameplay collision and object placements are
still determined by semantic level data.
