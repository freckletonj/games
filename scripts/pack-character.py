#!/usr/bin/env python3
"""Pack eight painted RGBA poses into Wonderwood's fixed-foot 4x2 atlas."""
import argparse
import json
from pathlib import Path
from PIL import Image

FRAME_NAMES = (
    "idle-0", "idle-1", "run-0", "run-1",
    "run-2", "run-3", "jump", "hurt",
)
ANIMATIONS = {
    "idle": {"frames": [0, 1], "fps": 2},
    "run": {"frames": [2, 3, 4, 5], "fps": 10},
    "jump": {"frames": [6], "fps": 1},
    "fall": {"frames": [6], "fps": 1},
    "eat": {"frames": [1], "fps": 1},
    "happy": {"frames": [1], "fps": 1},
    "hurt": {"frames": [7], "fps": 1},
    "sleep": {"frames": [0], "fps": 1},
    "alert": {"frames": [2], "fps": 1},
}


def pack_character(directory, cell=444, height=340, scale=0.1):
    """Use actual alpha silhouette bounds; never crop based on a painted background."""
    directory = Path(directory)
    if not 0 < height < cell - 24:
        raise ValueError("Pose height must leave space for the fixed foot anchor")
    foot_y = cell - 32
    atlas = Image.new("RGBA", (cell * 4, cell * 2))
    poses = []
    for name in FRAME_NAMES:
        path = directory / "poses" / f"{name}.png"
        pose = Image.open(path).convert("RGBA")
        opaque = pose.getchannel("A").point(lambda value: 255 if value >= 16 else 0)
        box = opaque.getbbox()
        if box is None:
            raise ValueError(f"Empty pose: {path}")
        poses.append(pose.crop(box))

    # All poses share a single scale, even when a crouched or airborne pose is shorter.
    factor = min(height / max(pose.height for pose in poses),
                 (cell - 48) / max(pose.width for pose in poses))
    bounds = []
    for index, pose in enumerate(poses):
        width = round(pose.width * factor)
        scaled_height = round(pose.height * factor)
        pose = pose.resize((width, scaled_height), Image.Resampling.LANCZOS)
        x = index % 4 * cell + (cell - width) // 2
        y = index // 4 * cell + foot_y - scaled_height
        atlas.alpha_composite(pose, (x, y))
        bounds.append((width, scaled_height))

    manifest = {
        "name": directory.name,
        "image": "sheet.png",
        "frameWidth": cell,
        "frameHeight": cell,
        "columns": 4,
        "origin": {"x": cell // 2, "y": foot_y},
        "worldScale": scale,
        "animations": ANIMATIONS,
    }
    atlas.save(directory / "sheet.png", optimize=True)
    (directory / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return bounds


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, help="src/assets/characters/<kind>")
    parser.add_argument("--cell", type=int, default=444)
    parser.add_argument("--height", type=int, default=340)
    parser.add_argument("--world-scale", type=float, default=0.1)
    args = parser.parse_args()
    bounds = pack_character(args.directory, args.cell, args.height, args.world_scale)
    print(f"Packed {args.directory.name}: {len(bounds)} frames, fixed foot pivot")


if __name__ == "__main__":
    main()