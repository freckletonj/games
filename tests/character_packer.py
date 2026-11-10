"""The painted sprite packer must preserve alpha and a fixed ground anchor."""
import importlib.util
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
print("PASS: eight painted RGBA frames share one foot anchor")