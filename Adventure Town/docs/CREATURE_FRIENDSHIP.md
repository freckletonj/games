# Creature friendship for Adventure Town

The user has requested the Wonderwood dynamic in Adventure Town: cute animals
solve puzzles; offer berries, catch a befriended animal with an orb, then turn
into it. This authorizes the creature asset family and the design work below.
The current batch supplies source references only. No creature AI, collection,
form switching, inventory, quest, trading or combat code has been added.

## What transfers from Wonderwood

The current Phaser game is the reference, rather than only the older Canvas
catalog. `Wonderwood/phaser/src/creatures.js` implements trust and a 12-second
capture opportunity: favorite food adds 60 trust, other food 36, capped at 100.
`phaser/src/game.js` feeds creatures, permits an orb to catch a distracted
creature, stores its kind in the player's single `caught` slot and switches
between explorer and that form. The captured creature has a respawn timer.
`phaser/src/puzzle-objects.js` connects friendship to actual traversal and
physical changes: pushing boulders, tipping bridges and punching cracked seals.

Use these rules as a design reference; Phaser's 2D physics, pixels and scene
objects cannot be pasted into Adventure Town's 3D controller. Retain its warmth:
pink/red affection, visible hearts and a willing friendship response. The orb
should look inviting. Avoid replacing this loop with decorative NPC animals.

Wonderwood currently gives Tidefox nectar and Moonwing stardrops. For Adventure
Town, begin with the user's requested berry feeding across these four forms.
Two berries to trust and a 12-second catch opportunity are proposed starting
tuning, derived from the existing favorite-food rule, not implemented behavior.

## First four forms

| Local asset | Wonderwood form key | Proposed ability | First puzzle opportunity | Required art/motion |
| --- | --- | --- | --- | --- |
| springaroo | springaroo | High/double jump | A garden ledge with a clearly visible landing | Four-leg idle, hop, airborne and landing; ears remain attached |
| tidefox | tideling | Swim/dive | A short river route between safe shore exits | Four-leg walk, paddle, dive and shore transition; tail stays clear |
| moonwing | skyling | Limited wingbeats | A short ascent with rest ledges beside the tower route | Bird idle, flap, glide and landing; wings clear the body |
| flintfist | flintfist | Push a marked obstacle; punch cracked stone | Ruin obstacle that reveals a walkable route | Biped idle/walk, braced push and punch with readable contact |

The two names with different runtime keys reflect Wonderwood's existing code;
Adventure Town has no form registry yet. The proposed rock bear may combine
Wonderwood's Gravelback push and Flintfist punch to keep the first set small.
Its biped design is intentional so the existing humanoid rig path can be fitted
after intake. The rabbit/fox and bird need deliberately implemented rig families.
Do not make them humanoid proxies or export them as static stand-ins and call
them animated.

## Small playable loop

A berry source, a nearby creature and one visible ability obstacle should teach
the complete loop before adding more encounters. Keep the initial garden puzzle
optional to the existing town entrances and route. An explorer offers a berry;
the animal approaches reachable food, eats, and displays growing affection.
At full trust it shows a clear catch opportunity. An orb reaching that creature
stores its form and plays a brief heart/spark capture response. A form control
switches into the caught creature and back into the explorer. Keep one current
caught form initially, as in Wonderwood; a multi-form inventory is a separate
product decision.

Feeding must respect paths, height differences and walls. The controller needs
one explicit state for explorer versus form, an ability action and dimensions
that match the visible animal. Attach berry/orb effects to authored positions,
not to baked details in the bush or orb splat. The visible berries in this source
are a design cue; replenishment and detached pickup shapes must be authored.

Author obstacles, their states, pivots, surfaces and recovery first. Export a
geometry guide before generating obstacle art, following Wonderwood's declared
layout workflow. A tipped bridge must connect actual banks and settle into a
walkable collider; a punched wall must remove the corresponding collision.
Flying needs limits and rest points so it cannot skip every puzzle. Transforming
in a doorway, under a low ceiling, in water or against a wall must have defined
placement behavior and be tested against each form's dimensions. A missed jump
or spent berry must leave a clear route to retry.

## Acceptance before calling it playable

Exercise feed → trust → orb hit → caught form → transform → ability → return in
the actual 3D game, on keyboard, touch and gamepad with visible controls. Verify
missed orbs, expired friendship opportunities, pause, respawn, room transitions,
waterline/shore exits, ability contacts and safe form changes. Test that collision
matches opened routes and that alternate forms cannot bypass required puzzle
states. Inspect animations and readability at gameplay distance, then provide
the offline HTML. Reference PNGs or structurally valid GLBs alone do not satisfy
this acceptance.
