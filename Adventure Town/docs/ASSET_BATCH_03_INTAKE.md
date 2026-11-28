# Batch 03 PLY intake

Verified against user commit `1f0bb0122c7e606722175a37d9edf7ad4c1cfa52`. All nine original PLYs contain 65,536 standard 3DGS vertices. All source PNG hashes match both the intake manifests and generation records. Source bytes remain unchanged.

| Asset | Original PLY SHA-256 |
| --- | --- |
| shop-wall-panel | `b2377bc876b2541fcef4aa45abb56fd3ed36e1d0d60c00b0e8acdb531a29c646` |
| emberbrook-gardener | `fb79cde55bb92013efe9eeb59596c16e3bf49d3bfd8e4e0b9281b3d91465d974` |
| springaroo | `b71ff700022cec2959df9558aa6299e1db83a2e57efd6ee8ba2d4acaf207fbd0` |
| tidefox | `a0696277f6f1bfdef584f88cab3cd0237cf4bc2d2e3a7ec0510f6563e5744920` |
| moonwing | `23eaf32120885139268028ecd7f1cb4297a942b42ee995fa47bb80e1544fe6a2` |
| flintfist | `2e90d6a0d476d4d122b448aac57a58a9e2853062954b8021a36e991d6c4ae307` |
| blushberry-bush | `32a63ca73de33daedb6a9239a4834fbfc7b3254c875898f33b66108a7eeff2de` |
| friendship-orb | `4058e05cdebfd0f7ce1116bea085525bf20bc7208a15601805162a4c3e5d3472` |
| town-bench | `ba5f75dda38298ed3c064414b8f8cc137b18f38f5fcd2561c438304db6936c37` |

Gaussian DC-color composites were inspected from front, back, side and oblique views. The gardener, Tidefox, Moonwing, rock bear and props have readable reconstructed silhouettes. Springaroo needs a fitted facing rotation and removal of stray rear geometry through explicit per-asset cropping; inferred rear geometry remains an approximation. The orb has a dark inferred rear. These limitations must be reviewed in the voxel candidate before runtime promotion.

Conversion settings are provisional. New quadruped and bird rig fits and animation support are in progress. Runtime paths remain null until review. Existing game tests passed before batch integration.
