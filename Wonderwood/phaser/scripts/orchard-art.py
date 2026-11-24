#!/usr/bin/env python3
"""Export a painted scene's moving decks, green repair input and repaired background."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

GREEN = (0, 255, 0)


def read_image(path, size):
    return Image.open(path).convert("RGB").resize(size, Image.Resampling.LANCZOS)


def repair_mask(spec):
    mask = Image.new("L", tuple(spec["referenceSize"]))
    draw = ImageDraw.Draw(mask)
    for object_art in spec["objects"]:
        left, top, right, bottom = object_art["repairBox"]
        draw.rectangle((left, top, right - 1, bottom - 1), fill=255)
    return mask


def outline_mask(size, outline):
    shape = Image.new("L", size)
    ImageDraw.Draw(shape).polygon([tuple(point) for point in outline], fill=255)
    return shape


def extract(source, spec, output):
    for object_art in spec["objects"]:
        shape = outline_mask(source.size, object_art["outline"])
        box = shape.getbbox()
        sprite = source.crop(box)
        sprite.putalpha(shape.crop(box))
        sprite.save(output / (object_art["id"] + ".webp"), lossless=True)
    green = Image.new("RGB", source.size, GREEN)
    Image.composite(green, source, repair_mask(spec)).save(output / "green-repair.png")


def composite(source, repaired, spec):
    # Use the authored mask, never chroma-key pixels in the returned painting.
    # A feather wholly inside a repair box keeps all outside pixels identical.
    result = source.copy()
    for object_art in spec["objects"]:
        box = tuple(object_art["repairBox"])
        patch = repaired.crop(box)
        weight = Image.new("L", patch.size)
        ImageDraw.Draw(weight).rectangle((2, 2, patch.width - 3, patch.height - 3), fill=255)
        feather = weight.filter(ImageFilter.GaussianBlur(0.8))
        deck = outline_mask(source.size, object_art["outline"]).crop(box)
        result.paste(patch, box[:2], ImageChops.lighter(feather, deck))
    return result


def register_scene(source, spec):
    # Piecewise, axis-aligned pins tie important painted edges to world pixels.
    # Pillow reads each destination rectangle from its matching source quad.
    width, height = spec["worldSize"]
    result = Image.new("RGB", (width, height))
    x_pins, y_pins = spec["registration"]["x"], spec["registration"]["y"]
    for (x0, left), (x1, right) in zip(x_pins, x_pins[1:]):
        for (y0, top), (y1, bottom) in zip(y_pins, y_pins[1:]):
            patch = source.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS,
                                  box=(left, top, right, bottom))
            result.paste(patch, (x0, y0))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--recipe", required=True, type=Path)
    parser.add_argument("--repaired", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    spec = json.loads(args.recipe.read_text())
    source = read_image(args.source, tuple(spec["referenceSize"]))
    args.output.mkdir(parents=True, exist_ok=True)
    extract(source, spec, args.output)
    if args.repaired:
        repaired = read_image(args.repaired, source.size)
        scene = composite(source, repaired, spec)
        scene.save(args.output / "repaired-scene.png")
        register_scene(scene, spec).save(args.output / "scene.webp", quality=88, method=6)


if __name__ == "__main__":
    main()
