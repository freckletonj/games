# Pipeline design and status

The reusable compiler in `tools/asset_pipeline/` has four stages:

1. `geometry/reconstruct.py`: decode transparent frames, segment alpha, estimate orthographic camera scale/translation from silhouette and boots, carve a supported voxel volume, repair edge-only contacts and fuse surface colors. The result is a vertex-colored, unlit static GLB. The color source is already lit, so the unlit export avoids double lighting.
2. `build_rig.py` and `rig.py`: consume the occupancy and color arrays, construct a shared 15-joint humanoid rig from character settings, calculate four skin weights per vertex, generate procedural test clips and export a skinned GLB. The mesh uses +Y up and +Z forward. The exported character is approximately 2 units tall.
3. `validate_rig.py`: compare exported accessors, inverse-bind matrices, sampled transforms and weights with the offline rig data. Build metrics additionally check the position-welded topology and rest pose.
4. `preview.py` and the build scripts: render static and animated inspection images from the real geometry. The game consumes only the animated GLB, never the source GIF or NPZ caches.

## Current constraints

- The visual hull cannot recover fully occluded concavities. Dense single-elevation views help but do not eliminate ambiguity.
- Camera angles are annotated estimates. Per-frame scale and translation are heuristic, not a full calibration. The pipeline does not yet combine different elevations.
- Color fusion can blur eyes and clothing details; alpha fringes and inconsistent generated art can contaminate color.
- Joint locations and skinning gates are configured per character. Arm clearance is optional and can distort the geometry. The skinning model is humanoid-specific.
- Idle, walk and attack are procedural tests, not motion inferred from AI-generated GIFs. The older GIF motion extraction system has not been ported into the current exporter. There is no hit detection, physics, inventory, navigation or enemy AI in the game.
- Silhouette IoU is image-space agreement, not ground-truth 3D accuracy. The rig audit does not check all continuous interpolated poses or detect collisions.

## Development priorities

Keep the adventurer fixed as a reproducible benchmark while improving color correspondence, camera calibration, acquisition density, elevated-view reconstruction and semantic part separation. Improve skinning and pose validation before integrating motion-reference GIF fitting. When adding new character types, prefer general algorithm improvements and explicit per-character configuration over baked-in fixes.

The runtime is intentionally small and separable from asset tooling. New gameplay code belongs in `game/`; assets and source art belong in `characters/`. No live AI service or Python process is needed at game runtime.

## Repository migration validation

The reorganized build was run from the game root into a separate output directory using Python 3.13.5. The static GLB, animated GLB, reconstruction report and rig metrics matched the prior v12 baseline byte-for-byte, and the separate rig audit completed successfully. The source GIF also matches the original archive byte-for-byte. The game JavaScript passed `node --check game/main.js`; the browser runtime and Vite build were not tested because the npm registry was unreachable in the packaging environment. Run `npm install`, `npm run dev` and `npm run build` locally before treating the runtime as verified. Commit the resulting npm lockfile after the first successful install.

## Monorepo integration verification

The imported project now lives in `Adventure Town/`. Its production Vite build
passes after dependency installation; `package-lock.json` records the resolved
versions. Run all asset-pipeline commands from the game directory.
