# cottage-hearth: first real voxel review

Status: **ready-for-test-drive**, user art acceptance pending.

The input is the user-committed 65,536-Gaussian TripoSplat PLY, not a synthetic
fixture or hand-built replacement. Reference hash matches `generation.json`.
Original PNG/PLY bytes are unchanged. The report records source/config/runtime
SHA-256 hashes, occupied cells, mesh counts and bounds.

The per-asset rotation maps source `[x,y,z]` to game `[z,-y,x]`. No crop was
needed. Conversion uses a 0.5-voxel Gaussian filter, maximum-density occupancy,
density-weighted DC colors and 12 levels per color channel. The coarse grid
reduces pinholes, noisy color changes and rendering cost. Height is fitted in
`asset.json`; collision remains authored separately. No hidden geometry was
invented to repair the splat. Higher spherical harmonics and Gaussian alpha
compositing are not reproduced.

Firebox opening, mantel, chimney and small decorations remain readable. The fire is static; tiny books/flowers soften.

`review.png` compares the actual reference with front, side, oblique and rear voxel
mesh renders. Source point projections and Gaussian fields were diagnostic
checks, not a faithful Gaussian rendering. The actual mesh passed the GLB audit
(finite packed attributes, indices, normals, winding and colors). In-game review
covers placement, door access/room clearance and river support. See the current
batch section in `../../../VALIDATION.md` for controller and browser evidence.

The runtime GLB and review PNG are delivered in the binary ZIP for user commit.
The report and this note are small text files committed by the agent. Do not
claim the runtime blobs are committed until the returned Git tree confirms it.

## Detail correction after user test drive

The new conversion uses 48 height samples, 32 color levels, a 0.25-voxel
filter, accumulated opacity occupancy (`1-product(1-alpha*density)` at threshold
0.5), and fourth-power density weights for more local color selection. This
retains detail that the previous coarse grid and broad color blend softened.
The comparison image shows old mesh, revised mesh and a depth-sorted orthographic
Gaussian composite from the actual PLY, in front oblique and rear views. The
composite is a diagnostic CPU renderer, not an upstream TripoSplat screenshot.

The mantel cloth, lantern/books, chimney opening and firebox are more distinct
than in the previous conversion. Fine details remain voxel approximations.
