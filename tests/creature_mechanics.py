"""All-species transformations, latest-catch inventory, tactical powers and AI tells."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(__file__).parents[1] / 'dist' / 'wonderwood.html'
source = html.read_text().replace('requestAnimationFrame(frame);', '')
source = source.replace('<script>\nwindow.WW',
    '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>\nwindow.WW', 1)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440, 'height':810})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(source, wait_until='domcontentloaded')

    def play(index):
        page.evaluate('index => WW.main.play(index)', index)
        page.locator('#menu').wait_for(state='hidden')

    def advance(frames=1):
        page.evaluate('(n) => {for(let i=0;i<n;i++)WW.main.game.update(1/60)}', frames)

    def state(expr):
        return page.evaluate('WW.main.game.state.' + expr)

    def key(code):
        page.keyboard.down(code)
        advance()
        page.keyboard.up(code)
        advance()

    species = page.evaluate('Object.keys(WW.catalog.creatures)')
    forms = page.evaluate('Object.keys(WW.catalog.forms)')
    assert len(species) == len(forms) == 8, (species, forms)
    assert sorted(species) == sorted(forms)
    assert page.evaluate('Object.values(WW.catalog.creatures).every(c => c.capturable)')

    # Catch different animals in a single meadow. Each capture must forget the
    # old type, even if that type was actively transformed.
    play(0)
    for kind in ['springaroo', 'mossback', 'prismtail', 'emberkit', 'glimmermoth']:
        page.evaluate("""kind => {
          const s=WW.main.game.state,p=s.players[0];
          s.animals.forEach(a => {a.alive=a.kind===kind;a.respawn=99999;});
          const a=s.animals.find(a => a.kind===kind);
          a.eating=0;a.stunned=0;a.trapped=0;a.stuck=0;
          a.trust=100;a.distractedUntil=999999;
          p.x=a.x-32;p.y=a.y;p.vx=p.vy=0;p.face=1;p.actionCD=0;p.invincible=100;
          s.projectiles.length=0;
          s.projectiles.push({kind:'orb',owner:0,x:a.x,y:a.y-14,vx:0,vy:0,ttl:1,age:0});
        }""", kind)
        advance()
        assert state('players[0].caught') == kind, kind
        assert sorted(k for k, v in state('players[0].unlocked').items() if v) == [kind]
        assert state('players[0].form') is None
        key('t')
        assert state('players[0].form') == kind, kind

    # The other biome species are equally catchable, with no special flags.
    for chapter, kinds in [(1, ['tideling']), (2, ['skyling', 'cloudwhisp'])]:
        play(chapter)
        for kind in kinds:
            page.evaluate("""kind => {
              const s=WW.main.game.state,p=s.players[0];
              s.animals.forEach(a => {a.alive=a.kind===kind;a.respawn=99999;});
              const a=s.animals.find(a => a.kind===kind);
              a.trust=100;a.distractedUntil=999999;
              p.x=a.x-32;p.y=a.y;p.vx=p.vy=0;p.actionCD=0;p.invincible=100;
              s.projectiles.length=0;
              s.projectiles.push({kind:'orb',owner:0,x:a.x,y:a.y-14,vx:0,vy:0,ttl:1,age:0});
            }""", kind)
            advance()
            assert state('players[0].caught') == kind, kind
            assert sum(state('players[0].unlocked').values()) == 1
            key('t')
            assert state('players[0].form') == kind, kind

    # In explorer form F spends one fruit; in creature form F uses a species
    # effect and never spends fruit. Magic is not part of the default toolkit.
    play(0)
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0];
      p.x=100;p.y=350;p.grounded=true;p.vx=p.vy=0;p.face=1;p.invincible=100;
      s.animals.forEach(a => {a.alive=false;a.respawn=99999;});
    }""")
    stock = state('shared.foods.berry')
    key('f')
    assert state('shared.foods.berry') == stock-1
    assert state('projectiles.some(pr => pr.kind==="food")')
    for kind, spell in [('springaroo','petal'), ('tideling','splash'),
                         ('skyling','feather'), ('mossback','honey'),
                         ('prismtail','bubble'), ('cloudwhisp','gust'),
                         ('emberkit','spark')]:
        page.evaluate("""kind => {
          const s=WW.main.game.state,p=s.players[0];
          p.form=kind;p.caught=kind;p.actionCD=0;p.face=1;
          s.projectiles.length=0;
        }""", kind)
        key('f')
        assert state('projectiles.some(pr => pr.kind === "'+spell+'")'), (kind, spell)
        assert state('shared.foods.berry') == stock-1

    page.evaluate("""() => {
      const p=WW.main.game.state.players[0];
      p.form='glimmermoth';p.caught='glimmermoth';p.actionCD=0;
      p.grounded=false;p.vy=4;
    }""")
    key('f')
    assert state('players[0].hover') > .6
    assert state('players[0].vy') <= 1.45

    # A spell should actually affect an animal, rather than being just a sprite.
    for kind, spell, status in [
        ('mossback','honey','stuck'), ('prismtail','bubble','trapped'),
        ('cloudwhisp','gust','stunned'), ('emberkit','spark','stunned')]:
        page.evaluate("""kind => {
          const s=WW.main.game.state,p=s.players[0],a=s.animals.find(a=>a.kind==='emberkit');
          s.animals.forEach(b => {b.alive=b===a;b.respawn=99999;});
          a.x=a.homeX;a.y=a.homeY;a.stuck=a.trapped=a.stunned=0;
          a.windup=a.dashTime=0;a.eating=1;a.distractedUntil=0;
          p.x=a.x-32;p.y=a.y;p.vx=p.vy=0;p.face=1;p.grounded=true;
          p.form=kind;p.caught=kind;p.actionCD=0;p.invincible=100;
          s.projectiles.length=0;
        }""", kind)
        key('f')
        advance(5)
        assert state('animals.find(a => a.kind==="emberkit").'+status) > 0, (kind, spell, status)

    # Downward head contact knocks out a charging Emberkit without costing hearts.
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],a=s.animals.find(a=>a.kind==='emberkit');
      a.alive=true;a.x=a.homeX;a.y=a.homeY;a.phase=0;a.eating=0;
      a.stunned=a.stuck=a.trapped=0;a.windup=a.dashTime=0;a.chargeCooldown=10;
      p.x=a.x;p.y=a.y-27;p.vx=0;p.vy=3;p.grounded=false;
      p.form=null;p.health=3;p.invincible=0;
    }""")
    advance(4)
    assert not state('animals.find(a => a.kind==="emberkit").alive')
    assert state('players[0].health') == 3
    assert state('players[0].vy') < 0

    # Each aggressive pattern begins with a readable warning, not a surprise hit.
    for chapter, kind in [(0,'emberkit'),(0,'prismtail'),(2,'cloudwhisp')]:
        play(chapter)
        page.evaluate("""kind => {
          const s=WW.main.game.state,p=s.players[0],a=s.animals.find(a=>a.kind===kind);
          s.animals.forEach(b => {b.alive=b===a;b.respawn=99999;});
          a.eating=0;a.distractedUntil=0;a.stunned=a.stuck=a.trapped=0;
          a.windup=a.dashTime=0;a.chargeCooldown=0;
          p.x=a.x+45;p.y=a.y;p.vx=p.vy=0;p.invincible=100;
        }""",kind)
        advance()
        assert state('animals.find(a => a.kind==="'+kind+'").windup') > 0, kind

    assert not errors, errors
    browser.close()
    print('PASS: all eight catchable, latest-form swap, exclusive F powers, spell hit effects, safe stomp and attack tells')
