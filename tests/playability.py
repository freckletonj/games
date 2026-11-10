"""Headless gameplay regression checks. python tests/playability.py (Playwright + Chromium)."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(__file__).parents[1] / 'dist' / 'wonderwood.html'
source = html.read_text().replace('requestAnimationFrame(frame);', '')
source = source.replace(
    '<script>window.WONDERWOOD_MAP',
    '<script>Object.defineProperty(window,"localStorage",'
    '{value:{getItem:()=>null,setItem:()=>{}}});</script><script>window.WONDERWOOD_MAP',
)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(source, wait_until='domcontentloaded')
    assert page.locator('#game').get_attribute('width') == '960'
    page.get_by_role('button', name='Settings').click()
    assert page.get_by_text('Game settings').is_visible()
    page.get_by_role('button', name='Back').click()
    page.get_by_role('button', name='PLAY THE FOREST').click()
    page.locator('#menu').wait_for(state='hidden')
    game = 'WW.main.game'

    def advance(n=1):
        page.evaluate(f'for(let i=0;i<{n};i++){game}.update(1/60)')

    def state(expr):
        return page.evaluate(f'{game}.state.{expr}')

    def place(x, y=304, second=False):
        i = 1 if second else 0
        page.evaluate(f'''(() => {{let p={game}.state.players[{i}];
          p.x={x}; p.y={y}; p.vx=p.vy=0;p.grounded=true;
          p.coyote=0;p.jumpsUsed=0;p.waterTime=0;p.lastSafe={{x:{x},y:{y}}};}})()''')

    # Explicit jump envelope, with starter platform 3 tiles above normal ground.
    place(90)
    advance(3)
    page.keyboard.down('w')
    height=[]
    for _ in range(25):
        advance()
        height.append(state('players[0].y'))
    page.keyboard.up('w')
    advance(1)
    apex = 304-min(height)
    assert 45 < apex < 66, f'Basic jump should rise 3-4 tiles: {apex}'

    # Double-jump must exceed the normal jump by a substantial margin.
    place(90)
    page.evaluate(f'{game}.state.players[0].form="springaroo";{game}.state.players[0].until=99999')
    page.keyboard.down('w');advance(1);page.keyboard.up('w')
    advance(16)
    page.keyboard.down('w');advance(1);page.keyboard.up('w')
    heights=[]
    for _ in range(24):
        advance();heights.append(state('players[0].y'))
    boosted=304-min(heights)
    assert boosted>apex+30, f'Double jump too short: basic={apex}, double={boosted}'

    # A normal jump plus horizontal movement lands on the first one-way ledge.
    page.evaluate(f'''{game}.state.animals.forEach(a=>{{a.alive=false;a.respawn=99999}})''')
    place(8*16);place(6*16,second=True)
    page.evaluate(f'{game}.state.players[0].form=null')
    page.keyboard.down('d');page.keyboard.down('w');advance(1);page.keyboard.up('w')
    advance(40);page.keyboard.up('d');advance(1)
    assert state('players[0].y')==256, ('First ledge unreachable',state('players[0].x'),state('players[0].y'))
    # A chain of ordinary ledges is genuinely traversable at the documented speed/jump.
    for start_x,start_y,end_y in [(17*16,256,224),(25*16,224,192)]:
        place(start_x,start_y);place(start_x-24,start_y,second=True)
        page.evaluate(f'{game}.state.players[0].form=null')
        page.keyboard.down('d');page.keyboard.down('w');advance(1);page.keyboard.up('w')
        advance(40);page.keyboard.up('d');advance(1)
        assert state('players[0].y')==end_y, (start_x,start_y,end_y,state('players[0].x'),state('players[0].y'))

    # The canopy gem is out of normal-jump reach, but in double-jump reach.
    place(23.5*16,224)
    place(25*16,224,second=True)
    page.evaluate(f'{game}.state.players[0].form="springaroo";{game}.state.players[0].until=99999')
    page.keyboard.down('w');advance(1);page.keyboard.up('w')
    advance(16)
    assert not state('shared.springKey'), 'Canopy key should require the second jump'
    page.keyboard.down('w');advance(1);page.keyboard.up('w')
    advance(30)
    assert state('shared.springKey'), 'Double jump failed to collect canopy gem'

    # A real orb hit gives the thrower (only) one form charge.
    place(110);place(120,second=True)
    page.evaluate(f'''(() => {{const a={game}.state.animals.find(a=>a.kind==='springaroo');
       a.alive=true;a.wary=0;a.x=136;a.origin=136;a.phase=0;a.attackCD=99;
       const p={game}.state.players[0];p.form=null;p.face=1;p.actionCD=0;
       p.charges.springaroo=0;{game}.state.players[1].charges.springaroo=0;}})()''')
    page.evaluate('Math.random=()=>0.5')
    page.keyboard.down('g');advance(1);page.keyboard.up('g');advance(12)
    assert state('players[0].charges.springaroo') == 1, 'A friendly animal was not caught by player 1'
    assert state('players[1].charges.springaroo') == 0, 'Capture credited to wrong player'

    # A caught form is owned by the player who caught it, not the teammate.
    page.evaluate(f'''(() => {{const [a,b]={game}.state.players;
      a.form=null;a.selected=0;a.charges.springaroo=1;b.form=null;
      b.charges.springaroo=0;}})()''')
    page.keyboard.down('t');advance();page.keyboard.up('t')
    assert state('players[0].form') == 'springaroo'
    assert state('players[1].form') is None
    assert state('players[0].charges.springaroo') == 0
    page.evaluate(f'{game}.state.players[0].form=null')
    page.evaluate(f'{game}.state.players[1].selected=0;{game}.state.players[1].charges.springaroo=1')
    page.keyboard.down('u');advance();page.keyboard.up('u')
    assert state('players[1].form') == 'springaroo'
    assert state('players[0].form') is None

    # The camera must keep the two players together, even if one stays behind.
    place(70);place(95,second=True)
    page.keyboard.down('d');advance(250);page.keyboard.up('d')
    a,b=state('players')
    camera=state('cameraX')
    assert abs(a['x']-b['x'])<=408.01, (a['x'],b['x'])
    assert 0<=a['x']-camera<=480 and 0<=b['x']-camera<=480, (a['x'],b['x'],camera)

    # Non-swimmers cannot cross the lake: timeout sends them to dry land.
    page.evaluate(f'{game}.state.players[0].form=null')
    place(44*16,304,second=True)
    place(47*16,304)
    page.evaluate(f'''(() => {{let p={game}.state.players[0];p.lastSafe={{x:44*16,y:304}};p.grounded=false;}})()''')
    advance(95)
    a=state('players[0]')
    assert a['x'] < 46*16 and a['health']<3, (a['x'],a['y'],a['health'])

    # Swimming can reach the real river gem, and it is form-gated.
    place(44*16,304,second=True)
    place(59*16,340)
    page.evaluate(f'{game}.state.players[0].form="tideling";{game}.state.players[0].until=99999')
    page.keyboard.down('s');advance(9);page.keyboard.up('s');advance(2)
    assert state('shared.diveKey'), (state('players[0].y'), state('items'))

    # Moonwing touches the high sky gem; all three gems unlock the gate.
    place(39.5*16,128)
    page.evaluate(f'{game}.state.players[0].form="skyling";{game}.state.players[0].until=99999')
    advance(1)
    assert state('shared.skyKey'), 'Moonwing did not collect sky gem'
    assert state('shared.springKey') and state('shared.diveKey')
    place(114*16,304,second=True)
    place(116.5*16,304)
    advance(1)
    assert page.get_by_text('YOU DID IT!').is_visible(), 'Exit did not finish the level'
    page.keyboard.press('Escape')
    assert page.get_by_text('YOU DID IT!').is_visible(), 'Escape resumed a completed level'
    page.get_by_role('button', name='Arcade menu').click()
    assert page.get_by_role('button', name='PLAY THE FOREST').is_visible()

    assert not errors, errors
    print('PASS: settings, jumps, double jump, per-player forms, camera leash, water hazard, dive gem, pause/menu')
    browser.close()
