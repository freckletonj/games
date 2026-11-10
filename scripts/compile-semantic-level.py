"""Compile a palette-coded level image to deterministic Wonderwood gameplay data.

This accepts semantic masks, not arbitrary painted concept images. The image is
snapped to the existing 16-unit logical tile grid using center-region voting.
"""
import argparse
import json
from collections import Counter
from pathlib import Path

from PIL import Image

COLORS = {
    "empty": "#ffffff", "ground": "#101820", "platform": "#5f5b85", "water": "#176ad7",
    "p1": "#00ed31", "p2": "#91fe54", "exit": "#ff152b",
    "springaroo": "#ffdc12", "skyling": "#00eeef", "tideling": "#ef851a",
    "snack": "#ff64bb", "skyKey": "#b052fc", "diveKey": "#167b86",
    "springKey": "#e83c86", "checkpoint": "#aaaaaa",
    "cloudwhisp": "#9480ed", "prismtail": "#ff895d", "mossback": "#6b9c42",
    "glimmermoth": "#ce6dff", "emberkit": "#fc5d3e", "starShard": "#f2f28a",
    "thermal": "#8af1f9", "prismKey": "#ffa03e", "mossKey": "#82e561",
    "cloudKey": "#c9adfb", "emberKey": "#f54848",
}
PALETTE = {name: tuple(bytes.fromhex(color[1:])) for name, color in COLORS.items()}
TERRAIN = {"ground", "platform", "water", "thermal"}
SURFACES = {"ground", "platform"}


def classify(pixel, threshold):
    if len(pixel) == 4 and pixel[3] < 80:
        return "empty"
    rgb = pixel[:3]
    name, distance = min(
        ((name, sum((a - b) ** 2 for a, b in zip(rgb, color)))
         for name, color in PALETTE.items()),
        key=lambda item: item[1],
    )
    return name if distance <= threshold * threshold else None


def compile_image(image, pixels_per_tile=1, max_color_distance=36):
    image = image.convert("RGBA")
    if image.width % pixels_per_tile or image.height % pixels_per_tile:
        raise ValueError("Image dimensions must be divisible by pixels-per-tile")
    width, height = image.width // pixels_per_tile, image.height // pixels_per_tile
    if not 8 <= width <= 400 or not 6 <= height <= 80:
        raise ValueError("Level grid must be between 8x6 and 400x80 tiles")
    pixels = image.load()
    grid, objects = [], []
    unknown_samples = 0
    total_samples = 0
    for y in range(height):
        row = []
        for x in range(width):
            tile = pixels_per_tile
            inset = max(1, tile // 5) if tile >= 4 else 0
            stride = max(1, tile // 8)
            votes = Counter()
            for yy in range(inset, tile - inset, stride):
                for xx in range(inset, tile - inset, stride):
                    result = classify(
                        pixels[x * tile + xx, y * tile + yy], max_color_distance
                    )
                    total_samples += 1
                    if result is None:
                        unknown_samples += 1
                    else:
                        votes[result] += 1
            kind = votes.most_common(1)[0][0] if votes else "empty"
            row.append(kind if kind in TERRAIN else "empty")
            if kind not in TERRAIN and kind != "empty":
                objects.append({"kind": kind, "x": x, "y": y})
        grid.append(row)
    warnings = []
    if unknown_samples:
        warnings.append(
            f"{unknown_samples}/{total_samples} samples had unknown colors; "
            "those samples were ignored during tile voting"
        )
    errors = []
    if unknown_samples > total_samples * 0.10:
        errors.append("More than 10% of semantic mask samples have unknown colors")
    for marker in ("p1", "exit"):
        matches = [obj for obj in objects if obj["kind"] == marker]
        if len(matches) != 1:
            errors.append(f"Expected exactly one {marker} marker; found {len(matches)}")
            continue
        obj = matches[0]
        x, y = obj["x"], obj["y"]
        if y + 1 >= height or grid[y + 1][x] not in SURFACES:
            errors.append(f"{marker} at ({x}, {y}) has no solid landing surface below")
    for obj in objects:
        if obj["kind"].endswith("Key") and obj["y"] + 1 >= height:
            errors.append(f"{obj['kind']} cannot be on the bottom row")
    level = {
        "width": width, "height": height, "grid": grid,
        "objects": objects, "warnings": warnings,
    }
    report = {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "unknownSamples": unknown_samples,
        "totalSamples": total_samples,
        "tiles": {"width": width, "height": height},
        "playability": "Static checks only; actual-physics progression tests required",
    }
    return level, report


def write_mask(level, output):
    image = Image.new("RGB", (level["width"], level["height"]))
    markers = {(obj["x"], obj["y"]): obj["kind"] for obj in level["objects"]}
    image.putdata([
        PALETTE[markers.get((x, y), level["grid"][y][x])]
        for y in range(level["height"]) for x in range(level["width"])
    ])
    image.save(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path, help="Palette-coded PNG semantic mask")
    parser.add_argument("--pixels-per-tile", type=int, default=1)
    parser.add_argument("--max-color-distance", type=int, default=36)
    parser.add_argument("--out", type=Path, required=True, help="Output level JSON path")
    args = parser.parse_args()
    if not 1 <= args.pixels_per_tile <= 64:
        parser.error("--pixels-per-tile must be 1..64")
    with Image.open(args.image) as image:
        level, report = compile_image(image, args.pixels_per_tile, args.max_color_distance)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    report_path = args.out.with_suffix(".report.json")
    mask_path = args.out.with_suffix(".semantic.png")
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    write_mask(level, mask_path)
    if not report["valid"]:
        parser.exit(1, f"Invalid level: {', '.join(report['errors'])}\nReport: {report_path}\n")
    args.out.write_text(json.dumps(level, indent=2) + "\n")
    print(f"Wrote {args.out}, {mask_path}, {report_path}")


if __name__ == "__main__":
    main()
