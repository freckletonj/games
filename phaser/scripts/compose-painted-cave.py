#!/usr/bin/env python3
"""Bake a model-generated Skywell painting against the authored physics.

Requires Pillow and NumPy (authoring only, never runtime dependencies).
The source image MUST contain static scenery only. This script projects its
texture onto exact air/rock/water regions, walls and physical landing ledges.
"""
import argparse
import json
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source',type=Path,help='maximum-resolution model-painted static cave PNG/WebP')
parser.add_argument('--output',type=Path,default=None,help='destination WebP asset')
args=parser.parse_args()

root=Path(__file__).resolve().parents[2]
output=args.output or root/'phaser/assets/generated/skywell-ascent.webp'
js="""
import {compileCave,skywellLayout} from './phaser/src/cave-layout.js';
const level=compileCave(skywellLayout),width=level.width*16;
const xs=Array.from({length:width},(_,x)=>x+.5);
console.log(JSON.stringify({
  width,height:level.height*16,
  roof:xs.map(level.cave.ceilingAt),
  floor:xs.map(level.cave.groundAt),
  pools:level.waterBodies,
  shelves:level.platformSegments,
  walls:level.climbWalls
}));
"""
geometry=json.loads(subprocess.check_output(
    ['node','--input-type=module','-e',js],cwd=root,text=True
))
w,h=geometry['width'],geometry['height']
source=Image.open(args.source).convert('RGB')
ratio=w/h
if source.width<1536 or source.height<850:
    raise ValueError('Use the image generator maximum native output, not a thumbnail')
if abs(source.width/source.height-ratio)>ratio*.02:
    raise ValueError('Painting aspect ratio differs from code-authored world')
painting=source.resize((w,h),Image.Resampling.LANCZOS)
background=np.asarray(ImageEnhance.Brightness(
    painting.filter(ImageFilter.GaussianBlur(17))).enhance(.64),dtype=np.uint8)
texture=np.asarray(ImageEnhance.Sharpness(painting).enhance(1.32),dtype=np.uint8)
ys=np.arange(h,dtype=np.float32)[:,None]+.5
floor=np.asarray(geometry['floor'],dtype=np.float32)
roof=np.asarray(geometry['roof'],dtype=np.float32)
solid=(ys<roof)|(ys>=floor)
water=np.zeros((h,w),dtype=bool)
for p in geometry['pools']:
    water[:,p['start']*16:p['end']*16]|=ys>=p['surface']*16
water &= ~solid
canvas=background.copy()
stone=(texture.astype(np.float32)*.64+
    np.array([44,55,67],dtype=np.float32)*.36).astype(np.uint8)
canvas[solid]=stone[solid]
aqua=(texture.astype(np.float32)*.37+
    np.array([20,125,165],dtype=np.float32)*.63).astype(np.uint8)
canvas[water]=aqua[water]
image=Image.fromarray(canvas,'RGB')
brush=ImageDraw.Draw(image,'RGBA')
brush.line([(x,float(floor[x])-2) for x in range(0,w,4)],
    fill=(141,194,151,115),width=7,joint='curve')
brush.line([(x,float(roof[x])+2) for x in range(0,w,4)],
    fill=(159,199,197,80),width=5,joint='curve')
for p in geometry['pools']:
    y=p['surface']*16
    for x in range(p['start']*16,p['end']*16,3):
        if floor[min(w-1,x)]>y:
            brush.line((x,y,x+3,y),fill=(154,245,245,180),width=3)
        if x%64<3 and floor[min(w-1,x)]>y+12:
            brush.arc((x,y+7,x+38,y+17),0,170,
                fill=(181,243,237,90),width=2)
for wall in geometry['walls']:
    x=int(wall['x']*16)
    top=int(wall['top']*16)
    bottom=min(int(wall['bottom']*16),int(floor[x]))
    if bottom<=top:continue
    brush.rounded_rectangle((x-11,top,x+11,bottom),radius=7,
        fill=(78,74,69,220),outline=(179,145,97,210),width=2)
    brush.line([(x-3,top+6),(x+2,top+(bottom-top)*.3),
        (x-3,top+(bottom-top)*.62),(x+2,bottom-8)],
        fill=(250,173,80,228),width=5,joint='curve')
    for k in range(8):
        px=x-8+int((math.sin(x*17+k*3)+1)*7)
        py=top+int((k+.5)*(bottom-top)/9)
        brush.ellipse((px-2,py-2,px+2,py+2),fill=(255,210,139,155))
for ledge in geometry['shelves']:
    left=int(ledge['x']*16)
    right=int((ledge['x']+ledge['length'])*16)
    top=int(ledge['y']*16)
    brush.polygon([(left+4,top+3),(right-5,top+3),
        (right-15,top+17),(left+10,top+19)],fill=(43,61,61,236))
    brush.line((left+4,top+3,right-4,top+3),
        fill=(189,210,125,240),width=6)
    brush.line((left+8,top-1,right-8,top-1),
        fill=(230,229,158,180),width=2)
    for px in range(left+15,right-8,27):
        length=3+(int(2*(1+math.sin(px*.37))))*3
        brush.line((px,top+8,px-2,top+8+length),
            fill=(67,130,94,160),width=2)
output.parent.mkdir(parents=True,exist_ok=True)
image.save(output,format='WEBP',quality=85,method=6)
print(f'Baked {output}: {w}×{h}, {output.stat().st_size} bytes')