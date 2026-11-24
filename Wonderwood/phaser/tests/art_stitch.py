"""Local authoring regression for full-scene painting refinement and seams.

Run: python phaser/tests/art_stitch.py  (requires Pillow)
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSEMBLER = ROOT / "phaser/scripts/stitch-cave-painting.py"


def main():
    with tempfile.TemporaryDirectory() as folder:
        root = Path(folder)
        plan = {
            "world": {"width": 64, "height": 32},
            "overlap": {"horizontal": 16, "vertical": 0},
            "patches": [
                {"id": "left", "x": 0, "y": 0, "width": 40, "height": 32,
                 "painting": "left.png"},
                {"id": "right", "x": 24, "y": 0, "width": 40, "height": 32,
                 "painting": "right.png"},
            ],
        }
        (root / "plan.json").write_text(json.dumps(plan))
        for file in ("left.png", "right.png"):
            Image.new("RGB", (40, 32), (50, 110, 180)).save(root / file)
        command = [sys.executable, str(ASSEMBLER), str(root / "plan.json"),
                   "--output", str(root / "whole.png")]
        subprocess.run(command, check=True, capture_output=True, text=True)
        with Image.open(root / "whole.png") as image:
            assert image.size == (64, 32)
            assert image.getpixel((0, 0)) == (50, 110, 180)
            assert image.getpixel((27, 15)) == (50, 110, 180)
            assert image.getpixel((63, 31)) == (50, 110, 180)

        # Deliberately conflicting crops must be rejected, not silently blended.
        Image.new("RGB", (40, 32), (250, 20, 50)).save(root / "right.png")
        wrong = subprocess.run(command, capture_output=True, text=True)
        assert wrong.returncode != 0
        assert "seam mismatch" in wrong.stderr

        # Upscaling a small image as though it were a native crop is prohibited.
        Image.new("RGB", (20, 16), (50, 110, 180)).save(root / "right.png")
        low_res = subprocess.run(command, capture_output=True, text=True)
        assert low_res.returncode != 0
        assert "low-res upscales" in low_res.stderr
    print("Art crop assembly and seam checks passed")


if __name__ == "__main__":
    main()
