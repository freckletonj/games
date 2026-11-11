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
5. Run: python scripts/evaluate-routes.py
   Chromium drives the real game physics at 60 Hz, probing each named challenge
   with walking, jumping, and the chapter's intended transformation.
   Outputs: dist/route-probes.json (progress, attempts, trajectories, stalled
   tile, key contact and advice), and dist/preview-route-probes.svg
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
- creatures: [kind,x,optionalY] encounters. Use internal species identifiers
  (tideling is Tidefox; skyling is Moonwing).
- checkpoints, snacks: arrays of x positions.
- stars: [x,y] optional pickups; landmarks: {x,type} descriptions.
- motifs: optional, section-bound platform patterns, for example:
  {"id":"lily-arc","section":"lilypond","type":"arc",
   "x":131,"y":30,"count":6,"dx":7,"width":5,"rise":8}.
  Types arc, staircase and ripples generate reusable, non-identical alternate
  routes; the whole pattern must fit inside its challenge section.
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
