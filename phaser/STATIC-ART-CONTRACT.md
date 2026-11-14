# Code-defined interaction, coherent painted scenery

This contract describes how to paint a coherent cave scene from authored
gameplay geometry.

## Non-negotiable invariant

The compiled level definition is the sole authority for traversable and
collidable shapes. **All solid and one-way material is painted as one
complete, world-locked scene**, with identical pixel coordinates to its
physics model. A single full-world color-coded reference guides the model.
Individual wedge, wall or ledge bitmaps are not generated separately.

The semantic reference contains solid rock (purple), open air (dark),
completely filled water volumes (cyan), one-way ledges (gold slab bodies,
with collision at the top only), and solid climbable walls (orange).
It contains **no players, creatures, pickups, UI, exit markers or dynamic
items**. The guide and all alpha masks are derived from `compileCave`.

Run from the repository root:

```sh
node phaser/scripts/export-cave-guides.mjs
```

For the active Skywell, this writes under `dist/cave-guides/skywell-ascent/`.
The separate **vaulted geometry study** exports under
`dist/cave-guides/skywell-vault-study/` with additional physically solid
polygons, nine overlapping art-refinement guides and a plan.json:

- `world-physical-rock.png`: **the one complete static geometry reference**
  for global image conditioning, at native 3520 × 2048 world pixels.
- `world-static-solid.png`: same dimensions, RGBA. Rock, ledges and
  climbing walls are opaque; open air and water are **actually transparent**.
  This is one mask for the entire collidable painting, not object sprites.
- `world-static-water.png`: same dimensions, RGBA. Only the swimmable
  water volume is opaque; rock, shelves, walls and air are transparent.
- `manifest.json`: source resolution, material semantics and layer contract.

### Painting contract

First generate the **complete** static cavern scene using the entire,
color-filled geometry reference as image conditioning, not a prompt alone.
Reject generated imagery that invents standable surfaces or fails to
respect rock/air, slope, ledge or water silhouettes.

Then obtain genuine full-world resolution. If the generator's maximum
native output is smaller than the world, do **not** stretch it with
Lanczos and call the result high resolution. Use it only as the **global
composition reference**, and refine overlapping high-resolution views
of that same composition, constrained by corresponding geometry crops.
Reassemble them in world coordinates while preserving continuous lines,
lighting, color and texture; inspect seam boundaries. The final **scene**
must be coherent before extracting any transparent layers.

Once an approved full-resolution painting exists:

```sh
python phaser/scripts/extract-painted-layers.py \
  approved-full-resolution-skywell.png \
  --background separate-noncolliding-depth-painting.png
```

Pillow is the only authoring dependency for extraction. The script
requires the **exact** world dimensions and refuses silent upscaling.
It preserves the painted RGB pixels untouched and applies the
code-generated alpha masks to create `painted-solid.png` and
`painted-water.png` (and an optional standalone backdrop). It does not
retouch, recolor, fabricate terrain, render vector walls or fill arbitrary
regions with mismatched source-image texture.

### Runtime depth order

1. Independently painted **noninteractive** distant scenery; parallax
   permitted. It must not suggest false standable platforms.
2. World-locked water painting and water surface treatment. Its bounds
   remain exactly attached to the simulated fluid volume.
3. **One world-locked, alpha-masked static-solid painting** for all
   collidable rock, ledges and climbable wall bodies, at the same transform
   as code-defined physics; **no per-ledge vector or sprite overlays**.
4. Dynamic actors, creatures, effects, collectibles and interface.
5. Optional independently painted, noninteractive foreground occlusion
   with alpha and parallax.

Only the code-defined physics handles collision. The artwork never changes
reachability, and its solid plane must not parallax.

### Gameplay and visual acceptance gates

- Validate minimum headroom, legal platforms, player/creature jump curves,
  wall-jump inputs, reachable treat/capture positions, swim routes,
  transformation-specific routes, checkpoint/goal reachability and a
  complete input-driven route to the exit.
- The material PNGs must be exactly world-sized and agree with the
  physics. Solid and water alpha may not overlap. Dynamic actors must
  not appear in either painted static layer.
- Reject any painting with visibly implied surfaces that do not exist
  in the collision structure, or invisible obstructions in walkable air.
- At the actual gameplay camera zoom, no visibly upscaled low-resolution
  blocks, discontinuous ledge contours, patch seams, incongruous color
  changes, or floating noncollidable ledges.
- Exercise the real exported HTML in Chromium **and Firefox** with the
  geometry overlay and complete route. A standalone canvas/inspector
  is **not** acceptance evidence.

### Scope of the implementation so far

The exporter and alpha extraction script are implemented and the mask
interfaces are covered by unit tests. **The user-selected second AI
painting is now integrated as a visual prototype** for playable Skywell,
split into three full-world geometry-derived alpha planes. Its generator
source was 1644 × 957, not native 3520 × 2048. Do not claim this resampling
adds high-frequency detail or represents a final high-resolution art pass.
The separate vaulted study still awaits painting aligned to its extra
polygon solids. Full browser acceptance is outstanding.

The compiler now accepts **additional 2D rock polygons**, with player
side, top, and underside collision, and rasterizes those exact polygons in
the semantic guide, water mask and solid alpha mask. They are exercised in
the `skywell-vault-study` authoring candidate; its polygons are **not**
activated in the playable old Skywell because that would create invisible
colliders under its older bitmap. The study's original wall-jump route has
also been simulated end-to-end against polygon collision.

The existing levels still use a single heightfield ground/roof beneath the
new polygons. Fully stacked, independently traversable tunnels **below the
ground heightfield** are not yet modeled. A future polygon-aircutout model
must include real player and creature collision before any art is approved.

Art refinement now uses `refinement/plan.json` and
`stitch-cave-painting.py` to assemble one native-sized composition **before**
applying alpha. The offline HTML build reads explicitly selected assets
from `phaser/assets/generated/approved-cave-art.json`. The playable
Skywell entry now points to the user's chosen Ancient Sanctuary alpha
composition, with all three planes locked to scroll factor 1. The old opaque WebP and its compositor were removed from the working tree;
there is no fallback for Skywell if the selected approved assets are absent.
The vaulted study remains unregistered because its polygon collision
does not match this original painting.

See [CAVE-ART-PIPELINE.md](CAVE-ART-PIPELINE.md) for the exact end-to-end
instructions, including historic PR checkpoints and the current approval gate.
