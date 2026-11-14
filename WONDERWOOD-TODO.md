# Wonderwood painted-cave integration

This branch brings the Wonderwood experiments together on top of `main`. Start here when resuming work and use the latest commits on the integration PR for the current implementation.

- [x] Compare #7 (Phaser campaign) and #8 (geometry-authored painted caves). #8 extends #7, and both are represented in the integration branch. The earlier Canvas experiment remains accessible in #6.
- [x] Bring the playable Phaser campaign and the authored cave pipeline into the integration branch in reviewable commits.
- [x] Verify collision, water, guide export, and static-art registration. The fixed-step route crosses all ten walls, reaches the lantern, and reaches the exit in both the playable Skywell and the vaulted geometry study.
- [ ] Run extended browser checks, including real-input traversal and campaign completion.
- [ ] Build the standalone HTML locally, exercise it offline in a real browser, and check in the verified build.
- [ ] Merge the integration PR and retire superseded experiments once their relevant work is accounted for.

## Current checkpoint

PR #9 contains the full PR #8 implementation on top of the Phaser work from #7. Compared with the #8 head, the integration branch adds this checklist, drops the workflow, updates local output ignores, fixes a stale wall-guide assertion, and rebakes the three selected Skywell layers. No cave source files are missing.

The offline dependency install passed checksums. A fresh run passed all 119 Phaser Node tests, exported the cave guides, and verified the committed Skywell alpha layers pixel for pixel. The rebuilt `dist/wonderwood-phaser.html` is 15,840,464 bytes with SHA-256 `de85aa020634218126ecca3777be1605ee3d89d737880aa9e65d01dd198162d1`. Extended browser checks and checking in the standalone HTML are next.

## Earlier verification

The Phaser campaign and #8 cave sources are in this branch. The first local run passed 118 of 119 Node tests. The integration corrects the stale assertion for the SVG’s clipped climb-wall group, bringing the suite to 119 passing. Guide export succeeds. The original painting differed from the current masks by 41 solid, 15 water, and 26 background pixels. The rebaked WebP layers match all three masks pixel for pixel. The standalone build launches from a local file in Firefox, renders Skywell’s three layers, toggles the geometry overlay, and responds to movement without HTTP requests. A fresh build passed all 119 Node tests, the mechanics report, cave guide export, and the three-layer alpha comparison. Playwright Firefox verified Skywell from the actual local HTML and the general offline smoke test verified movement and co-op. The installed Chromium cannot start in this environment, so the extended browser tests are being exercised in Firefox.

GitHub Actions is intentionally disabled. Use local builds and browser verification. Keep diffs and logs scoped to source and summarize binary assets by path and size. Avoid printing generated HTML, embedded assets, and vendored dependencies into the conversation.
