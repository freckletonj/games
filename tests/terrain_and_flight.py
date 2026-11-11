"""Continuous ramps, real lagoons, aerial paths and optional painted panels."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(__file__).parents[1] / 'dist' / 'wonderwood.html'
source = html.read_text().replace('requestAnimationFrame(frame);', '')
source = source.replace('<script>\nwindow.WW',
    '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>\nwindow.WW', 1)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':810})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(source, wait_until='domcontentloaded')
    page.wait_for_function("() => WW.scenery.ready('tiles')")
    overview = page.evaluate("""() => WW.chapters.map(chapter => {
        const w=WW.worlds.create(chapter);
        const water=w.grid.flat().filter(t=>t==='water').length;
        return {id:chapter.id,width:w.width,height:w.height,water,
          surface:w.surface?.length,creatures:w.objects.filter(o=>WW.catalog.creatures[o.kind]).length,
          p1:w.objects.filter(o=>o.kind==='p1').length,
          exit:w.objects.filter(o=>o.kind==='exit').length,
          thermals:w.grid.flat().filter(t=>t==='thermal').length};
    })""")
    assert len(overview) == 5
    assert all(w['width'] >= 250 and w['height'] >= 50 for w in overview), overview
    assert all(w['surface'] == w['width'] + 1 and w['creatures'] >= 7 for w in overview), overview
    assert all(w['p1'] == w['exit'] == 1 for w in overview), overview
    assert all(w['water'] > 100 for w in overview), overview
    assert overview[2]['thermals'] > 0 and overview[4]['thermals'] > 0

    def play(index):
        page.evaluate('(i) => WW.main.play(i)', index)
        page.locator('#menu').wait_for(state='hidden')

    def advance(n):
        page.evaluate('(n) => {for(let i=0;i<n;i++)WW.main.game.update(1/60)}', n)

    play(0)
    # A single sustained walk must climb a gentle grade, not hit stair-step walls.
    start = page.evaluate("""() => {
      const game=WW.main.game,s=game.state,p=s.players[0],level=WW.worlds.create(s.chapter);
      const x=25.5*16, c=Math.floor(x/16),f=x/16-c;
      p.x=x;p.y=(level.surface[c]*(1-f)+level.surface[c+1]*f)*16;
      p.vx=p.vy=0;p.grounded=true;p.invincible=100;
      s.animals.forEach(a=>{a.alive=false;a.respawn=99999});
      return {x:p.x,y:p.y};
    }""")
    page.keyboard.down('d')
    advance(50)
    page.keyboard.up('d')
    end = page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],level=WW.worlds.create(s.chapter);
      const c=Math.floor(p.x/16),f=p.x/16-c;
      return {x:p.x,y:p.y,ground:(level.surface[c]*(1-f)+level.surface[c+1]*f)*16,
        grounded:p.grounded};
    }""")
    assert end['x'] > start['x'] + 85, (start,end)
    assert end['y'] < start['y'] - 7, (start,end)
    assert abs(end['y'] - end['ground']) < 4, end
    assert end['grounded'], end
    page.evaluate('WW.main.game.render(document.querySelector("#game").getContext("2d"),5)')
    page.screenshot(path=str(html.parent/'preview-slopes.png'))

    play(1)
    # Tidefox wildlife may live and patrol in deep water, not merely by its shore.
    aquatic = page.evaluate("""() => {
      const s=WW.main.game.state,a=s.animals.find(a=>a.kind==='tideling' &&
        a.homeX/16>60 && a.homeX/16<100);
      s.animals.forEach(other=>{other.alive=other===a;other.respawn=99999});
      return {x:a.x,y:a.y,homeX:a.homeX};
    }""")
    advance(30)
    after = page.evaluate("""() => {
      const a=WW.main.game.state.animals.find(a=>a.kind==='tideling' &&
        a.homeX/16>60 && a.homeX/16<100);
      return {x:a.x,y:a.y};
    }""")
    assert abs(after['x']-aquatic['x']) > 4, (aquatic,after)

    # An offline JSON import can carry a fractional collision surface and large
    # embedded painted chunks. Art remains completely independent of collision.
    panels = page.evaluate("""async () => {
      const level=WW.worlds.create(WW.chapters[0]);
      level.art={foreground:[{asset:'backdrop',x:0,y:0,width:1024,height:512}]};
      const url=URL.createObjectURL(new Blob([JSON.stringify(level)],{type:'application/json'}));
      const loaded=await WW.levels.loadJSON(url);
      URL.revokeObjectURL(url);
      const canvas=document.createElement('canvas');
      canvas.width=1440;canvas.height=810;
      const ctx=canvas.getContext('2d');
      return {surface:loaded.surface.length,art:loaded.art.foreground.length,
        painted:WW.scenery.paintLayers(ctx,loaded.art.foreground,0,0)};
    }""")
    assert panels == {'surface':261,'art':1,'painted':True}, panels
    assert not errors, errors
    browser.close()
    print('PASS: five expansive worlds, continuous slope walking, aquatic wildlife, offline diffusion-art panels')
