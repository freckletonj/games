"""Production-physics regression for semantic kinetic route beats."""
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

    def play(index):
        page.evaluate('(i) => WW.main.play(i)', index)
        page.locator('#menu').wait_for(state='hidden')

    def advance(n):
        page.evaluate('(n) => {for(let i=0;i<n;i++)WW.main.game.update(1/60)}', n)

    play(0)
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],b=s.setpieces.find(v=>v.kind==='bounceBloom');
      s.animals.forEach(a=>{a.alive=false;a.respawn=10000});
      p.x=b.x;p.y=b.y-8;p.vx=0;p.vy=2;p.grounded=false;p.invincible=100;
    }""")
    advance(5)
    bloom = page.evaluate("""() => {
      const s=WW.main.game.state,b=s.setpieces.find(v=>v.kind==='bounceBloom');
      return {vy:s.players[0].vy,cooldown:b.ready[0]};
    }""")
    assert bloom['vy'] < -6 and bloom['cooldown'] > 0, bloom

    play(2)
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],ring=s.setpieces.find(v=>v.kind==='windRing');
      s.animals.forEach(a=>{a.alive=false;a.respawn=10000});
      p.form='skyling';p.x=ring.x;p.y=ring.y+13;
      p.vx=p.vy=0;p.grounded=false;p.invincible=100;
    }""")
    advance(1)
    ring = page.evaluate("""() => {
      const s=WW.main.game.state,r=s.setpieces.find(v=>v.kind==='windRing');
      return {vy:s.players[0].vy,cooldown:r.ready[0],wingbeat:s.players[0].wingbeat};
    }""")
    assert ring['vy'] <= -4.7 and ring['cooldown'] > 0 and ring['wingbeat'] > 0, ring

    play(1)
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],v=s.setpieces.find(v=>v.kind==='bubbleVent');
      s.animals.forEach(a=>{a.alive=false;a.respawn=10000});
      p.form='tideling';p.x=v.x;p.y=v.y+11;
      p.vx=p.vy=0;p.grounded=false;p.invincible=100;
    }""")
    page.keyboard.down('Space')
    advance(1)
    page.keyboard.up('Space')
    vy=page.evaluate('WW.main.game.state.players[0].vy')
    assert vy <= -3.7, vy
    # Tidefox must be able to breach the waterline to clear steep basin banks.
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],level=WW.worlds.create(s.chapter);
      const basin=level.waterBodies[1];
      p.x=((basin.start+basin.end)/2)*16;
      p.y=basin.surface*16+25;
      p.vy=0;p.breachCooldown=0;p.grounded=false;
    }""")
    page.keyboard.down('Space')
    advance(1)
    page.keyboard.up('Space')
    breach=page.evaluate("""() => {
      const p=WW.main.game.state.players[0];
      return {vy:p.vy,cooldown:p.breachCooldown};
    }""")
    assert breach['vy'] <= -5 and breach['cooldown'] > 0, breach

    page.evaluate('WW.main.game.render(document.querySelector("#game").getContext("2d"),7)')
    assert not errors, errors
    browser.close()
    print('PASS spring blooms, wind rings and Tidefox bubble vents')
