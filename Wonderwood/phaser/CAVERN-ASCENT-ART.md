# Cavern Ascent

The 1280 × 3200 chapter is authored in [levels/cavern-ascent.json](levels/cavern-ascent.json).
Moonwing takes players from the entrance to Gravelback's low ledge. Two
Flintfist seals follow, with a bridge room and four spinning boulders between
them. After the gallery, the west path bends right around a rock overhang
and doubles back to camp. The upper seal leads into an updraft and the summit. Side shelves hide Stardrops. Camps on both
sides of the boulder gallery provide a place to recall after a fall. Gaps
between the boulders drop to a lower route. The west recovery shelf leads
back to the near bridge bank.

The [layout SVG](levels/cavern-ascent-guide.svg) shows both bridge poses
and the recovery shelf below the boulder gallery.

## Artwork

Run `node phaser/scripts/export-cave-guides.mjs` from the `Wonderwood/` directory.
Use `dist/cave-guides/cavern-ascent/world-physical-rock.png` as the image model's
full-height composition reference. The static rock mask comes from the same
platforms and rock polygons as gameplay. Use `painted-scene-context.png`
for the positions of the upright bridge, seals, and boulders.
`fallen-bridge-context.png` places the bridge at rest with its deck flush
with the tops of both named banks.

The approved scene is packed from `temp/cave.png` with:

```sh
python phaser/scripts/pack-cavern-scene.py
```

The source composition is 793 × 1983 pixels, at the correct 2:5 world
aspect. The packer resamples it to the authored 1280 × 3200 world extent
and writes `phaser/assets/generated/cavern-ascent/scene.webp`; resampling
does not add native image detail. The scene and each movable object are
registered in `phaser/assets/generated/approved-scene-art.json`, so
the standalone build embeds the artwork without depending on `temp/`
at runtime.

The stone bridge and boulders remain independent RGBA textures. The
upright stone bridge is 50 × 320 world units, with its pivot at the
center of the foot. At rest its left edge faces up and is the walkable
surface. The four wheels share a spinning-boulder texture and use
84 × 84 collision extents. The pushable stone uses a bottom-centered
72 × 67 sprite. Both seals reuse the existing Stonewake fragments.

Use **V** in the game to compare the registered painting against the
actual collision geometry. Keep the original `temp/` model artwork
as regenerable inputs, not as runtime dependencies.

## Collision geometry

Collision is derived from the declarative level rather than from the painting.
`rockPolygons` compile into oriented line segments; the authored floor and
ceiling contours become connected half-tile polylines. Grounded characters
follow the supporting edge at its exact interpolated height. Moving characters
use swept rectangle/segment intersections for walls and overhangs, while
platforms and the fallen stone bridge retain their one-way landing rules.
This avoids per-pixel stepping, repeated push-ups, and binary-search
repositioning on cave slopes.

## Verification

`npm test --prefix phaser` includes fixed-tick checks for flight around both
overhangs, the chimney, the spinning boulder crossing, both seals, and walking
from one bank to the other across the fallen span. Run the standalone Phaser
build and `python phaser/tests/chapters.py` to check chapter selection and
rendering. Full keyboard and co-op playthroughs are still pending.
