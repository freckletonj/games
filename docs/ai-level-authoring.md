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
5. Run the existing Playwright browser regressions for actual player physics,
   creature AI, transformations, controls and screenshots.

CI performs these steps and uploads the offline game and review previews.

Important: a structurally valid design does NOT prove a successful run, good
pacing, or human enjoyment. Browser regressions verify targeted mechanics and
selected routes. Full-map automated agent traces are a future milestone.

## The design schema

Each chapter is keyed by ID and has:

- version: 1, id, biome (meadow, coast, summit)
- width (32–400), height (20–80), in semantic cells, not visual sprite tiles;
  one semantic cell currently corresponds to 16 game world units.
- ridge: strictly increasing [x,y] points from x=0 to x=width.
  Decimal y positions provide continuous slopes. Positive y points downward.
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
A general headless gameplay agent and screenshot-feedback loop are not
implemented yet. Maintain the single-file offline contract, canonical
declarative designs, and deterministic diagnostics during those upgrades.
