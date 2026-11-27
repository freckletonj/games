# Emberbrook asset backlog

Reviewed against PR #27 at `27dae67330fb0cb958b5799ded1ce8535fdb1972` on 2026-11-27.

This is the proposed complete visual-art backlog for the current explorable town, based on `game/world.js`, `game/town-assets.js` and the existing asset docs. It is not a claim that the game cannot be played without these designs. Most static entries replace existing authored block visuals; benches, signposts, a cupboard and the NPC population are additions within the user's requested town-art work. No shopping mechanics, quests or inventory are proposed.

There are **25 designs** below: six references generated in the current handoff and 19 planned references. Only the generated six have new manifests and join the splat queue. Each design is one reusable asset, not one asset per placed instance. The bridge belongs in this inventory as an existing authored visual that can be improved.

## Shop interiors

| Asset ID | Design and purpose | Status |
| --- | --- | --- |
| grocery-counter | Replace the grocery's simple counter; keep the top clear and aisle open | awaiting-splat |
| provisions-barrel | Reusable closed supplies barrel for grocery storage | planned |
| apothecary-cabinet | Replace the potion room's simple bottle shelving | awaiting-splat |

## Cottage interiors

| Asset ID | Design and purpose | Status |
| --- | --- | --- |
| cottage-bed | Replace the existing bed visual | planned |
| cottage-chair | Reusable chair for dining table and room seating | planned |
| cottage-cupboard | Compact storage cabinet against an interior wall | planned |

## Town furniture and bridge

| Asset ID | Design and purpose | Status |
| --- | --- | --- |
| plaza-well | Replace the roofed west-plaza well visual | awaiting-splat |
| town-lantern | Replace the existing town lamp visuals | awaiting-splat |
| town-bench | Reusable public seating beside paths | planned |
| town-signpost | Directional post; keep any readable labels authored separately | planned |
| garden-fence | Reusable fence segment matching current boundaries | planned |
| river-bridge | Improve the current bridge visual while preserving authored deck and collision | planned |

## Inn frontage

| Asset ID | Design and purpose | Status |
| --- | --- | --- |
| inn-sign | Replace the existing hanging inn sign; no tiny generated lettering | planned |
| outdoor-table | Replace the current outdoor table visual | planned |
| outdoor-stool | Replace its simple outdoor seating; separate reusable object | planned |

## Landscape

| Asset ID | Design and purpose | Status |
| --- | --- | --- |
| emberbrook-tree | Reusable broadleaf tree replacing the current block crowns | planned |
| river-bush | Reusable chunky bush replacing current block shrubs | planned |
| meadow-flowers | Compact connected flower cluster for existing flower patches | planned |

## Landmarks

| Asset ID | Design and purpose | Status |
| --- | --- | --- |
| old-watchtower | Improve the existing tower silhouette; preserve viewing deck and jump access | planned |
| mossy-ruin-arch | Replace the existing ruined arch visual | planned |
| terrace-shrine | Replace the current small shrine visual | planned |

## Humanoid population

| Asset ID | Design and purpose | Status |
| --- | --- | --- |
| emberbrook-grocer | Grocery shopkeeper with short apron and separated legs | awaiting-splat |
| emberbrook-herbalist | Potion shopkeeper, trousers and close-fitting vest | awaiting-splat |
| emberbrook-resident | Reusable resident for cottage/plaza population | planned |
| emberbrook-gardener | Resident suited to the town gardens | planned |

These are new NPC assets, not a replacement for the imported player. Keep `next-adventurer` deferred. Reference images do not establish successful rigging: each actual PLY needs its own orientation, density and skeleton fit, complete Idle/Walk/Run/Jump review and eventual in-game NPC placement. No NPC controller is added by this handoff.

## Existing art to retain and review

| Asset ID | Current evidence | Remaining work |
| --- | --- | --- |
| willow-cottage | Source PNG, original PLY and runtime GLB present in the PR tree | User art review and any targeted corrections |
| greenbasket-grocery | Source PNG, original PLY and runtime GLB present; authored rear-wall infill documented | Review facade, rear roof seam and door alignment |
| moss-ember-potions | Source PNG, original PLY and runtime GLB present | User art review |
| produce-shelf | Source PNG, original PLY and runtime GLB present | Review products and clearance in the grocery |
| potion-workbench | Source PNG, original PLY and runtime GLB present | Review dark rear surface and room placement |
| cottage-table | Source PNG, original PLY and runtime GLB present | User art review |
| cottage-hearth | Source PNG, original PLY and updated runtime GLB present | Review detail and baked colors |
| river-boulder | Source PNG, original PLY and runtime GLB present | Retain reusable rock design and playable stepping route |
| emberbrook-adventurer | Imported skinned runtime GLB; source image/PLY absent | Retain playable baseline; do not claim reproducible conversion |

Presence is based on repository paths and metadata; no new binary audit of the existing assets was performed for this reference batch. Their earlier review status remains `ready-for-test-drive` (the player is `imported-runtime`), not final art approval.

Keep floors, cutaway walls, door triggers, terrain, paths, water, collision and climbable ledges authored. Reuse existing boulder/rock art where appropriate. A room-wide reconstruction would hide surfaces and compromise navigation. For the bridge, tower and arch, preserve actual traversal surfaces separately from any new render mesh.

## Current delivery

See [batch 02](ASSET_BATCH_02.md) for the six generated references, exact intake mapping, hashes and commands. The first eight objects remain documented in [TOWN_ASSETS.md](TOWN_ASSETS.md). Do not regenerate them merely to populate the new-art queue.
