# First town asset batch

The current adventurer stays. The unused `next-adventurer` experiment is deferred;
no new character PLY is needed. The town is already playable with authored block
placeholders: three cottages, a grocery, a potion shop, a bridge, a swimmable
river and a five-stone jumping route north of the bridge.

## Reference → splat handoff

The reference ZIP contains **only the eight PNGs**, using these repository paths.
Extract at the repository root and commit the images. Convert one PNG at a time
in TripoSplat, then commit the returned original Gaussian PLY at the matching
path. Do not combine this batch into a single splat. A boulder is the simplest
first conversion to check; the house and shops can follow with the same contract.

| Object | Reference PNG | Returned PLY | Initial world height |
| --- | --- | --- | --- |
| Cottage exterior | `Adventure Town/assets/willow-cottage/source/reference.png` | `Adventure Town/assets/willow-cottage/incoming/model.ply` | 2.9 |
| Grocery exterior | `Adventure Town/assets/greenbasket-grocery/source/reference.png` | `Adventure Town/assets/greenbasket-grocery/incoming/model.ply` | 3.1 |
| Potion shop exterior | `Adventure Town/assets/moss-ember-potions/source/reference.png` | `Adventure Town/assets/moss-ember-potions/incoming/model.ply` | 2.9 |
| Produce shelf | `Adventure Town/assets/produce-shelf/source/reference.png` | `Adventure Town/assets/produce-shelf/incoming/model.ply` | 1.4 |
| Potion workbench | `Adventure Town/assets/potion-workbench/source/reference.png` | `Adventure Town/assets/potion-workbench/incoming/model.ply` | 1.25 |
| Dining table | `Adventure Town/assets/cottage-table/source/reference.png` | `Adventure Town/assets/cottage-table/incoming/model.ply` | 0.65 |
| Cottage hearth | `Adventure Town/assets/cottage-hearth/source/reference.png` | `Adventure Town/assets/cottage-hearth/incoming/model.ply` | 1.55 |
| Stepping boulder | `Adventure Town/assets/river-boulder/source/reference.png` | `Adventure Town/assets/river-boulder/incoming/model.ply` | 0.6 |

Heights are provisional game units (the player is one unit tall). Prompts,
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
reconstruct hidden rooms. Their walls/floors and placeholder furniture are already
present; reviewed prop meshes replace just the corresponding visual shapes.
No reference image is claimed to have become a 3D game asset yet.

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

Keep collision stable while replacing visuals. A splat is not a collision mesh,
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
