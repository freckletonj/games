# Ginger Cat

A small ginger tabby sidekick, reconstructed from AI-generated transparent
multiview art. Cream paws and muzzle, green eyes, dark orange stripes and an
upright hooked tail keep the silhouette readable beside the adventurer.

The game loads `generated/character_animated.glb` at 45% scale (about 0.88 world
units tall). The cat trots toward the adventurer when separated by more than
1.5 units and rests at 1.1 units. This is a companion for the open test ground;
there is no obstacle navigation or combat behavior.

## Source and rebuild

`source/turntable.png` is the unmodified generated RGBA 4×4 sheet. The actual
submitted prompt and acquisition settings are in `source/PROMPT.md`. The views
are fixed standing poses, with visually estimated camera angles recorded in
`character.json`. No interpolated images were counted as extra observations.

From `Adventure Town/`, with the pipeline requirements installed:

```sh
python tools/asset_pipeline/build_character.py characters/cat
python tools/asset_pipeline/validate_rig.py characters/cat/generated
```

`source/rig.json` selects the quadruped rig: pelvis, chest, head, two tail
joints and three joints per leg. Anatomical weight gates keep the head and tail
separate from the four legs. `idle` and `walk` are procedural clips; the source
sheet does not contain motion. The walk clip uses alternating diagonal paws.

## Baseline and limitations

The 64-voxel build contains 63,487 occupied voxels and 36,592 triangles. Mean
source-view silhouette IoU is 0.899, and 95.5% of surface colors are sampled
directly from the source. The welded surface is watertight with consistent
winding. Rest-pose error is below 5e-8 and the exported animation palette error
is below 4e-8; all indices are in range and weights sum to one within 1.2e-7.

The source views vary slightly in markings, framing and tail shape. The visual
hull softens the cubic source details, particularly the tail curl and underside,
and single-elevation acquisition cannot recover hidden concavities. Preview
and motion sheets were inspected, but the rig audit does not establish
collision-free poses or planted feet. The trot can slide on the ground; it is
a procedural companion animation, not motion capture or foot IK.

The [depth trial and expanded rig assessment](../../docs/depth-trial-20261124/README.md)
find significant stance drift and local mesh stretching. This is a prototype
rig, not a polished animation rig. Generated depth did not fix the tail in
that trial; the shipping model has not been replaced by those worse candidates.
