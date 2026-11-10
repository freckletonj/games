"""Deterministic semantic pixel maps: 1 pixel = 16 world units. No image-generation ambiguity."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'src/games/animal-adventure/levels'
COLORS = {
    'empty':'#ffffff','ground':'#101820','platform':'#5f5b85','water':'#176ad7','p1':'#00ed31','p2':'#91fe54',
    'exit':'#ff152b','springaroo':'#ffdc12','skyling':'#00eeef','tideling':'#ef851a',
    'snack':'#ff64bb','skyKey':'#b052fc','diveKey':'#167b86','springKey':'#e83c86',
    'checkpoint':'#aaaaaa','cloudwhisp':'#9480ed','prismtail':'#ff895d','mossback':'#6b9c42',
    'glimmermoth':'#ce6dff','emberkit':'#fc5d3e','starShard':'#f2f28a',
    'thermal':'#8af1f9','prismKey':'#ffa03e','mossKey':'#82e561','cloudKey':'#c9adfb','emberKey':'#f54848',
}

chapters = [
    dict(file='first-forest.png',width=260,height=42,ground=30,
        water=[(111,129),(211,223)],
        platforms=[(23,28,8),(30,25,6),(39,22,6),(45,19,5),(61,27,7),(68,24,6),(75,21,5),
                  (90,27,8),(99,25,6),(101,21,5),(141,26,7),(151,22,6),(158,18,6),
                  (164,14,5),(177,27,8),(185,24,7),(197,25,6),(229,26,8),(237,23,6)],
        keys=[('springKey',47,12),('skyKey',167,5),('diveKey',121,35)],
        creatures=[('springaroo',16),('springaroo',42),('skyling',152),('skyling',161),('tideling',102),('tideling',211),
                   ('cloudwhisp',64),('prismtail',83),('mossback',137),('glimmermoth',180),('emberkit',201),('springaroo',233)],
        checkpoints=[77,150,230],
        shards=[(27,24),(42,17),(70,20),(95,22),(149,19),(166,6),(192,21),(236,20)]),
    dict(file='crystal-coast.png',width=296,height=44,ground=31,
        water=[(53,69),(129,156),(240,260)],
        platforms=[(18,28,8),(25,25,7),(34,22,6),(42,19,7),(72,28,8),(82,25,6),(94,22,6),
                   (104,19,7),(115,26,7),(158,28,8),(170,25,7),(182,22,7),(190,19,6),
                   (202,27,8),(216,24,6),(225,20,6),(270,27,8),(280,24,7)],
        keys=[('prismKey',116,27),('mossKey',196,16),('diveKey',248,37)],
        creatures=[('prismtail',22),('prismtail',44),('tideling',46),('tideling',235),('mossback',164),
                   ('mossback',190),('springaroo',77),('cloudwhisp',101),('skyling',119),('glimmermoth',208),
                   ('emberkit',226),('prismtail',271)],
        checkpoints=[84,175,267],
        shards=[(36,19),(45,16),(86,22),(107,16),(149,28),(193,15),(221,21),(251,38),(283,21)]),
    dict(file='starfall-summit.png',width=320,height=46,ground=33,
        water=[(91,108),(201,221),(278,289)],
        platforms=[(22,30,8),(30,27,7),(38,24,7),(49,21,6),(56,17,6),(68,29,7),(77,25,6),
                   (112,30,7),(120,27,7),(128,23,7),(141,20,6),(153,17,7),(163,14,6),
                   (176,30,8),(187,26,7),(223,29,8),(232,25,7),(241,21,7),(250,17,6),
                   (259,13,7),(266,9,5),(296,29,7),(304,26,7)],
        keys=[('cloudKey',60,13),('emberKey',167,10),('skyKey',268,1)],
        creatures=[('cloudwhisp',33),('cloudwhisp',51),('emberkit',127),('emberkit',155),('skyling',245),
                   ('skyling',260),('mossback',82),('prismtail',109),('glimmermoth',139),('springaroo',146),('tideling',192),
                   ('springaroo',221),('emberkit',284),('cloudwhisp',300)],
        checkpoints=[82,177,278],
        shards=[(41,21),(57,14),(72,26),(133,19),(161,10),(187,24),(239,18),(265,7),(304,23)]),
]

def hex_rgb(s):
    return tuple(bytes.fromhex(s.removeprefix('#')))

def make(data):
    w,h,base=data['width'],data['height'],data['ground']
    grid=[['empty']*w for _ in range(h)]
    water={x for lo,hi in data['water'] for x in range(lo,hi)}
    def ground_y(x):
        # Flat ground avoids invisible one-tile walls; vertical routes use explicit platforms.
        return base
    for x in range(w):
        y=ground_y(x)
        for j in range(y,h): grid[j][x]='water' if x in water and j<h-1 else 'ground'
    def draw_platform(x,y,length):
        for xx in range(max(0,x),min(x+length,w)): grid[y][xx]='platform'
    for x,y,length in data['platforms']:draw_platform(x,y,length)
    # Bridged shallow sections keep ordinary explorers able to follow teammates.
    for lo,hi in data['water']:
        for xx in range(lo-3,hi+3,7): draw_platform(xx,ground_y(lo)-2,5)
    if data['file']=='starfall-summit.png':
        for lo,hi,top in [(53,62,12),(256,269,5)]:
            for x in range(lo,hi):
                for y in range(top,ground_y(x)-1):
                    if grid[y][x]=='empty':grid[y][x]='thermal'
    def mark(name,x,y):
        assert 0<=x<w and 0<=y<h and (grid[y][x] in ('empty','thermal') or (name=='diveKey' and grid[y][x]=='water')),(data['file'],name,x,y,grid[y][x])
        grid[y][x]=name
    mark('p1',4,ground_y(4)-1);mark('p2',6,ground_y(6)-1)
    mark('exit',w-6,ground_y(w-6)-1)
    for kind,x,y in data['keys']:mark(kind,x,y)
    for kind,x in data['creatures']:
        y=ground_y(x)-1
        if kind in ('skyling','cloudwhisp','glimmermoth'):y-=3
        while grid[y][x]!='empty':y-=1
        mark(kind,x,y)
    for x in data['checkpoints']:
        while grid[ground_y(x)-1][x]!='empty':x+=2
        mark('checkpoint',x,ground_y(x)-1)
    for x,y in data['shards']:
        while grid[y][x]!='empty':y-=1
        mark('starShard',x,y)
    for x in range(10,w-9,17):
        y=ground_y(x)-1
        if grid[y][x]=='empty':mark('snack',x,y)
    for key,x,y in data['keys']:
        assert sum(1 for row in grid for entry in row if entry==key)==1
    im=Image.new('RGB',(w,h))
    im.putdata([hex_rgb(COLORS[t]) for row in grid for t in row]);im.save(ROOT/data['file'],optimize=True)
    print(data['file'],im.size,'enemies:',len(data['creatures']),'platforms:',sum(row.count('platform') for row in grid))

if __name__=='__main__':
    for chapter in chapters:make(chapter)
