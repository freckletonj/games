# Grocery Counter

Status: **ready-for-test-drive**, awaiting the user's in-game art review. Reference PNG and original TripoSplat PLY are committed and were verified locally; runtime binary files are delivered separately by ZIP for the user to commit.

Broad oak cabinet base, cream overhanging top, dark corner posts and moss-green trim. Empty countertop; one connected furniture object.

Grocery interior at (-1.65, 0, 1), facing +Z. Authored collision is 1.62 × 1.20 units, height 0.73, fitted to the actual mesh footprint. The counter stays clear of the door and central aisle.

The original PNG and PLY are unchanged. `asset.json` owns the fitted conversion settings. The asset exports at 0.73 game units tall, +Y up, +Z forward, with feet/base at Y=0.

See [runtime/REVIEW.md](runtime/REVIEW.md) for actual visual/game checks and remaining limitations, and [runtime/report.json](runtime/report.json) for geometry counts and hashes. The [batch handoff](../../docs/ASSET_BATCH_02.md) gives extraction and commit instructions. Runtime ZIP delivery is not a Git commit.
