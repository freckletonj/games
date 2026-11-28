# Shop surfaces and creature friendship: reference batch 03

Generated 2026-11-27 against PR #27 head `7c6d812236a30a9ba5edc02cfaca309018f001c1`.
Read [CREATURE_FRIENDSHIP.md](CREATURE_FRIENDSHIP.md) for the proposed gameplay and rig work.

## Reviewed starting point

The branch contains twelve static runtime meshes, two rigged shopkeepers and the
imported player. Existing batch 02 notes still describe its binary handoff as
pending; this review checked repository paths, not the quality or hashes of those
existing binaries. Keep their existing test-drive status.

`game/world.js` builds 6.4-unit room foundations, half-unit floor cells, and
0.48-unit cutaway walls. Shop furniture and NPCs already have separate placements.
The floor and walls need richer materials and construction, rather than a
room-wide reconstruction that could block the aisle or door. No existing source
PNG, PLY, runtime mesh, collision or gameplay is changed by this reference batch.

## Ten new source references

| Asset ID | Intake kind | Intended role | Next step |
| --- | --- | --- | --- |
| shop-wall-panel | static | Cream plaster and timber low wall; target height 0.48 | Splat, then fit visual module to authored walls |
| shop-floor-sample | reference-only | Honey-oak boards and staggered seams | Use as a guide for authored flat floor geometry; no splat |
| emberbrook-gardener | humanoid | Friendly new town resident, empty-handed A-pose | Splat, fit individual humanoid rig; target height 1 |
| springaroo | creature-reference | Cream rabbit; high/double jump | Splat, inspect four-leg and ear separation, implement fitted quadruped rig |
| tidefox | creature-reference | Teal aquatic fox; swim/dive | Splat, inspect four feet and tail, implement fitted quadruped rig |
| moonwing | creature-reference | Blue/lavender owl; wingbeats/flight | Splat, inspect wing roots, implement fitted bird rig |
| flintfist | humanoid | Friendly bipedal rock bear; push/punch | Splat, fit humanoid rig to its actual broad shoulders and short legs |
| blushberry-bush | static | Readable pink berries and town vegetation | Splat; detach pickups as authored gameplay objects later |
| friendship-orb | static | Cream/pink/gold heart orb for capture | Splat; author projectile and friendship effects separately later |
| town-bench | static | Reusable timber seating around town | Splat, fit placement and independent collision |

The PNG-only ZIP uses `Adventure Town/assets/<id>/source/reference.png` for each
row. It contains exactly ten originals; the corrected bench is the selected
generator output. Prompts, manifests, readmes and this guide are committed as
small text files separately. SHA-256 values, RGBA dimensions and alpha bounds
are recorded in each `source/PROMPT.md`.

Visual checks covered the whole silhouettes, readable faces, gardener/rock-bear
arm and leg gaps, wings/tails and transparent openings. Compositing against a
light background confirmed true transparency. Several margins are tighter than
requested, especially Tidefox, Moonwing and Flintfist; geometry remains inside
the alpha >16 bounds. Low-alpha speckles remain in the unchanged generator
outputs. The initial bench clipped its caps; an image edit corrected its framing.
These are single-view designs, with no guarantee about inferred backs, splat
coverage, rig deformation or final in-game appearance.

## User handoff

On PR #27's branch `codex/adventure-town-playability-polish`, extract the reference
ZIP at the repository root. Commit the ten PNGs. Use the existing TripoSplat
environment and weights to process the following nine sources, one object per
PLY, with the existing CLI:

```sh
python "Adventure Town/tools/generate_splats.py" --weights /path/to/ckpts shop-wall-panel emberbrook-gardener springaroo tidefox moonwing flintfist blushberry-bush friendship-orb town-bench --dry-run
```

Remove `--dry-run` after checking the paths. Commit each original
`Adventure Town/assets/<id>/incoming/model.ply` and its `generation.json`.
The floor sample is deliberately excluded. Existing completed assets are not
regenerated. Keep Gaussian properties and original export bytes intact.

The new manifests are intake records only: `runtime` is null, conversion settings
and fitted rigs are intentionally absent until the actual PLYs can be inspected.
`creature-reference` is a generation-stage label, not an implemented converter or
runtime kind. The generator uses reference/splat paths and status and does not
require a rig. Do not run `convert_splat.py` on these unfitted intake records.

## Agent work after intake

Inspect real PLY headers, bounds, orientation, source composites and limb gaps.
Fit each static asset's scale and sampling, and each humanoid's joints/region
gates. Extend the converter deliberately for quadrupeds and birds against those
actual inputs before claiming an animal is rigged. Review full idle, locomotion,
jump/swim/flight and ability cycles as appropriate, including paws/feet, wing
roots, tail attachments, stretched cube faces and facing direction.

For rooms, author board seams and wall trim from the references while preserving
the current floor plane, cutaway visibility, aisle and door trigger clearance.
Fit wall segments to their actual bounds; do not blindly tile splat edges or
load the floor sample as a texture into the vertex-color renderer.

Gameplay states, controls, puzzle collision, form dimensions and resets still
need implementation and playtesting. Follow the design guide, then deliver
reviewed runtime GLBs/review images in a new repository-path ZIP and an offline
HTML for play. This reference delivery is neither that runtime handoff nor a
claim that the creature loop is already implemented.
