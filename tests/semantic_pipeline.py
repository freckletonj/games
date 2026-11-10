"""Regression coverage for semantic PNG -> gameplay level export."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from importlib import import_module

compiler = import_module("compile-semantic-level")


class SemanticPipelineTests(unittest.TestCase):
    def make_mask(self, path, exit_marker=True):
        tile = 4
        width, height = 24, 12
        data = [["empty"] * width for _ in range(height)]
        for y in range(8, height):
            for x in range(width):
                data[y][x] = "ground"
        for x in range(10, 15):
            data[5][x] = "platform"
        data[7][3] = "p1"
        if exit_marker:
            data[7][20] = "exit"
        data[3][12] = "springKey"
        image = Image.new("RGB", (width * tile, height * tile))
        for y in range(height):
            for x in range(width):
                color = compiler.PALETTE[data[y][x]]
                for yy in range(tile):
                    for xx in range(tile):
                        image.putpixel((x * tile + xx, y * tile + yy), color)
        # Noise at an edge should not override a center-voted ground tile.
        image.putpixel((0, 8 * tile), (200, 189, 190))
        image.save(path)

    def test_compiles_and_snaps_to_tiles(self):
        with tempfile.TemporaryDirectory() as directory:
            src = Path(directory) / "semantic.png"
            target = Path(directory) / "level.json"
            self.make_mask(src)
            result = subprocess.run(
                [sys.executable, str(ROOT / "scripts/compile-semantic-level.py"),
                 str(src), "--pixels-per-tile", "4", "--out", str(target)],
                capture_output=True, text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            level = json.loads(target.read_text())
            report = json.loads(target.with_suffix(".report.json").read_text())
            self.assertTrue(report["valid"])
            self.assertEqual((level["width"], level["height"]), (24, 12))
            self.assertEqual(level["grid"][8][0], "ground")
            self.assertEqual(level["grid"][5][12], "platform")
            self.assertEqual(
                {(item["kind"], item["x"], item["y"]) for item in level["objects"]},
                {("p1", 3, 7), ("exit", 20, 7), ("springKey", 12, 3)},
            )
            fixed = Image.open(target.with_suffix(".semantic.png"))
            self.assertEqual(fixed.size, (24, 12))

    def test_missing_exit_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            src = Path(directory) / "semantic.png"
            target = Path(directory) / "level.json"
            self.make_mask(src, exit_marker=False)
            result = subprocess.run(
                [sys.executable, str(ROOT / "scripts/compile-semantic-level.py"),
                 str(src), "--pixels-per-tile", "4", "--out", str(target)],
                capture_output=True, text=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(target.exists())
            report = json.loads(target.with_suffix(".report.json").read_text())
            self.assertIn("Expected exactly one exit marker; found 0", report["errors"])


if __name__ == "__main__":
    unittest.main()
