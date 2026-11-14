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

The model can shift outlines even when it follows the composition. Use
the guide to find each deck, then trace the actual first-pass pixels at
the recipe's `referenceSize`. Orchard used a Pillow preview with an x/y
grid at 1152 × 469. The six vertices in each `outline` were read by eye
from the painted deck and entered as `[x, y]` pairs, starting at the
top-left corner and proceeding clockwise. The deck's painted landing
edge is the top of the sprite. Coordinates are relative to the upper-left
corner of the full reference painting.

For the next scene, crop around each deck at its rough guide position
and enlarge the crop with nearest-neighbor sampling. Record the crop's
upper-left coordinate and add that offset to every local vertex. A polygon
selection in an image editor also works at the same reference size.
Trace the top and corners first, then preview the alpha against a light
and a dark background for clipped edges and stray background pixels.

Give each silhouette a slightly larger `repairBox` that covers edge
pixels and any baked shadow while avoiding neighboring static ledges.
For example, the copper deck starts at `[133, 332]` and runs along its
top to `[207, 332]`. Its repair box is `[131, 330, 211, 350]`.
Boxes are half-open rectangles in `[left, top, right, bottom]` order.
The IDs match the corresponding decks in the level JSON.

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

For more complex silhouettes, try an edge-aware selection in the crop,
seeded with a few strokes on the object and its surroundings. Review the
alpha at gameplay scale before committing it. A before/after difference
image is useful for locating missed edge pixels inside the repair box.
On the saved Orchard pair, a simple per-channel difference also picked
up repainting in the surrounding sky and missed parts of the decks. Keep
the authored silhouette and repair box as the source of truth.

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
