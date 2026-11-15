#!/usr/bin/env python3
"""Register the Monkey Jungle panorama and pack its two moving cutouts."""
import argparse
from pathlib import Path

from PIL import Image

DESTINATION = Path(__file__).resolve().parents[1] / "assets/generated/monkey-jungle"
# The painted guide was inspected at 1000 x 481. These landmarks put the
# painted cliff tops, gorge floors, and bough shelves on the compiled route.
X_PAINT = [0, 217, 229, 319, 331, 465, 473, 562, 576, 723, 735, 821, 837, 1000]
X_WORLD = [0, 368, 384, 544, 560, 768, 784, 960, 976, 1200, 1216, 1392, 1408, 1664]
Y_PAINT = [0, 260, 284, 304, 325, 452, 481]
Y_WORLD = [0, 448, 480, 512, 544, 752, 800]


def panorama(painted):
    scene = Image.new("RGB", (X_WORLD[-1], Y_WORLD[-1]))
    for col, (left, right) in enumerate(zip(X_WORLD, X_WORLD[1:])):
        for row, (top, bottom) in enumerate(zip(Y_WORLD, Y_WORLD[1:])):
            region = (X_PAINT[col]*painted.width/1000, Y_PAINT[row]*painted.height/481,
                      X_PAINT[col+1]*painted.width/1000, Y_PAINT[row+1]*painted.height/481)
            patch = painted.transform((right-left, bottom-top), Image.Transform.EXTENT,
                                       region, Image.Resampling.BICUBIC)
            scene.paste(patch, (left, top))
    return scene


def cutout(source, clear, solid):
    alpha = source.getchannel("A").point(
        lambda value: max(0, min(255, round((value-clear)*255/(solid-clear)))))
    source.putalpha(alpha)
    return source.crop(alpha.getbbox())


def monkey_atlas(painted):
    size = 192
    atlas = Image.new("RGBA", (4*size, 2*size))
    # Baseline is the feet. The two airborne frames retain vertical clearance.
    for index, target_height in enumerate([134, 112, 131, 116, 108, 126, 146, 134]):
        x, y = index % 4, index // 4
        panel = painted.crop((round(x*painted.width/4), round(y*painted.height/2),
                              round((x+1)*painted.width/4), round((y+1)*painted.height/2)))
        patch = cutout(panel, 94, 242)
        width = min(176, round(target_height*patch.width/patch.height))
        patch = patch.resize((width, target_height), Image.Resampling.LANCZOS)
        atlas.alpha_composite(patch, (x*size+(size-width)//2, y*size+164-target_height))
    return atlas


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("painting", type=Path)
    parser.add_argument("monkey", type=Path)
    parser.add_argument("rope", type=Path)
    args = parser.parse_args()
    DESTINATION.mkdir(parents=True, exist_ok=True)
    scene = panorama(Image.open(args.painting).convert("RGB"))
    scene.save(DESTINATION / "scene.webp", quality=93, method=6)
    monkey_atlas(Image.open(args.monkey).convert("RGBA")).save(
        DESTINATION / "monkey.webp", quality=94, method=6)
    rope = cutout(Image.open(args.rope).convert("RGBA"), 94, 242)
    rope.resize((48, 640), Image.Resampling.LANCZOS).save(
        DESTINATION / "rope.webp", quality=94, method=6)


if __name__ == "__main__":
    main()
