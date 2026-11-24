#!/usr/bin/env python3
"""Keep an approved painting at collision edges while refining its interiors."""
import argparse
from pathlib import Path

from PIL import Image, ImageFilter


def protect_edges(guide, approved, refined, margin):
    # The guide uses flat colors for air, solid, water, and ledges.
    borders = guide.filter(ImageFilter.FIND_EDGES).convert("L")
    borders = borders.point(lambda value: 255 if value else 0)
    core = borders.filter(ImageFilter.MaxFilter(2 * margin + 1))
    soft = core.filter(ImageFilter.GaussianBlur(margin / 2))
    mask = soft.point(lambda value: min(255, round(value * 1.25)))
    mask = mask.resize(refined.size, Image.Resampling.LANCZOS)
    original = approved.resize(refined.size, Image.Resampling.LANCZOS)
    return Image.composite(original, refined, mask)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("guide", type=Path, help="World-sized material guide")
    parser.add_argument("approved", type=Path, help="Approved registered panorama")
    parser.add_argument("refined", type=Path, help="Stitched high-resolution panorama")
    parser.add_argument("output", type=Path)
    parser.add_argument("--margin", type=int, default=18, help="Preserved radius in world pixels")
    args = parser.parse_args()
    guide = Image.open(args.guide).convert("RGB")
    approved = Image.open(args.approved).convert("RGB")
    refined = Image.open(args.refined).convert("RGB")
    if any(guide.width * image.height != guide.height * image.width
           for image in (approved, refined)):
        parser.error("Both paintings must match the material guide's aspect ratio")
    protected = protect_edges(guide, approved, refined, args.margin)
    protected.save(args.output)


if __name__ == "__main__":
    main()
