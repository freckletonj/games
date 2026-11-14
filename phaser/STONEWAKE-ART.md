# Stonewake Hollow

The chapter layout declares the two gaps, shelf, roof, creatures, camps and
puzzle objects in `levels/stonewake-hollow.json`. Puzzle object homes are
horizontal centers and bottom edges in world pixels. A settled boulder's
`platform` gives the center and top of its walkable surface.

## Generate and separate the scene

Run `node phaser/scripts/export-art-guides.mjs` from the repo root. Use
`dist/art-guides/stonewake-hollow/painted-scene-context.png` as the layout
reference. The first model pass was prompted for a side-on, sunlit sandstone
and pine gorge with distant waterfalls, two empty cuts in the terrain, a
thin shelf, two distinct boulders, and a red cracked column sealing a
blue-crystal cave. Keep the guide's ground edges and avoid extra platforms.

Set `art=phaser/assets/generated/stonewake-hollow` and run:

```sh
python phaser/scripts/stonewake-art.py "$art/authoring/first-pass.webp" \
  --output dist/stonewake-art
```

Use the enlarged crops for individual transparent edits. Ask the model to
preserve the complete boulder or seal, its lighting, and its top edge.
Remove scenery and any shadows. For `alpha-holes.png`, fill just the
transparent parts with the matching forest, grass, shelf, and open cave.
The separate shelf repair continues the distant forest through the shelf's
original position so the shelf can be placed at the exact collision height.
The model also produced the paired rock creatures and the sandstone spire
used below the settled boulders.

## Pack and verify

```sh
python phaser/scripts/stonewake-art.py "$art/authoring/first-pass.webp" \
  --art "$art/authoring" --output "$art"
node --test phaser/tests/stonewake-hollow.test.mjs
npm run build --prefix phaser
```

The packer blends the targeted repair patches over the first painting and
registers the terrain to the authored collision. The scene is opaque, while
the runtime boulders and seal retain the model cutouts' transparency. Use
**V** to inspect the shelf, the cave roof, and the new footholds after the
boulders fall. Choose Stonewake Hollow from the menu or open the build with
`#stonewake-hollow`.
