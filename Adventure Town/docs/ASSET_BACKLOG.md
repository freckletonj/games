# Emberbrook asset backlog

Updated 2026-11-27 after batch 03 conversion and playable integration on PR #27. Batch 03 adds the requested shop surfaces and creature-friendship art; see [its handoff](ASSET_BATCH_03.md) and [gameplay design](CREATURE_FRIENDSHIP.md).

This is the proposed complete visual-art backlog for the current explorable town, based on `game/world.js`, `game/town-assets.js` and the existing asset docs. It is not a claim that the game cannot be played without these designs. Most static entries replace existing authored block visuals; benches, signposts, a cupboard and the NPC population are additions within the user's requested town-art work. No shopping mechanics, quests or inventory are proposed.

There are **33 designs** below: 15 converted designs ready for a test drive, one floor construction guide, and 17 planned designs. Nine conversions are from batch 03; the floor guide remains outside the splat queue. Batch 02's original PNGs/PLYs are committed; preserve its existing runtime review status. Each design is one reusable asset, not one asset per placed instance. The bridge belongs in this inventory as an existing authored visual that can be improved.

## Shop interiors

| Asset ID | Design and purpose | Status |
| --- | --- | --- |
| grocery-counter | Replace the grocery's simple counter; keep the top clear and aisle open | ready-for-test-drive |
| provisions-barrel | Reusable closed supplies barrel for grocery storage | planned |
| apothecary-cabinet | Replace the potion room's simple bottle shelving | ready-for-test-drive |
| shop-wall-panel | Reusable plaster/timber decoration fitted to authored low cutaway walls | ready-for-test-drive |
| shop-floor-sample | Oak board construction/material guide for the authored flat floor | reference-only; authored floor guide applied |

## Cottage interiors

| Asset ID | Design and purpose | Status |
| --- | --- | --- |
| cottage-bed | Replace the existing bed visual | planned |
| cottage-chair | Reusable chair for dining table and room seating | planned |
| cottage-cupboard | Compact storage cabinet against an interior wall | planned |

## Town furniture and bridge

| Asset ID | Design and purpose | Status |
| --- | --- | --- |
| plaza-well | Replace the roofed west-plaza well visual | ready-for-test-drive |
| town-lantern | Replace the existing town lamp visuals | ready-for-test-drive |
| town-bench | Reusable public seating beside paths | ready-for-test-drive |
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
| blushberry-bush | Pink berries and readable vegetation for the friendship loop | ready-for-test-drive |

## Landmarks

| Asset ID | Design and purpose | Status |
| --- | --- | --- |
| old-watchtower | Improve the existing tower silhouette; preserve viewing deck and jump access | planned |
| mossy-ruin-arch | Replace the existing ruined arch visual | planned |
| terrace-shrine | Replace the current small shrine visual | planned |

## Humanoid population

| Asset ID | Design and purpose | Status |
| --- | --- | --- |
| emberbrook-grocer | Grocery shopkeeper with short apron and separated legs | ready-for-test-drive |
| emberbrook-herbalist | Potion shopkeeper, trousers and close-fitting vest | ready-for-test-drive |
| emberbrook-resident | Reusable resident for cottage/plaza population | planned |
| emberbrook-gardener | Resident suited to the town gardens | ready-for-test-drive |

These are new NPC assets, not a replacement for the imported player. Keep `next-adventurer` deferred. The first two have fitted rigs, reviewed Idle/Walk/Run/Jump clips and shop placements. The resident still needs a reference; the gardener has its own fitted rig and outdoor placement. Shopkeepers are stationary; no roaming AI, trading or quest behavior is added.

## Creature friendship and capture

| Asset ID | Design and purpose | Status |
| --- | --- | --- |
| springaroo | Cute rabbit; proposed high/double jump puzzle form | ready-for-test-drive; fitted quadruped rig |
| tidefox | Aquatic fox; proposed swim/dive puzzle form | ready-for-test-drive; fitted quadruped rig |
| moonwing | Owl; proposed limited-wingbeat puzzle form | ready-for-test-drive; fitted bird rig |
| flintfist | Bipedal rock bear; proposed push/punch puzzle form | ready-for-test-drive; fitted humanoid rig |
| friendship-orb | Heart-marked capture orb; effects and behavior authored separately | ready-for-test-drive |

The four animals are now rigged and playable. Two berries build trust, a friendship orb catches a ready animal, and the player can become the current caught form. Springaroo double-jumps, Tidefox swims/dives, Moonwing has limited wingbeats and Flintfist pushes/punches optional ruin obstacles. See [the playable rules](CREATURE_FRIENDSHIP.md). Binaries await extraction and user commit; user art acceptance is pending.

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

Presence is based on repository paths and metadata; this conversion pass audits the nine new batch 03 binaries and retains the earlier assets. Their earlier review status remains `ready-for-test-drive` (the player is `imported-runtime`), not final art approval.

Keep floors, cutaway walls, door triggers, terrain, paths, water, collision and climbable ledges authored. Reuse existing boulder/rock art where appropriate. A room-wide reconstruction would hide surfaces and compromise navigation. For the bridge, tower and arch, preserve actual traversal surfaces separately from any new render mesh.

## Current delivery

See [batch 03](ASSET_BATCH_03.md) for the original references and current runtime handoff. [Batch 02](ASSET_BATCH_02.md) retains its prior conversion notes. The first eight objects remain documented in [TOWN_ASSETS.md](TOWN_ASSETS.md). Do not regenerate completed sources merely to populate the new-art queue.
