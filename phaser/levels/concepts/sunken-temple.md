# Level concept: The Sunken Temple

**Status (Nov 17, 2026): geometry-route proven, not release-ready.** The unregistered [level spec](../sunken-temple.json), [fixed-tick rules](../../src/temple-rules.js), [production world adapter](../../src/temple-world.js), [runtime water/art adapter](../../src/temple-scene.js), [validator](../../src/future-chapter-validation.js), and [motion-level tests](../../tests/temple-world.test.mjs) exist. Production-rule **solo and two-explorer** simulations reach the Light and exit. This is **not** an end-to-end in-browser route or approved painting.

## Playable graybox puzzle iteration (PR #19)

The candidate remains **outside the normal campaign**. To inspect the unfinished
level with its authored terrain and plain mechanical blocks, build the Phaser
HTML and open it with `#sunken-temple` (or `?temple-preview#sunken-temple`). This intentionally
works without approved panorama or mechanism sprites. The art-free prototype
uses the same water, gate, platform and player physics as the finished scene.

The route is no longer an unbroken rightward run:

1. **Courtyard:** at low tide, enter the first basin and jump onto the raft;
   ride it to high tide, then jump to the dock. The waterline alone is too
   low for a normal explorer to reach that dock. The first Stardrop is an
   optional low-water exploration reward.
2. **Sluice:** operate the upstream fill handle. A stone weir blocks the
   crate while the water is low. Push the crate over the weir while flooded.
   Move from the water to the sluice raft, then to the upper drain handle;
   select Hold, then Drain. Only the crate's **bottom** settling onto the
   floor socket latches the closed arch gate open.
   A separate narrow bottom tunnel under the weir is passable by diving as
   Tidefox, but too short for the crate and too deep for normal floating.
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

Dedicated tests in `tests/temple-world.test.mjs` cover each isolated input
sequence, low-crate obstruction, raised-crate passage, drain/socket contact,
latching, waterwheel release, the two raft jumps, and attempted raft-free
crossings. The browser playthrough and balance/difficulty review remain
separate acceptance gates; deterministic tests alone do not make the
chapter release-ready.

## Player fantasy

Explore a warm, overgrown stone temple where water is the principal moving mechanism. The same room is traversed differently when it is empty, partly flooded, and full. The level combines *rising and falling water*, *buoyant platforms*, *swimmable passages*, *valves and gates*, *currents*, and a final *waterwheel chain reaction*. The drama comes from understanding a physical system, not from demanding twitch-perfect inputs.

Tidefox is a natural companion for diving, but its acquisition should be introduced with the existing berries/nectar trust-and-mount-independent transformation loop: offer favorite treats, capture, then transform. Verify the actual favorite food for the authored species before placing treats. The critical route must be completable with one player, and the light remains collectible whenever physically reached, independently of optional puzzle completion.

## Intended route / three acts

**Act I — The tidal courtyard (teach).** Start on a safe dry bank overlooking a basin with a slow, clearly telegraphed water cycle. A wooden raft rises with the pool, providing access to a second shelf; at low tide, a floor passage reveals an optional Stardrop. Let the player watch one complete cycle from a safe spot, then use a broad landing area to cross. Provide a checkpoint just after this demonstration.

**Act II — The sluice halls (experiment).** A controllable valve switches a chamber between draining, holding, and filling. The player floats a timber crate up to a higher level and places it on a pressure plate that opens a stone sluice. A second optional submerged passage rewards Tidefox's swim/dive ability. A current is visible before it is entered; turning the valve changes the current and allows deliberate route choice. The two-player version can divide valve and raft roles; solo play must have enough state persistence to walk between them without a second operator.

**Act III — The heart of the temple (combine).** The player releases a restrained flood through an ancient waterwheel. Water height changes sequentially across connected basins, raising two rafts and rotating a paddle mechanism that opens a high walkway. The route finishes on a sunlit observation terrace with the Temple Light and gate. The visual payoff should show a cascade from one chamber into the next, but the transition must be simulated deterministically and provide safe recovery if a jump is missed.

**Optional discoveries.** Hidden shard on a draining lower shelf; Tidefox-accessible tunnel with a cache; advanced route across two rising rafts; an overlook containing the temple's pre-flood mural. None is required for the light to be collectible if reached.

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
