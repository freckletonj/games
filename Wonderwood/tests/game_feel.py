"""Food persistence, creature ecology, real airborne collisions and capture presentation."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html=Path(__file__).parents[1]/'dist'/'wonderwood.html'
source=html.read_text().replace('requestAnimationFrame(frame);','')
source=source.replace('<script>\nwindow.WW',
    '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>\nwindow.WW',1)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':810})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(source,wait_until='domcontentloaded')
    page.evaluate('WW.main.play(0)')
    page.locator('#menu').wait_for(state='hidden')
    def advance(n):
        page.evaluate('(n)=>{for(let i=0;i<n;i++)WW.main.game.update(1/60)}',n)
    def state(expr):
        return page.evaluate('WW.main.game.state.'+expr)
    def key(code,n=1):
        page.keyboard.down(code);advance(n)
        page.keyboard.up(code);advance(1)

    # Throw food and let physics deposit it; it must remain visible and edible.
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],a=s.animals.find(a=>a.kind==='springaroo');
      p.x=a.x-75;p.y=a.homeY;p.vx=p.vy=0;p.grounded=true;
      p.face=1;p.selectedFood=0;p.actionCD=0;p.invincible=100;
    }""")
    stock=state('shared.foods.berry')
    key('f');advance(33)
    assert state('shared.foods.berry')==stock-1
    assert state('lures.length')>=1,'Food must settle and persist rather than hit enemies'

    # Spawn an edible patch in reach; real AI must travel toward it and consume it.
    page.evaluate("""() => {
      const s=WW.main.game.state,a=s.animals.find(a=>a.kind==='springaroo');
      s.projectiles.length=0;s.lures.length=0;
      s.lures.push({x:a.homeX+12,y:a.homeY-1,food:'berry',ttl:24,age:0,used:false});
    }""")
    advance(150)
    trust=state('animals.find(a=>a.kind==="springaroo").trust')
    assert trust==60,trust
    page.evaluate("""() => {
      const s=WW.main.game.state,a=s.animals.find(a=>a.kind==='springaroo');
      s.lures.push({x:a.x+10,y:a.homeY-1,food:'berry',ttl:24,age:0,used:false});
    }""")
    advance(130)
    assert state('animals.find(a=>a.kind==="springaroo").trust')==100
    assert state('animals.find(a=>a.kind==="springaroo").distractedUntil')>0

    # A distracted companion is captured with an aimed orb. No random roll.
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],a=s.animals.find(a=>a.kind==='springaroo');
      p.x=a.x-29;p.y=a.y;p.face=1;p.actionCD=0;p.vx=p.vy=0;
      p.grounded=true;Math.random=()=>.999;
    }""")
    key('g',12)
    assert not state('animals.find(a=>a.kind==="springaroo").alive')
    assert state('players[0].unlocked.springaroo')
    assert state('captures.length')>0,'A capture should produce a visible transition effect'
    key('t')
    assert state('players[0].form')=='springaroo'

    # Contact with the territorial chaser must hurt the player IN THE AIR.
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],a=s.animals.find(a=>a.kind==='emberkit');
      p.x=a.x;p.y=a.y-17;p.vy=0;p.vx=0;p.invincible=0;
      p.health=3;p.grounded=false;p.form=null;
      a.eating=0;a.distractedUntil=0;
    }""")
    advance(1)
    assert state('players[0].health')==2
    assert state('players[0].vy')<0,'Hits should apply an airborne knockback impulse'

    page.evaluate('WW.main.game.render(document.querySelector("#game").getContext("2d"),6)')
    assert not errors, errors
    browser.close()
    print('PASS: food physics and persistence, autonomous eating, timed distraction, capture animation, airborne hit')
