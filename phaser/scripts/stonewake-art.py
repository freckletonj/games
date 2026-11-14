#!/usr/bin/env python3
"""Prepare Stonewake's model inputs and pack the geometry-registered artwork."""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("brassworks_art", HERE / "brassworks-art.py")
brassworks = importlib.util.module_from_spec(spec)
sys.dont_write_bytecode = True
spec.loader.exec_module(brassworks)

LEVELS = HERE.parent / "levels"
LAYOUT = json.loads((LEVELS / "stonewake-hollow.json").read_text())
RECIPE = json.loads((LEVELS / "stonewake-hollow-art.json").read_text())
RESAMPLE = Image.Resampling.LANCZOS


def make_inputs(scene, output):
    for name, box in RECIPE["crops"].items():
        crop = scene.crop(box)
        crop.resize((crop.width * 3, crop.height * 3), RESAMPLE).save(output / f"{name}-crop.png")
    masked = scene.convert("RGBA")
    masked.putalpha(ImageOps.invert(brassworks.patch_mask(scene.size, RECIPE["holes"])))
    masked.save(output / "alpha-holes.png")
    shelf = scene.convert("RGBA")
    shelf.putalpha(ImageOps.invert(brassworks.patch_mask(scene.size, [RECIPE["shelfHole"]])))
    shelf = shelf.crop(RECIPE["shelfPatch"])
    shelf.resize((shelf.width * 4, shelf.height * 4), RESAMPLE).save(output / "shelf-hole.png")


def make_scene(scene, repair, shelf_repair):
    # Repair only the holes, then register the painted cliff edges to the
    # exact collision profile. Preserve the original sky and distant trees.
    blend_recipe = {"holes": RECIPE["holes"], "groundPatch": RECIPE["holes"][0]}
    combined = brassworks.composite(scene, repair, blend_recipe)
    width, height = [LAYOUT[key] * 16 for key in ("width", "height")]
    registration = {"x": RECIPE["horizontalPins"], "ground": RECIPE["terrainEdges"]}
    # Use a clean strip of the repaired shelf, where the boulder used to sit.
    # Compress the panorama's old shelf out of the sky before registering it.
    shelf = combined.crop(tuple(RECIPE["shelfSource"]))
    left, top, right, bottom = RECIPE["shelfPatch"]
    patch = shelf_repair.resize((right - left, bottom - top), RESAMPLE)
    repaired_shelf = combined.copy()
    repaired_shelf.paste(patch, (left, top))
    inner = brassworks.patch_mask(scene.size, [RECIPE["shelfHole"]])
    blend = inner.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(2))
    combined = Image.composite(repaired_shelf, combined, blend)
    # The existing Brassworks warp uses the working reference's dimensions
    # for its sampling, so register terrain before painting our shelf on top.
    layout = {**LAYOUT, "ledges": []}
    result = brassworks.register_scene(combined, combined, {
        "worldSize": [width, height], "registration": registration, "ledgeSource": [0, 0, 1, 1]
    }, layout)
    for x, y, length in LAYOUT["ledges"]:
        ledge = shelf.resize((length * 16, 21), RESAMPLE).convert("RGBA")
        result.paste(ledge, (x * 16, y * 16), ledge)
    return result


def pack(scene, art, output):
    repair = Image.open(art / "alpha-repair.webp").convert("RGB").resize(scene.size, RESAMPLE)
    shelf_repair = Image.open(art / "shelf-repair.webp").convert("RGB")
    panorama = make_scene(scene, repair, shelf_repair)
    spire_source = art / "spire.webp"
    spire = brassworks.clean_cutout(spire_source)
    landscape = panorama.convert("RGBA")
    for piece in LAYOUT["puzzleObjects"]:
        if "platform" not in piece:
            continue
        x, y = piece["platform"]
        bed = y + piece["size"][1] - 3
        pillar_width = piece["size"][0] + 18
        ridge = [(px * 16, py * 16) for px, py in LAYOUT["ridge"]]
        base = round(brassworks.interpolate(ridge, x)) + 7
        pillar = spire.resize((pillar_width, base - bed), RESAMPLE)
        landscape.alpha_composite(pillar, (x - pillar_width // 2, bed))
    landscape.convert("RGB").save(output / "scene.webp", quality=86, method=6)
    for piece in LAYOUT["puzzleObjects"]:
        sprite = brassworks.clean_cutout(art / f"{piece['id']}.webp")
        # Keep genuine outer alpha even at the frame boundary.
        width, height = [dimension * 2 for dimension in piece["size"]]
        frame = Image.new("RGBA", (width, height))
        frame.paste(sprite.resize((width - 2, height - 1), RESAMPLE), (1, 1))
        frame.save(output / f"{piece['id']}.webp", lossless=True)
    creatures = Image.open(art / "creatures.webp").convert("RGBA")
    for i, name in enumerate(("gravelback", "flintfist")):
        sprite = creatures.crop((i * creatures.width // 2, 0, (i + 1) * creatures.width // 2, creatures.height))
        alpha = sprite.getchannel("A")
        sprite.putalpha(alpha.point(lambda a: a if a >= 24 else 0))
        sprite = sprite.crop(sprite.getbbox())
        sprite.thumbnail((114, 112), RESAMPLE)
        frame = Image.new("RGBA", (128, 128))
        frame.paste(sprite, ((128 - sprite.width) // 2, 112 - sprite.height))
        frame.save(output / f"{name}.webp", quality=91, method=6)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scene", type=Path)
    parser.add_argument("--art", type=Path, help="Directory containing the model repair and alpha cutouts")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    scene = Image.open(args.scene).convert("RGB").resize(tuple(RECIPE["referenceSize"]), RESAMPLE)
    if args.art:
        pack(scene, args.art, args.output)
    else:
        make_inputs(scene, args.output)


if __name__ == "__main__":
    main()
