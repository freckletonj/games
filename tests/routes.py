"""Actual-physics proof that each chapter's single light requires its distinct power."""
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
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(source,wait_until='domcontentloaded')
    def advance(n):
        page.evaluate('(n)=>{for(let i=0;i<n;i++)WW.main.game.update(1/60)}',n)
    def place(y,form=None):
        page.evaluate("""([y,form])=>{
            const s=WW.main.game.state,p=s.players[0];
            const light=s.items.find(i=>i.kind.endsWith('Key'));
            p.x=light.x;p.y=y;p.vx=p.vy=0;p.grounded=true;
            p.coyote=.1;p.jumpsUsed=0;p.jumpBuffer=0;
            p.health=3;p.invincible=100;p.waterTime=0;
            p.lastSafe={x:p.x,y:p.y};p.form=form;
            if(form)p.unlocked[form]=true;
            s.animals.forEach(a=>{a.alive=false;a.respawn=99999});
            WW.input.reset();
        }""",[y,form])
    def got(kind):
        return page.evaluate('(name)=>WW.main.game.state.shared.keys[name]',kind)
    def key(code,frames=1):
        page.keyboard.down(code);advance(frames)
        page.keyboard.up(code);advance(1)
    # In the meadow, the key hangs too high for an ordinary single jump.
    page.evaluate('WW.main.play(0)')
    page.locator('#menu').wait_for(state='hidden')
    place(21*16)
    key('w',14);advance(62)
    assert not got('springKey')
    place(21*16,'springaroo')
    key('w',12);advance(3);key('w',24);advance(35)
    assert got('springKey'),'A properly timed double jump must reach the canopy light'
    # The underwater light cannot be reached without Tidefox's dive.
    page.evaluate('WW.main.play(1)')
    page.locator('#menu').wait_for(state='hidden')
    place(29*16)
    advance(67)
    assert not got('diveKey')
    place(29*16,'tideling')
    page.keyboard.down('s');advance(68);page.keyboard.up('s');advance(1)
    assert got('diveKey'),'Tidefox must be able to reach the pearl'
    # The summit light is above the reach of any ordinary jump.
    page.evaluate('WW.main.play(2)')
    page.locator('#menu').wait_for(state='hidden')
    place(11*16)
    key('w',14);advance(62)
    assert not got('skyKey')
    place(11*16,'skyling')
    page.keyboard.down('w');advance(110);page.keyboard.up('w');advance(1)
    assert got('skyKey'),'Moonwing flight must reach the upper light'
    assert not errors, errors
    browser.close()
    print('PASS: single jump, ordinary swimmer and ordinary jumper blocked; all 3 powers solve their light puzzle')
