#!/usr/bin/env python3
"""Export the fracture guide and pack painted stone into registered debris."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

PHASER = Path(__file__).resolve().parents[1]
PLAN = json.loads((PHASER / "levels/stonewake-seal.json").read_text())
ART = PHASER / "assets/generated/stonewake-hollow"
RESAMPLE = Image.Resampling.LANCZOS


def guide(output):
    scale = 5
    width, height = [value * scale for value in PLAN["size"]]
    gap = 44
    sheet = Image.new("RGB", (3 * (width + gap), height + 65), "#e4ddcc")
    draw = ImageDraw.Draw(sheet)
    colors = ("#ad694b", "#c89863", "#737582")
    for stage in range(3):
        x = gap // 2 + stage * (width + gap)
        draw.text((x, 14), ("Intact", "After punch 1", "After punch 2")[stage], fill="#302d26")
        for index, band in enumerate(PLAN["bands"]):
            if index < stage:
                continue
            for piece in band["pieces"]:
                draw.polygon([(x + px * scale, 38 + py * scale) for px, py in piece],
                             fill=colors[index], outline="#674b37", width=3)
    sheet.save(output)


def pack(paint, output):
    reference = Image.open(ART / "cave-seal.webp").convert("RGBA")
    weathered = Image.open(paint).convert("RGBA")
    bounds = weathered.getchannel("A").point(lambda value: 255 if value > 128 else 0).getbbox()
    if bounds is None:
        raise ValueError("The painted stone needs an opaque body and transparent margins")
    width, height = reference.size
    if (width, height) != tuple(value * 2 for value in PLAN["size"]):
        raise ValueError("Seal cutout must be at twice the declared world size")
    weathered = weathered.crop(bounds).resize(reference.size, RESAMPLE).convert("RGB")
    texture = Image.blend(reference.convert("RGB"), weathered, .53).convert("RGBA")
    cracks = Image.new("RGBA", reference.size)
    draw = ImageDraw.Draw(cracks)
    seams = set()
    for band in PLAN["bands"]:
        for polygon in band["pieces"]:
            for a, b in zip(polygon, polygon[1:] + polygon[:1]):
                if a[0] == b[0] in (0, PLAN["size"][0]) or a[1] == b[1] in (0, PLAN["size"][1]):
                    continue
                seams.add(tuple(sorted((tuple(a), tuple(b)))))
    for a, b in sorted(seams):
        line = [tuple(value * 2 for value in point) for point in (a, b)]
        light = [(x, y + 2) for x, y in line]
        draw.line(light, fill=(235, 151, 76, 135), width=2)
        draw.line(line, fill=(54, 26, 40, 210), width=2)
    texture = Image.alpha_composite(texture, cracks)
    pieces = [piece for band in PLAN["bands"] for piece in band["pieces"]]
    atlas = Image.new("RGBA", (width * len(pieces), height))
    for index, piece in enumerate(pieces):
        points = [(round(x * width / PLAN["size"][0]), round(y * height / PLAN["size"][1]))
                  for x, y in piece]
        mask = Image.new("L", reference.size)
        ImageDraw.Draw(mask).polygon(points, fill=255)
        fragment = texture.convert("RGBA")
        fragment.putalpha(ImageChops.multiply(reference.getchannel("A"), mask))
        atlas.paste(fragment, (index * width, 0))
    atlas.save(output, quality=88, method=6)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--painted", type=Path)
    args = parser.parse_args()
    if args.painted:
        pack(args.painted, args.output)
    else:
        guide(args.output)


if __name__ == "__main__":
    main()
