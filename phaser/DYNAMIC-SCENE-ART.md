# Clockwork Orchard art workflow

Clockwork Orchard is the eighth chapter. Its copper lift moves vertically,
its green ferry travels across the ravine, and its brass gondola follows an
elliptical orbit with a level deck. The existing heightfield shapes the
mounds and piers. Overlapping one-way ledges form the stone steps. The
wind tower is scenery behind the roof garden.

## 1. Export the layout

```sh
node phaser/scripts/export-art-guides.mjs
```

In `dist/art-guides/clockwork-orchard/`, `world-physical-rock.png` is the
static material guide. It excludes the moving decks. The separate
`painted-scene-context.png` is the first-pass image model input. It shows the
decks exactly once in their authored home poses. It also uses color hints
close to the proposed scene materials, such as copper, moss green, brass,
limestone, and terracotta. The `sceneFeatures` polygons in
`levels/clockwork-orchard.json` mark visually distinct masonry and the
tower. The ridge and ledges still define the physical surfaces.

Ask the image model for a single side-view composition. Give it the context
bitmap first and the desired art style as a separate reference. Tell it to
keep each moving object isolated, with a clear silhouette and no attached
ropes or supports. The original paint pass used an early version of the
guide and the Mosslight Meadow panorama as the style reference. The
level's final platform routes were tuned during physics testing.

## 2. Trace once and export the repair image

The model can shift outlines even when it follows the composition. Open
the first painting at the recipe's `referenceSize` and trace the actual
painted silhouettes. Use the deck's painted top as the top of the trace.
Give each trace a slightly larger `repairBox` that includes antialiased
edges and any attached shadow. The boxes are half-open pixel rectangles
and should leave adjacent static surfaces intact. The IDs match the
corresponding decks in the level JSON.

```sh
art=phaser/assets/generated/clockwork-orchard
recipe=phaser/levels/clockwork-orchard-art.json
python phaser/scripts/orchard-art.py "$art/authoring/first-pass.webp" \
  --recipe "$recipe" --output dist/orchard-art
```

This produces three transparent WebP cutouts and `green-repair.png`. The
latter puts `#00ff00` only in the authored repair boxes. The green image
is a communication aid for the image model. The recipe still supplies
the exact mask.

## 3. Repair, composite, and register

Give the model the green image and ask it to replace only the green with
a continuation of the distant background. Specify that nearby ledges and
terrain stay in place and that the filled regions contain no moving object
or replacement ledge. Inspect the result at the same crop before using it.

```sh
art=phaser/assets/generated/clockwork-orchard
recipe=phaser/levels/clockwork-orchard-art.json
python phaser/scripts/orchard-art.py "$art/authoring/first-pass.webp" \
  --recipe "$recipe" --repaired "$art/authoring/repair-pass.webp" \
  --output dist/orchard-art
npm run check --prefix phaser
```

Only pixels inside the authored boxes enter the repaired scene. The script
feathers the joins inside those boxes and fully replaces every traced deck
pixel. Registration pins map the painted stairs, pier tops and upper
terrace to their intended world coordinates. Painting registration and
cutout extraction are repeatable from the saved source pair. A fresh
model generation still needs inspection, tracing, and registration.

Review the WebPs in `dist/orchard-art/` before replacing the registered
files in `phaser/assets/generated/clockwork-orchard/`. The build embeds
the registered scene and deck images. The original and edited reference
paintings remain in `authoring/`. Both were generated at 1965 × 800 and
saved at 1152 × 469 for this recipe.

## 4. Check in play

Open the standalone HTML and choose **Clockwork Orchard**. Press **V** to
see the level's geometry and each moving deck's live top. Jump onto the
copper lift, transfer to the stone steps, cross on the green ferry, and
use the brass gondola to reach the roof garden. **C** returns to the last
camp. The tests drive the production player step through all three rides.

The same paint, trace, and repair sequence could extract foreground or
parallax art. Each such layer would need its own mask, draw depth, and
scroll behavior. This experiment ships one repaired world-locked
composition and three independently moving cutouts.
