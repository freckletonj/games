#!/usr/bin/env python3
"""Bake or verify the selected Ancient Sanctuary static painting layers.

Skywell's 3520x2048 guide is the only authority for the three alpha channels.
The user-selected model output has 1644x957 native pixels; resizing here is
EXPLICITLY a visual prototype, not a high-resolution refinement pipeline.
Use stitch-cave-painting.py + extract-painted-layers.py for genuine native
full-world image-generation refinement.

First run: node phaser/scripts/export-cave-guides.mjs
Verify checked-in binary art:
    python phaser/scripts/bake-selected-skywell.py --verify
Re-bake after geometry changes:
    python phaser/scripts/bake-selected-skywell.py --write
"""
import argparse
from pathlib import Path
from PIL import Image, ImageChops

ROOT=Path(__file__).resolve().parents[2]
GUIDES=ROOT/'dist/cave-guides/skywell-ascent'
DEST=ROOT/'phaser/assets/generated/skywell-ancient'
MATERIALS=('solid','water','background')


def alpha_masks():
    with Image.open(GUIDES/'world-static-solid.png') as image:
        solid=image.convert('RGBA').getchannel('A')
    with Image.open(GUIDES/'world-static-water.png') as image:
        water=image.convert('RGBA').getchannel('A')
    if solid.size!=(3520,2048) or water.size!=solid.size:
        raise ValueError('Skywell masks must match the authored 3520x2048 world')
    if ImageChops.multiply(solid,water).getbbox() is not None:
        raise ValueError('A pixel cannot be both solid and swimmable')
    air=ImageChops.invert(ImageChops.lighter(solid,water))
    return dict(solid=solid,water=water,background=air)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    action=parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--verify',action='store_true',
                        help='Test alpha against freshly exported code geometry')
    action.add_argument('--write',action='store_true',
                        help='Bake three world-sized WebP layers from source')
    args=parser.parse_args()
    masks=alpha_masks()
    if args.verify:
        for kind,mask in masks.items():
            path=DEST/f'painted-{kind}.webp'
            with Image.open(path) as layer:
                if layer.size!=mask.size or layer.mode!='RGBA':
                    raise ValueError(f'{path}: wrong dimensions or missing alpha')
                if ImageChops.difference(layer.getchannel('A'),mask).getbbox():
                    raise ValueError(f'{path}: image alpha differs from game geometry')
        print('Skywell Ancient Sanctuary: all 3 committed alpha layers match physics')
        return

    with Image.open(DEST/'skywell-ancient-source.webp') as source:
        if source.size!=(1644,957):
            raise ValueError('Expected the selected 1644x957 generated painting')
        scene=source.convert('RGB').resize((3520,2048),Image.Resampling.LANCZOS)
    for kind,mask in masks.items():
        layer=scene.convert('RGBA')
        layer.putalpha(mask)
        layer.save(DEST/f'painted-{kind}.webp','WEBP',quality=88,method=6)
        print('Wrote',DEST/f'painted-{kind}.webp')


if __name__=='__main__':
    main()
