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
    group = "humans" if name in SKINS else "mounts" if name in ("unicorn", "pegasus") else name
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


def tidefox(pose):
    _, body, head, tail_base, tail_bend, tail_tip, far_fin, near_fin = pose
    layer = Image.new("RGBA", (256, 256))
    draw = ImageDraw.Draw(layer)
    x, y = body
    tx, ty = tail_tip
    draw.line([body, tail_base, tail_bend, tail_tip], fill="#447baf", width=25, joint="curve")
    draw.polygon([(tx-9,ty-21),(tx+22,ty-18),(tx+27,ty+11),(tx+1,ty+16)], fill="#37638e")
    draw.line([body, far_fin], fill="#29608a", width=15)
    dot(draw, far_fin, 13, 6, "#29608a")
    dot(draw, body, 35, 24, "#4c9bc6")
    dot(draw, (x+8,y+10), 28, 14, "#d0e5e5")
    draw.line([(x+2,y-3), near_fin], fill="#417dad", width=16)
    dot(draw, near_fin, 14, 7, "#417dad")
    x, y = head
    draw.polygon([(x-31,y-23),(x-8,y-13),(x-10,y+5)], fill="#2f6797")
    draw.polygon([(x-18,y-31),(x+3,y-16),(x-5,y-4)], fill="#d2aa69")
    dot(draw, head, 25, 20, "#468db7")
    dot(draw, (x+15,y+11), 26, 12, "#ede5df")
    dot(draw, (x+10,y-3), 5, 6, "#203654")
    dot(draw, (x+39,y+8), 4, 4, "#203654")
    return layer


def moonwing(pose):
    _, body, head, tail, far_foot, near_foot, wing = pose
    layer = Image.new("RGBA", (256, 256))
    draw = ImageDraw.Draw(layer)
    draw.line([body, tail], fill="#6c60a1", width=23)
    x, y = body
    for foot, color in ((far_foot, "#9f7766"), (near_foot, "#c18d64")):
        draw.line([(x,y+13), foot], fill=color, width=8)
        dot(draw, foot, 10, 4, color)
    dot(draw, body, 39, 27, "#a896c7")
    dot(draw, (x+15,y+7), 29, 22, "#e4d7cb")
    draw.polygon([tuple(point) for point in wing], fill="#7869ad", outline="#efdbaf", width=4)
    wx, wy = wing[0]
    draw.arc((wx-25,wy+3,wx-7,wy+20), 65, 290, fill="#f7e2b0", width=4)
    x, y = head
    draw.polygon([(x-27,y-13),(x-26,y-32),(x-9,y-20),(x+9,y-18),
                  (x+27,y-33),(x+24,y-7)], fill="#8d79be")
    dot(draw, head, 30, 23, "#a491ca")
    dot(draw, (x+13,y+4), 20, 18, "#f4dfcf")
    dot(draw, (x+16,y), 7, 8, "#372c55")
    draw.polygon([(x+30,y+2),(x+42,y+9),(x+28,y+15)], fill="#c49770")
    return layer


def emberkit(pose):
    _, body, head, tail_base, tail_bend, tail_tip, far_hand, near_hand, far_foot, near_foot = pose
    layer = Image.new("RGBA", (256, 256))
    draw = ImageDraw.Draw(layer)
    x, y = body
    tx, ty = tail_tip
    draw.line([body, tail_base, tail_bend, tail_tip], fill="#d97a45", width=31, joint="curve")
    dot(draw, tail_tip, 15, 14, "#eedbbd")
    draw.line([(x-7,y+16), far_foot], fill="#af694c", width=16)
    dot(draw, far_foot, 12, 5, "#613d31")
    draw.line([(x+7,y+15), near_foot], fill="#de8750", width=16)
    dot(draw, near_foot, 13, 5, "#6c4231")
    draw.line([body, far_hand], fill="#a86345", width=13)
    dot(draw, body, 26, 28, "#875b46")
    draw.polygon([(x+24,y-23),(x-12,y-32),(tx+12,ty+6),
                  (x-23,y+1),(x+17,y-4)], fill="#347c86")
    draw.line([(x+12,y-6),near_hand], fill="#c8774b", width=13)
    dot(draw, near_hand, 8, 7, "#f2ddbd")
    x, y = head
    draw.polygon([(x-27,y-10),(x-39,y-31),(x-9,y-18),
                  (x-10,y-38),(x+12,y-20)], fill="#763f32")
    dot(draw, head, 27, 22, "#e48a50")
    dot(draw, (x+17,y+11), 24, 13, "#f5e2c3")
    dot(draw, (x+12,y-3), 6, 8, "#51392f")
    dot(draw, (x+40,y+8), 4, 4, "#4a3029")
    return layer


def mossback(pose):
    _, shell, head, far_rear, far_front, near_rear, near_front = pose
    layer = Image.new("RGBA", (256, 256))
    draw = ImageDraw.Draw(layer)
    x, y = shell
    for foot, dx, color in ((far_rear,-36,"#52695c"), (far_front,31,"#52695c"),
                            (near_rear,-37,"#6c8b74"), (near_front,35,"#6c8b74")):
        draw.line([(x+dx,y+19),foot], fill=color, width=23)
        dot(draw, foot, 15, 6, color)
    dot(draw, (x,y+10), 71, 36, "#53695e")
    draw.line([(x+41,y+10),head], fill="#7e9572", width=29)
    dot(draw, (x-5,y-16), 73, 49, "#7a7767")
    draw.arc((x-72,y-63,x+53,y+32), 170, 349, fill="#879a4a", width=16)
    for dx, dy, rx, ry in ((-52,-28,20,14),(-23,-45,30,16),(18,-44,26,17),
                           (45,-23,22,13),(-18,-20,23,13),(-42,5,19,11),(25,8,22,12)):
        dot(draw, (x+dx,y+dy),rx,ry,"#8c9e55")
    for dx, dy in ((-39,-19),(-23,-61),(25,-52)):
        dot(draw, (x+dx,y+dy),7,6,"#d89a9b")
    x, y = head
    dot(draw, head, 29, 23, "#829c77")
    dot(draw, (x+8,y+9), 24, 12, "#c5bc8f")
    dot(draw, (x+10,y-3), 5, 6, "#33433a")
    return layer


def prismtail(pose):
    _, body, head, tail, far_rear, far_front, near_rear, near_front = pose
    layer = Image.new("RGBA", (256, 256))
    draw = ImageDraw.Draw(layer)
    x, y = body
    tx, ty = tail
    draw.line([body, tail], fill="#c68cb1", width=17)
    for offset, color in ((12,"#a092ca"),(4,"#89bbb9"),(-5,"#f0bd7a"),(-14,"#e996a4")):
        draw.polygon([(tx+26,ty+17),(tx-16,ty+13+offset),(tx-37,ty+4+offset),
                      (tx-43,ty-12+offset),(tx-16,ty-20+offset),(tx+12,ty-12+offset)],
                     fill=color)
    for foot, dx, color in ((far_rear,-29,"#ae7a75"), (far_front,24,"#ae7a75"),
                            (near_rear,-25,"#d28d7a"), (near_front,32,"#d28d7a")):
        draw.line([(x+dx,y+10),foot], fill=color, width=16)
        dot(draw, foot, 11, 5, color)
    dot(draw, body, 42, 24, "#df9b88")
    draw.line([(x+20,y),head], fill="#df9b88", width=24)
    x, y = head
    draw.polygon([(x-19,y-5),(x-48,y-39),(x-20,y-33),(x+1,y-13)], fill="#bb7883")
    draw.polygon([(x-1,y-9),(x-25,y-43),(x+4,y-35),(x+14,y-12)], fill="#d79292")
    dot(draw, head, 23, 20, "#e4a28d")
    dot(draw, (x+15,y+8), 19, 10, "#f4d6bb")
    dot(draw, (x+12,y-3), 5, 6, "#694553")
    dot(draw, (x+33,y+7), 3, 3, "#694553")
    return layer


CREATURES = {
    "tideling": tidefox, "skyling": moonwing, "emberkit": emberkit,
    "mossback": mossback, "prismtail": prismtail,
}


def silhouettes(name, plan):
    if name == "riders":
        return [(pose[0], human(pose,i,True)) for i in range(3) for pose in plan["poses"]]
    if name in SKINS:
        return [(pose[0], human(pose,SKINS.index(name),False)) for pose in plan["poses"]]
    if name in CREATURES:
        return [(pose[0], CREATURES[name](pose)) for pose in plan["poses"]]
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


def pack_sheet(plan, layers, painted, alpha_range):
    columns = plan["columns"]
    rows = len(layers)//columns
    width, height = plan["frame"]
    scale, inset = geometry(plan)
    clear, solid = alpha_range
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
        alpha = alpha.point(lambda a: min(255, round(255*max(0,a-clear)/(solid-clear))))
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
    parser.add_argument("name",choices=[*SKINS,*CREATURES,"unicorn","pegasus","riders"])
    parser.add_argument("output",type=Path)
    parser.add_argument("--painted-sheet",type=Path)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--pixel-scale", type=int, default=1,
                        help="Multiply texture dimensions while preserving world size")
    parser.add_argument("--alpha-range", nargs=2, type=int, default=(120, 255),
                        metavar=("CLEAR", "SOLID"), help="Input alpha levels for clear and opaque")
    args = parser.parse_args()
    if args.pixel_scale < 1:
        parser.error("--pixel-scale must be a positive integer")
    if not 0 <= args.alpha_range[0] < args.alpha_range[1] <= 255:
        parser.error("--alpha-range must increase from clear to solid within 0–255")
    plan = plan_for(args.name)
    plan["frame"] = [edge * args.pixel_scale for edge in plan["frame"]]
    plan["worldScale"] /= args.pixel_scale
    if args.name in ("unicorn", "pegasus"):
        plan["seatAdjustments"][args.name] = [
            [x * args.pixel_scale, y * args.pixel_scale]
            for x, y in plan["seatAdjustments"][args.name]
        ]
    if args.manifest:
        args.manifest.write_text(json.dumps(manifest_for(args.name,plan),indent=2)+"\n")
    layers = silhouettes(args.name,plan)
    if args.painted_sheet:
        atlas = pack_sheet(plan,layers,Image.open(args.painted_sheet),args.alpha_range)
        atlas.save(args.output,quality=92,method=6)
    else:
        draw_guide(plan,layers).save(args.output)


if __name__ == "__main__":
    main()
