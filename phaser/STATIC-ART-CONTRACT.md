# Code-defined interaction, coherent painted scenery

This is the replacement authoring contract for new painted cave levels.
The earlier Skywell **low-resolution source → resize → tint rock/water →
paint isolated vector ledges** compositor is a visual draft and is **not**
the target pipeline. It produces inconsistent texture scale and scenery
that does not faithfully depict the physical construction.

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

For Skywell, this writes under `dist/cave-guides/skywell-ascent/`:

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
interfaces are covered by unit tests. **No newly approved high-resolution
coherent painted scene exists yet.** The current game runtime still loads
the legacy opaque Skywell WebP. Do not present it as proof of this improved
art pipeline. A subsequent art pass must replace the legacy painting
with the actual baked RGBA layers and run the browser acceptance gates.

The current compiler is also limited to one ground and ceiling height
per X and one-way shelves. To support overlapping cave tunnels or organic
rock bridges, the next geometry representation should support explicit
rock **polygons** and collision surfaces, then rasterize those same
polygons for image conditioning. Do not simulate complicated caves by
inventing decorative platforms with no physical correspondence.
