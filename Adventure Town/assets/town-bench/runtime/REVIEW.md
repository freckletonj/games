# town-bench: batch 03 review

Reviewed 2026-11-27 from the user's original PLY at `1f0bb0122c7e606722175a37d9edf7ad4c1cfa52`. Source PNG/PLY bytes are unchanged. Status: **ready-for-test-drive**, pending user art approval.

Two public benches with separate authored collision.

`review.png` compares the reference, original Gaussian DC alpha composite, and fitted mesh front/side/back/oblique. The original composite uses its intake facing; animal fitting may rotate the final mesh. Actual software WebGL mesh views were inspected. Clips: none (static). Mesh: 6,612 triangles. Exact source/config/rig/runtime hashes are in `report.json`; `conversion_config_sha256` records the candidate manifest before promotion metadata changed.

Back and seat edges are reconstructed approximately. The separate authored collision is deliberately simple. No seating animation is implemented.

The offline game and HTTP source were exercised for entrances, shop clearance, movement, swimming and mobile controls. The real controller tests cover all four feed/catch/form encounters, safe dimensions, pause/expiry, missed/blocked orbs, the second-jump landing, wingbeat limits, diving and physical push/punch colliders. Keyboard and touch friendship plus the garden landing were also exercised in Chromium. Standard-pad actions are tested with simulated input; no physical pad was available. These checks do not establish final art quality or target-device performance.

Extract the runtime handoff ZIP at the repository root, then commit its binary files on PR #27's branch. Small text files are committed separately. The standalone play ZIP already embeds these exact GLBs.
