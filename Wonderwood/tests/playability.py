"""Campaign continuity, co-op, checkpoint and single-light completion."""
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
    assert page.evaluate('WW.storage.data.settings.players')==1
    page.get_by_role('button',name='CHOOSE A LEVEL').click()
    page.get_by_role('button',name='Explore Mosslight Meadow').click()
    page.locator('#menu').wait_for(state='hidden')
    def advance(n=1):
        page.evaluate('(n)=>{for(let i=0;i<n;i++)WW.main.game.update(1/60)}',n)
    def state(expr):
        return page.evaluate('WW.main.game.state.'+expr)
    assert state('goals.length')==1
    assert state('animals.length')>=6

    # A named checkpoint restores hearts and persists as the last safe return.
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],cp=s.items.find(i=>i.kind==='checkpoint');
      p.x=cp.x;p.y=cp.y+13;p.vx=p.vy=0;p.grounded=true;p.health=1;
      p.invincible=1;p.lastSafe={x:p.x,y:p.y};
    }""")
    advance()
    assert state('players[0].health')==3
    assert state('items.find(i=>i.kind==="checkpoint").used')
    assert state('shared.checkpoint.x')>0

    # Snacks, star shards and the one-light gate all update progress.
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],star=s.items.find(i=>i.kind==='starShard');
      p.x=star.x;p.y=star.y+13;p.vx=p.vy=0;
    }""")
    advance()
    assert state('shared.shards')==1
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],light=s.items.find(i=>i.kind==='springKey');
      p.x=light.x;p.y=light.y+13;p.vx=p.vy=0;
    }""")
    advance()
    assert state('shared.keys.springKey')
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],exit=s.items.find(i=>i.kind==='exit');
      p.x=exit.x;p.y=exit.y+13;p.vx=p.vy=0;
    }""")
    advance()
    assert page.get_by_text('The ancient gate has awakened!').is_visible()
    assert page.evaluate('WW.storage.data.progress.chapters["first-forest"]')==1
    page.get_by_role('button',name='Next: Crystal Coast').click()
    page.locator('#menu').wait_for(state='hidden')
    assert state('goals[0].kind')=='diveKey'
    assert state('animals.some(a=>a.kind==="tideling")')

    # Controller-agnostic two-player mode still creates two fully independent explorers.
    page.evaluate('WW.storage.data.settings.players=2')
    page.evaluate('WW.main.play(2)')
    page.locator('#menu').wait_for(state='hidden')
    advance(12)
    assert state('players.length')==2
    assert state('goals[0].kind')=='skyKey'
    assert state('players[0].unlocked.skyling')==False
    page.keyboard.press('Escape')
    assert page.get_by_role('button',name='Warp to last checkpoint').is_visible()
    page.get_by_role('button',name='Warp to last checkpoint').click()
    assert not errors,errors
    browser.close()
    print('PASS: checkpoint, shards, one-light victory, campaign progression, co-op and pause warp')
