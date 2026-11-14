# Wonderwood painted-cave integration

This branch brings the Wonderwood experiments together on top of `main`. Start here when resuming work and use the latest commits on the integration PR for the current implementation.

- [ ] Compare #6 (Canvas gameplay and mounts), #7 (Phaser campaign), and #8 (geometry-authored painted caves). Record what carries forward.
- [ ] Bring the playable Phaser campaign and the authored cave pipeline into the integration branch in reviewable commits.
- [ ] Verify that the cave layout drives collision, water, guide export, and registration of the static painting. Verify the painted cave route from spawn through the objective to the exit.
- [ ] Build the standalone HTML locally, exercise it offline in a real browser, and check in the verified build.
- [ ] Merge the integration PR and retire superseded experiments once their relevant work is accounted for.

GitHub Actions is intentionally disabled. Use local builds and browser verification. Keep diffs and logs scoped to source and summarize binary assets by path and size. Avoid printing generated HTML, embedded assets, and vendored dependencies into the conversation.
