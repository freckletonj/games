# Town art reference batch 02

Generated 2026-11-27 for PR #27, branch `codex/adventure-town-playability-polish`. This continues the same transparent image → user TripoSplat → inspected voxel conversion → runtime ZIP workflow.

## Six reference images

| Asset ID | Kind | Target height | Intended use |
| --- | --- | --- | --- |
| grocery-counter | static | 0.73 | Replace the simple grocery counter at (-1.3, 0, 1.0); preserve door and central aisle clearance. |
| apothecary-cabinet | static | 1.4 | Replace the simple side shelving in the potion room; fit against its side wall without covering the workbench or doorway. |
| emberbrook-grocer | humanoid | 1 | Future grocery shopkeeper; fit placement to the counter while leaving the walking aisle open. |
| emberbrook-herbalist | humanoid | 1 | Future potion shopkeeper; stand beside the workbench with clear access to the room entrance. |
| town-lantern | static | 1.55 | Replace existing lamp visuals at their authored town positions, fitting collision separately. |
| plaza-well | static | 1.62 | Replace the existing west-plaza well visual near (-8, 0, 1.65); preserve its authored collision envelope. |

Heights are provisional game units (player height = 1). Each source is a single isolated 1254 × 1254 RGBA image generated with the built-in image tool. Actual prompts are recorded in each `source/PROMPT.md`. The PNGs are unchanged copies of generator output. Visual inspection covered full silhouettes, transparent background/openings, empty-handed A-poses and limb separation. Visible-alpha bounds were checked inside all four canvas edges. Some margins are tighter than requested. Near-zero alpha speckles exist in the output; originals are preserved rather than edited. Image checks cannot establish splat surface coverage, inferred rear geometry or animation quality.

The well's basin and the cabinet shelf openings need special inspection after reconstruction. For characters, inspect arm/torso and crotch gaps before fitting joint positions and region gates.

## User handoff

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

Generate each reference separately; preserve original standard 3DGS properties. Do not combine images or rename mesh PLYs into Gaussian inputs. A ZIP delivery is not a Git commit. At the time these notes are written, the six new PNGs/PLYs are not confirmed committed.

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

Conversion settings and humanoid rig files are intentionally absent from this reference-only handoff. Fit them only after inspecting each actual PLY. Build candidates into new `experiments/<id>-<attempt>/` paths. Audit GLBs and review multi-angle mesh/splat comparisons. For the two humanoids, fit each rig separately and watch full Idle/Walk/Run/Jump cycles before NPC integration. Keep the existing player and deferred experiment unchanged.

No new runtime paths, meshes, NPC behavior or gameplay changes are included in this reference batch. After conversion and in-game review, commit small settings/code/reports directly and deliver GLBs/review images in another uniquely named repository-path ZIP plus a standalone offline HTML for immediate testing. User commits the binary outputs.
