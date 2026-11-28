# Creature friendship for Adventure Town

The first playable Wonderwood-style loop is implemented using the actual batch 03 splats: offer berries, catch a willing animal with a friendship orb, then become it. This is a small optional traversal loop within the existing town, with one current caught form. There is no multi-form inventory, shopping, combat or quest progression.

## Friendship and controls

Approach an animal as the explorer and press **F** twice to offer two berries. Each eaten berry adds 60 trust, capped at 100; the animal walks toward reachable offered food and shows pink hearts. Full trust opens a 12-second friendship opportunity. **G** throws the actual heart-marked orb toward a nearby ready animal; **F** also offers capture when ready. A missed or wall-blocked orb does not catch it. A caught animal returns to town after 17 seconds. Expiry resets full trust so feeding can be retried. Berries/orbs are freely available in this introductory loop; the bushes signal encounters, rather than implementing a harvest inventory.

**T** switches between explorer and the current caught form. Standard gamepad controls are **X** for context/feed/ability, **RB** for the orb and **Y** for form. Touch has the contextual button plus explicit orb/form controls. **Space / A / Jump** triggers jumps or wingbeats. Pause freezes trust opportunities and effects. Respawn returns to explorer while retaining the caught form. Room entry returns to explorer; animal encounters remain outdoors.

| Local form | Implemented ability | Where to try it | Motion |
| --- | --- | --- | --- |
| Springaroo | One additional air jump | Optional high garden landing west of the river | Fitted 18-joint quadruped, Idle/Walk/Run/Jump |
| Tidefox | Faster swimming; F toggles dive/surface in water | River between the safe shores | Fitted 19-joint quadruped, core clips plus Swim |
| Moonwing | Four limited airborne wingbeats, refreshed by landing | Existing tower ledges and short ascents | Fitted 12-joint bird, core clips plus Fly |
| Flintfist | F pushes a nearby boulder or punches a cracked seal | Two optional ruin passages east of the river | Individually fitted 15-joint biped, core clips plus Push/Punch |

The player's dimensions and rendered GLB change together. Form switches require ground or water support and enough clearance; switching in midair cannot refill jumps or wingbeats. Under-bridge collision rejects a larger explorer if it does not fit. The riverbed is deeper to accommodate Tidefox's submerged pose. Its dedicated paddle clip replaces the humanoid swim tilt.

Pushing moves the actual obstacle collider and carries the pusher along; punching removes the seal collider at the gesture's contact time. Those changes persist across room visits during the current run. These are deliberately authored practice obstacles, not a progression campaign or generated puzzle art. The garden landing can also be approached creatively using nearby scenery. There is no claim that every route is exclusively gated by one form. Misses leave the original town routes and respawn available.

## Relationship to Wonderwood

The reference is the repository's current Phaser version: `Wonderwood/phaser/src/creatures.js`, `game.js` and `puzzle-objects.js`. Favorite-food trust (+60), the 12-second opportunity, a single caught slot, animal respawn and physical ability interactions inform this implementation. Adventure Town uses berries across all four animals as requested, rather than copying Tidefox's nectar or Moonwing's stardrops. Its local keys are `tidefox` and `moonwing`; Wonderwood calls those forms `tideling` and `skyling`. Its 2D physics and scene objects were not imported.

## Evidence and remaining art work

The real controller tests exercise all four encounters through feed → trust → orb → caught → transform → return. They cover opportunity expiry, wall-blocked orbs, pause, respawn, safe form dimensions, the garden landing, wingbeat limits, underwater clearance and real push/punch collision changes. Standard-pad X/RB/Y actions are simulated; a physical controller has not been tested. Chromium checks exercise keyboard and touch friendship and the second-jump garden landing, alongside existing doors, water, shops and offline play.

The actual skinned GLBs were rendered over full clip cycles and checked for finite skinning, loop closure and stretched edges. Motion is procedural and in place, with remaining foot drift and small voxel creases. Springaroo's inferred rear remains rough; the orb retains a dark inferred back. See each asset's `runtime/REVIEW.md`. These are test-drive assets awaiting user art acceptance.
