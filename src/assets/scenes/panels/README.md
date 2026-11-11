# Painted level panels

Place diffusion-painted **PNG** or **WebP** chunks here before building.
Each file is embedded into the offline HTML under its filename stem, for example
`glade-01.webp` becomes `asset: "glade-01"`. Keep names unique.

The level JSON may contain:

```json
{
  "art": {
    "background": [
      {"asset":"glade-sky-01","x":0,"y":0,"width":960,"height":270,"parallax":0.15}
    ],
    "foreground": [
      {"asset":"glade-terrain-01","x":0,"y":0,"width":1024,"height":800}
    ]
  }
}
```

Foreground panels are drawn at **world-space coordinates** over the procedural
terrain but under creatures and interactive props. They can depict entire
continuous landscapes without using individual sprite tiles. Background panels
are parallax paintings positioned in view-space; the `parallax` fraction
controls their offset as the camera scrolls. Adjacent panels should share the
same boundary pixels (or use transparent overlap) to avoid seams.

The JSON semantic `grid` and optional `surface` heightfield remain the
only collision sources; visual RGB is never guessed to be ground.

`surface` consists of `width + 1` **fractional tile-row** heights (for
example `[30, 29.8, 29.6, ...]`) and defines continuously interpolated
walkable ground independent of the coarse semantic grid. Put solid ground
at or below each surface, and leave the wedge above it empty. Water cells
may cover the space above deeper underwater ground. For imported JSON, validate
the start and exit markers against the semantic grid.

For deterministic results, generate semantic geometry first, then condition
the diffusion pass on that geometry. Stitch chunks at full resolution in
world coordinates, not by guessing physics from a finished painting.
