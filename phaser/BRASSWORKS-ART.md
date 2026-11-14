# The Brassworks art experiment

The Brassworks uses a conveyor, three turning gears, and a timed steam
piston. `levels/brassworks.json` provides machine positions, dimensions,
and movement. The gear teeth and spokes rotate, while a smooth upper arc
provides a stable one-way tread. The piston flashes before it fires.
Wait on its cap to launch across the gap.

## Generate the first pass

Run `node phaser/scripts/export-art-guides.mjs`. The guide at
`dist/art-guides/brassworks/painted-scene-context.png` shows the machines
in their starting poses with material colors. The separate
`world-physical-rock.png` shows the static terrain and ledges. The first
paint pass used an early revision of the material guide and Clockwork
Orchard as a style reference. The final machine placement was tuned in
the fixed-tick simulation.

Prompt for a full side-view panorama, sharply separated machines and
recognizable empty gaps. Ask for clean front-facing silhouettes, visible
spoke openings, level caps, and no attached wires or pipes. Save the
approved generation before beginning extraction.

## Extract with alpha and prepare repair variants

```sh
art=phaser/assets/generated/brassworks
python phaser/scripts/brassworks-art.py "$art/authoring/first-pass.webp" \
  --output dist/brassworks-art
```

This produces enlarged crops with margins and two versions of the same
repair mask. The reference size, crop bounds, broad repair boxes, and
registration pins are in `levels/brassworks-art.json`.

Send each crop individually to an image model in transparent edit mode.
Identify the exact object and ask it to preserve material, silhouette,
straight landing edges, and holes between spokes. Ask it to remove all
neighboring objects and shadows. The resulting sprites are model
reconstructions of the cropped objects. Inspect them over a light and
dark background. Look at the alpha channel itself for foreground holes,
isolated specks and background halos. In this level the three gears share
one model-assisted cutout.

For the repair pass, export RGBA with a fully transparent interior in
each hole. Extend the holes beyond the objects and baked edges. Leave
enough surrounding material to guide the fill. Brassworks also removes
invented shelves that could be mistaken for playable surfaces. Ask the
model to fill transparent areas with the local scene and return the full
canvas, preserving its crop and landmarks.

## Inspect and pack

Both the alpha-hole and green-hole experiments removed the machinery.
The alpha result was selected for its softer blend around the edited
boiler and platform edges. Both variants repainted parts of the
surrounding image. In the raw previews, about 16% of unmasked pixels
in the alpha pass and 17% in the green pass differed by more than 24
levels in at least one RGB channel. This is one model attempt per
variant, at 1120 × 480, with no alignment correction beyond resizing.

Use only the repaired patches and blend inside a padded mask. The
packer retains the original pixels outside that mask in the working
reference, then registers the combined terrain edge to collision.
It resizes the alpha cutouts around the authored origins and removes
low-alpha specks. It does not trace their silhouettes.

```sh
art=phaser/assets/generated/brassworks
python phaser/scripts/brassworks-art.py "$art/authoring/first-pass.webp" \
  --repair "$art/authoring/alpha-repair.webp" --cutouts "$art/authoring" \
  --output dist/brassworks-art
```

The reusable inputs are in `authoring/`, including the three selected
alpha sprites. The panorama was generated at 1915 × 821 and saved at
1120 × 480 before packing. Review the output at gameplay zoom and use
**V** over the gears and piston to inspect the actual standing surfaces.
The tests run the production movement through the conveyor, three gears,
piston launch, relic and gate. **C** recalls to the most recent camp.
