#!/usr/bin/env python3
"""Draw the animation plans and register painted alpha frames to their anchors."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

PHASER = Path(__file__).resolve().parents[1]
SKINS = ["hero", "princess", "steampunk"]
BACKGROUND = "#f4f1e8"


def plan_for(name):
    group = "humans" if name in SKINS else "riders" if name == "riders" else "mounts"
    return json.loads((PHASER / "assets" / "poses" / f"{group}.json").read_text())


def dot(draw, point, rx, ry, fill):
    x, y = point
    draw.ellipse((x-rx, y-ry, x+rx, y+ry), fill=fill)


def limb(draw, start, points, fill, width):
    a, b, c, d = points
    draw.line([tuple(start), (a,b), (c,d)], fill=fill, width=width, joint="curve")
    dot(draw, (a,b), width//2, width//2, fill)


def human(pose, skin, riding):
    layer = Image.new("RGBA", (256,256))
    draw = ImageDraw.Draw(layer)
    coat, hair, boots = [("#b55649","#704432","#704b36"),
                         ("#8573b1","#ae793c","#634780"),
                         ("#366d69","#633c35","#69412f")][skin]
    flesh = "#dca780"
    if riding:
        _, head, chest, hip, arm, leg = pose
    else:
        _, head, chest, hip, far, near = pose
        limb(draw, hip, far[4:], "#a49da7", 15)
        dot(draw, (far[6]+3,far[7]-4), 13, 6, "#a49da7")
        limb(draw, chest, far[:4], "#b59a86", 12)
        arm, leg = near[:4], near[4:]
    limb(draw, hip, leg, boots, 18)
    dot(draw, (leg[2]+4,leg[3]-4), 13, 6, boots)
    draw.line([tuple(hip),tuple(chest)], fill=coat, width=30)
    dot(draw, hip, 15, 12, coat)
    dot(draw, chest, 17, 13, coat)
    limb(draw, chest, arm, flesh, 12)
    dot(draw, arm[2:], 7, 7, flesh)
    x, y = head
    draw.line([(x,y+14),tuple(chest)], fill=flesh, width=13)
    dot(draw, (x-12,y-4), 24, 20, hair)
    if skin == 0:
        draw.polygon([(x-19,y-12),(x-47,y-25),(x-58,y-12),(x-48,y+12),(x-29,y+5)], fill=hair)
    elif skin == 1:
        draw.polygon([(x-18,y-19),(x-18,y-34),(x-8,y-26),(x-1,y-37),(x+6,y-25),(x+16,y-31),(x+13,y-18)], fill="#be954b")
        dot(draw, (x-22,y+17), 12, 23, hair)
    else:
        dot(draw, (x-34,y-15), 14, 14, hair)
        draw.rounded_rectangle((x-24,y-22,x+18,y-10), 5, fill="#915941")
        dot(draw, (x+7,y-15), 8, 7, "#ca9b51")
    dot(draw, (x+4,y+3), 18, 19, flesh)
    dot(draw, (x+18,y+6), 7, 5, flesh)
    dot(draw, (x+13,y-1), 3, 4, "#383543")
    return layer


def mount(pose, wing):
    _, rump, chest, head, nose, seat, legs = pose
    layer = Image.new("RGBA", (256,256))
    draw = ImageDraw.Draw(layer)
    pink = "#c180ad" if wing is None else "#c9ac69"
    coat = "#c9a2c6" if wing is None else "#b4c5d8"
    x, y = rump
    draw.line([(x,y-4),(x-24,y-9),(x-40,y+10),(x-55,y+19),(x-68,y+14)], fill=pink, width=18, joint="curve")
    for index, points in enumerate(legs):
        start = rump if index < 2 else chest
        color = "#9994ae" if index % 2 == 0 else coat
        limb(draw, start, points, color, 16)
        dot(draw, (points[2]+3,points[3]-3), 11, 6, "#9a8069")
    draw.line([tuple(rump),tuple(chest)], fill=coat, width=44)
    dot(draw, rump, 24, 22, coat)
    dot(draw, chest, 24, 22, coat)
    draw.line([tuple(chest),tuple(head)], fill=coat, width=32)
    x,y = head
    draw.line([(chest[0]-10,chest[1]-14),(x-16,y-2)], fill=pink, width=17)
    draw.polygon([(x-11,y+3),(x-17,y-20),(x-6,y-13),(x-1,y+1)], fill=pink)
    draw.line([tuple(head),tuple(nose)], fill=coat, width=24)
    dot(draw, head, 17, 17, coat)
    dot(draw, nose, 14, 10, coat)
    dot(draw, (x+7,y+1), 3, 4, "#394052")
    if wing is None:
        draw.polygon([(x+10,y-7),(x+29,y-40),(x+20,y-6)], fill="#c4a667")
    else:
        draw.polygon([tuple(p) for p in wing], fill="#e4edf0", outline="#778da9", width=2)
    sx,sy = seat
    draw.arc((sx-21,sy-1,sx+21,sy+22), 5, 175, fill="#a48057", width=5)
    return layer


def silhouettes(name, plan):
    if name == "riders":
        return [(pose[0], human(pose,i,True)) for i in range(3) for pose in plan["poses"]]
    if name in SKINS:
        return [(pose[0], human(pose,SKINS.index(name),False)) for pose in plan["poses"]]
    return [(pose[0], mount(pose, plan["wings"][i] if name == "pegasus" else None))
            for i,pose in enumerate(plan["poses"])]


def draw_guide(plan, layers):
    cell, columns = plan["cell"], plan["columns"]
    sheet = Image.new("RGB",(columns*cell,len(layers)//columns*cell),BACKGROUND)
    for i,(label,layer) in enumerate(layers):
        panel = Image.new("RGB",(cell,cell),BACKGROUND)
        draw = ImageDraw.Draw(panel)
        draw.rectangle((0,0,cell-1,cell-1), outline="#c8cec4", width=2)
        draw.line((16,plan["origin"][1],240,plan["origin"][1]), fill="#d5d4c9", width=2)
        draw.text((10,9),f"{i+1:02d}  {label}",fill="#535c5b")
        panel.paste(layer, (0,0), layer)
        sheet.paste(panel, (i%columns*cell,i//columns*cell))
    return sheet


def geometry(plan):
    cell = plan["cell"]
    width,height = plan["frame"]
    scale = min(width/cell, height/cell)
    offset = ((width-cell*scale)/2, (height-cell*scale)/2)
    return scale, offset


def manifest_for(name, plan):
    scale, (left,top) = geometry(plan)
    width,height = plan["frame"]
    x,y = plan["origin"]
    manifest = {"name":name,"image":"sheet.webp","frameWidth":width,"frameHeight":height,
                "columns":plan["columns"],"origin":{"x":left+x*scale,"y":top+y*scale},
                "worldScale":plan["worldScale"]}
    if name == "riders":
        manifest["explorers"] = plan["explorers"]
    else:
        manifest["animations"] = dict(plan["animations"])
    if name in ("pegasus","unicorn"):
        manifest["seats"] = [[round((pose[5][0]-x)*scale,3),round((pose[5][1]-y)*scale,3)]
                             for pose in plan["poses"]]
        manifest["riderFrames"] = plan["riderFrames"]
        deltas = plan["seatAdjustments"][name]
        manifest["seats"] = [[x+dx,y+dy] for (x,y),(dx,dy) in zip(manifest["seats"],deltas)]
    if name == "pegasus":
        manifest["animations"]["flap"] = plan["flap"]
    return manifest


def pack_sheet(plan, layers, painted):
    columns = plan["columns"]
    rows = len(layers)//columns
    width, height = plan["frame"]
    scale, inset = geometry(plan)
    atlas = Image.new("RGBA",(columns*width,rows*height))
    if painted.mode != "RGBA":
        raise ValueError("Expected a true-alpha painted sheet")
    for i,(label,guide) in enumerate(layers):
        col,row = i%columns,i//columns
        patch = painted.crop((round(col*painted.width/columns),round(row*painted.height/rows),
                              round((col+1)*painted.width/columns),round((row+1)*painted.height/rows)))
        alpha = patch.getchannel("A")
        if min(alpha.getpixel(pt) for pt in [(3,3),(patch.width-4,3),
               (3,patch.height-4),(patch.width-4,patch.height-4)]) > 100:
            raise ValueError(f"Pose {i+1} ({label}) has a background matte")
        # Keep the model's alpha edge while removing translucent background haze.
        alpha = alpha.point(lambda a: round(255*max(0,a-120)/(255-120)))
        patch.putalpha(alpha)
        bounds = alpha.getbbox()
        if bounds is None:
            raise ValueError(f"Missing painted pose {i+1} ({label})")
        l,t,r,b = guide.getbbox()
        x,y = round(inset[0]+l*scale),round(inset[1]+t*scale)
        w,h = round(inset[0]+r*scale)-x,round(inset[1]+b*scale)-y
        patch = patch.crop(bounds).resize((w,h),Image.Resampling.LANCZOS)
        atlas.alpha_composite(patch,(col*width+x,row*height+y))
    return atlas


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("name",choices=[*SKINS,"unicorn","pegasus","riders"])
    parser.add_argument("output",type=Path)
    parser.add_argument("--painted-sheet",type=Path)
    parser.add_argument("--manifest", type=Path)
    args = parser.parse_args()
    plan = plan_for(args.name)
    if args.manifest:
        args.manifest.write_text(json.dumps(manifest_for(args.name,plan),indent=2)+"\n")
    layers = silhouettes(args.name,plan)
    if args.painted_sheet:
        atlas = pack_sheet(plan,layers,Image.open(args.painted_sheet))
        atlas.save(args.output,quality=92,method=6)
    else:
        draw_guide(plan,layers).save(args.output)


if __name__ == "__main__":
    main()
