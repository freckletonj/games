# Wonderwood integration checklist

**Resume on [PR #9](https://github.com/freckletonj/games/pull/9).** The next unchecked item is the next work session. Commit each completed slice to the PR branch and record its result here, including any blocked checks.

## Completed

- [x] Compare the experiments and consolidate #7 (the Phaser campaign) and #8 (the geometry-authored cave pipeline) on top of `main`.
- [x] Run the Phaser Node suite, export the cave guides, and verify the selected Skywell layers against the current material masks. A fixed-step simulation crossed all ten climb walls, collected the lantern, and reached the exit in both playable Skywell and the vaulted geometry study.
- [x] Build a standalone HTML preview and smoke-test it in Firefox from a local file. Skywell rendered all three painted layers, responded to movement, and toggled the geometry overlay. The general offline smoke test covered movement and co-op. The smoke runs made no HTTP requests.

## Remaining

- [ ] **Finish extended browser verification.** Run `bash phaser/scripts/verify-offline.sh full` from a clean checkout with a supported browser. Exercise real-input Skywell traversal through the lantern and exit, campaign progression, water and slopes, mounts, and co-op. Record the browser, passing checks, and any unverified coverage. The previous environment could not start Chromium. Firefox smoke coverage is recorded below.
- [ ] **Review the playable scope and art.** Keep #8’s authored stage geometry as the source for collision, water, climb walls, the whole-scene image-generation guide, and the masks that register the selected painting. Playable Skywell uses the selected Ancient Sanctuary artwork. Keep the separate vaulted geometry study out of the playable campaign until it has matching art. Check the shipped art and its provenance.
- [ ] **Check in the playable HTML.** Rebuild `dist/wonderwood-phaser.html` from the accepted source, verify that the exact file opens offline, and commit it to PR #9. Record its SHA-256 and verify the committed file matches.
- [ ] **Merge and retire the experiments.** Review PR #9 against `main`, confirm the intended #7 and #8 changes and the HTML are included, then merge #9. Close superseded PRs still open and remove their experiment branches once their work is accounted for. #8 is stacked on #7.

## Last recorded checkpoint

The integration branch includes #8 on top of #7. Compared with the #8 head, it also drops the workflow, updates local output ignores, fixes the clipped-wall guide assertion, and rebakes the three selected Skywell layers.

The offline dependency install passed checksums. The build passed all 119 Phaser Node tests and the mechanics report. Cave guide export succeeded and all three baked alpha layers matched their masks pixel for pixel. The local HTML was 15,840,464 bytes with SHA-256 `de85aa020634218126ecca3777be1605ee3d89d737880aa9e65d01dd198162d1`. That build was used for the Firefox smoke checks and has yet to be checked in.

GitHub Actions is intentionally disabled. Use local verification. Read one subsystem or a small set of source files at a time. Report generated HTML and binary assets by path, size, and checksum. Record the last completed check and the next action before moving on.
