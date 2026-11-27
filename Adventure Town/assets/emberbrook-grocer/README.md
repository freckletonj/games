# Emberbrook grocer

Status: **awaiting-splat**. Reference image generated; PNG delivery is not a repository commit or a converted runtime model.

Friendly dark-haired, moustached grocer in a cream shirt, moss waistcoat, short tan apron, brown trousers and boots. Empty-handed A-pose, separate legs and clear arm/torso gaps.

Intended placement: Future grocery shopkeeper; fit placement to the counter while leaving the walking aisle open.

Target height is one game unit, +Y up and +Z forward, feet at Y=0. A-pose is a reconstruction input, not an animated pose. After the original PLY arrives, inspect orientation, floaters and limb separation, then fit every joint and region in a new rig.json to that asset. Use the existing humanoid pipeline and audit Idle/Walk/Run/Jump; do not reuse a guessed universal rig. NPC placement/controller work follows successful mesh and motion review.

The manifest currently supplies image-to-splat routing only. Conversion settings and rig are intentionally absent until actual PLY inspection; do not run voxel conversion yet.

Extract the reference ZIP at the repository root. Keep `source/reference.png` unchanged, generate its own splat and commit `incoming/model.ply` plus `incoming/generation.json`. Preserve the original standard 3DGS Gaussian fields. See [the next asset batch](../../docs/ASSET_BATCH_02.md) and [the full backlog](../../docs/ASSET_BACKLOG.md).
