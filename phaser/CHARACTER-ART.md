# Character animation

The pose plans in `assets/poses/` define the shared explorer gait, mount
gaits and wing positions, seated rider poses, and creature motion. Export
guides from the repo root with Pillow installed.

```sh
python phaser/scripts/character-pose-art.py hero hero-guide.png
python phaser/scripts/character-pose-art.py princess princess-guide.png
python phaser/scripts/character-pose-art.py steampunk steampunk-guide.png
python phaser/scripts/character-pose-art.py unicorn unicorn-guide.png
python phaser/scripts/character-pose-art.py pegasus pegasus-guide.png
python phaser/scripts/character-pose-art.py riders riders-guide.png
python phaser/scripts/character-pose-art.py tideling tideling-guide.png
python phaser/scripts/character-pose-art.py skyling skyling-guide.png
```

Run the same command with `mossback`, `prismtail`, `emberkit`,
`glimmermoth`, or `cloudwhisp` to export those creature plans. Each plan
declares its own action frames and 320 × 320 runtime cells.

Give the image model the guide and a painted appearance reference. Ask for
a four-column, three-row sheet with one right-facing figure per cell, the
same contacts as the guide, and transparent space around each cutout.
Use the same human poses for all three explorers. The rider rows are the
original explorer, princess, and steampunk explorer in that order. Each
row shows four different seated poses with a shared hip pivot. The near
leg and boot are visible along the mount's flank.

The princess's standing and moving frames use artwork from her painted
rider row. Her head, braid, coat, arms and boots were cut out and posed
using the same landmarks as the other explorers.

Pack the model's painted alpha sheet and derive the runtime manifest from
the same plan. Repeat for each explorer and mount. For `riders`, write
`phaser/assets/generated/riders.webp` and `phaser/assets/generated/riders.json`.

```sh
python phaser/scripts/character-pose-art.py hero src/assets/characters/hero/sheet.webp \
  --painted-sheet hero-painted.png --manifest src/assets/characters/hero/manifest.json \
  --pixel-scale 2 --alpha-range 219 245
```

The explorer example packs 320 × 320 cells at the same in-game size and
foot origin as the old 160 × 160 cells. Set the alpha range for each
painting after checking it over light and dark backgrounds. Tidefox's
plan specifies 320 × 320 cells directly. Review its bound, breach,
descent, and underwater swim clips on both sides.
Moonwing's plan also uses 320 × 320 cells. Its flight clips call distinct
takeoff, glide, upstroke, middle, and downstroke frames. Review the
wingbeat through its full sweep with the body held to the guide's pivot.

Preview the packed poses and composite a rider over each painted saddle.
The mount manifest holds a seat and a rider-pose index per frame. Adjust
`seatAdjustments` in the mount plan to register the contact point against
painted saddles, then regenerate the manifest. Check both facing directions,
grounded gaits, takeoff, wingbeats, and descent at gameplay zoom.

The catch orb uses its own painted WebP. Capture hits and form changes
share a spark and light burst timed by the fixed simulation clock.

The steampunk explorer wears a bun in the locomotion sheet and the seated
rider row. Both use the existing frame bounds and pivots. The separate
fainted atlas in `assets/generated/fainted.webp` has a ground-aligned pose
for each playable explorer and creature form. The fainted animation gently
scales the pose around its ground pivot.
