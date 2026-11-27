# Town art reference batch 02

Generated 2026-11-27 for PR #27, branch `codex/adventure-town-playability-polish`. This continues the same transparent image → user TripoSplat → inspected voxel conversion → runtime ZIP workflow.

## Current status: converted and integrated

All six reference hashes and original standard 3DGS PLYs were verified at user commit `a5e68c3a29c3b861757c515a13a94922f7584711`. The four static assets are enabled in town; the grocer and herbalist have individually fitted 15-joint rigs and stand in their respective shops. They use relaxed Idle loops; Walk/Run/Jump are also exported and reviewed. Status is `ready-for-test-drive`, with user art review still pending.

Small code, settings, rig files, reports and review notes are committed by the agent. **Extract the new runtime ZIP at the repository root on this PR branch and commit its contents.** It contains six `assets/<id>/runtime/asset.glb` files, six `review.png` sheets, and the two characters' `motion.png` and four named clip GIFs, all beneath `Adventure Town/`. No source PNG/PLY or unrelated code is overwritten. The separate offline play ZIP contains one self-contained HTML; extract it and double-click to play immediately, with no server or network.

After extracting the runtime ZIP, stage the six asset directories shown in the handoff command below, commit with a runtime-art message and push this PR branch. `runtime/report.json` records each delivered GLB SHA-256. The agent has verified the ZIP bytes, but a delivered ZIP is not a repository commit.

The first eight runtime assets and imported player remain unchanged. There are now twelve static town meshes and two stationary shopkeepers. Floors, walls, doors, collision, navigation and water remain authored.

## Six reference images

| Asset ID | Kind | Target height | Intended use |
| --- | --- | --- | --- |
| grocery-counter | static | 0.73 | Grocery counter at (-1.65, 0, 1); door and central aisle remain clear. |
| apothecary-cabinet | static | 1.4 | Replace the simple side shelving in the potion room; fit against its side wall without covering the workbench or doorway. |
| emberbrook-grocer | humanoid | 1 | Rigged grocery shopkeeper behind the counter at (-1.65, 0, -0.05). |
| emberbrook-herbalist | humanoid | 1 | Rigged potion shopkeeper beside the workbench at (1.85, 0, -1.65). |
| town-lantern | static | 1.55 | Replace existing lamp visuals at their authored town positions, fitting collision separately. |
| plaza-well | static | 1.62 | Replace the existing west-plaza well visual near (-8, 0, 1.65); preserve its authored collision envelope. |

Heights are provisional game units (player height = 1). Each source is a single isolated 1254 × 1254 RGBA image generated with the built-in image tool. Actual prompts are recorded in each `source/PROMPT.md`. The PNGs are unchanged copies of generator output. Visual inspection covered full silhouettes, transparent background/openings, empty-handed A-poses and limb separation. Visible-alpha bounds were checked inside all four canvas edges. Some margins are tighter than requested. Near-zero alpha speckles exist in the output; originals are preserved rather than edited. Image checks cannot establish splat surface coverage, inferred rear geometry or animation quality.

The well's basin and the cabinet shelf openings need special inspection after reconstruction. For characters, inspect arm/torso and crotch gaps before fitting joint positions and region gates.

## Original reference handoff (completed)

The uniquely named reference ZIP contains **only these six PNGs**, with real repository-relative paths. Extract it at the repository root of this PR branch. Small manifests, prompts and docs are committed directly by the agent.

| Reference PNG | Original PLY to return |
| --- | --- |
| `Adventure Town/assets/grocery-counter/source/reference.png` | `Adventure Town/assets/grocery-counter/incoming/model.ply` |
| `Adventure Town/assets/apothecary-cabinet/source/reference.png` | `Adventure Town/assets/apothecary-cabinet/incoming/model.ply` |
| `Adventure Town/assets/emberbrook-grocer/source/reference.png` | `Adventure Town/assets/emberbrook-grocer/incoming/model.ply` |
| `Adventure Town/assets/emberbrook-herbalist/source/reference.png` | `Adventure Town/assets/emberbrook-herbalist/incoming/model.ply` |
| `Adventure Town/assets/town-lantern/source/reference.png` | `Adventure Town/assets/town-lantern/incoming/model.ply` |
| `Adventure Town/assets/plaza-well/source/reference.png` | `Adventure Town/assets/plaza-well/incoming/model.ply` |

In your existing TripoSplat environment, from the repository root:

```sh
python "Adventure Town/tools/generate_splats.py" --weights /path/to/ckpts --dry-run
python "Adventure Town/tools/generate_splats.py" --weights /path/to/ckpts
```

The six new manifests are `awaiting-splat`; the first eight are already `ready-for-test-drive`, so the default queue selects this batch. Existing PLYs are skipped. See [TRIPOSPLAT.md](TRIPOSPLAT.md) for local weight layout and options.

Commit the extracted references plus each original `incoming/model.ply` and `incoming/generation.json` to this PR branch. For example:

```sh
git add -- "Adventure Town/assets/grocery-counter" "Adventure Town/assets/apothecary-cabinet" "Adventure Town/assets/emberbrook-grocer" "Adventure Town/assets/emberbrook-herbalist" "Adventure Town/assets/town-lantern" "Adventure Town/assets/plaza-well"
git commit -m "Add second town reference batch and original TripoSplat outputs"
git push origin codex/adventure-town-playability-polish
```

Generate each reference separately; preserve original standard 3DGS properties. Do not combine images or rename mesh PLYs into Gaussian inputs. A ZIP delivery is not a Git commit. The six PNGs/PLYs and generation records are now confirmed committed at the intake revision above.

## Reference integrity

| Asset ID | PNG SHA-256 |
| --- | --- |
| grocery-counter | `0057d69c92ee1ee7977f915cbe45c89e95f8740c54bce7373f70b82d0a49d30c` |
| apothecary-cabinet | `6f9c76014e6d40636c16d6256318e0532555f0f536f49ace33b5725b5d8e2b24` |
| emberbrook-grocer | `bb515de1b60ca49cf7cbb1804e8c49d05101c57eeedeb594eb44cfb931376f4c` |
| emberbrook-herbalist | `9d5033001f396b20d70a1b6dc405e7803afaed30ec9f3eb924bb98c33d27ed9d` |
| town-lantern | `c91ef00c4131de5c77ad9f052a537c8ee16d00332c1beccf88dad08e0379f926` |
| plaza-well | `a7d6e91caf7836a8ec77a891c46099c9572b88e2720a47b10a4399b007d53f37` |

The ZIP was checked for exactly six PNG entries, CRC integrity and these byte hashes. Pixel checks establish RGBA alpha range 0–255 and non-clipped visible geometry; they do not prove the image-to-3D result.

## Agent intake after user commit

Read the committed branch head and download PNG/PLY bytes directly to local files; never emit binary/base64 payloads through GitHub tools into conversation context. Verify the source PNG hashes above, inspect the actual PLY header and Gaussian fields, then inspect orientation, bounds, floaters and gaps.

The original reference-only handoff omitted conversion settings and humanoid rigs. Both are now fitted against the inspected PLYs and committed beside each asset. Build candidates into new `experiments/<id>-<attempt>/` paths. Audit GLBs and review multi-angle mesh/splat comparisons. For the two humanoids, fit each rig separately and watch full Idle/Walk/Run/Jump cycles before NPC integration. Keep the existing player and deferred experiment unchanged.

The original reference handoff did not include runtime paths, meshes or NPC placement. The current conversion now enables the four static meshes and two idle shopkeepers as described above. After conversion and in-game review, commit small settings/code/reports directly and deliver GLBs/review images in another uniquely named repository-path ZIP plus a standalone offline HTML for immediate testing. User commits the binary outputs.
