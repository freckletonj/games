"""Verify the painted Temple solid plane uses the exact compiled alpha mask.

This check runs after export-future-chapter-guides.mjs. The picture itself
never contributes to the production collision or tide simulation.
"""
from pathlib import Path

from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[2]
directory = root / "phaser/assets/generated/sunken-temple"
guides = root / "dist/future-chapter-guides/sunken-temple"

solid = Image.open(directory / "solid.webp").convert("RGBA")
background = Image.open(directory / "background.webp")
physical = Image.open(guides / "world-static-solid.png").convert("RGBA")
static_water = Image.open(guides / "world-static-water.png").convert("RGBA")

assert solid.size == background.size == physical.size == (3584, 1024)
assert ImageChops.difference(solid.getchannel("A"), physical.getchannel("A")).getbbox() is None
assert ImageChops.multiply(solid.getchannel("A"), static_water.getchannel("A")).getbbox() is None

for name in ["raft", "crate", "valve", "sluice-gate", "wheel-gate",
             "waterwheel", "bridge"]:
    sprite = Image.open(directory / f"{name}.webp")
    assert sprite.mode == "RGBA", name
    low, high = sprite.getchannel("A").getextrema()
    assert low == 0 and high == 255, f"{name} needs transparent and opaque pixels"

print("Temple artwork: exact world-sized static alpha, no static water, seven alpha sprite sources")
