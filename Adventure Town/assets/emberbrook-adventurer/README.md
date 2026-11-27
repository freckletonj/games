# Emberbrook adventurer

Status: **imported-runtime**. `runtime/asset.glb` is the binary GLB extracted from
the embedded base64 in the user-supplied `emberbrook_playable_v1(1).html`, without
modification. SHA-256: `3127d8b6663a4e45f5b483a136b4fcd82ce2937231bc171b402f862bea8234d1`.

The model has 6,782 vertices, 3,682 triangles, 15 joints, vertex colors, normalized
byte skin weights, inverse bind matrices, and Idle/Walk/Run/Jump clips. The game
uses the model's exact positions, normals, colors, weights and animation keys.

The original reference image, source Gaussian PLY and conversion implementation
were not supplied. No source image or PLY is invented here; this imported asset
proves that the runtime can play the provided rigged voxel model. It does not
prove that the new converter reproduces it. Replace only after another asset has
passed the workflow in the project AGENTS.md.
