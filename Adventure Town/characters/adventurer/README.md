# Adventurer — canonical character

The orange-haired adventurer is the only current character. Her original transparent 16-frame turntable is the canonical appearance. All generated geometry comes from that reference; no previous character's images, meshes or animations are included.

## Files

- `character.json`: baseline reconstruction parameters and approximate azimuth annotations specific to this GIF.
- `source/turntable.gif`: unchanged original reference, 16 frames at 313×313 pixels.
- `source/contact.png`: inspection contact sheet of the same reference.
- `source/rig.json`: normalized 15-joint rest positions, anatomical gates and arm-clearance parameters fitted to this character.
- `source/PROMPT.md`: character appearance description and prompt specification.
- `generated/character_animated.glb`: game-ready candidate with idle, walk and attack test clips.
- `generated/character.glb`: static mesh; `volume.npz` and `rig.npz`: reproducible reconstruction/rig intermediates.
- `generated/report.json`, `rig_metrics.json`: numerical validation; PNG/GIF files: real geometry and animation previews.

## Baseline (64 voxels)

| Metric | Value |
| --- | --- |
| Occupied voxels | 22,328 |
| Triangles | 19,196 |
| Mean input-view silhouette IoU | 92.22% |
| Direct color coverage | 98.26% |
| Joints / procedural clips | 15 / 3 |
| Position-welded mesh watertight | Yes |
| Winding consistent | Yes |
| Maximum palette error | 7.92e-8 |

See the JSON reports for exact values. The 96-voxel static experiment previously had 92.96% IoU, but is not part of this approved baseline. Arm/waist intersections during larger poses and blurred face detail remain known limitations. The procedural animations are rig tests; they are not extracted from an AI motion reference.

From the `Adventure Town/` directory, run `python tools/asset_pipeline/build_character.py characters/adventurer` to rebuild. Do not overwrite the source GIF when experimenting.
