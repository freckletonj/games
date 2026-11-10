"""Play-loop regression: navigation, no-softlocks, capture & form banks, water, quests.
Run: python tests/playability.py (requires Playwright + Chromium)."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(__file__).parents[1] / 'dist' / 'wonderwood.html'
source = html.read_text().replace('requestAnimationFrame(frame);', '')
source = source.replace('<script>window.WONDERWOOD_MAP',
    '<script>Object.defineProperty(window,"localStorage",'
    '{value:{getItem:()=>null,setItem:()=>{}}});</script><script>window.WONDERWOOD_MAP')

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1280,'height':720})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(source, wait_until='domcontentloaded')
    assert page.locator('#game').get_attribute('width') == '1440'
    assert page.get_by_role('button', name='PLAY FIRST FOREST').is_visible()
    # Real keyboard menu navigation works without a controller or mouse.
    assert page.evaluate('document.activeElement.dataset.action') == 'play'
    page.keyboard.press('ArrowRight')
    assert page.evaluate('document.activeElement.dataset.action') == 'journal'
    page.keyboard.press('Enter')
    assert page.get_by_text('Meet the magical neighbors').is_visible()
    assert page.locator('.journal-card').count() == 8
    page.keyboard.press('Escape')
    page.keyboard.press('Enter')
    page.locator('#menu').wait_for(state='hidden')
    g = 'WW.main.game'
    def advance(n=1):page.evaluate(f'for(let i=0;i<{n};i++){g}.update(1/60)')
    def state(expression):return page.evaluate(f'{g}.state.{expression}')
    def player(i=0):return state(f'players[{i}]')
    def place(x,y=304,i=0):
        page.evaluate(f'''(() => {{const p={g}.state.players[{i}];
          p.x={x};p.y={y};p.vx=p.vy=0;p.grounded=true;p.coyote=0;
          p.jumpsUsed=0;p.waterTime=0;p.lastSafe={{x:{x},y:{y}}};}})()''')
    def key(code,frames=1):
        page.keyboard.down(code);advance(frames);page.keyboard.up(code);advance(1)

    assert state('animals.length') >= 8
    assert set(state('players[0].energy')) == set(page.evaluate('Object.keys(WW.catalog.forms)'))
    assert len(state('shared.foods')) == 5
    assert not state('shared.springKey')
    page.evaluate(f'{g}.state.animals.forEach(a=>{{a.alive=false;a.respawn=99999}})')
    # Ordinary jump physics; double-jump reaches significantly higher.
    place(90);advance(2);key('w')
    highest=min(player()['y'] for _ in range(27) for __ in [advance()])
    normal=304-highest
    assert 45<normal<66, normal
    place(90);page.evaluate(f'{g}.state.players[0].form="springaroo";{g}.state.players[0].energy.springaroo=999')
    key('w');advance(15);key('w')
    boosted=304-min(player()['y'] for _ in range(24) for __ in [advance()])
    assert boosted>normal+30,(normal,boosted)
    # Ordinary one-way platforms must be reachable with the documented jump envelope.
    for x,y,expected in [(8*16,304,256),(17*16,256,224),(25*16,224,192)]:
        place(x,y);place(x-20,y,i=1)
        page.evaluate(f'{g}.state.players[0].form=null')
        page.keyboard.down('d');key('w');advance(37);page.keyboard.up('d');advance(1)
        assert abs(player()['y']-expected)<1, (x,y,expected,player()['x'],player()['y'])
    # Camera containment still works when a teammate remains behind.
    place(85);place(95,i=1)
    page.keyboard.down('d');advance(250);page.keyboard.up('d')
    assert abs(player()['x']-player(1)['x'])<=state('physics.leash')+0.1
    camera=state('cameraX')
    assert all(0<=p['x']-camera<=480 for p in state('players'))
    # Touchable gems always collect: reaching the location was the puzzle.
    page.evaluate(f'{g}.state.players[0].form=null')
    gem=next(item for item in state('items') if item['kind']=='springKey')
    place(gem['x'],gem['y']+13);advance(1)
    assert state('shared.springKey') and next(item for item in state('items') if item['kind']=='springKey')['used']
    # Camp recall is lossless even if the player is on the far side with no available powers.
    page.evaluate(f'''(() => {{const p={g}.state.players[0];p.form=null;p.energy.tideling=0;
       p.x=111*16;p.y=304;}})()''')
    key('c')
    assert player()['x']<100 and state('shared.springKey')
    # A faint in deep water never leaves the character stuck underwater.
    place(44*16,304,i=1);place(47*16,304);page.evaluate(f'''(() => {{let p={g}.state.players[0];
      p.health=1;p.form=null;p.invincible=0;p.waterTime=.78;p.lastSafe={{x:42*16,y:304}};}})()''')
    advance(75)
    assert player()['sleep'], player()
    assert player()['x'] < 46*16, player()
    key('r')
    assert not player()['sleep'] and player()['health']==3
    assert player()['x']<46*16
    # Capture grants the thrower a per-creature bank, not a shared charge.
    place(110);place(115,i=1)
    page.evaluate(f'''(() => {{let a={g}.state.animals.find(a=>a.kind==='springaroo');
      a.alive=true;a.wary=0;a.x=140;a.origin=140;a.phase=0;a.attackCD=99;
      let p={g}.state.players[0];p.actionCD=0;p.form=null;p.face=1;p.energy.springaroo=0;
      {g}.state.players[1].energy.springaroo=0;}})()''')
    page.evaluate('Math.random=()=>0.01')
    key('g',8)
    assert player()['energy']['springaroo']>=35
    assert player(1)['energy']['springaroo']==0
    # Transformation belongs to P1 and the bank counts down only in that form.
    page.evaluate(f'''(() => {{let p={g}.state.players[0];p.selected=0;p.energy.springaroo=36;
      p.energy.skyling=20;p.form=null;p.actionCD=0;}})()''')
    key('t')
    assert player()['form']=='springaroo' and player(1)['form'] is None
    advance(60)
    left=player()['energy']['springaroo']
    assert 34<left<36,left
    key('q');key('t')
    assert player()['form']=='skyling'
    advance(30)
    assert abs(player()['energy']['springaroo']-left)<0.1
    key('t')
    assert player()['form'] is None
    assert player()['energy']['skyling']>18
    # Full food wheel works and each food has different trajectory/effect.
    page.evaluate(f'{g}.state.players[0].selectedFood=0;{g}.state.players[0].actionCD=0')
    key('e')
    assert player()['selectedFood']==1
    page.evaluate(f'{g}.state.players[0].actionCD=0')
    before=state('shared.foods.star')
    key('f')
    assert state('shared.foods.star')==before-1
    assert any(p['food']=='star' for p in state('projectiles') if p['kind']=='food')
    # Underwater gem reachable as Tidefox, even if player has just switched form.
    place(60*16,367,i=1);place(59*16,367);page.evaluate(f'{g}.state.players[0].form="tideling";{g}.state.players[0].energy.tideling=25')
    advance(1)
    assert state('shared.diveKey')
    # Sky gem collects even after Moonwing time expires.
    sky=next(item for item in state('items') if item['kind']=='skyKey')
    place(sky['x'],sky['y']+13);page.evaluate(f'{g}.state.players[0].form=null');advance(1)
    assert state('shared.skyKey')
    # Optional rewards grant food and are never required for the gate.
    shard=next(item for item in state('items') if item['kind']=='starShard')
    place(shard['x']-16,shard['y']+13,i=1);place(shard['x'],shard['y']+13)
    before=state('shared.foods.star');advance(1)
    assert state('shared.shards')>=1 and state('shared.foods.star')==before+2
    # All gems belong to the entire party; gate opens after physically reaching it.
    exit=next(item for item in state('items') if item['kind']=='exit')
    place(exit['x']-20,exit['y']+13,i=1);place(exit['x'],exit['y']+13);advance(1)
    assert page.locator('#menu h1').inner_text()=='YOU DID IT!'
    page.keyboard.press('Escape')
    assert page.locator('#menu h1').inner_text()=='YOU DID IT!'
    page.get_by_role('button', name='Arcade menu').click()
    assert page.get_by_role('button', name='PLAY FIRST FOREST').is_visible()
    assert not errors,errors
    print('PASS: keyboard menus, 8 forms, reachable platforms, camera, gems, recall, water rescue, ownership, time banks, foods, shards, victory')
    browser.close()
