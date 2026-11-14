#!/usr/bin/env python3
"""Rasterize a rock creature pose plan or pack a painted alpha sprite sheet."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

PLAN = Path(__file__).resolve().parents[1] / "assets/generated/stonewake-hollow/poses/rock-poses.json"


def draw_guide(plan):
    cell = plan["cell"]
    sheet = Image.new("RGB", (plan["columns"] * cell, plan["rows"] * cell), "#f6f3e5")
    for index, (name, head, chest, hip, back_hand, front_hand, back_foot, front_foot) in enumerate(plan["poses"]):
        pose = Image.new("RGB", (cell, cell), "#f6f3e5")
        draw = ImageDraw.Draw(pose)
        draw.rectangle((0, 0, cell - 1, cell - 1), outline="#cbd2c7", width=2)
        draw.line((20, plan["baseline"], 236, plan["baseline"]), fill="#cbd2c7", width=2)
        draw.text((10, 10), f"{index + 1:02d}  {name}", fill="#455354")
        draw.line((hip, back_foot), fill="#77718f", width=19)
        draw.line((chest, back_hand), fill="#77718f", width=16)
        draw.line((hip, chest), fill="#567d80", width=46)
        draw.line((hip, front_foot), fill="#436c72", width=22)
        draw.line((chest, front_hand), fill="#b96547", width=20)
        for (x, y), rx, ry, color in [
            (hip, 23, 21, "#567d80"), (head, 31, 27, "#b19b67"),
            (front_hand, 14, 14, "#b96547"), (back_foot, 18, 6, "#77718f"),
            (front_foot, 18, 6, "#436c72")
        ]:
            draw.ellipse((x-rx, y-ry, x+rx, y+ry), fill=color)
        draw.ellipse((head[0]+16, head[1]-7, head[0]+23, head[1]), fill="#263a43")
        sheet.paste(pose, (index % plan["columns"] * cell, index // plan["columns"] * cell))
    return sheet


def pack_sheet(plan, painted):
    columns, rows = plan["columns"], plan["rows"]
    if painted.mode != "RGBA":
        raise ValueError("The painted sheet must contain model-generated alpha")
    frame_width, frame_height = 160, 128
    atlas = Image.new("RGBA", (columns * frame_width, rows * frame_height))
    for index, (name, head, *_) in enumerate(plan["poses"]):
        col, row = index % columns, index // columns
        box = (round(col*painted.width/columns), round(row*painted.height/rows),
               round((col+1)*painted.width/columns), round((row+1)*painted.height/rows))
        image = painted.crop(box)
        image.putalpha(image.getchannel("A").point(lambda a: a if a >= 36 else 0))
        bounds = image.getchannel("A").point(lambda a: 255 if a > 160 else 0).getbbox()
        if bounds is None:
            raise ValueError(f"Missing painted pose {index + 1}: {name}")
        # Recover a stable body anchor from the planned pose. The punch
        # frames extend in front of the shared origin, as do the guide arms.
        image = image.crop(bounds)
        lift = 9 if name == "jump tuck" else 0
        height = min(102, round((plan["baseline"] - head[1] + 27) * .59) - lift)
        image.thumbnail((146, height), Image.Resampling.LANCZOS)
        x = 79 - round(image.width * (.38 if index in (7, 8, 9, 13, 14) else .48))
        y = 112 - image.height - lift
        atlas.alpha_composite(image, (col*frame_width+x, row*frame_height+y))
    return atlas


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--painted-sheet", type=Path)
    args = parser.parse_args()
    plan = json.loads(PLAN.read_text())
    if args.painted_sheet:
        pack_sheet(plan, Image.open(args.painted_sheet)).save(args.output, quality=91, method=6)
    else:
        draw_guide(plan).save(args.output)


if __name__ == "__main__":
    main()
