# Cavern Ascent

The 1280 × 3200 chapter is authored in [levels/cavern-ascent.json](levels/cavern-ascent.json).
Moonwing takes players from the entrance to Gravelback's low ledge. Two
Flintfist seals follow, with a bridge room and four spinning boulders between
them. After the gallery, the west path bends right around a rock overhang
and doubles back to camp. The upper seal leads into an updraft and the summit. Side shelves hide Stardrops. Camps on both
sides of the boulder gallery provide a place to recall after a fall. Gaps
between the boulders drop to a lower route. The west recovery shelf leads
back to the near bridge bank.

## Artwork

Run `node phaser/scripts/export-cave-guides.mjs` from the repository root.
Use `dist/cave-guides/cavern-ascent/world-physical-rock.png` as the image model's
full-height composition reference. The static rock mask comes from the same
platforms and rock polygons as gameplay. Use `painted-scene-context.png`
for the positions of the upright bridge, seals, and boulders.
`fallen-bridge-context.png` places the bridge at rest with its deck flush
with the tops of both named banks.

The refreshed composition study needs final alignment against the static
mask at gameplay zoom. Keep the stone bridge and boulders as independent
alpha textures. The upright stone texture is 50 × 320 world units, with its
pivot at the center of the foot. At rest its left edge faces up and is the
walkable surface. The boulder wheels rotate around their centers and have
84 × 84 world-unit collision shapes. The pushable stone uses a 72 × 67
bottom-centered sprite. Both seals use the existing Stonewake fragment atlas.

Once the aligned artwork is ready, add the painting and alpha textures under
`phaser/assets/generated/cavern-ascent/`, and add a `cavern-ascent` entry in
`approved-scene-art.json` with the painting in `scene` and each movable
texture in `platforms`, keyed by the corresponding object or machine ID.
The chapter uses geometry preview art before the approved art entry is installed.
Use **V** in the running game to compare the scene and its collision.

## Verification

`npm test --prefix phaser` includes fixed-tick checks for flight around both
overhangs, the chimney, the spinning boulder crossing, both seals, and walking
from one bank to the other across the fallen span. Run the standalone Phaser
build and `python phaser/tests/chapters.py` to check chapter selection and
rendering. Full keyboard and co-op playthroughs are still pending.
