#!/usr/bin/env python3
"""Extract whole-world RGBA art layers using masks compiled from real physics.

The input painting must already be generated at the exact world dimensions,
using the *whole* color-filled guide as its conditioning image. This script
does not upscale, tint, paint wedges, or synthesize vector platform artwork.
Any noncolliding backdrop is a separate artwork, not a blurred copy that
could depict platforms absent from the physics model.

Usage:
    node phaser/scripts/export-cave-guides.mjs
    python phaser/scripts/extract-painted-layers.py \
        approved-full-resolution-skywell.png --background skywell-depth.png

Outputs one coherent static-solid painting with alpha, a separate water
painting with alpha, and optionally a background painting.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_GUIDES = ROOT / "dist/cave-guides/skywell-ascent"
DEFAULT_OUTPUT = ROOT / "dist/painted-layers/skywell-ascent"


def full_resolution_image(path, dimensions):
    image = Image.open(path).convert("RGBA")
    if image.size != dimensions:
        raise ValueError(
            f"{path}: expected {dimensions[0]}x{dimensions[1]} native pixels, "
            f"got {image.width}x{image.height}. Generate/refine at full "
            "resolution first; never silently stretch a small image."
        )
    return image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scene", type=Path,
                        help="Approved, complete scene conditioned on the world guide")
    parser.add_argument("--background", type=Path,
                        help="Separate noninteractive depth painting without platforms")
    parser.add_argument("--guide-dir", type=Path, default=DEFAULT_GUIDES)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    with Image.open(args.guide_dir / "world-physical-rock.png") as guide:
        dimensions = guide.size
    scene = full_resolution_image(args.scene, dimensions)

    args.output.mkdir(parents=True, exist_ok=True)
    for material in ("solid", "water"):
        # All physically meaningful surfaces are derived from the same
        # level representation; the model never chooses the alpha contour.
        with Image.open(args.guide_dir / f"world-static-{material}.png") as mask:
            if mask.size != dimensions:
                raise ValueError(f"Material mask size mismatch: {material}")
            opacity = mask.convert("RGBA").getchannel("A")
        layer = scene.copy()
        layer.putalpha(ImageChops.multiply(layer.getchannel("A"), opacity))
        layer.save(args.output / f"painted-{material}.png", optimize=True)
        print(f"Wrote painted-{material}.png: {dimensions[0]}x{dimensions[1]} RGBA")

    if args.background:
        background = full_resolution_image(args.background, dimensions)
        background.save(args.output / "painted-background.png", optimize=True)
        print("Wrote separate noncolliding background")

    print("Painting preserved unmodified where visible; opacity is from physics.")


if __name__ == "__main__":
    main()
