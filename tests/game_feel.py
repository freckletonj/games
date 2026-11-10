"""Focused browser regressions for movement feel, readable objectives and deterministic bonding."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(__file__).parents[1] / 'dist' / 'wonderwood.html'
source = html.read_text().replace('requestAnimationFrame(frame);', '')
source = source.replace(
    '<script>window.WONDERWOOD_LEVELS',
    '<script>Object.defineProperty(window,"localStorage",'
    '{value:{getItem:()=>null,setItem:()=>{}}});</script><script>window.WONDERWOOD_LEVELS'
)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox']
    )
    page = browser.new_page(viewport={'width': 1440, 'height': 810})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(source, wait_until='domcontentloaded')
    page.evaluate("""() => {
        const grid = Array.from({length: 42}, (_, y) =>
            Array.from({length: 100}, () => y >= 22 ? 'ground' : 'empty'));
        window.testGame = WW.games.animals.start({
            width: 100, height: 42, grid,
            objects: [
                {kind:'p1',x:10,y:21}, {kind:'mossback',x:16,y:21},
                {kind:'checkpoint',x:12,y:21}, {kind:'exit',x:90,y:21}
            ],
            chapter: {id:'mechanics-test',name:'Test Glade',biome:'meadow',
                intro:'',goals:[],events:[],signs:[]}
        });
        document.querySelector('#menu').hidden = true;
        window.lowest = 352;
        window.advance = n => {
            for (let i = 0; i < n; i++) {
                testGame.update(1/60);
                lowest = Math.min(lowest, testGame.state.players[0].y);
            }
        };
        window.resetPlayer = () => {
            const p = testGame.state.players[0];
            p.x = 168; p.y = 352; p.vx = p.vy = 0;
            p.grounded = true; p.jumpsUsed = 0; p.coyote = 0;
            p.jumpBuffer = 0; p.actionCD = 0; p.health = 3;
            p.invincible = 100; p.lastSafe = {x:p.x,y:p.y};
            lowest = p.y;
            WW.input.reset();
        };
        testGame.state.animals[0].alive = false;
        testGame.state.animals[0].respawn = 99999;
    }""")

    def advance(n):
        page.evaluate('(n) => window.advance(n)', n)

    def reset():
        page.evaluate('window.resetPlayer()')

    # Horizontal acceleration and braking should be perceptible but not slippery.
    reset()
    page.keyboard.down('d')
    advance(20)
    page.keyboard.up('d')
    traveled = page.evaluate('testGame.state.players[0].x - 168')
    advance(12)
    drift = page.evaluate('testGame.state.players[0].x - 168') - traveled
    assert 34 < traveled < 46, traveled
    assert 0 < drift < 8, drift

    def jump_height(hold):
        reset()
        page.keyboard.down('w')
        advance(hold)
        page.keyboard.up('w')
        advance(45)
        return 352 - page.evaluate('window.lowest')

    short = jump_height(1)
    tall = jump_height(15)
    assert 12 < short < 36, short
    assert 45 < tall < 65, tall

    # The orb never randomly succeeds before the bond threshold or fails after it.
    reset()
    page.evaluate("""() => {
        const p=testGame.state.players[0],a=testGame.state.animals[0];
        a.alive=true; a.behavior='guardian'; a.x=p.x+28; a.y=p.y;
        a.homeX=a.x; a.homeY=a.y; a.wary=60; a.attackCD=999;
    }""")
    page.keyboard.down('g')
    advance(9)
    page.keyboard.up('g')
    advance(1)
    assert page.evaluate('testGame.state.animals[0].alive')
    assert page.evaluate('testGame.state.players[0].energy.mossback') == 0

    page.evaluate("""() => {
        const p=testGame.state.players[0],a=testGame.state.animals[0];
        p.actionCD=0; a.wary=20; a.x=p.x+28; a.y=p.y;
        a.homeX=a.x; a.homeY=a.y;
        Math.random=()=>.999;
    }""")
    page.keyboard.down('g')
    advance(9)
    page.keyboard.up('g')
    advance(1)
    assert not page.evaluate('testGame.state.animals[0].alive')
    assert page.evaluate('testGame.state.players[0].energy.mossback') == 45

    # Checkpoints matter: they stay lit and restore hearts.
    page.evaluate("""() => {
        const s=testGame.state,p=s.players[0],c=s.items.find(x=>x.kind==='checkpoint');
        c.used=false;p.health=1;p.x=c.x;p.y=c.y+13;p.vx=p.vy=0;
    }""")
    advance(1)
    assert page.evaluate('testGame.state.players[0].health') == 3
    assert page.evaluate("testGame.state.items.find(x=>x.kind==='checkpoint').used")
    assert page.evaluate('testGame.state.objective.name') == 'THE ANCIENT GATE'
    page.evaluate('testGame.render(document.querySelector("#game").getContext("2d"), 3)')
    assert not errors, errors
    browser.close()
    print('PASS: acceleration, short/long jumps, deterministic bonds, checkpoint healing, objectives and rendering')
