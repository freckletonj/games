# Stonewake Hollow

`levels/stonewake-hollow.json` declares the gaps, ledge, cave roof, creatures,
camps and puzzle objects. Creature entries can attach a ground creature to
an authored ledge with `"perched"` and the ledge's row. Puzzle objects give
their home as horizontal center and bottom edge in world pixels. The log's
`pushAbove` specifies the highest foot Y that can tip it. The settled
`platform` gives the center and top of the boulder or bridge.

## Scene and props

Run `node phaser/scripts/export-art-guides.mjs` from the repo root. The
layout reference is
`dist/art-guides/stonewake-hollow/painted-scene-context.png`. The first
painting used a side-on sandstone and pine gorge, distant waterfalls,
empty cuts, a shelf, and a red cracked seal in a blue-crystal cave.

```sh
art=phaser/assets/generated/stonewake-hollow
python phaser/scripts/stonewake-art.py "$art/authoring/first-pass.webp" \
  --output dist/stonewake-art
```

Use the enlarged crops as transparent-edit references. Preserve the complete
silhouette, lighting and walkable top, and remove scenery and shadows.
Fill the expanded alpha holes with matching forest, grass, shelf and open
cave. The separate shelf repair continues the distant forest so the shelf
can be redrawn at the exact collision height. The original panorama
includes a second boulder, which the archived repair removes.

Generate the bridge log on transparent alpha with a side-on view and
mostly straight edges. Its root end is at the sprite's bottom, the
pivot during the clockwise fall. Repack with:

```sh
python phaser/scripts/stonewake-art.py "$art/authoring/first-pass.webp" \
  --art "$art/authoring" --output "$art"
```

## Rock-creature poses

`poses/rock-poses.json` declares a four-by-four bitmap guide and the
runtime animation clips. Each pose has the head, chest, hip, both hands
and both feet in cell pixels. `baseline` is the common floor line.

```sh
python phaser/scripts/rock-pose-art.py dist/stonewake-poses.png
```

Use the guide as the pose and spacing reference and the creature design
as the visual reference. Ask for one right-facing, full-body painted
creature per cell on true alpha, with consistent scale and generous cell
margins. Ask the model to follow the walk cycle, braced push, tucked jump,
landing, and punch frames without painting the grid or labels. The
original Gravelback and Flintfist designs are in `authoring/creatures.webp`.
The generated sheets are in `poses/`. Repack either creature with:

```sh
python phaser/scripts/rock-pose-art.py "$art/flintfist.webp" \
  --painted-sheet "$art/poses/flintfist-painted.webp"
```

The packer crops the cell alpha, aligns feet to a common baseline and leaves
room for the extended push and punch poses. The scene uses the declared
clip frames during contact and at punch impact.

## Verify

```sh
node --test phaser/tests/stonewake-hollow.test.mjs
npm run build --prefix phaser
```

Choose Stonewake Hollow from the menu or open the HTML build with
`#stonewake-hollow`. **V** shows the ledge, cave roof, and walkable surfaces
once the boulder and log settle.
