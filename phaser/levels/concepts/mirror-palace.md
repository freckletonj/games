# Mirror Palace — three-chamber optical puzzle overhaul

**Status:** Unpainted, playable graybox in the main campaign menu; not art-approved or release-ready.

The six visible, independently operated optical stations replace the previous three one-hit room relays. One key or projectile rotates/toggles **exactly one mechanism** per activation. Mirror detents and shutters persist while the player walks away. Actual deterministic, rock-aware beam tracing powers the receivers, phase-platform collision and latched doors.

## Focused gameplay audit and redesign (November 18, 2026)

**Design thesis:** A three-beat optical adventure should move from *I can bend
light*, to *I can build a ray path*, to *I can store moving, interrupted light*.
The player should observe physical rays, choose controls, and see a real
walkable consequence—not simply operate six switches or wait through arbitrary
animation. This pass changes Mirror Palace graybox gameplay, not art.

**1. Blue Atrium — single reflection and safe learning.** The first mirror has
only two meaningful directions: a wrong angle visibly sends its ray away;
the correct angle hits a receiver and constructs the bridge. Previously the
gate latched but its bridge could later disappear if either player touched
the dial again. This is an unexplained punishment for experimentation and a
co-op recovery problem. The receiver now **stores the first correct light**;
the bridge and doorway stay solved, even if the ray is subsequently redirected.
A brief collision-synchronized formation preview remains. The low-vault
Stardrop is an optional detour, not a gate dependency.

**2. Gallery lower mirror — discover a first bounce.** Incorrect detents now
remain visibly meaningful because the actual traced ray misses the next
reflector. A state-sensitive hint encourages looking for the endpoint rather
than listing an angle combination. Only a real first reflection continues the
path; the checkpoint stays on the upstream bank until the crossing is solved.

**3. Gallery upper mirror — transform a vertical ray into a horizontal one.**
This remains a distinct detent, not a remote auto-solving relay. Its result is
seen in the traced ray before the player touches the curtain. Two-player
control still changes exactly one mechanism per input; the upper-reflector
station does not depend on the first operator remaining at the lower mirror.

**4. Gallery shutter — make the last obstruction intelligible.** The shutter
still interrupts the *real* ray. Its control was so close to the first crystal
step that standing at the station could prevent that step from materializing.
The control moved from x=109 to x=106 tiles (and its authored interaction
reference follows), clear of the platform body. Its label is vertically
staggered from the upper mirror label. The UI now shows both the current and
next state, so Up never feels random.

**5. Pink crystal staircase — reward composition.** Six genuine, jumpable
steps now appear in a **near-to-far wave**, five additional 60 Hz ticks per
step, instead of flashing into solidity simultaneously. The first solution
is stored permanently, keeping the whole return route safe for both players.
The first step is usable before the last step has finished forming, and every
solid / preview state still comes from the same deterministic collision rules.
The lower Gallery Stardrop remains a voluntary exploration reward.

**6. Gold prism — choice between three ray directions.** The three detents
remain separate and reversible. Current and next angle are printed at the
actual dial, rather than requiring two mysterious Up presses. Wrong detents
continue to terminate the visible physical ray at different places; the
prism does not secretly activate the room.

**7. Eclipse shutter — control the final sightline.** The independent curtain
must be opened to pass light. A moving disc really occludes the incoming
ray, but hitting the correct alignment no longer instantly solves the
entire room during the first transient clear frame.

**8. Eclipse receiver / capacitor — watch a causal payoff, not a punishing
timer.** The receiver accumulates **30 clean-light ticks** (0.5 seconds at
60 Hz); partial charge survives every orbiting shadow. Its gate cannot unlock
and its steps cannot become solid until it reaches full charge. Progress is
reported numerically as CHARGING or SHADOW, and the accumulated charge and
stored-light state are available in the live diagnostic snapshot. The eclipse
thus matters mechanically without requiring frame-perfect shutter timing or
making players idle through repeated failed cycles.

**9. Gold staircase and final exit — purposeful culmination.** Eight real
stepping stones form in an upward wave, four additional ticks per step. The
capacitor locks the path, including during later eclipses. No timed platform
can vanish underneath a solo or co-op jumper. The final Glimmermoth encounter
remains beyond all three receiver-gated passages, so a flying form cannot
skip the optical route. The Light and exit still require physical contact.

**10. Presentation, checkpoints and optional play.** The HUD now responds to
actual mirror, shutter and receiver states, names all **six** pink steps and
**eight** gold steps correctly, and identifies stored light. Shorter station
names and staggered labels reduce overlapping graybox callouts. Stage
checkpoints still preserve detents, capacitor progress and solved geometry;
recall must not re-enable a hidden collapse. Three optional Stardrops reward
investigation without adding compulsory switch hunting.

**Boundaries / acceptance.** No AI art is authorized by this gameplay pass.
Deterministic tests cover missing controls, first-hit versus charged gates,
progress accumulation, step-formation order, stationary shutter operators,
reversed controls after solving, full normal-spawn solo and two-human routes,
cliff and gate bypasses, and state restoration. Whole-route real-keyboard
Chromium and Firefox playtesting, subjective pacing and readability remain
release gates. The full browser smoke is separate from simulated movement,
and a scripted route is not proof that a new player understands the puzzle.

**Act I — Reflection Atrium.** Rotate the blue mirror dial to redirect a real sunlight beam up to its receiver. A long crystal walkway materializes across a sunken vault. An authored stone cliff prevents simply walking up the other side.

**Act II — Reflection Gallery.** Set two pink mirror detents (up then right) and independently raise a blocking shutter to complete a two-bounce ray. Six illuminated, jump-height steps form an ascending bridge across a dry depression to a high balcony. All three interventions matter, and the visual beam ends at whichever obstruction is currently blocking it.

**Act III — Eclipse Observatory.** Rotate the three-position prism to direct a gold beam upward and open the independent eclipse curtain. A slow orbiting eclipse disc intermittently shades the incoming ray. Thirty clear-light ticks charge a permanent optical capacitor; partial charge survives an eclipse shadow, and the staircase stays solid during subsequent eclipses so jumps cannot end in a sudden collapse. Eight close-spaced light-built stepping stones climb to the high Moonlight Terrace, where the Light and exit have physical contact requirements.

**Controls.** Up / D-pad Up within three cells of a dial rotates its one detent or toggles its shutter. A thrown orb hitting the same dial performs precisely the same action. Labels show the physical mechanism, mirror angle or OPEN/CLOSED state, receiver LIT/DARK and projected-vs-solid platform edges. The colored lines render the **actual ray trace**, not fake station-to-bridge decorations. Two players may distribute controls but are never simultaneously required.

The camera preview has no artwork, and world solidity never comes from a rendered beam. All closed gates are physical top-to-rock collision curtains drawn only over their open doorways. The final flying creature is placed beyond the gated puzzles so it cannot bypass the physics before activation.

Acceptance requires successful real-input 1P and 2P traversal, full actual-spawn route, negative gate/bank/deck bypasses, missing-link optical state checks, timing, rider safety, deterministic checkpoint replay and Chromium screenshots. Browser smoke and full playthroughs should use exactly the shipped Phaser rules. No assets have been generated or campaign registration changed.
