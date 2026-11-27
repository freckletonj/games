# Games

A monorepo of games to play with the family. Each game keeps its own source,
assets, documentation, build tools, and dependencies.

| Game | Project | Run or build from the repository root |
| --- | --- | --- |
| Wonderwood | [Wonderwood/](Wonderwood/README.md) — 2D creature adventure for one or two players | `npm install --prefix Wonderwood/phaser` then `npm run build --prefix Wonderwood/phaser` |
| Adventure Town | [Adventure Town/](<Adventure Town/README.md>) — voxel town with enterable buildings and a splat asset workflow | `npm run dev --prefix "Adventure Town"` |

Wonderwood builds a self-contained offline game at
`Wonderwood/dist/wonderwood-phaser.html`. Its original Canvas version remains
available with `node Wonderwood/scripts/build.mjs`, which produces
`Wonderwood/dist/wonderwood.html`. Run the Phaser unit tests with
`npm test --prefix Wonderwood/phaser`.

Adventure Town uses a Python static server for development. Build it with
`npm run build --prefix "Adventure Town"`, then open
`Adventure Town/dist/adventure-town.html` directly for offline play. Node 20+ and
Python 3 are enough; there is no npm install step. Its previous version is
preserved under `old/Adventure Town/`.
See each game's README for controls, dependencies, asset workflows, and checks.

GitHub Actions workflows stay in `.github/workflows/`; the Wonderwood workflow
runs commands from `Wonderwood/` and uploads artifacts from that game's `dist/`.
