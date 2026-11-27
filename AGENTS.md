# Working on the games monorepo

Each game is an independent project. Read the game-specific `AGENTS.md` and
README before editing it, and run its commands from the directory documented
there. Keep gameplay, assets, dependencies, tests, and build outputs scoped to
the game being changed.

- `Wonderwood/` contains the Phaser campaign, original Canvas game, shared art,
  and their build and verification tools. See `Wonderwood/AGENTS.md`.
- `Adventure Town/` contains the voxel town, interiors and image/splat asset pipeline.
  See `Adventure Town/AGENTS.md`.
- `.github/workflows/` contains repository workflows. Shell steps can set a
  game working directory; artifact upload paths are relative to the checkout.

Keep generated game builds and local dependency directories out of Git.
