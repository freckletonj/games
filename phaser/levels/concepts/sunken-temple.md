# Level concept: The Sunken Temple

**Status (Nov 17, 2026): geometry-route proven, not release-ready.** The campaign-registered [level spec](../sunken-temple.json), [fixed-tick rules](../../src/temple-rules.js), [production world adapter](../../src/temple-world.js), [runtime water/art adapter](../../src/temple-scene.js), [validator](../../src/future-chapter-validation.js), and [motion-level tests](../../tests/temple-world.test.mjs) exist. Production-rule **solo and two-explorer** simulations reach the Light and exit. This is **not** an end-to-end in-browser route or approved painting.

## Playable graybox puzzle iteration (PR #19)

Sunken Temple is now in the ordinary **Choose a level** campaign menu.
Build Phaser and open `dist/wonderwood-phaser.html`, then select Sunken
Temple alongside the existing painted chapters. The optional
`#sunken-temple` fragment simply preselects its main-menu card. CI
publishes the same main game with all three grayboxes. This intentionally
works without approved panorama or mechanism sprites: the prototype uses
the same water, gate, platform and player physics as the finished scene.

The route is no longer an unbroken rightward run:

1. **Courtyard:** at low tide, enter the first basin and jump onto the raft;
   ride it to high tide, then jump to the dock. The waterline alone is too
   low for a normal explorer to reach that dock. The first Stardrop is an
   optional low-water exploration reward.
2. **Sluice:** operate the upstream fill handle. A stone weir blocks the
   crate while the water is low. Push the crate over the weir while flooded.
   Move from the water to the sluice raft, then to the upper drain handle;
   select Hold, then Drain. Only the crate's **bottom** settling onto the
   floor socket latches the closed arch gate open. Its rim catches and
   centers the crate, and the solved socket automatically refills the basin
   so the raft can lift the player to the open exit.
   The crate is solid on top: a falling player can stand on it and ride it
   upward; only deliberate braced side contact pushes it horizontally.
   The weir is rooted in the floor, not an unexplained floating block.
   Tidefox remains an optional swimming form, but has no bypass under
   the critical crate divider.
3. **Temple heart:** fill the head reservoir, take its raft to the wheel
   station, and operate the separate release. Only released water can
   charge the wheel. After the visible delay, the mechanism latches the
   physical bridge and exit gate while the downstream basin continues
   filling.
4. **Final crossing:** bridge A ends before bridge B begins. From bridge A,
   jump to the high downstream raft, then jump to bridge B. The raft supplies
   a real intermediate landing, not just a visual ornament.

Every critical gate extends above ordinary or Tidefox jumps. Success
latches completed gates and bridges instead of retracting occupied surfaces.
Valve changes remain reversible; checkpoint snapshots retain the ratchets.
The waterwheel and sluice mechanisms are independent of the rendered art.
The pressure plate and weir use authored geometry, not proximity to a
floating crate or a fake interaction flag.
There is no automatic sideways current in the experimental build. The older
sluice-flow force was not visually communicated and made unsteered explorers
slide right during a fill; it has been removed until the current is an
intentional, visibly signposted obstacle.

Dedicated tests in `tests/temple-world.test.mjs` cover each isolated input
sequence, low-crate obstruction, raised-crate passage, drain/socket contact,
latching, waterwheel release, the two raft jumps, and attempted raft-free
crossings. The browser playthrough and balance/difficulty review remain
separate acceptance gates; deterministic tests alone do not make the
chapter release-ready.

## Focused graybox playability pass (Nov 18, 2026)

This pass changes **Sunken Temple only**. No textures, backdrop or campaign
registration changed. The criticisms below concern the playable puzzle contract,
not the eventual scenery.

**Courtyard — discovery versus waiting.** The original triangular tide began
rising at spawn and immediately reversed at full height. A normal no-jump walk
reached the basin with water already high, encouraging an unproductive wait for
the next cycle. The tide now waits **420 ticks at the opening low-water state**,
then rises over 300 ticks, holds high for 120 ticks, falls over 300 and holds
low for 120; subsequent cycles have the same 840-tick period. The raft sits
four pixels lower so the first boarding jump is more forgiving without
making the high dock reachable without it. A live RISING / HIGH / FALLING /
LOW readout with the flood percentage communicates that timing. The low-water
Stardrop remains optional. The solo input test checks **arrival from spawn**
and an actual raft-to-dock jump, not just an assumed phase.

**Sluice — understanding before manipulating.** The crate-over-weir and
crate-down-onto-socket sequence is a sound two-state puzzle, but several
consecutive fills/drains, unlabeled valve detents and an unexplained automatic
refill make it feel like trial-and-error or broken input. Basin changes now
move at **0.06 tile/tick** instead of 0.04, preserving manual Hold and Drain
without asking the player to stare at static water for as long. Both controls
show the current setting and the *next* setting for Up; the socket indicates
whether the crate is aligned and needs draining; the open gate explicitly
explains the automatic refill. The original physical weir, socket latch,
side-only crate push, and raised exit stay required, including for Tidefox.

**Temple heart — causality and payoff.** Filling the head alone still cannot
activate the wheel: the high release remains an independent, raft-gated
control. The label now distinguishes release armed / waiting for head water,
charging percentage, and latched wheel instead of promising charging whenever
release is pulled. The faster head and tail fills reduce passive downtime.
The tail flood and wheel latch still survive reversing a valve.

**Final crossing — legibility and safety.** Previously both bridge segments
solidified when the wheel charged, even while the downstream raft was too low
for the second jump. Bridge A still comes on with the wheel; bridge B now
solidifies only when the downstream surface is at **42.5 tiles or higher**
(numerically at or below Y 42.5), near the raft's usable top height. Water
progress, second-bridge readiness and the required A → raft → B movement are
shown in world labels and the HUD. This remains a deliberate two-jump
traversal rather than a timed vanishing-platform trap. Checkpoint rewind
restores the correct intermediate stage.

**Optional play and recovery.** Hidden Stardrops and Tidefox exploration remain
optional; the player is never forced to capture a creature to complete this
route. No untelegraphed current is reintroduced, and solved crate and wheel
ratchets still persist. The next hands-on playtest should judge whether the
optional underwater passages warrant a fuller mechanical reward, and whether
the crate's new pacing removes its remaining backtracking friction. These are
not claims of verified full browser playthroughs.

## Player fantasy

Explore a warm, overgrown stone temple where water is the principal moving mechanism. The same room is traversed differently when it is empty, partly flooded, and full. The level combines *rising and falling water*, *buoyant platforms*, *swimmable passages*, *valves and gates*, *currents*, and a final *waterwheel chain reaction*. The drama comes from understanding a physical system, not from demanding twitch-perfect inputs.

Tidefox is a natural companion for diving, but its acquisition should be introduced with the existing berries/nectar trust-and-mount-independent transformation loop: offer favorite treats, capture, then transform. Verify the actual favorite food for the authored species before placing treats. The critical route must be completable with one player, and the light remains collectible whenever physically reached, independently of optional puzzle completion.

## Intended route / three acts

**Act I — The tidal courtyard (teach).** Start on a safe dry bank overlooking a basin with a slow, clearly telegraphed water cycle. A wooden raft rises with the pool, providing access to a second shelf; at low tide, a floor passage reveals an optional Stardrop. Let the player watch one complete cycle from a safe spot, then use a broad landing area to cross. Provide a checkpoint just after this demonstration.

**Act II — The sluice halls (experiment).** A controllable valve switches a chamber between draining, holding, and filling. The player floats a timber crate up to a higher level and places it on a pressure plate that opens a stone sluice. A second optional submerged passage rewards Tidefox's swim/dive ability. A current is visible before it is entered; turning the valve changes the current and allows deliberate route choice. The two-player version can divide valve and raft roles; solo play must have enough state persistence to walk between them without a second operator.

**Act III — The heart of the temple (combine).** The player releases a restrained flood through an ancient waterwheel. Water height changes sequentially across connected basins, raising two rafts and rotating a paddle mechanism that opens a high walkway. The route finishes on a sunlit observation terrace with the Temple Light and gate. The visual payoff should show a cascade from one chamber into the next, but the transition must be simulated deterministically and provide safe recovery if a jump is missed.

**Optional discoveries.** Hidden shard on a draining lower shelf; Tidefox-accessible tunnel with a cache (in a future art-approved pass); advanced route across two rising rafts; an overlook containing the temple's pre-flood mural. None is required for the light to be collectible if reached.

## Proposed declarative design (not existing schema)

Author one chapter specification under phaser/levels/ and register it through phaser/src/campaign.js once implemented. Reuse existing terrain, platforms, objects, checkpoints, relic, and sections where possible. Proposed schema extensions, to be validated before use:

- **waterVolumes**: explicit basin bounds, minimum and maximum surface heights, starting height, and water-collision masks; keep solid rock and water disjoint.
- **waterControllers**: a fixed 60 Hz tide curve or valve-selected target level plus transition duration; no random phase or real-time tween determining physics.
- **valves / gates / pressurePlates**: stable IDs and typed links describing which controller or barrier changes state; no hidden hardcoded per-scene coordinates.
- **buoyantObjects**: world-space dimensions, mass/float offset, constraints and collision support. Rafts and crates are independent dynamic pieces with authored painted cutouts.
- **currents**: spatial regions with a magnitude and direction derived from water controller state.
- **triggerChains**: named dependencies for the finale, including start, active, completed, and reset/recovery states.
- **sections / checkpoint / pickups / goal**: explicitly ordered learning beats and safe recovery locations.

The exact property names are suggestions, not claims that the current compiler supports them. Prefer a small extension to the existing declarative compiler over a separate level-specific simulation.

## Deterministic gameplay rules

- Compute water height, raft support, crate motion, and currents from a single fixed-tick state. Restarting from the same checkpoint and action sequence must reproduce the same results.
- Define whether a floating platform is one-way landable and how the player is carried as it rises. Test entering from above, jumping off, swimming beneath, and riding through the top of a chamber without clipping into solid geometry.
- Prevent a valve from sealing the only route out while an explorer is inside a closing basin. Define minimum headroom, accessible hold points, and a repeatable draining/reset action.
- Do not spawn pickup objects inside changing collision boundaries. A submerged shard remains reachable when the intended tide state returns.
- Give valve operation a large, immediate visual state change; show rising water and current direction with consistent animation. Keep cycle timing generous rather than forcing exact-frame jumps.
- Two co-op players can operate independently. The player-two follow bubble does not trigger plates, collect objects, or hold a valve; a single active explorer must be able to reproduce the required states.

## Image-model handoff pack (Nov 19, 2026)

The geometry and 60 Hz state now drive a reproducible **image-conditioning pack**:
[Sunken Temple generation brief](sunken-temple-imagegen.md). The existing
`export-future-chapter-guides.mjs sunken-temple` export additionally writes
a full-world vector composition study, low/high/sluice/finale visual context
studies, pivot-registered transparent object silhouettes, and a machine-readable
`imagegen-handoff.json`. CI renders SVGs to native-size PNGs for review and
future image-model conditioning. The sample called *high tide* is now sampled
**after** the initial low-water delay, at the actual upper surface.

These vector studies are **not image-model artwork or approved painting**. No
assets were added to `approved-scene-art.json`, and the production chapter
continues to render its compiled graybox until properly conditioned,
native-detail painted assets pass the art and browser acceptance gates.

## AI art and geometry handoff

Follow [AGENTS.md](../../../AGENTS.md), [STATIC-ART-CONTRACT.md](../../STATIC-ART-CONTRACT.md), and [CAVE-ART-PIPELINE.md](../../CAVE-ART-PIPELINE.md).

1. Implement and compile the *entire deterministic world* first: ground, chamber walls, shelves, water extents, rafts at home poses, valves, gates, checkpoints, and route events.
2. Export a full-world semantic material bitmap from the same compiled predicates used for physics; include separate overlays/reference frames for **low tide, high tide, valve-controlled fill, and finale state**. Never let an AI-generated shoreline determine physics.
3. Give the image model the exact guide plus an approved Wonderwood style reference. Art direction: weathered coral-stone temples, jade/teal water, warm sunbeams, hanging gardens, engraved sluices, waterwheel and carved faces. Preserve every bank, ledge, headroom pocket, and swim tunnel in the guide.
4. Generate one coherent world-locked scene. Refine at native display resolution via overlapping guide-conditioned crops. Do not invent playable stones, stairs, or swim passages. Separate each **moving** raft, crate, valve, gate, and wheel into transparent, pivot-aligned sprites and repair their holes in the static painting.
5. Keep variable-height water and foam/ripples as **runtime dynamic layers clipped to simulated water bounds**; a single static baked waterline would contradict the play state. Validate every extreme against V geometry overlay and renderer depth.
6. Pack and register only approved geometry-matched art in phaser/assets/generated/approved-scene-art.json; the painting never becomes collision data.

## Progress / outstanding acceptance gates

- [x] Compile and validate the authored water volumes and dynamic references; implement 60 Hz tide, valve, raft, pushable crate, current, plate, gate and waterwheel mechanics.
- [x] Prove **simulated 1P and 2P movement** to Light/exit on compiled geometry; cover failed wheel bypass, water movement, crate contact and deterministic checkpoint replay.
- [x] Export physical-material maps and four tide / valve / finale frames directly from the compiled and simulated world in CI.
- [ ] Exercise the **actual Phaser scene** from start to finish in solo and co-op with real key/gamepad input, including Tidefox, air/headroom, reversals, dead ends, failed jumps and checkpoint recall.
- [ ] Produce and approve geometry-conditioned native-detail panorama and registered **true-alpha** raft/crate/gate/valve/wheel cutouts; repair their backgrounds and verify pivot registration.
- [ ] Compare simulated water surfaces and collision to painted water/ripple layers at all tested tide extremes using V overlay and gameplay zoom.
- [ ] Prove candidate chapter completion in the standalone offline Chromium **and Firefox** builds before adding campaign/approved-art registration.

The original full-scope checklist below remains open wherever a *browser- or art-level* acceptance condition has not been demonstrated.

## TODO / acceptance checklist

- [ ] Block out a three-act route with authored geometry, both dry and flooded clearances, optional paths, checkpoints, and the physical light/gate.
- [ ] Extend the declarative compiler/validation for bounded water controllers, valves, buoyant objects, currents, and named trigger links.
- [x] Implement tide and valve state machines in the production 60 Hz rules; document update order for collisions and supported riders. *(Production-rule adapter and deterministic tests; rendered browser route pending.)*
- [x] Implement floating raft/crate physics, rider carry, current forces, pressure plates, waterwheel and reset behavior. *(Rule/motion-level implementation; in-scene failure and recovery still need acceptance.)*
- [ ] Make Tidefox and enough favorite treats accessible; provide a complete solo route and useful second-player cooperation without mandatory simultaneous controls.
- [ ] Ensure safe recovery for failed jumps, submerged rooms, interrupted valve transitions, recall, and checkpoint respawn.
- [ ] Create deterministic tests for low/high tide, valve reversals, buoyancy, player support, swimming, current force, and repeatability after restart.
- [ ] Test a full input-driven solo route and a two-player route using ordinary controls; test shortcut attempts and non-gated light pickup.
- [ ] Export geometry-derived scene, state, object, and alpha guides; verify source coordinates and collision alignment before generating painting.
- [ ] Generate and refine one style-coherent temple panorama; create true-alpha movable-object cutouts and repair the background.
- [ ] Register approved art only after verifying masks at each water height, intact contact surfaces, correct water depth layering, and gameplay zoom.
- [ ] Run the repository's Node, Chromium and Firefox/offline checks, with V overlay screenshots at both tide extremes and after the waterwheel finale.

## Design guardrails

Avoid a hard timer, irreversible flood lock, death from incidental water contact, or creating several incompatible collision copies of the room. The same authored world should remain comprehensible as its water changes state.
