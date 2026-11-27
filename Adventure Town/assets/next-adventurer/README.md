# Next adventurer: first TripoSplat round trip

Status: **awaiting-splat**. The transparent reference is generated and ready.
It depicts a copper-haired adventurer with a teal scarf, cream shirt, brown vest,
trousers and boots. The A-pose separates the arms from the body and the boots
from each other. It is a new candidate, not a reconstruction of the Emberbrook
character, and is not yet used by the game.

Use `source/reference.png` as the TripoSplat input. Commit the uncompressed
Gaussian export to **`Adventure Town/assets/next-adventurer/incoming/model.ply`**.
Retain all Gaussian fields. If known, record the TripoSplat version and export
settings in `incoming/README.md`. The agent will then inspect the actual header,
orientation, bounds and anatomy before fitting the conversion.

`asset.json` and `rig.json` are starting settings only. The initial rig uses
normalized joint positions with a four-weight segment fit and region gates;
these must be fitted after the voxelized splat exists. Do not promote its output
just because it validates structurally. The source prompt is recorded verbatim
in `source/PROMPT.md`. The alpha channel was checked to contain transparent and
opaque pixels with separated silhouette gaps.
