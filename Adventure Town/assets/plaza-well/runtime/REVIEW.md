# plaza-well: conversion review

**ready-for-test-drive** — structural and agent visual/game review completed; user art acceptance remains pending.

## Provenance and conversion

Read from user commit `a5e68c3a29c3b861757c515a13a94922f7584711`. The unchanged source PNG matches both the handoff and `generation.json` hashes. The original binary little-endian vertex-only PLY contains 65,536 standard 3DGS Gaussians: logit opacity, logarithmic scales and WXYZ source quaternions. No crop or fabricated hidden geometry was applied.

The inspected upright/front mapping is `[x,y,z] → [z,-y,x]`. This asset uses 32 height samples, a 0.25-voxel filter, accumulated opacity at threshold 0.5, fourth-power local color weighting and 32 color levels. It exports 23,816 vertices and 11,908 triangles, without any rig or invented animation. Exact source/config/rig/runtime/converter hashes and bounds are in `report.json`. Promotion changes status/notes only; the static candidate's original config digest is retained as `build_config_sha256`.

`review.png` compares the original PNG, an orthographic DC Gaussian alpha composite, and actual WebGL front/oblique/side/rear mesh views. The source composite projects oriented covariance with a three-sigma cutoff; it omits higher SH and perspective. It is not a point-cloud projection or a claim of exact training-render fidelity.

## In-game placement

West plaza at (-8, 0, 1.65). The existing authored stone-ring collision remains; the visual footprint is approximately 1.19 × 1.19 units.

Actual Chromium checks covered HTTP and embedded offline/no-network play, desktop movement and camera, mobile doors/touch, all three interior types, both shop interactions and bank-to-bank swimming. The current player remains the unchanged imported Emberbrook runtime. The six new GLBs passed structural checks for packed data, winding and normals. Browser rendering was software-backed; it is not a device frame-rate guarantee.

## Remaining art limitations

The roof, posts and recessed basin survive without invented infill. The rear basin is dark in the source too. Small roof/stone steps soften in the voxel mesh. This is scenery, not an enterable shaft or a water simulation.

The four static assets are enabled in `game/town-assets.js`; shopkeepers are placed by `game/town-characters.js`. NPCs are stationary and use a slow Idle, skinned at 10 Hz; they do not add trading, quests or roaming AI. Extract and commit the runtime ZIP before source play/build. The separate offline play ZIP already embeds all assets.
