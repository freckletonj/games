# flintfist: batch 03 review

Reviewed 2026-11-27 from the user's original PLY at `1f0bb0122c7e606722175a37d9edf7ad4c1cfa52`. Source PNG/PLY bytes are unchanged. Status: **ready-for-test-drive**, pending user art approval.

Befriendable rock bear and playable push/punch form for the optional ruin obstacles.

`review.png` compares the reference, original Gaussian DC alpha composite, and fitted mesh front/side/back/oblique. The original composite uses its intake facing; animal fitting may rotate the final mesh. Actual software WebGL mesh views were inspected. Motion sheets and full-cycle GIFs contain 12 actual WebGL frames per clip. Clips: Idle, Walk, Run, Jump, Push, Punch. Mesh: 19,476 triangles. Exact source/config/rig/runtime hashes are in `report.json`; `conversion_config_sha256` records the candidate manifest before promotion metadata changed.

Broad shoulders and short legs have individually fitted soft weights. Push and punch are modest procedural gestures, not authored contact animation; object contact timing is controlled by gameplay. Small voxel creases and foot drift remain.

The offline game and HTTP source were exercised for entrances, shop clearance, movement, swimming and mobile controls. The real controller tests cover all four feed/catch/form encounters, safe dimensions, pause/expiry, missed/blocked orbs, the second-jump landing, wingbeat limits, diving and physical push/punch colliders. Keyboard and touch friendship plus the garden landing were also exercised in Chromium. Standard-pad actions are tested with simulated input; no physical pad was available. These checks do not establish final art quality or target-device performance.

Extract the runtime handoff ZIP at the repository root, then commit its binary files on PR #27's branch. Small text files are committed separately. The standalone play ZIP already embeds these exact GLBs.
