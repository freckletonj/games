# Emberbrook Herbalist

Status: **ready-for-test-drive**, awaiting the user's in-game art review. Reference PNG and original TripoSplat PLY are committed and were verified locally; runtime binary files are delivered separately by ZIP for the user to commit.

Friendly silver-haired herbalist in cream sleeves, a lavender vest with moss trim, green trousers and brown boots. Empty-handed A-pose with separate legs; no skirt or loose accessories.

Potion room at (1.85, 0, -1.65), yaw -0.35 beside the workbench. A separate authored 0.40 × 0.40 collision envelope leaves the central approach clear.

The original PNG and PLY are unchanged. `asset.json` owns the fitted conversion settings, and `rig.json` owns this character’s skeleton and weight/pose settings. The asset exports at 1 game units tall, +Y up, +Z forward, with feet/base at Y=0.

See [runtime/REVIEW.md](runtime/REVIEW.md) for actual visual/game checks and remaining limitations, and [runtime/report.json](runtime/report.json) for geometry counts and hashes. The [batch handoff](../../docs/ASSET_BATCH_02.md) gives extraction and commit instructions. Runtime ZIP delivery is not a Git commit.
