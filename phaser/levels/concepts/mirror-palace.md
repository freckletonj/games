# Level concept: The Mirror Palace

**Status:** implementation candidate. The unregistered [Mirror Palace level spec](../mirror-palace.json), [fixed-tick optical/phase rules](../../src/palace-rules.js), [schema validation](../../src/future-chapter-validation.js), and [unit tests](../../tests/future-chapters.test.mjs) now exist. Production collision integration, complete input-driven routes, approved art, and campaign registration remain outstanding.

## Player fantasy

An ancient observatory-palace where light determines which portions of the architecture are physically real. The player swivels large bronze mirrors, opens shutters, and uses moving shafts of sunlight to turn illuminated bridges **solid** and unlit bridges **insubstantial**. A later chamber inverts this rule: some shadow platforms are solid only in darkness. It should feel like solving a large, tangible mechanism, not memorizing an arbitrary on/off sequence.

This is a geometric puzzle with expressive art. The optical rules must be visible in the world and recoverable without a second player. The relic is collectible on contact if physically reached; puzzle completion is not a separate key-pickup condition.

## Intended route / three acts

**Act I — The sunlit atrium (teach).** A fixed beam hits one movable mirror. Turning the mirror between two clear detents lights a short crystal bridge and grants access to an upper balcony. The solid bridge appears *before* a player needs to trust it; its inactive outline remains visible and non-collidable. A forgiving checkpoint sits beyond it. The sun source and mirror paths are readable on a single camera screen.

**Act II — The shadow gallery (experiment).** The player sends a beam around a pillar using two mirrors. One reflection activates a crossing, another lights a gate latch, and a shutter holds a selected beam state long enough to traverse. Introduce darkstone platforms that are solid in shadow and translucent in direct light, with a clear, distinct silhouette. The central puzzle requires arranging a lit path and a shaded landing at once. A hidden alcove rewards redirecting light to an optional crystal rather than the main crossing.

**Act III — The eclipse observatory (combine).** A slow rotating occluder produces a predictable sweep of illumination over three tiers. Mirrors and shutters allow the player to *freeze* a useful route while the occluder moves. Finish by turning the central prism to reveal a staircase of lit and shaded surfaces to the Moonlight Terrace, which holds the Palace Light and exit. Use a long telegraph before any platform transition and leave safe anchor ledges between transitions.

**Optional discoveries.** Shadow-only narrow side route, mirrored Stardrop chamber, decorative constellations revealed by an optional beam, and a faster mastery path using the sweep cadence.

## Proposed declarative design (not existing schema)

Use the established level-spec -> compiler -> gameplay -> art-guide chain, not bespoke sprite-pixel collision. Proposed additions:

- **lightSources**: ID, position, direction, range, hue, and on/off state.
- **mirrors**: ID, position, pivot, finite authored orientation choices (for example, 0, 45, 90 and 135 degrees), trigger/contact controls, and a stable resting angle.
- **shutters / prisms / occluders**: named logical states, visibility geometry and deterministic fixed-tick sweep functions.
- **beamTargets**: ID and linked outputs (gate, platform, cosmetic mural), with a clear source/target graph.
- **phasePlatforms**: authored shape/collision surface, activation rule (lit or shadow), appearance/disappearance transition, and safe occupancy policy.
- **sections, safe ledges, checkpoints, goals and optional discoveries**: explicit route and reset boundaries.

These are proposal names; implement against the existing Phaser runtime and authoring conventions only after validation. For nontrivial mirror rays, keep collision/visibility geometry separate from appearance data. Render the computed optical paths; do not let a painted highlight change the beam's actual reach.

## Deterministic gameplay rules

- Trace rays against authored rock, shutters and mirrors using fixed origin, finite directions and bounded reflections. At each tick, resolve occluder positions -> beam segments -> target activation -> platform state -> collision support -> visuals in a defined order.
- Prefer discrete, player-controlled mirror detents, not free rotation requiring pixel precision. Use generous interaction distances and consistent controls; do not add new controls until reviewing the existing keyboard and gamepad mappings.
- A phase platform that turns **off** under a player must first announce the change and provide a short grace interval or another reliable escape. A platform that turns **on** must not materialize inside the player's body or trap them against a ceiling. Specify how riders are supported and how intersection is handled.
- Moving rays must not flicker between on/off at floating-point boundaries. Model illumination and shutdown with deterministic thresholds and visible anticipation.
- Avoid visually ambiguous states: lit-solid, dark-solid, and inactive platforms need unmistakable shape, opacity, edge and sound cues, not color alone. No seizure-like rapid strobing.
- One player must be able to lock beams or traverse stable states without another operator. Co-op can let one player control a mirror while the other crosses, but the second player's follow bubble cannot hold switches or activate targets.
- Checkpoint recall resets mirror/occluder states to an explicitly authored, solvable configuration. Never strand the party in a room with no light source or no reachable controls.

## AI art and geometry handoff

Use [AGENTS.md](../../../AGENTS.md), [STATIC-ART-CONTRACT.md](../../STATIC-ART-CONTRACT.md), [DYNAMIC-SCENE-ART.md](../../DYNAMIC-SCENE-ART.md), and [CAVE-ART-PIPELINE.md](../../CAVE-ART-PIPELINE.md).

1. Author and validate rock silhouettes, ceiling height, stable ledges and **all potential phase-platform volumes** before painting. The deterministic platform state graph defines which of these volumes is collidable in each state.
2. Export a complete world-locked material guide plus separate overlays for **all mirror detents, representative beam routes, phase-solid / phase-ghost states, and final eclipse**. Export the exact collision masks used by physics; do not reinterpret shadows from a generated picture as game logic.
3. Art direction: carved moonstone arches, brass mirror frames, iridescent crystal floors, hanging curtains, vines under skylights, astronomical murals and soft gold/indigo shafts. Ask the model to preserve all real standing lips and empty gaps exactly; decorative highlights must not imply new platforms.
4. Paint one cohesive palace composition, refine guide-registered crops at native resolution, and extract independently painted **rotating mirrors, shutter leaves, prism, occluder and phase-platform visual states** as alpha cutouts. Repair their empty locations in the static panorama.
5. Beam paths, projected light and cast shadows are runtime effects derived from the beam solver. An image model may add rich material texture and atmosphere, but cannot bake a fixed beam across a platform that is sometimes dark or create a persistent painted platform where none exists.
6. Register only approved images matching compiled world coordinates. Verify V overlay for every meaningful platform state at gameplay zoom.

## TODO / acceptance checklist

- [ ] Block out the three-act palace with safe ledges, clear sight lines, turning radii, hidden collectibles, checkpoints and a reachable light/gate.
- [ ] Add declarative light-source, mirror, shutter, target, occluder and phase-platform specifications with schema validation, stable IDs and link checks.
- [ ] Implement deterministic bounded beam tracing and target activation independent of rendering and frame refresh rate.
- [ ] Implement discrete mirror/shutter controls compatible with keyboard, gamepad and the existing interaction model.
- [ ] Implement dynamic phase-platform collision, supported-rider carry, activation previews and safe deactivation grace; prevent trapping players inside appearing solids.
- [ ] Build a readable visual language for illumination, shadow, ghost geometry, active geometry, and beam direction, including non-color-only cues.
- [ ] Test every critical state sequence, mirror reset, obstruction, near-edge contact, and identical-tick replay in the production rules.
- [ ] Verify a complete solo route and 2-player route; ensure puzzle locks cannot softlock progress and physical contact always collects the light.
- [ ] Export a full material atlas and machine-readable light/platform state previews conditioned on compiled collision, not a hand-painted guess.
- [ ] Produce a cohesive native-detail panoramic painting; extract and register mirrors, prism, shutters and phase variants with correct pivots and restored background.
- [ ] Review V overlay, shadow alignment, legibility and transitions at gameplay zoom, especially when platforms disappear under or appear near riders.
- [ ] Run the usual Node tests, full browser interaction tests, offline build, and Chromium/Firefox playthroughs with the state transitions exercised.

## Design guardrails

This is not a combat laser level. Beams should primarily change geometry, with generous timing and a satisfying sense of cause and effect. The hardest puzzles come from arranging illuminated and shaded surfaces in one coherent space.
