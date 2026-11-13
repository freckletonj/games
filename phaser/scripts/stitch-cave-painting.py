#!/usr/bin/env python3
"""Assemble approved overlapping scene refinements at native WORLD pixels.

The entire image is composed first. Only afterwards are physics alpha
masks applied by extract-painted-layers.py. This is NOT runtime tiling.
Every crop must have been generated while conditioning on the same global
composition, complete physics guide and its overlapping neighbors.

Usage:
  python phaser/scripts/stitch-cave-painting.py \
    dist/cave-guides/skywell-vault-study/refinement/plan.json \
    --output dist/painted-layers/skywell-vault-study/whole-scene.png
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageStat


def blended_patch(image, left, top, overlap_x, overlap_y):
    alpha = Image.new("L", image.size, 255)
    draw = ImageDraw.Draw(alpha)
    if left:
        for x in range(overlap_x):
            draw.line((x, 0, x, image.height),
                      fill=round(255 * x / overlap_x))
    if top:
        vertical = Image.new("L", image.size, 255)
        stroke = ImageDraw.Draw(vertical)
        for y in range(overlap_y):
            stroke.line((0, y, image.width, y),
                        fill=round(255 * y / overlap_y))
        alpha = ImageChops.multiply(alpha, vertical)
    image.putalpha(alpha)
    return image


def seam_error(current, patch):
    difference = ImageChops.difference(current.convert("RGB"),
                                       patch.convert("RGB"))
    return max(ImageStat.Stat(difference).mean)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plan", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--max-seam-error", type=float, default=36,
                        help="Maximum mean RGB channel difference in overlaps")
    args = parser.parse_args()
    plan = json.loads(args.plan.read_text())
    world = plan["world"]
    canvas = Image.new("RGBA", (world["width"], world["height"]))
    overlap_x = plan["overlap"]["horizontal"]
    overlap_y = plan["overlap"]["vertical"]

    for patch in plan["patches"]:
        file = args.plan.parent / patch["painting"]
        with Image.open(file) as source:
            if source.size != (patch["width"], patch["height"]):
                raise ValueError(
                    f"{file}: expected native {patch['width']}x{patch['height']}, "
                    f"got {source.size}; low-res upscales are not accepted."
                )
            piece = source.convert("RGBA")
        x, y = patch["x"], patch["y"]
        if x:
            existing = canvas.crop((x, y, x + overlap_x, y + piece.height))
            candidate = piece.crop((0, 0, overlap_x, piece.height))
            difference = seam_error(existing, candidate)
            if difference > args.max_seam_error:
                raise ValueError(f"{file}: horizontal seam mismatch "
                                 f"{difference:.1f} > {args.max_seam_error}; "
                                 "regenerate the crop with neighbor references")
        if y:
            existing = canvas.crop((x, y, x + piece.width, y + overlap_y))
            candidate = piece.crop((0, 0, piece.width, overlap_y))
            difference = seam_error(existing, candidate)
            if difference > args.max_seam_error:
                raise ValueError(f"{file}: vertical seam mismatch "
                                 f"{difference:.1f} > {args.max_seam_error}")
        piece = blended_patch(piece, x > 0, y > 0, overlap_x, overlap_y)
        canvas.alpha_composite(piece, (x, y))

    if canvas.getchannel("A").getextrema() != (255, 255):
        raise ValueError("The painting crops left transparent or missing pixels")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(args.output, optimize=True)
    print(f"Stitched one cohesive {world['width']}x{world['height']} painting: "
          f"{args.output}")


if __name__ == "__main__":
    main()
