"""Gameplay regressions for the three-chapter Wonderwood adventure."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html=Path(__file__).parents[1]/'dist'/'wonderwood.html'
source=html.read_text().replace('requestAnimationFrame(frame);','')
source=source.replace('<script>window.WONDERWOOD_LEVELS',
 '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>window.WONDERWOOD_LEVELS')

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True, args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':810});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(source,wait_until='domcontentloaded')
    def advance(n=1):page.evaluate(f'for(let i=0;i<{n};i++)WW.main.game.update(1/60)')
    def state(expr):return page.evaluate('WW.main.game.state.'+expr)
    def set_state(js):page.evaluate('(()=>{let s=WW.main.game.state;'+js+'})()')
    def place(x,y):set_state(f'let p=s.players[0];p.x={x};p.y={y};p.vx=p.vy=0;p.grounded=true;p.waterTime=0;p.lastSafe={{x:p.x,y:p.y}};')
    def key(code,n=2):page.keyboard.down(code);advance(n);page.keyboard.up(code);advance(1)
    def start(i):
        if page.get_by_role('button',name='CHOOSE A LEVEL').count():page.get_by_role('button',name='CHOOSE A LEVEL').click()
        page.get_by_role('button',name=['Explore Mosslight Meadow','Explore Crystal Coast','Explore Starfall Summit'][i]).click()
        page.locator('#menu').wait_for(state='hidden')
        advance(14)
    # Keyboard-only chapter selector and default solo mode.
    assert page.evaluate('WW.storage.data.settings.players')==1
    page.keyboard.press('ArrowRight');assert page.evaluate('document.activeElement.dataset.action')=='chapters'
    page.keyboard.press('Enter');assert page.locator('.chapter-card').count()==3
    page.get_by_role('button',name='Explore Mosslight Meadow').click()
    page.locator('#menu').wait_for(state='hidden');advance(14)
    assert state('players.length')==1
    assert state('animals.length')==12
    assert state('chapter.id')=='first-forest'
    assert state('goals.length')==3
    assert page.locator('#hud').bounding_box()['height']<65
    # Each species uses a unique behavior and has a non-identical movement envelope.
    before={a['kind']:(a['x'],a['y']) for a in state('animals')}
    advance(75)
    after={a['kind']:(a['x'],a['y']) for a in state('animals')}
    assert any(abs(before[k][0]-after[k][0])>9 for k in ('springaroo','skyling','tideling','cloudwhisp','prismtail','glimmermoth'))
    assert len({a['behavior'] for a in state('animals')})>=8
    # A transformed player sees visible ability instructions and does not lose time when switched away.
    set_state('let p=s.players[0];p.energy.springaroo=36;p.energy.skyling=32;p.selected=0;p.form=null;')
    key('t');assert state('players[0].form')=='springaroo'
    assert page.locator('#ability-callout').is_visible()
    assert 'Jump again' in page.locator('#ability-callout').inner_text()
    advance(60);stored=state('players[0].energy.springaroo')
    key('q');key('t');assert state('players[0].form')=='skyling'
    assert 'fly' in page.locator('#ability-callout').inner_text()
    advance(35);assert abs(state('players[0].energy.springaroo')-stored)<.1
    key('c');assert state('players[0].x')<100
    # Physical gem overlap always collects, even if the related form is expired.
    gem=next(x for x in state('items') if x['kind']=='springKey')
    place(gem['x'],gem['y']+13);set_state('s.players[0].form=null;')
    advance();assert state('shared.keys.springKey')
    # Playable water rescue and on-demand wakeup.
    water=next((x for x in state('items') if x['kind']=='diveKey'))
    place(water['x'],water['y']+15)
    set_state('let p=s.players[0];p.health=1;p.form=null;p.invincible=0;p.waterTime=.79;p.lastSafe={x:40*16,y:30*16};')
    advance(3);assert state('players[0].sleep')
    assert state('players[0].x')<1000
    key('r');assert not state('players[0].sleep')
    # Win first stage and select a new one from the victory screen.
    for kind in ('skyKey','diveKey'):
        gem=next(x for x in state('items') if x['kind']==kind)
        place(gem['x'],gem['y']+13);advance(1)
        assert state('shared.keys.'+kind)
    exit=next(x for x in state('items') if x['kind']=='exit')
    place(exit['x'],exit['y']+13);advance(1)
    assert page.get_by_text('The ancient gate has awakened!').is_visible()
    page.get_by_role('button',name='Next: Crystal Coast').click()
    page.locator('#menu').wait_for(state='hidden');advance(14)
    assert state('chapter.id')=='crystal-coast'
    assert state('goals[0].kind')=='prismKey'
    assert state('challenges[0].type')=='sprint'
    # Relic is genuinely gated behind the sprint: touching it early does nothing.
    gem=next(x for x in state('items') if x['kind']=='prismKey')
    place(gem['x'],gem['y']+13);advance(1)
    assert not state('shared.keys.prismKey')
    # Run the 24-tile timed speed trial as Prismtail using real keyboard movement.
    place(88*16-9,31*16)
    set_state('let p=s.players[0];p.energy.prismtail=120;p.form="prismtail";p.health=3;p.invincible=100;')
    page.keyboard.down('d');advance(105);page.keyboard.up('d');advance(2)
    assert state('challenges[0].completed'),state('challenges[0]')
    place(gem['x'],gem['y']+13);advance(1)
    assert state('shared.keys.prismKey')
    # Other keys are independent, and a repeatable checkpoint warp works.
    set_state('s.shared.checkpoint={x:1500,y:496};')
    page.keyboard.press('Escape');page.get_by_role('button',name='Warp to last checkpoint').click()
    assert abs(state('players[0].x')-1500)<3
    # Starfall has an actual glider updraft and a two-creature friendship quest.
    page.keyboard.press('Escape');page.get_by_role('button',name='Main menu').click()
    start(2)
    assert state('chapter.id')=='starfall-summit'
    assert state('challenges[0].type')=='befriend'
    place(57*16,29*16)
    set_state('let p=s.players[0];p.form="cloudwhisp";p.energy.cloudwhisp=90;')
    initial=state('players[0].y');advance(72)
    assert state('players[0].y')<initial-45,(initial,state('players[0].y'))
    # Gem stays locked until two actual Emberkit captures.
    gem=next(x for x in state('items') if x['kind']=='emberKey')
    place(gem['x'],gem['y']+13);advance(1)
    assert not state('shared.keys.emberKey')
    page.evaluate('Math.random=()=>0')
    for attempt in range(2):
        place(500+attempt*60,33*16)
        set_state(f'''let p=s.players[0];p.form=null;p.actionCD=0;p.face=1;p.invincible=100;
            let a=s.animals.filter(a=>a.kind==='emberkit')[{attempt}];a.x=p.x+28;
            a.homeX=a.x;a.homeY=p.y;a.y=p.y;a.wary=0;a.attackCD=999;a.alive=true;''')
        key('g',10)
    assert state('challenges[0].completed'),state('challenges[0]')
    place(gem['x'],gem['y']+13);advance(1)
    assert state('shared.keys.emberKey')
    assert not errors,errors
    print('PASS: keyboard, 3 chapters, compact HUD, 8 AIs, form tutorials, time banks, rescue, gems, sprint, thermal, friendship, win/next')
    browser.close()
