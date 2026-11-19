# Level concept: Unicorn Escape — Skybound Stampede

**Status (Nov 17, 2026): both route halves geometry-proven, not release-ready.** The campaign-registered [level spec](../skybound-stampede.json), [fixed-tick race rules](../../src/race-rules.js), [production race/collision/camera adapter](../../src/race-world.js), [validator](../../src/future-chapter-validation.js) and separate [Unicorn corridor](../../tests/race-geometry-route.test.mjs) / [Pegasus flight](../../tests/race-flight-route.test.mjs) tests exist. Both phases have **solo and two-rider** production-motion proofs. A single browser journey including **befriending, switching mounts, setbacks and actual completion** has not yet been demonstrated.

**Playtesting:** Skybound Stampede is selectable in the ordinary
`dist/wonderwood-phaser.html` chapter menu alongside the existing
painted levels and the two other grayboxes. Campaign registration does
not imply that uninterrupted human 1P/2P mount-transition playthroughs
or commissioned artwork are complete.

## Player fantasy and non-negotiable flow

A spectacular side-scrolling **two-phase escape/race**: first on galloping Unicorns through an enchanted woodland, then on flying Pegasi above a storm-tossed canyon. The scenery and hazards move past the riders because the camera **auto-advances through authored world coordinates**. Keep the physics and obstacles in fixed world space: moving the camera, parallax art and scripted rider progression produces the desired scrolling experience without inventing separate moving visual and collision worlds.

**Required stage gates:**
- Before the ground race starts, **each active human-controlled explorer must be riding their own befriended Unicorn**. For one player, one mounted Unicorn starts the race; for two, BOTH must mount. Do not start when only the lead rider mounts.
- Near the **middle of the level**, the world auto-scroll stops entirely at an authored Pegasus sanctuary. No rushing clock runs while players befriend and mount Pegasi.
- Place **at least one reachable Pegasus per active explorer**, ample star treats for both (and recoverable refills), safe room to dismount, and clear return access to each mount. The existing trust loop—favorite treats, friendship, mount with T / gamepad Y—applies to each rider. Mounts are NOT transformed creature forms.
- The flying stage starts only when **each active human-controlled explorer has mounted their own Pegasus**. One Pegasus mount starts it in solo play; BOTH Pegasus mounts are required with two players.
- Airborne escape uses flight-specific obstacles, not simply the same ground race with a different sprite. Jump/wings and Down should matter.
- Do not count the optional player-two cloud-assist cursor as a human rider. Decide this explicitly in UI/testing. A joined active second explorer is always counted; never silently leave that player behind.

This must feel like two complementary games with a calm, friendly changeover in the middle, not a surprise mandatory race before the player understands the mounts.

## Intended route / four beats

**Beat 0 — The orchard start corral (mount preparation).** Begin in a stationary, attractive woodland enclosure with two gentle Unicorns, berries, a basket for refills and room to practice mounting and jumping. Show a simple joint-ready indicator: 1/1 or 2/2 mounted. The start gate opens and the camera begins to advance only after the active players are ready. Allow the scene to remain stationary without a timeout. For solo, no waiting for a nonexistent player 2.

**Beat 1 — The woodland stampede (ground auto-scroll).** Increase pace gradually through a generous training sequence: small roots/logs to jump; then a broken stone bridge with broad jump timing; then a crossing cart, swinging branch, and moving rolling boulder with visible timing tells. Later combine a rolling boulder with a short hop and a descending arch, but keep one obvious safe line through each encounter. Unicorns are fast ground mounts with powerful jumps, not flying mounts. Place Stardrops on optional skill lines and safe visual landmarks (windmill, old aqueduct, blossom grove) to mark progress. The camera keeps driving forward at a level-authored speed curve while mounted riders steer/jump within a readable safe window.

**Beat 2 — The Pegasus sanctuary (midpoint hard stop).** At a clear 45–55% authored progress boundary, bring the auto-scroll to zero before a long, flat sanctuary. No obstacles chase the players into this space. Two Pegasi graze near flowers and star-treat baskets. Let explorers dismount their Unicorns and use the established feeding/trust/mount flow, with room to aim treats and see capture/mount prompts. The next gate stays shut, and the camera remains stationary, until **all active players** ride Pegasi. For one player the transition starts with their Pegasus; for two it begins only after the second is on their Pegasus. Provide a fresh checkpoint here, plus a safe local reset if a mount is lost.

**Beat 3 — Skybound escape (flight auto-scroll).** The camera accelerates into a canyon of sky bridges and floating islands. Early flight obstacles teach repeated wingbeats and controlled descent: high arch to fly over, low tunnel to duck under, and a wide bank of rising wind. Advanced combinations add **moving cloud shutters**, **rotating fan blades**, **descending crystal clusters**, **crossing flying creatures**, and **reversible gust zones** that move riders upward or downward. The safest path alternates vertical elevation to make flight the central skill; no precise pixel threading through a crowded hazard field. Final sequence threads through a calm gap in the storm and lands at a sky-garden gate with the Escape Light. Stop scrolling at a broad finish ledge so the goal and celebration can be enjoyed.

**Optional mastery:** visible Stardrop lines for precise jumps/flight, a clean-run achievement, alternate high and low flight routes. No optional achievement or puzzle may separately block touching the level's light.

## Proposed declarative design (not existing schema)

The chapter should be a versioned plan under phaser/levels/ and registered through phaser/src/campaign.js once implemented. Reuse current Unicorn/Pegasus in phaser/src/mounts.js (including their existing trust, rider art anchors, jumping and wingbeats), the fixed 60 Hz tick, and the established checkpoint/pickup system. The following are **proposed additions**, not existing API fields:

- **racePhases** with stable IDs and state values: waitingForUnicorns -> groundScroll -> sanctuaryStop -> waitingForPegasi -> flightScroll -> finished. The stop boundaries, scroll speeds/easing and restart points are authored.
- **readyRequirements** derived from the number of active human players plus per-player mounted species. No implicit one-player assumption in 2P mode.
- **scrollSegments** with authored world X bounds, a fixed-tick speed curve, camera anchor/lookahead, safe rider window, and stop target. World obstacles do not move just because the camera moves.
- **hazards** with ID, world-space hitbox, kind (static log, moving cart, swinging branch, rolling boulder, cloud shutter, windmill, crystal, crossing flyer), deterministic period/phase/trajectory, telegraph and severity. All physical/visual poses share the authored schedule.
- **flightVolumes** with bounded updraft/gust/downburst force; hazards can use scripted movement within authored ranges.
- **mountEncounters** for two Unicorn and two Pegasus candidates, required treats, safe spawn areas, and reset rules. Spawn/enable only the number needed for solo or co-op, without excluding a second late join.
- **checkpoints, scoring and collectibles** for stage recovery, optional skill rewards, summit light and finish gate. Keep scores observational and avoid setting a fail condition that blocks completion.

Describe all active patterns in the level JSON, not in painter output or ad hoc random spawners. Shared rule implementation should consume the schema and be testable without Phaser rendering.

## Deterministic co-op, camera and failure semantics

- The **first readiness gate** checks each active explorer's mount kind is Unicorn. If player 2 joins during pre-start, require a second Unicorn. Handle a mid-race join explicitly: defer to the next stopped sanctuary or restart checkpoint; do not let them appear behind an unstoppable camera.
- At the sanctuary, halt camera progress and stage-scoped moving hazards. Neither player can re-trigger scrolling alone. Each must have a Pegasus mounted. Two Unicorns must not be treated as interchangeable with Pegasi.
- Let the progress anchor advance at a scripted speed per 60 Hz tick. Camera position and expected hazard approach derive from that world-space anchor. Riders retain controllable movement relative to it and do not gain collision immunity from the illusion of scrolling.
- Set a two-player camera framing policy that keeps both mounted riders inside a generous horizontal/vertical safety window. Rather than allowing the existing follower bubble to silently bypass the race, recover an out-of-frame/knocked-out rider at a safe section checkpoint and pause/restart **both riders together**. Define limited damage and a non-punitive retry. An inactive cloud-assist player is not counted in the readiness state.
- The mounted state, active player set, phase index, checkpoint, obstacle tick and camera anchor form the deterministic restart snapshot. Pause freezes progress; recall restores consistent mounts, world, phase and hazard timing. Do not leave the camera moving during menus, knockouts or sanctuary recovery.
- Make obstacle timing readable: shadows, approach silhouettes, warning motions, and ample lead time at the current scroll speed. Test response windows at the existing actual Unicorn and Pegasus speeds/flight limits rather than choosing hazard spacing by eye.
- The finish key remains collectable on ordinary physical contact, not behind a separate 'won race' flag.

## AI art and geometry handoff

Follow [AGENTS.md](../../../AGENTS.md), [DYNAMIC-SCENE-ART.md](../../DYNAMIC-SCENE-ART.md), [BRASSWORKS-ART.md](../../BRASSWORKS-ART.md), and [CHARACTER-ART.md](../../CHARACTER-ART.md).

1. Author both race corridors as deterministic terrain/material layouts. For every obstacle, define **world-space collision bounds, motion path, frame poses, timing and anchors**. Export guide frames at ground-phase training, ground climax, stopped sanctuary, flight training and flight climax. A fixed-tick replay should determine exactly where every moving hazard is at each frame.
2. Export full-world **static** material guides for ground, rock, gaps and safe landing surfaces, with a separate dynamic-object context guide marking all hazards in representative poses. Never put collision silhouettes into a painting based only on an artist's interpretation.
3. Art direction: storybook golden woodland in the gallop phase, warm sunlit sanctuary with jewel-hued Pegasi, and luminous cloud islands with violet storms and giant drifting crystals in the aerial phase. Preserve an overarching Wonderwood palette and texture treatment across transitions.
4. Generate one coherent image-model composition per authored scene/corridor, then refine with registered overlapping crops at true display resolution. Distinct **non-colliding distant parallax** layers can scroll at different rates; all physical ground/arches/ledges remain world locked. Never bake a moving obstacle permanently into the base panorama.
5. Paint independent true-alpha cutouts for carts, boulders, branches, swinging/rotating hazards, cloud shutters, crystal clusters and other moving objects. Use the exact declared pivots and bounds, then paint repaired static background behind each. Inspect extreme poses and ensure no ghost obstacle is left in the repaired image.
6. Reuse approved Unicorn/Pegasus animation atlases and seated explorer rider poses/hip offsets. Add only pose coverage justified by the race (if needed); maintain frame pivots and collision box alignment. Keep obstacle art separate from static world masks.
7. Register final scene planes and object sprites only after V overlay, full scroll, camera-stop, and both rider poses pass at actual gameplay zoom. The scroll effect is a **camera and parallax presentation of deterministic geometry**, not a license for art and physics to diverge.

## Progress / outstanding acceptance gates

- [x] Compile and validate two authored scrolling corridors, stationary sanctuary, 60 Hz phase machine, named hazards, gust volumes, encounter bounds and camera progress anchor.
- [x] Verify distinct mounted Unicorn/Pegasus readiness for **every active human** (1P/2P), exclude cloud assist, prevent scroll before both riders are ready, and preserve hard sanctuary stop/restart semantics.
- [x] Implement reproducible world-space hazard collisions and production Pegasus gust forces; test failure/retry and consistent collision/motion ticks.
- [x] Prove **separate** solo and 2P real-mounted-motion routes through the ground hazards and flight hazards, including physical Light and exit contact from sanctuary. The two phases have **not** been joined into a full route.
- [x] Export static physical-material maps and five deterministic context/time frames for corral, woodland, sanctuary, storm and climax in CI.
- [ ] Complete and test one **unbroken** Phaser input sequence: forage/feed two Unicorns, mount both; survive ground; dismount at zero-scroll sanctuary, feed and mount distinct Pegasi; survive flight; collect Light and trigger real game completion.
- [ ] Verify treat supplies/refills, proper mount/rider pivots, late join/drop-out, cloud assist, mounted input and checkpoint placement under actual browser controls.
- [ ] Validate physical hazard warnings and safe reaction windows across different timings, both camera views, knockouts, pause/restart and retry; ensure stage `finished` cannot substitute for actual pickup/exit completion.
- [ ] Generate and approve guide-conditioned native-detail woodland/sanctuary/storm backgrounds and true-alpha moving obstacle sprites at the authored world pivots; repair their static holes and render synced hazard/warning cues.
- [ ] Verify V overlay, camera windows and phase stops in the standalone Chromium and Firefox offline builds for **both** party sizes before campaign/art registration.

The full acceptance checklist below intentionally leaves compound browser, feeding, warning and painting tasks open.

## TODO / acceptance checklist

- [ ] Author the full horizontal route, two distinct movement envelopes, obstacle timing/spacing, sanctuary stop, checkpoints, pickups and finish using a versioned level specification.
- [x] Define and validate a phase-state schema, world-space progress anchor and fixed-tick scroll progression; separate camera movement from obstacle physics. *(Fixed-tick rule/adapter proven; browser camera presentation pending.)*
- [x] Implement the all-active-player Unicorn readiness check at the start (solo 1/1, co-op 2/2), including joining/leaving and an explicit cloud-assist policy. *(Unit-level readiness; live join/drop browser flows pending.)*
- [ ] Implement the safe midpoint stop, deactivation of chasing hazards, dismount/feeding space, sufficient star treats, and an all-active-player Pegasus readiness check before resuming.
- [ ] Reuse/test existing mount trust, mount/dismount, seated rider art, Unicorn jumps, Pegasus repeated wingbeats and Down-controlled descent; add only necessary runner-mode movement.
- [ ] Implement ground hazards: timed moving boulder, swinging branch, crossing cart and jumpable static obstacles, all with generous telegraph windows.
- [ ] Implement flight hazards: changing altitude passages, moving shutters/fans, descending clusters, passing flyers and deterministic gusts, with separate up/down routes.
- [ ] Define forgiving shared 2P failure and recovery: no follower-bubble shortcut, synchronized checkpoint restart, pause freezes time and camera, never leave a rider behind.
- [ ] Validate hazard clearances and reaction time from production Unicorn/Pegasus acceleration, jump arc, wingbeat and camera speed, rather than visual guessing.
- [x] Add pure 60 Hz tests for readiness gates, exact midpoint halt, second-phase resume, hazard motion repeatability, camera/physics synchronization, and retry/recall.
- [ ] Run full real-input solo and 2P browser journeys including feeding and mounting both species, pausing, failing, recovering, switching phase, collecting the light, and exiting.
- [ ] Export deterministic material and time-sampled obstacle bitmap guides; give an image model the complete level outline and approved Wonderwood visual reference.
- [ ] Generate/refine cohesive native-detail ground, sanctuary and flight art; repair static background around all individually moving alpha cutouts and align rider pivots.
- [ ] Check V collision overlay and rendered moving objects at training, midpoint, flight and finish in Chromium and Firefox; build and verify offline HTML.

## Design guardrails

Do not start scrolling when just one of two joined players mounts. Do not restart at Pegasus sanctuary until all current riders are on Pegasi. Do not create a death conveyor: telegraph every hazard, include readable alternate lines, and let both players retry together. The player should experience a sweeping ride through a *deterministically authored* illustrated world, not randomized obstacles that the art cannot anticipate.
