#!/usr/bin/env python3
"""Pack the approved Cavern Ascent composition at its authored world resolution."""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
LEVEL = ROOT / "phaser/levels/cavern-ascent.json"
SOURCE = ROOT / "temp/cave.png"
OUTPUT = ROOT / "phaser/assets/generated/cavern-ascent/scene.webp"


def main():
    layout = json.loads(LEVEL.read_text())
    width = layout["width"] * layout["tile"]
    height = layout["height"] * layout["tile"]
    painting = Image.open(SOURCE).convert("RGB")
    if abs(painting.width / painting.height - width / height) > 0.002:
        raise ValueError("The source painting must match the cavern's authored aspect ratio")
    composition = painting.resize((width, height), Image.Resampling.LANCZOS)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    composition.save(OUTPUT, "WEBP", quality=87, method=6)
    print(f"Packed Cavern Ascent {painting.size} to {(width, height)}: {OUTPUT}")


if __name__ == "__main__":
    main()
