# Pipeline design and status

The reusable compiler in `tools/asset_pipeline/` has four stages:

1. `geometry/reconstruct.py`: decode transparent frames, segment alpha, estimate orthographic camera scale/translation from silhouette and boots, carve a supported voxel volume, repair edge-only contacts and fuse surface colors. The result is a vertex-colored, unlit static GLB. The color source is already lit, so the unlit export avoids double lighting.
2. `build_rig.py` and `rig.py`: consume the occupancy and color arrays, construct a 15-joint humanoid rig or a 17-joint quadruped rig (`quadruped.py`) from character settings, calculate four skin weights per vertex, generate procedural test clips and export a skinned GLB. The mesh uses +Y up and +Z forward. The exported character is approximately 2 units tall; the runtime scales the cat to companion size.
3. `validate_rig.py`: compare exported accessors, inverse-bind matrices, sampled transforms and weights with the offline rig data. Build metrics additionally check the position-welded topology and rest pose.
4. `preview.py` and the build scripts: render static and animated inspection images from the real geometry. The game consumes only the animated GLB, never the source GIF or NPZ caches.

## Current constraints

- The visual hull cannot recover fully occluded concavities. Dense single-elevation views help but do not eliminate ambiguity.
- Camera angles are annotated estimates. Per-frame scale and translation are heuristic, not a full calibration. The pipeline does not yet combine different elevations.
- Color fusion can blur eyes and clothing details; alpha fringes and inconsistent generated art can contaminate color.
- Joint locations and skinning gates are configured per character. Arm clearance is optional and can distort the geometry. The quadruped skinning model assumes four separated legs and a raised rear tail; other anatomies need a different rig configuration or model.
- Idle, walk and the humanoid attack are procedural tests, not motion inferred from AI-generated GIFs. The older GIF motion extraction system has not been ported into the current exporter. The cat follows directly in the open test ground; there is no hit detection, physics, inventory, obstacle navigation or enemy AI in the game.
- Silhouette IoU is image-space agreement, not ground-truth 3D accuracy. The rig audit does not check all continuous interpolated poses or detect collisions.

## Development priorities

Keep the adventurer fixed as a reproducible benchmark while improving color correspondence, camera calibration, acquisition density, elevated-view reconstruction and semantic part separation. Improve skinning and pose validation before integrating motion-reference GIF fitting. When adding new character types, prefer general algorithm improvements and explicit per-character configuration over baked-in fixes.

The runtime is intentionally small and separable from asset tooling. New gameplay code belongs in `game/`; assets and source art belong in `characters/`. No live AI service or Python process is needed at game runtime.

## Research follow-up

Depth, correspondence and alternative-meshing experiments did not establish a
robust replacement for the compiler. Their conclusions, archived evidence and
planned local service live in [asset-tools](../../asset-tools/README.md#existing-research).
The game has no learned-model dependencies.

## Verification

Both committed characters pass the independent rig audit. The cat's
`generated/motion_metrics.json` additionally records substantial stance drift
and local stretching; use `assess_quadruped.py` and inspect rebuilt motion GIFs
when evaluating a refit. A valid GLB is not animation-quality approval.

The canonical adventurer rebuild reproduces the committed occupancy/color
cache, reports, rig preview and three motion GIFs byte-for-byte. Rig arrays
differ only by at most 5.96e-8 in linear colors under the installed numerical
dependencies. Her source art and committed outputs are unchanged.

`npm test` exercises the actual runtime movement and animation code and loads
both GLBs with Three.js, replacing only rendering, DOM APIs and the clock.
It and `npm run build` pass. Browser rendering and continuous collision/contact
validation remain unverified.
