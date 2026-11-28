# emberbrook-herbalist: conversion review

**ready-for-test-drive** — structural and agent visual/game review completed; user art acceptance remains pending.

## Provenance and conversion

Read from user commit `a5e68c3a29c3b861757c515a13a94922f7584711`. The unchanged source PNG matches both the handoff and `generation.json` hashes. The original binary little-endian vertex-only PLY contains 65,536 standard 3DGS Gaussians: logit opacity, logarithmic scales and WXYZ source quaternions. No crop or fabricated hidden geometry was applied.

The inspected upright/front mapping is `[x,y,z] → [z,-y,x]`. This asset uses 64 height samples, a 0.25-voxel filter, accumulated opacity at threshold 0.5, fourth-power local color weighting and 32 color levels. It exports 25,448 vertices and 12,724 triangles, with Idle/Walk/Run/Jump clips. Exact source/config/rig/runtime/converter hashes and bounds are in `report.json`. Promotion changes status/notes only; the static candidate's original config digest is retained as `build_config_sha256`.

`review.png` compares the original PNG, an orthographic DC Gaussian alpha composite, and actual WebGL front/oblique/side/rear mesh views. The source composite projects oriented covariance with a three-sigma cutoff; it omits higher SH and perspective. It is not a point-cloud projection or a claim of exact training-render fidelity.

## In-game placement

Potion room at (1.85, 0, -1.65), yaw -0.35 beside the workbench. A separate authored 0.40 × 0.40 collision envelope leaves the central approach clear.

Actual Chromium checks covered HTTP and embedded offline/no-network play, desktop movement and camera, mobile doors/touch, all three interior types, both shop interactions and bank-to-bank swimming. The current player remains the unchanged imported Emberbrook runtime. The six new GLBs passed structural checks for packed data, winding and normals, bind transforms, skin weights and clip structure. Browser rendering was software-backed; it is not a device frame-rate guarantee.

## Rig and motion

This asset has 15 fitted joints and four normalized byte weights per vertex. Joint positions and gates were fitted against its actual voxel geometry. `arm_rest_angle` lowers the reconstruction A-pose for Idle. The lower arm gate includes fingertips and excludes apron/waist corners; `arm_transition_height` makes that boundary continuous. A fitted shoulder blend joins sleeve and torso weights, and `hip_blend_height` joins the trousers to the pelvis. These settings live in this asset's rig file.

All Idle/Walk/Run/Jump cycles were sampled and rendered through the real game skinning code, 24 WebGL frames per clip. `motion.png` shows key phases; the four named GIFs show full loops. Same-side leg weights, loop closure and finite geometry are checked in `tests/characters.mjs`. Maximum sampled edge stretch is 2.112×, below the 3× regression limit; this is a guard against spikes, not a claim of distortion-free skinning.

## Remaining art limitations

Face, gray bob, lavender vest and trousers remain readable. The relaxed Idle is used in the game. Walk/Run/Jump are in-place procedural clips, not trained motion or foot-locked locomotion. Small sleeve/hip creases remain at extreme phases.

The four static assets are enabled in `game/town-assets.js`; shopkeepers are placed by `game/town-characters.js`. NPCs are stationary and use a slow Idle, skinned at 10 Hz; they do not add trading, quests or roaming AI. Extract and commit the runtime ZIP before source play/build. The separate offline play ZIP already embeds all assets.
