# Creating a character

The pipeline is image-driven: generate transparent multiview art, reconstruct a static voxel volume, assign a skeleton and skin weights, export animation clips and inspect the resulting mesh. Humanoid and quadruped rigs are supported. It currently requires human or LLM-guided per-character rig configuration; it is not automatic skeletal inference.

## 1. Create the source

Make a new folder such as `characters/ranger/` with a `source/` subdirectory. Use [ACQUISITION.md](ACQUISITION.md) to generate a turntable, and place the accepted file there as `turntable.gif` (animated GIF) or `turntable.png` (transparent uniform spritesheet). Keep the generation prompt and optional reference/contact sheet beside it. Do not rename a static contact sheet to a GIF. The compiler reads actual image content, not just file extensions.

## 2. Configure reconstruction

Copy only the adventurer's `character.json` and `source/rig.json` as starting templates, not her art or generated assets. Set a unique `id` and display `name`. Paths are relative to the new character directory. Example manifest for an evenly spaced 4×4 transparent sheet:

```json
{
  "id": "ranger",
  "name": "Ranger",
  "source": "source/turntable.png",
  "rig": "source/rig.json",
  "reconstruction": {
    "height": 64,
    "agreement": 0.94,
    "elevation": 5,
    "rows": 4,
    "cols": 4
  }
}
```

Omit `angles` only for evenly spaced observations starting at the front. Otherwise set `angles` to a list of degrees in frame order, one value per image. GIF frames are decoded directly, independent of `rows` and `cols`; static sheets are split according to those settings. A duplicate 360° endpoint is excluded by the compiler if annotated as such. All views currently use one elevation. `height` controls nominal grid resolution, not final model height (approximately two world units). Prefer 64 until a higher resolution passes validation.

`agreement` is the fraction of masks that must support a voxel, rounded up. With 16 views, 0.94 means 16/16; 0.90 means 15/16. A small silhouette-distance tolerance is applied before voting. Relaxing the threshold may help inconsistent images but can overfill gaps. Tune against held-out views or visual comparisons rather than simply maximizing training-view IoU.

## 3. Fit the rig

`source/rig.json` defines the shared 15-joint humanoid naming scheme, parent relationships, normalized rest joint positions, anatomical weight gates, and an optional `arm_gap` correction. Keep parent joints before children in JSON order. The runtime expects `idle`, `walk` and `attack` clip names.

Joint coordinates are fractions of actual reconstructed height: X is horizontal (positive toward the character's left), Y points up from the floor, Z points forward. Inspect front and side images and the reconstruction to place hips, knees, ankles, shoulders, elbows, wrists, chest and head. Adjust the `gates` ranges to match the new silhouette: head/upper/leg are height ranges; arm_x measures absolute horizontal distance from center; arm_bottom/arm_top limit the arm region vertically. The weight function also includes a fixed rear-body exclusion to reduce backpack/arm mixing; inspect that behavior for different characters.

For a four-legged character, use `characters/cat/source/rig.json` as the rig
template and set `type` to `quadruped`. Keep the configured 17-joint naming
scheme and refit every joint and weight gate. `head_y`/`head_z` isolate the
head; `tail_y`/`tail_z` isolate the rear raised tail; `tail_tip` blends its two
joints; `leg_y` separates legs from trunk; `chest_z` separates front and rear
regions. These ranges are fractions of reconstructed height, with smooth
transitions between their two endpoints. Quadrupeds export `idle` and `walk`,
which are the clips used by the companion runtime. The humanoid player also
requires `attack`. Adapt the acquisition rest pose to a fixed four-paw stance
with visible leg clearance rather than using a humanoid A-pose.

The adventurer's optional `arm_gap` cuts small bilateral slits through the visual hull at the specified normalized heights and X offsets; its values are not universal anatomy. Remove this field when the new source already has good arm clearance. If retained, refit it to the new silhouette. It is a heuristic, not recovered hidden geometry.

To inspect static geometry before skinning, run from the root (replace paths and settings to match the manifest):

```sh
python tools/asset_pipeline/geometry/reconstruct.py characters/ranger/source/turntable.png --out experiments/ranger-static --height 64 --rows 4 --cols 4 --agreement .94 --elevation 5
```

Pass `--angles` followed by values for uneven views; pass `--rig-config characters/ranger/source/rig.json` to include an optional arm gap in the static test. Then refine the rig file as needed.

## 4. Build and review

```sh
python tools/asset_pipeline/build_character.py characters/ranger
```

Inspect `generated/segmentation.png`, `preview.png`, `reconstruction.gif` and `rig_preview.png`. Compare face, hair, silhouette, rear accessories and the limbs from oblique angles against the source. Review `idle.gif`, `walk.gif` and `attack.gif` for deformation, slipping, intersections and attachment errors. Read `report.json` and `rig_metrics.json`; require finite data, valid indices and normalized weights, close rest-pose/palette agreement, consistent winding and a watertight position-welded mesh. The numerical audit does not establish collision-free poses, physical foot contacts, or artistic quality. Inspect motion visually as well.

Once approved, use `generated/character_animated.glb` in the game. For a quick test, change the character GLB import in `game/main.js` to the new path. The static `character.glb` is available for geometry inspection. There is no character-selection UI yet.

## 5. Commit an approved character

Commit the source, its manifest, rig configuration, documented prompt, and approved `generated/` files. Keep temporary builds in `experiments/`; only change the canonical source deliberately. The shared compiler should not contain character names, custom angle tables, or geometry corrections specific to an individual character. If a change to the algorithm is necessary, rerun the existing adventurer benchmark as well as the new character.
