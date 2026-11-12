# AI-native level authoring (v1)

Wonderwood's canonical built-in level source is src/games/animal-adventure/designs.json.
Edit that file instead of painting collision pixels or editing the old JavaScript world generator.

The game and the offline analysis scripts use the SAME deterministic compiler:
src/platform/world-compiler.js. It emits the existing collision grid,
fractional slope surface, objects, stage metadata, and continuous water bodies.
The standalone HTML needs no Node runtime, network, or third-party libraries.

## Fast feedback loop

From the repository root:

1. Edit src/games/animal-adventure/designs.json (declarative JSON).
2. Run: node tests/level-designs.mjs
3. Run: node scripts/inspect-levels.mjs
   This produces dist/level-diagnostics.json (diagnostics, progression
   intent and metrics), and dist/preview-levels.svg (atlas of physical surfaces,
   water, platforms, spawns, key objectives, checkpoints and challenge sections).
4. Run: node scripts/build.mjs
   This produces one fully offline dist/wonderwood.html file.
  Optional mount courses remain world-space runtime gates and are included
  in the same offline build, not downloaded externally.
5. Run: python scripts/evaluate-routes.py
   Chromium drives the real game physics at 60 Hz, probing each named challenge
   with walking, jumping, and the chapter's intended transformation.
   Outputs: dist/route-probes.json (progress, attempts, trajectories, stalled
   tile, key contact and advice), and dist/preview-route-probes.svg.
   Each world additionally gets a goal probe: a finite, form-aware agent
   starting on the authored real ledge, following goalRoute waypoints,
   physically collecting the relic (or reporting a failing trace). The
   campaign CI requires all five local goal probes to succeed; imported
   candidates report failures without being rejected for artistic revision.
   These are local proof-of-contact tests, not autonomous campaign completion
   (a quick per-section comparison chart).
6. Run the other Playwright regressions for campaign mechanics, input,
   creature transformations, controller menus, co-op and screenshots.

To evaluate a standalone level draft without editing the campaign, run:

   python scripts/evaluate-routes.py path/to/candidate-design.json

The candidate is compiled and probed in the actual browser runtime. To isolate
traversal from the creature-capture puzzle, each probe starts locally in its
section with the necessary transformation granted and wildlife combat disabled.
A green bar means this movement script reached the section's far edge.
Amber means this specific approach stalled. Neither proves that a human can
or cannot complete the level. The JSON gives the exact furthest tile so an
LLM can revise a limited area and compare the same probe again.

Compare two revisions with:

   node scripts/compare-route-reports.mjs before.json after.json

This writes dist/route-comparison.json with normalized progress deltas and
named improved/regressed/unchanged challenges. Compare the same chapter
and probe settings across revisions; the comparison is evidence for which
scripted approaches improved, not an automatic aesthetic or fun score.

CI performs these steps and uploads the offline game and review previews.

Important: a structurally valid design does NOT prove a successful run, good
pacing, or human enjoyment. Browser regressions verify targeted mechanics and
selected routes. Full-map autonomous route search and objective-complete agent traces are a future milestone; local real-physics probes are now available.

## The design schema

Each chapter is keyed by ID and has:

- version: 1, id, biome (meadow, coast, summit)
- width (32–400), height (20–80), in semantic cells, not visual sprite tiles;
  one semantic cell currently corresponds to 16 game world units.
- ridge: strictly increasing [x,y] points from x=0 to x=width.
  Decimal y positions provide continuous slopes. Positive y points downward.
- terrainFeatures: optional broad, cosine-tapered changes to the ridge:
  {"center":72,"radius":15,"lift":4} raises a hill 4 cells at x=72;
  negative lift carves a gently sloping valley. Both endpoints blend to zero.
- water: [startX,endX,referenceTopY,depth] basin spans. The compiler lowers
  the waterline to its banks when necessary and interpolates smooth shoulders.
  Deep water only exists where the basin floor is below the water surface.
- bridges, ledges: [x,y,length] one-way platform spans.
- thermals: optional [x,y,width,height] updrafts.
- relic: [kind,x,y] containing springKey, diveKey, or skyKey.
- creatures: [kind,x,optionalY] capturable encounters. Use internal species
  identifiers (tideling is Tidefox; skyling is Moonwing).
- mounts: optional [kind,x,optionalY] rideable spawns, using **unicorn** or
  **pegasus**. Two favorite treats (three other treats) earn trust; land on the
  saddle to ride. Mounts are not capturable transformations. Omitting y
  places the mount on continuous dry ground; explicit y must stand
  immediately above an authored bridge or ledge, not empty air. To perch
  a Pegasus on a ledge at row 29, use ["pegasus",276,28].
  The compiler rejects floating or submerged mounts. Keep Pegasus locations on
  meaningful elevated routes beyond the chapter's required Moonwing climb
  so unlimited mounted flight does not invalidate the initial ability puzzle.
- mountCourses: optional species-gated, timed riding challenges. A course has a
  unique id, section, name, mount ("unicorn" or "pegasus"), seconds (6–30),
  and 4–7 strictly increasing [tileX,tileY] ring coordinates. Every ring
  must stay inside its named section and have a preceding matching mount
  spawn no more than 12 tiles before the first ring. Adjacent rings span
  at most 24 tiles horizontally and climb no more than 11 tiles for Unicorn
  or 17 for Pegasus. The first ring starts the timer **only while riding
  that species**, and later rings must be reached in order. Dismounting,
  running out of time or entering a follow bubble resets the run. Completing
  the optional course awards 5 Stardrops and a heart once; it never
  locks the chapter relic or overrides required transformations.
  Example in Mosslight Meadow:
  {"id":"lantern-gallop","section":"lantern-grove",
   "name":"Lantern Leap","mount":"unicorn","seconds":13,
   "nodes":[[182,33],[199,25],[218,24],[235,28],[250,27]]}.
  The art guide exports these rings as separate anchors, not static paint.
- checkpoints, snacks: arrays of x positions.
- stars: [x,y] optional pickups; landmarks: {x,type} descriptions.
- motifs: optional, section-bound platform patterns, for example:
  {"id":"lily-arc","section":"lilypond","type":"arc",
   "x":131,"y":30,"count":6,"dx":7,"width":5,"rise":8}.
  Types arc, staircase and ripples generate reusable, non-identical alternate
  routes; the whole pattern must fit inside its challenge section.
The **Willow Wetlands** sequence is a visual narrative, not a random
vegetation scatter: willow bank → lily-covered lagoon (exact waterline
anchor) → elder-tree refuge → submerged library → lantern-lit delta.
Keep this readable when generating new diffusion panels: do not repeat
Crystal Coast's open-ocean coral formations in a freshwater river.
The two sky chapters should likewise be distinguished through lighting
and frame placement, without fabricating extra traversable geometry.

- goalRoute: an ordered sequence of [tile x, tile y] authored world-space
  waypoints leading from a real platform or dive approach to the exact relic
  coordinates. The engine draws a few proximity-sensitive in-world motes;
  routes never create collisions, auto-move the player or grant abilities.
  The compiler rejects out-of-range steps and any endpoint that misses the
  relic; the diffusion layout exporter includes these anchors for visual
  storytelling and route review. Place paths through physically reachable
  landings, wind currents or water volumes, not empty impossible space.
- vistas: one major authored composition per section in the included
  campaign. Each has an id, section, kind, role, x (semantic tile center),
  span (12–34 tiles), and an optional y anchor (otherwise grounded to the
  continuous heightfield). Roles establish, teach, challenge, rest, reveal,
  reward connect visual staging to the player's intended experience.
  These are detailed procedural storybook illustrations rendered on a
  dedicated middle-distance layer, never collision objects. The vocabulary
  includes root arches, elder trees, lily gardens, firefly ruins, reefs,
  flooded temples, willow groves, moon gates, floating gardens and spires.
  An LLM should place a distinctive focal composition at the actual
  gameplay beat, not evenly distribute decorative props.
- dressing: explicitly positioned and grounded illustrations. Each item has
  x, asset (flowers, mushrooms, stones, reeds, shells, moonStone, berryBush)
  and scale (.6–1.65). The built-in worlds no longer use randomly repeated
  ground decorations or the old landmark stamps. Keep quiet negative space
  between landmarks so characters and objectives remain readable.
- Every interactive setpiece requires a target [tileX,tileY] inside its own
  section and at most ten tiles horizontally from its origin. The compiler
  reports intendedRoutes; during play, small directional motes appear only
  nearby and only for a creature form that can use the mechanism. A launch
  bloom leads to a ledge, a wind ring to higher flight, a bubble vent toward
  the surface. These are specific route decisions, not filler.
- setpieces: optional interactive route beats, with id, kind, section, x and
  (except bounceBloom) y in semantic cells:
  - bounceBloom (dry ground; omit y): an animated spring flower launches a
    landing player upward. Springaroo can use its second jump afterward.
  - windRing (open air; y required): Moonwing gains a wingbeat boost and
    resets flap cooldown when passing through a luminous ring.
  - bubbleVent (central deep water; y required): a passive upward current
    lifts entrants. Tidefox can hold Jump for a stronger boost or hold Down
    to swim against the bubbles and reach deep relics.
    Near the waterline, holding Jump produces a brief Tidefox breach.
  Example: {"id":"reef-rescue","kind":"bubbleVent","section":"shallow-reef",
  "x":81,"y":44}. The compiler rejects unknown kinds, duplicates, misplaced
  landmarks and wrong section references, and emits local interaction counts.
- sections: contiguous objects with id, range:[start,end], challenge, goal,
  and optionally requires. They cover the entire level. A form required in
  a section must have a creature encounter earlier than its beginning.

The compiler rejects unsupported versions, missing core objects, broken
stage coverage, impossible water depths, invalid ridge coordinates, overlapping
water basins, and unknown prerequisite creatures. Shoreline corrections are
reported as warnings so an LLM can revise the proposal.

## Diffusion art preparation

Run: node scripts/export-art-guides.mjs

This exports dist/art-jobs.json and paired, camera-exact 16:9 SVG masks in
dist/art-guides. The clean *.mask.svg files identify ground silhouettes,
continuous water volumes, and walkable ledges without painting fake gameplay
objects. The *.layout.svg guides overlay the actual creature, pickup and
checkpoint anchors so a human or image critic can check visual readability.

Each job has a 480x270 world-unit camera rectangle, a 960x540 output size,
a named challenge and goal, separate distant-background and transparent
foreground prompts, and suggested safe asset names. The exporter creates
additional upper-altitude cameras where flight paths or aerial relics would
otherwise be outside the ground-level view. Neighboring horizontal views
overlap, helping a model preserve continuity without stretching artwork.

To export a one-off candidate: node scripts/export-art-guides.mjs candidate.json

Generated painted PNG/WebP files go in src/assets/scenes/panels. Reference
their filename stem through a design's optional art.background or
art.foreground arrays:

    "art": {
      "foreground": [
        {"asset":"meadow_scene_01","x":0,"y":320,
         "width":480,"height":270}
      ]
    }

Coordinates use **world pixels** and match the canvas, not a resized PNG.
The image itself can be 960x540 or larger at the same aspect ratio. The
renderer center-crops to fit instead of distorting image proportions.
Foreground panels are world-aligned; for distant atmospheric background
layers use a parallax value between 0 and 1. Do not bake creatures, keys,
UI text or fake collision obstacles into scene art.

The *.layout.svg guides and art-jobs.json contain `interactions` anchors
and `compositions` with each vista's kind, role, center and world span.
Painted panels should follow that authored composition rather than
placing a generic disconnected collage over the collision mask.
Avoid painting static copies of blooms, rings or vents into the diffusion
panels: runtime animations, physics and player reactions own those landmarks.

A built-in design referencing an asset that isn't bundled now fails the
build with a specific missing-asset error. CI checks this panel packing
path with a temporary PNG fixture and uploads the masks and art job manifest.

**Limit:** This generates diffusion-ready spatial conditioning and prompts,
not painted images. An image-generation model must still produce the panels,
and visual inspection/human playtesting is required before acceptance.

## Authoring strategy for LLMs

Start with gameplay intent: 3–6 named challenges, different routes,
an explicit source for each required ability, checkpoints and recoverable
mistakes. Design the ridge, platforms, water volumes, and creature placements
to express that intent. Run structural validation, inspect the SVG, then
review actual browser gameplay. Fix failing sections before generating art.

Level art is separate from physics. Optional diffusion-painted scene panels
live in src/assets/scenes/panels. The renderer now preserves panel image
proportions by cropping to fit, not stretching the bitmap on both axes.

Custom JSON level import accepts these high-level design files through the
existing Load JSON feature; legacy semantic PNG and compiled-grid JSON maps
remain importable.

## Architecture boundaries

This is an integrated architecture slice, not a claim of a complete engine
replacement. Current gameplay still runs in Canvas 2D, with coarse semantic
collision cells plus a continuous ground heightfield. Full caves and overhangs
need arbitrary terrain polygons, stacked navigation and a future renderer.
Scripted real-physics local traversal agents run in CI, but a full
objective-complete player-agent search and automated screenshot critic are not
implemented yet. Maintain the single-file offline contract, canonical
declarative designs, and deterministic diagnostics during those upgrades.
