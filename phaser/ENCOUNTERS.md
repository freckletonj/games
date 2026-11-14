# Encounter authoring for Wonderwood

The **semantic world design remains the only source of truth**. Use
`src/games/animal-adventure/designs.json` and the Phaser meadow transformation
in `phaser/src/meadow-design.js`; no duplicate collision tilemaps or scene
bitmaps. The compiler still determines ridge heights, ledges, wildlife,
checkpoints and objective locations.

## Reusable first-chapter templates

`phaser/src/encounters.js` currently provides three explicitly supported
prefabs, with validated metadata in the existing `sections` array:

| Prefab | Intended interaction | Required skill |
| --- | --- | --- |
| `befriend-creature` | Learn food preferences; earn a form safely | None |
| `ability-ascent` | Use an ability acquired earlier to traverse elevation | Springaroo |
| `rest-and-exit` | Safe recovery and clear chapter transition | None |

An encounter section is created with:

```js
encounter('ability-ascent','canopy-ascent',[61,124],{
  goal:'Read the enemy dash, then double-jump toward the light',
  recovery:101,
  reward:'springKey',
  route:[72,101,106,112]
});
```

The first two values are the prefab and a unique identifier. Its cell range
is half-open `[start,end)`; `route` is an *expected left-to-right
sequence of x-cell waypoints*, not a simulated physics trajectory or an
extra set of colliders.

`validateEncounters(design)` checks contiguous level coverage, valid
ranges, a real authored checkpoint within each encounter, required species
introduced before the gated section, a reward located in its section, and
strictly advancing route waypoints. This is a **design sanity check**,
not proof the player can physically traverse the route.

The actual world still goes through `WW.worldCompiler.compile(spec)`.
The Phaser browser tests prove the first chapter's capture and physical
route to the light without editing game state.

## LLM and diffusion authoring workflow

1. Compose an encounter sequence in the existing semantic level format.
   Reuse these tested prefabs or define one new prefab with its own
   requirement and recovery rules.
2. Validate the encounter metadata and compile the entire semantic world
   with `npm test --prefix phaser`.
3. Build the self-contained HTML (`npm run build --prefix phaser`),
   then run the actual browser route tests and review screenshots.
4. Revise geometry or encounters based on failed input traces. Only then
   author background/foreground artwork to match the geometry. Never let
   a diffusion-painted surface become the collision source.
5. Check generated asset pivots, scale, alpha seams, and consistency across
   the wider biome before adding new creature or tile art.

Each new prefab should add a unit test for its constraints and a browser
test showing one real, no-cheat successful traversal. Future prefabs
might include a timed springboard leap, underwater rising bank, Pegasus
thermal ascent, and a two-player relay. Those are **not implemented**
by this first schema.

## Architecture boundary

- `world-renderer.js`: world paint, slopes drawn as texture masks, flora,
  water highlights, and atmospheric effects; **no collision decisions**.
- `physics.js`: heightfield/ledge and projectile geometry.
- `mounts.js`: deterministic riderless mounted motion rules and mount data;
  scene code remains responsible for input, character visuals and effects.
- `game.js`: scene lifecycle and orchestration; future work should move
  explorer control and creature AI to similar small functional modules.

Fixed-timestep simulation, physics-engine comparison, the other four
campaign completion scripts, full animation pipeline and physical
gamepad QA remain on the PR TODO list.
