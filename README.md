# Games

A collection of independent family adventure games.

## Wonderwood

A 2D creature adventure for one or two players. See [Wonderwood's README](Wonderwood/README.md) and [Phaser build instructions](Wonderwood/phaser/README.md#build).

```sh
cd Wonderwood
npm install --prefix phaser
npm run build --prefix phaser
npm test --prefix phaser
```

The standalone game is written to `Wonderwood/dist/wonderwood-phaser.html` (relative to the monorepo root).

Each game owns its dependencies, build outputs, assets, documentation and tests. Run commands from the relevant game directory.
