# Mirror Palace — laser-routing adventure (graybox)

**Status:** Gameplay-only revision of the Mirror Palace chapter in the regular
Wonderwood campaign. Not painted or human-playtest approved. The other two
experimental chapters are unchanged.

## Design intent

A good light level is about making a choice with a beam and then *going
somewhere because of that choice*. The earlier version was physically correct,
but all three rooms were effectively a fixed series of Up presses followed by
a bridge that stayed on forever. The revised course keeps the deterministic
optics, safe checkpoints and cooperative play, while giving each room a
different purpose.

### Atrium — discover a useful wrong answer

The opening mirror now has three detents. It initially sends the laser straight
ahead (no receiver). One Up press aims upward, charging the permanent bridge
and opening the door as before. A second turn aims *downward* at a separate
blue receiver inside the dry vault. That receiver constructs **three temporary
ascending platforms** from the vault floor to the first Stardrop. The beam
cannot feed the upper bridge and the lower steps at the same instant, but the
upper bridge stores its first success, so the player can safely experiment
later and never strand a partner.

The lower receiver sits within the dial's camera view, the small vault steps
rise with a near-to-far preview, and the reward must be reached through real
jumping rather than from a remote toggle. Turning the beam away eventually
retracts the optional steps, except under an occupied rider. A player who
ignores the detour can simply cross the main bridge.

### Gallery — assemble a path, then climb it

The pink route remains the room that teaches **ray composition**, rather than
repeating the Atrium's branch choice. A lower mirror redirects the lantern
upward, an upper mirror turns it horizontally, and an independently controlled
shutter blocks the final segment. The real beam terminates at each obstruction.
Only the full two-bounce path lights the receiver and grows six successive
steps into a balcony. Every control is separately reachable by one player;
no simultaneous co-op inputs or automatic room relays are required. Solved
stairs and door stay safe if another player later changes a detent.

### Observatory — aim down, then aim up

The original gold climax could be completed by rotating one prism twice in
place, opening a shutter, and waiting for a shadow to pass. The prism now has
two *different productive* directions and two visibly connected receivers.

The player first turns the prism to its **downward** detent, then opens the
curtain, illuminating a lower gold receiver. It takes a short clean exposure
to store its ignition charge. The player must then return to the prism and aim
**upward** toward the second receiver. The upper capacitor cannot charge until
the lower one is primed; its required thirty ticks of clean light accumulate
across interruptions. Both receiver rings and their dotted conduit communicate
the dependency with minimal text. The intermediate receiver cannot open the
final gate or form a single final step by itself.

The orbiting eclipse has moved above the prism, into the *outgoing upward ray*.
It intermittently eclipses that ray but **cannot obstruct the incoming beam or
the downward ignition**. This avoids a potentially long, untelegraphed wait
at the first receiver. Once both cells are charged, the eight-step upward
staircase builds in a wave and latches permanently, including during later
eclipses. A timed shadow cannot remove a platform under a jumping player.

## Physics and presentation contract

All beams use the fixed-tick, real-material ray tracer. All optional and
required steps use the same solid, pending-preview and occupied-player state
machine as collision; no floating decorative substitute is walkable. Gate
bodies remain embedded in the physical rock, steep banks cannot be climbed
around, and the Glimmermoth remains beyond the optical gates. The first
optional detour cannot reach the far cliff without the main bridge.

In-game graybox affordances are the three-position handles, true beam
endpoints, visible receiver charge rings, preview/solid step outlines and
thin dotted control/receiver links. The world remains unpainted; do not make
art authoritatively determine reachability. Any later generated scenery must
be aligned to the updated phase-platform and receiver pivots. Exported
geometry snapshots should include *both* blue beam branches and *both* gold
charging stages.

## Verified and still outstanding

Focused production-rule tests cover blue detents, main-door latching,
temporary optional platforms, a normal-input route to the vault Stardrop,
gallery bounce/shutter dependencies, gold prerequisite charging and real
occlusion, stair buildup, missing-control cases, steep banks, reset/replay,
occupied-platform safety, and ordinary-spawn solo/two-human routes to the
Light and exit. The offline full-campaign CI and Chromium smoke must pass on
the committed revision before release.

A scripted movement run proves physical feasibility, **not** that a first-time
player understands or enjoys the route. Real human solo/co-op playthroughs,
pacing checks, pickup placement, accessibility/readability review, and final
art approval are still required; keep the PR draft.
