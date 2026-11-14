#!/usr/bin/env python3
"""Prepare alpha-hole references and pack the generated Brassworks artwork."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / "levels/brassworks.json"
RECIPE = ROOT / "levels/brassworks-art.json"
RESAMPLE = Image.Resampling.LANCZOS


def interpolate(points, x):
    for (left, low), (right, high) in zip(points, points[1:]):
        if x <= right:
            return low + (high - low) * (x - left) / (right - left)
    return points[-1][1]


def patch_mask(size, boxes):
    mask = Image.new("L", size)
    draw = ImageDraw.Draw(mask)
    for left, top, right, bottom in boxes:
        draw.rectangle((left, top, right - 1, bottom - 1), fill=255)
    return mask


def save_inputs(scene, recipe, output):
    holes = patch_mask(scene.size, recipe["holes"])
    for name, box in recipe["crops"].items():
        crop = scene.crop(box)
        crop.resize((crop.width * 4, crop.height * 4), RESAMPLE).save(output / f"{name}-crop.png")
    transparent = scene.convert("RGBA")
    transparent.putalpha(ImageOps.invert(holes))
    transparent.save(output / "alpha-holes.png")
    green = Image.new("RGB", scene.size, (0, 255, 0))
    Image.composite(green, scene, holes).save(output / "green-holes.png")


def composite(scene, repair, recipe):
    # Blend inside a padded mask, with the entirety of each original hole
    # replaced. Include the continuous terrain edge for the alignment pass.
    boxes = recipe["holes"] + [recipe["groundPatch"]]
    inner = patch_mask(scene.size, boxes)
    pad = inner.filter(ImageFilter.MaxFilter(19))
    inset = pad.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.GaussianBlur(2))
    weight = ImageChops.multiply(ImageChops.lighter(inner, inset), pad)
    return Image.composite(repair, scene, weight)


def register_scene(scene, original, recipe, layout):
    width, height = recipe["worldSize"]
    source_width, source_height = scene.size
    registration = recipe["registration"]
    ridge = [(x * 16, y * 16) for x, y in layout["ridge"]]
    result = Image.new("RGB", (width, height))
    for x in range(width):
        src_x = interpolate(registration["x"], x + .5)
        edge = round(interpolate(ridge, x + .5))
        src_edge = interpolate(registration["ground"], src_x)
        left, right = max(0, src_x - .35), min(source_width, src_x + .35)
        # Keep distant windows and chimneys stationary. Fade the terrain
        # adjustment into the last 140 world pixels above the collision edge.
        band = min(140, edge)
        top = edge - band
        sky = scene.resize((1, edge), RESAMPLE, box=(left, 0, right, edge * source_height / height))
        def source_y(at):
            t = (at - top) / band
            return at * source_height / height + (src_edge - edge * source_height / height) * t * t
        for start in range(top, edge, 4):
            end = min(edge, start + 4)
            strip = scene.resize((1, end - start), RESAMPLE,
                                 box=(left, source_y(start), right, source_y(end)))
            sky.paste(strip, (0, start))
        soil = scene.resize((1, height - edge), RESAMPLE,
                            box=(left, src_edge, right, source_height))
        result.paste(sky, (x, 0))
        result.paste(soil, (x, edge))

    # Use a painted slice from the first pass to cover the two short static lips.
    stone = original.crop(recipe["ledgeSource"])
    for cell, row, cells in layout["ledges"]:
        x, y, span = cell * 16, row * 16, cells * 16
        ledge = stone.resize((span, 14), RESAMPLE)
        visible = Image.new("L", ledge.size)
        for dx in range(span):
            open_depth = min(14, round(interpolate(ridge, x + dx + .5)) - y)
            if open_depth > 0:
                ImageDraw.Draw(visible).line((dx, 0, dx, open_depth - 1), fill=255)
        result.paste(ledge, (x, y), visible)
    return result


def clean_cutout(path):
    sprite = Image.open(path)
    if "A" not in sprite.getbands():
        raise ValueError(f"{path} needs an alpha channel")
    alpha = sprite.getchannel("A")
    low, high = alpha.getextrema()
    if low >= 16 or high < 192:
        raise ValueError(f"{path} needs transparent margins and an opaque object")
    bounds = alpha.point(lambda value: 255 if value >= 32 else 0).getbbox()
    # Preserve the model's edge alpha and spoke openings. Remove only
    # very low alpha dust that can appear across the transparent margin.
    sprite.putalpha(alpha.point(lambda value: value if value >= 16 else 0))
    return sprite.crop(bounds)


def pack(args, recipe, layout, scene):
    repair = Image.open(args.repair).convert("RGB").resize(scene.size, RESAMPLE)
    repaired = composite(scene, repair, recipe)
    repaired.save(args.output / "repaired-reference.png")
    static = register_scene(repaired, scene, recipe, layout)
    static.save(args.output / "scene.webp", quality=88, method=6)

    gear = clean_cutout(args.cutouts / "gear.webp")
    belt = clean_cutout(args.cutouts / "belt.webp")
    piston = clean_cutout(args.cutouts / "piston.webp")
    for name, sprite, size in (
        ("gear", gear, (248, 248)),
        ("feed-belt", belt, (600, 76)),
        ("launch-piston", piston, (180, 88)),
    ):
        sprite.resize(size, RESAMPLE).save(args.output / f"{name}.webp", lossless=True)
    # One complete repeating painted chevron becomes the scrolling belt tread.
    tread_box = tuple(round(fraction * extent) for fraction, extent in
                      zip((.287, .109, .374, .385), (*belt.size, *belt.size)))
    tread = belt.crop(tread_box).resize((32, 11), RESAMPLE)
    tread.convert("RGB").save(args.output / "feed-tread.webp", lossless=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scene", type=Path)
    parser.add_argument("--repair", type=Path)
    parser.add_argument("--cutouts", type=Path, help="Directory with gear.webp, belt.webp and piston.webp")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    recipe = json.loads(RECIPE.read_text())
    layout = json.loads(LAYOUT.read_text())
    args.output.mkdir(parents=True, exist_ok=True)
    scene = Image.open(args.scene).convert("RGB").resize(tuple(recipe["referenceSize"]), RESAMPLE)
    save_inputs(scene, recipe, args.output)
    if bool(args.repair) != bool(args.cutouts):
        parser.error("--repair and --cutouts must be supplied together")
    if args.repair:
        pack(args, recipe, layout, scene)


if __name__ == "__main__":
    main()
