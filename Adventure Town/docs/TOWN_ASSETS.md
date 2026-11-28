# First town asset batch

The second round trip is documented in [ASSET_BATCH_02.md](ASSET_BATCH_02.md):
four new static objects and two rigged shopkeepers, with runtime binary ZIP handoff.

The current adventurer stays. The unused `next-adventurer` experiment is deferred;
no new character PLY is needed. The first real TripoSplat batch is now converted and enabled: three cottages, a grocery, a potion shop, a bridge, a swimmable
river and a three-boulder jumping route north of the bridge.

## Repeatable reference → splat handoff

The reference ZIP contains **only the eight PNGs**, using these repository paths.
Extract at the repository root and commit the images. Convert one PNG at a time
in TripoSplat, then commit the returned original Gaussian PLY at the matching
path. Do not combine this batch into a single splat. A boulder is the simplest
first conversion to check; the house and shops can follow with the same contract.

| Object | Reference PNG | Returned PLY | Fitted world height |
| --- | --- | --- | --- |
| Cottage exterior | `Adventure Town/assets/willow-cottage/source/reference.png` | `Adventure Town/assets/willow-cottage/incoming/model.ply` | 2.9 |
| Grocery exterior | `Adventure Town/assets/greenbasket-grocery/source/reference.png` | `Adventure Town/assets/greenbasket-grocery/incoming/model.ply` | 3.1 |
| Potion shop exterior | `Adventure Town/assets/moss-ember-potions/source/reference.png` | `Adventure Town/assets/moss-ember-potions/incoming/model.ply` | 2.9 |
| Produce shelf | `Adventure Town/assets/produce-shelf/source/reference.png` | `Adventure Town/assets/produce-shelf/incoming/model.ply` | 1.4 |
| Potion workbench | `Adventure Town/assets/potion-workbench/source/reference.png` | `Adventure Town/assets/potion-workbench/incoming/model.ply` | 1.25 |
| Dining table | `Adventure Town/assets/cottage-table/source/reference.png` | `Adventure Town/assets/cottage-table/incoming/model.ply` | 0.65 |
| Cottage hearth | `Adventure Town/assets/cottage-hearth/source/reference.png` | `Adventure Town/assets/cottage-hearth/incoming/model.ply` | 1.55 |
| Stepping boulder | `Adventure Town/assets/river-boulder/source/reference.png` | `Adventure Town/assets/river-boulder/incoming/model.ply` | 0.3 |

Heights are game units (the player is one unit tall). The boulder was reduced
to 0.3 units high to preserve its broad source proportions, with three separated
low stones across the river. Buildings and props have fitted authored collision. Prompts,
reference hashes and starting conversion settings are committed beside each
asset; the large PNGs are delivered separately. The original PLY must retain
its Gaussian properties; record the TripoSplat export settings/version when
available. The PNG and PLY files are not loaded by the game.

Use the [local batch CLI](TRIPOSPLAT.md) to load your installed TripoSplat weights
once and generate every pending PLY in sequence:

```sh
python "Adventure Town/tools/generate_splats.py" --weights /path/to/ckpts
```

Run that command from the repository root in your existing TripoSplat environment.
Existing PLYs are skipped; each output gets `generation.json` with the settings.
No manual output renaming is needed. See the CLI guide for a subset, dry-run and
intentional regeneration.

## Buildings and interiors

An exterior splat supplies the visible building shell. Door interaction points,
walkable space and collision remain authored in `game/world.js`. Press **F** or
tap the contextual button near a door to enter; use the room's front doorway
to return to the same building. The grocery and potion shop have small contextual
interactions. There is no buying, inventory or crafting system in this milestone.

Rooms are furnished cutaway spaces, assembled from separate props. This makes
floor plans readable and reusable without asking a single exterior image to
reconstruct hidden rooms. Their walls/floors are authored separately; converted prop meshes supply the corresponding visual
shapes. The eight runtime meshes come from the actual committed PLYs.

## Agent conversion and review

From `Adventure Town/`, after a real PLY is committed:

```sh
python3 tools/convert_splat.py assets/river-boulder --out experiments/river-boulder-01
python3 tools/validate_asset.py experiments/river-boulder-01/asset.glb
npm run dev
```

Inspect the header, Gaussian field semantics, orientation, bounds, floaters and
color first; fit `source_to_game`, crop, density and resolution in that asset's
`asset.json`. Static builds use `kind: "static"`, normalize the mesh to
`world_height`, place its lowest point at zero and center its X/Z bounds.
They export vertex-colored **3D voxel meshes**, without bones or fake animation.
The original humanoid converter remains available for future character work.

Preview the boulder in every assigned town slot without promoting it:

`http://127.0.0.1:8000/?scenery=river-boulder&candidate=experiments/river-boulder-01/asset.glb`

Use the same query with any ID in the table to inspect its candidate. The PNGs
are acquisition inputs, not billboards; the static loader reads the actual GLB.
After structural validation, compare front/back/sides, palette, silhouette,
door placement and scale. Walk around and jump on it. For a building, verify
its entrance visually matches its trigger; for props, verify room clearance.
The initial height is a starting fit, not a guarantee that reconstruction has
the desired footprint or pivot. Adjust the per-asset settings and placement/
collision envelope deliberately against the real mesh before promotion.

After review, put `asset.glb` and `report.json` into that asset's `runtime/`,
record the review and status in its manifest, then set its `runtime` path in
`game/town-assets.js` (relative to the game root). Null paths intentionally keep
the authored placeholders. A configured path that fails to load is an error;
there is no silent runtime fallback. The offline bundler embeds all promoted
scenery, so HTTP and offline play use the same accepted assets.

Fit authored collision deliberately while replacing visuals, preserving playable routes. A splat is not a collision mesh,
and an exterior is not a complete navigable interior. Moving parts should become
separate assets with explicit pivots when a real gameplay need arises. Buildings
and furniture do not need character rigs.

## Code versus large-file delivery

Agents commit code, manifests, prompts, tests and documentation directly to the
repository. Deliver new PNGs, PLYs and GLBs in uniquely named ZIPs when large-file
transfer is needed; archive entries must use their real repository-relative paths.
State exactly what is committed and what still needs user upload. Source ZIPs
must not overwrite unrelated code or contain pretend generated outputs. Pull the
user's committed assets and inspect them before the next conversion step.

## First real conversion review

All eight references match their generation-record SHA-256 hashes. Each PLY has
65,536 standard 3DGS Gaussians; opacity endpoints include infinite logits, which
correctly mean alpha 0/1. Original PNG/PLY files are unchanged. The upright fit
for this batch is `[x,y,z] → [z,-y,x]`, recorded per asset rather than assumed for
future exports. No crop or invented hidden geometry was applied.

The first sampling pass was porous. A 0.5-voxel Gaussian filter and density-weighted
DC colors reduced pinholes and speckle. Buildings use 32 height samples, props 24,
and the small river boulder 16. This keeps cubic steps readable and reduces the
render cost compared with the initial higher-resolution attempt. The eight meshes
have 119,980 triangles total before instancing. Static objects have no skin or
animation. Their reports record exact counts, source/config/runtime hashes and
bounds; review sheets compare the reference with front/oblique/rear voxel views.
These sheets are mesh renders, not Gaussian renderings.

The cottage, shop facades, hearth, produce shelf, bottles and table silhouette
survive well enough for a test drive. Inferred hidden surfaces remain weaker:
the grocery rear is dark/open, the workbench rear is very dark, small labels and
accessories soften, and source lighting remains baked into colors. The pipeline
is promising for this scale, but user art acceptance is still pending.

The runtime ZIP contains only `Adventure Town/assets/<id>/runtime/asset.glb`
and `runtime/review.png` for these eight assets. Extract it at the repository root
and commit those files. Code/config/reports/review notes are already committed
separately by the agent. Source play/build requires those GLBs; the delivered
standalone HTML already embeds them and needs no network or extra files.

## User playtest corrections

The hearth/grocery now use 48 height samples, 32 color levels, a smaller 0.25
filter, accumulated opacity and selective fourth-power color weights. Compare
their updated review sheets against Gaussian composites of the original PLYs.
The grocery rear is also open in that source composite. Authored wall infill in
`game/world.js` closes it in town; the source and converted GLB remain honest
about missing geometry. Other six GLBs are byte-identical to the previous batch.
The new binary handoff includes all eight GLBs because the previous upload was
not visible on main when this correction began. Extract it at the repo root;
only changed files will need a new Git commit if the old batch was added locally.
