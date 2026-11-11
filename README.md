# Wonderwood — a little world worth exploring

A dependency-free, offline 2D creature adventure for one or two players. Five extended chapters, eight catchable creatures with distinct behaviors, two additional feedable rideable mounts, three essential traversal transformations, and one hidden light to recover per chapter.

**Play:** Run `node scripts/build.mjs` from the repository root, then open `dist/wonderwood.html` in Firefox or Chromium. No server, npm packages, or internet connection are needed. Pull request builds also publish a **wonderwood-playable-preview** artifact in GitHub Actions containing the complete standalone HTML.

## The loop

**Explore → leave food as an explorer → catch a distracted creature → transform into your latest friend → use its power to outwit wildlife → retrieve the light → return to the gate.**

Food is not a weapon. While in **explorer form**, press F to toss selected fruit. Thrown treats are now drawn as individual small fruit rather than whole bushes. It arcs, settles on terrain, and remains for up to 24 seconds. Creatures smell food and approach to eat it. Favorites add 60 trust; other food adds 36. At 100 trust (two favorites or three other treats), **any species** becomes DISTRACTED for 12 seconds. An accurately aimed G orb captures it without randomness. Press T to transform into the **last creature you caught**, or revert. Catching a different species replaces the previous form (including an active transformation). While transformed, **F uses that creature's power instead of throwing food**; revert with T to feed again.

All eight species can be transformed into. Only three are required to reach their chapter's light; unlike the smaller encounter powers, they change major traversal physics:

| Companion | Power | Chapter |
| --- | --- | --- |
| Springaroo | Double jump | Mosslight Meadow: the Canopy Light |
| Tidefox | Swim and dive | Crystal Coast and Willow Wetlands: underwater lights |
| Moonwing | Tap Jump for successive wingbeats | Starfall Summit and Cloud Gardens: the high lights |

The other five transformations provide situational, cooldown-limited abilities:

| Creature | F ability | Encounter role / strategy |
| --- | --- | --- |
| Mossback | Honey glob: briefly immobilizes wildlife | Slow, predictable wanderer. Run around or hop over. |
| Prismtail | Bubble trap: briefly lifts an animal | Runs away, then telegraphs a straight dash. Jump or step aside. |
| Glimmermoth | Short hover: slows falling briefly, never lifts | Flees nearby explorers. Lure it, then give it room. |
| Cloudwhisp | Wind blast: pushes and stuns an animal | Winds up a gust along a marked line. Get behind it or move out of the lane. |
| Emberkit | Short stunning spark | Chases and telegraphs a damaging dash. Leap over it, stomp its head, or distract it. |

### Unicorn and Pegasus mounts

A **Unicorn** or **Pegasus** is a friend to ride, **not** a capture-orb transformation. In explorer form, leave two favorite treats (or three other treats) until its trust bar fills, then **jump onto its back** to mount. A capture orb cannot capture a mount, and riding never replaces the latest caught transformation.

The **Unicorn** runs much faster than the explorer and launches into exceptionally high jumps with a tap of Jump. The **Pegasus** moves swiftly and can fly upward indefinitely by holding Jump; release to coast, or hold Down to descend. Unlike Moonwing it has no four-flap budget. Press **T** to dismount safely and return to normal explorer/transformation controls. Both mounts share the player's world position while ridden and release safely on recall, a damaging hit, or co-op follow-bubble transport.

For this first implementation, the mounts use animated, canvas-painted silhouettes with consistent saddle and ground pivots. Dedicated, reviewed painted character atlases are still outstanding. The authored worlds currently place the Unicorn in later Mosslight Meadow and the Pegasus in later Starfall Summit and Cloud Gardens, making them optional traversal companions.

All creatures have recognizable patrols and non-random attack tells. Head-stomping from above gives the explorer a bounce and temporarily knocks the animal out; it returns after a short rest. Bubbles carry an animal upward briefly; honey holds it still; wind knocks it back and stuns it. These are friendly, temporary setbacks, not lethal attacks. You can also run past or use food to avoid confrontations. Captured animals return to their habitats later.

Five expanded 2D adventures span **260–338 horizontal cells** and 52–80 vertical
cells: rolling meadow slopes, wide lagoons with submerged shells, a multi-tier
summit, the deep Willow Wetlands and the aerial Cloud Gardens. Geometry supports
fractional-height ground profiles and genuine walkable ramps; deep water has
aquatic wildlife, underwater shelves and multiple routes. Moonwing rises from
**individual wingbeats**, not by holding Jump; shimmer columns provide updrafts.
A restrained progress rail and occasional contextual hints replace a permanent
text-heavy guide. Each chapter also has a **Wonder Trail**: touch its first glowing ring, then reach the remaining rings in order before the light fades. These optional routes reward skillful jumps, diving or wingbeats with three Stardrops and a heart restored. They never block the main story; co-op partners can relay the rings between them for a fourth Stardrop. Completed trails are recorded with chapter progress. Five additional hidden star shards in each chapter give curious players more optional routes to seek out. Completed chapters are saved in the browser.

## Controls

| Action | Player 1 | Player 2 | Controller |
| --- | --- | --- | --- |
| Move | A / D, arrows | J / L | Stick / D-pad |
| Jump / wingbeat / swim up | W / Space (tap repeatedly to flap) | I | South / A |
| Swim down | S | K | Stick down |
| Leave fruit (explorer) / use creature power (transformed) | F | O | East / B |
| Change fruit | E | M | Trigger |
| Throw capture orb | G | P | West / X |
| Transform / revert | T | U | North / Y |
| Revive | R | Y | Left shoulder |
| Recall to camp | C | N | Back / Select |
| Pause | Escape | Escape | Start / Menu |

Movement uses acceleration, braking, buffered jumps, coyote time, variable jump heights, and camera anticipation.

**Family-friendly co-op:** Player 1 leads the camera. Player 2 can explore and
use their own controller normally while nearby, without preventing Player 1 from
running or climbing. If the partners become too far apart, Player 2 is carried
along safely inside a translucent follow bubble. Press any action button
(Jump, food/power, capture, transform, etc.) to pop out beside Player 1 and
resume playing. Riding in the bubble cannot collect objects, activate trials,
attract enemies or take damage. Both players retain their creature powers and
progression. Bubble travel and camera movement are automatic and need no extra
control binding.

**Gamepad menus:** Either connected controller can navigate the menus using its
D-pad or left stick. A confirms, B goes back (or resumes a paused game), and
Start pauses/resumes. Select lists and numeric controls change with Left/Right;
A toggles checkboxes. All controls work in the generated offline HTML. Emberkit contact and Prismtail's active dash can cost hearts, with brief invulnerability; Cloudwhisp gusts cause knockback rather than heart loss. Enemies visibly wind up before their attacks. Controller vibration is optional.

## AI-native level design

Built-in worlds are now authored as versioned JSON in src/games/animal-adventure/designs.json.
The offline game embeds these declarations and compiles the same definitions
that the Node-based level inspector validates. Challenge sections express
intent and shoreline-aware basins avoid unsupported water columns.

An AI authoring loop can be run entirely offline:

- `node tests/level-designs.mjs` — schema, ability sources and water-basin checks.
- `node scripts/inspect-levels.mjs` — semantic level atlas and local diagnostics.
- `node scripts/export-art-guides.mjs` — 16:9 geometry masks, annotated camera
  layouts and prompts for painting cohesive, correctly aligned scene artwork.
- `node scripts/build.mjs` — the single standalone offline HTML.
- `python scripts/evaluate-routes.py` — actual browser-physics movement probes
  with per-section stalls, skill/form attempts and a visual comparison.
- `node scripts/compare-route-reports.mjs before.json after.json` — measure
  which challenge sections improved or regressed after an LLM revision.

Both route evaluation and art export accept a standalone candidate JSON path.
See docs/ai-level-authoring.md for their schema, limitations and intended workflow.
A scripted section probe is not a proof of complete human playability.

## Developer guide

- **src/games/animal-adventure/designs.json** — AI-editable progression and geometry. **src/platform/world-compiler.js** compiles the canonical declarations into collision and objects; **worlds.js** adapts them to the game.
- **src/games/animal-adventure/chapters.js** — story, objectives and environmental hints.
- **src/games/animal-adventure/catalog.js** — companions, wildlife, and foods.
- **src/games/animal-adventure/game.js** — physics, creature AI, edible lures, capture states, collectibles, camera, rendering and HUD.
- **src/assets/** — painted atlases for all eight creatures, biome backdrops, props and high-resolution terrain textures. Optional full-scene painted chunks in `src/assets/scenes/panels/` are bundled into the same offline build.
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

### Full-scene diffusion artwork (without tile-shaped paintings)

The **visual texture and the colliders are independent**. For custom JSON
maps, optional `surface` provides an array of `width + 1` fractional ground
heights (tile-row units), interpolated continuously for smooth ramps. The
semantic grid still defines water, platforms, hazards and markers.

To use artwork larger than a tile, put losslessly aligned PNG or WebP scene
panels in `src/assets/scenes/panels/`, then add `art.foreground` and/or
`art.background` panel descriptors to the level JSON. Each descriptor names
the embedded asset plus world-space `x`, `y`, `width` and `height`;
background panels may set `parallax`. Foreground panels are drawn above
fallback tile textures, but below creatures and interactive props. Because the
full-resolution art never determines collisions, a diffusion model can paint
entire valleys or reefs using a semantic mask as a conditioning guide and the
player still walks on physically defined slopes. See
`src/assets/scenes/panels/README.md` for a complete example.

Without optional painted panels, the existing high-resolution terrain
textures, continuous slope caps, and chapter-length painted panoramas render
automatically. This makes a painted world-panel pass optional rather than a
prerequisite to playing.

Existing bitmap examples in **src/games/animal-adventure/levels/** remain available for users of the custom Load PNG Map feature, but they are no longer the built-in chapter maps.

Build with Node.js 20+: **node scripts/build.mjs**. The standalone file is generated rather than version-controlled, because the full-resolution artwork makes the compiled HTML large.

Run browser regression tests after installing Python Playwright and its Chromium browser:

    python -m pip install playwright
    python -m playwright install chromium
    python tests/offline_launch.py
    python tests/smoke.py
    python tests/playability.py
    python tests/routes.py
    python tests/terrain_and_flight.py
    python tests/game_feel.py
    python tests/creature_mechanics.py
    python tests/painted_illustrations.py

The offline launch test deliberately uses the generated HTML **unchanged**:
it clicks Play, lets the actual `requestAnimationFrame` loop draw, checks
that the canvas contains real game frames, and moves the protagonist. It
also catches test-only storage shims accidentally included in a release.
Do not distribute a Playwright fixture with its animation loop removed.
GitHub Actions is optional: `node scripts/build.mjs` and the local browser
tests work without any hosted CI compute.

GitHub Actions runs the same suite on pull requests. The traversal suite checks that the three chapter lights require their intended power using actual player physics. `tests/creature_mechanics.py` additionally checks every capturable form, latest-catch replacement, spell consequences, safe head-stomps and hazard windup.

**Status:** This is a playable iteration, not a finished commercial release. Dedicated animation art, encounter pacing and real-device playtesting remain important. The standalone HTML, browser storage and vibration should be tested on actual browsers and controllers before a public release.

### Painted eating and knockout states

The transparent `src/assets/illustrations/states.webp` 3×3 atlas contains
earlier independent eating concepts plus the red-scarfed explorer's knockout
pose. Because some independent eating paintings do not match the corresponding
creature identity, **animals now use the eat animation in their own species'
painted character atlas**, retaining proportions, colors and anchored feet.
The old eating-state cells remain embedded for asset review but are not drawn in
play. The explorer still has the separate sleeping illustration, with three
independently orbiting dizzy stars. No artwork is allowed to change collision.

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
