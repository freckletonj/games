"""The painted sprite packer must preserve alpha and a fixed ground anchor."""
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("pack_character", root / "scripts" / "pack-character.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

with TemporaryDirectory() as tmp:
    character = Path(tmp) / "tideling"
    poses = character / "poses"
    poses.mkdir(parents=True)
    for index, name in enumerate(module.FRAME_NAMES):
        image = Image.new("RGBA", (160, 200), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        draw.ellipse((60 - index, 50, 105, 130 - index), fill=(83, 180, 206, 255))
        draw.rectangle((75, 120 - index, 91, 180), fill=(255, 216, 151, 255))
        image.save(poses / f"{name}.png")
    sizes = module.pack_character(character, cell=128, height=86)
    assert len(sizes) == 8
    assert (character / "manifest.json").is_file()
    sheet = Image.open(character / "sheet.png").convert("RGBA")
    assert sheet.size == (512, 256)
    for index in range(8):
        cell = sheet.crop((index % 4 * 128, index // 4 * 128,
                           (index % 4 + 1) * 128, (index // 4 + 1) * 128))
        assert cell.getchannel("A").getbbox()
        assert cell.getchannel("A").getbbox()[3] == 96
        assert cell.getpixel((0, 0))[3] == 0
# Verify shipped WebP atlases are true RGBA art, rather than painted
# rectangular backgrounds or frames with baked cast shadows underneath.
for name in ("mossback", "prismtail", "glimmermoth", "cloudwhisp"):
    directory = root / "src" / "assets" / "characters" / name
    manifest = json.loads((directory / "manifest.json").read_text())
    image = Image.open(directory / manifest["image"])
    width, height = manifest["frameWidth"], manifest["frameHeight"]
    columns, rows = manifest["columns"], 3
    assert image.size == (columns * width, rows * height), name
    alpha = image.getchannel("A")
    for row in range(rows):
        for col in range(columns):
            x, y = col * width, row * height
            cell = alpha.crop((x, y, x + width, y + height))
            assert cell.getbbox(), (name, row, col)
            # Keep the bottom eighth clear of baked cast shadows.
            ground_shadow = cell.crop((0, height * 7 // 8, width, height))
            assert ground_shadow.getextrema()[1] == 0, (name, row, col)

print("PASS: eight packed poses share one foot anchor and shipped atlases preserve alpha")
