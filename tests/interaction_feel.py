"""Regression: spring timing, currents, buoyancy, flap buffering, and capture-orb hops."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(__file__).parents[1] / "dist" / "wonderwood.html"
source = html.read_text().replace("requestAnimationFrame(frame);", "")
source = source.replace('<script>\nwindow.WW',
    '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>\nwindow.WW', 1)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 1440, "height": 810})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_content(source, wait_until="domcontentloaded")

    def play(index):
        page.evaluate("(i) => WW.main.play(i)", index)
        page.locator("#menu").wait_for(state="hidden")

    def advance(frames=1):
        page.evaluate("(n) => {for(let i=0;i<n;i++)WW.main.game.update(1/60)}", frames)

    def state(expr):
        return page.evaluate("WW.main.game.state." + expr)

    def clear_animals():
        page.evaluate("""() => WW.main.game.state.animals.forEach(a => {
            a.alive=false;a.respawn=99999;
        })""")

    # A bloom launches a character without input, and a press immediately
    # following contact produces extra height without a free double jump.
    play(0)
    clear_animals()
    page.evaluate("""() => {
        const s=WW.main.game.state,p=s.players[0];
        const b=s.setpieces.find(piece=>piece.kind==='bounceBloom'&&!piece.requires);
        p.x=b.x;p.y=b.y;p.vx=p.vy=0;p.grounded=true;p.form=null;
        p.coyote=0;p.lastJumpPress=-100;p.bloomBoostWindow=0;
    }""")
    advance()
    normal = state("players[0].vy")
    window = state("players[0].bloomBoostWindow")
    assert -6.4 < normal < -5.7 and window > .1, (normal, window)
    page.keyboard.down("Space")
    advance()
    page.keyboard.up("Space")
    boosted = state("players[0].vy")
    assert -7.6 < boosted < -6.8 and boosted < normal - .8, (normal, boosted)

    # Schema-declared Springaroo blooms must not be usable in explorer form.
    required = state("setpieces.filter(s=>s.kind==='bounceBloom'&&s.requires).length")
    if required:
        page.evaluate("""() => {
            const s=WW.main.game.state,p=s.players[0];
            const b=s.setpieces.find(piece=>piece.kind==='bounceBloom'&&piece.requires);
            p.x=b.x;p.y=b.y;p.vx=p.vy=0;p.grounded=true;p.form=null;
            p.lastJumpPress=-100;
            b.ready[p.id]=0;
        }""")
        advance()
        assert state("players[0].vy") > -6

    # A real thermal accelerates upward from rest, rather than just reducing
    # the downward acceleration. Test explorer lift, not only Moonwing recharge.
    play(2)
    clear_animals()
    page.evaluate("""() => {
        const s=WW.main.game.state,p=s.players[0];
        const t=WW.worlds.create(s.chapter).thermalVolumes[0];
        p.x=(t.x+t.width/2)*16;p.y=(t.y+t.height/2)*16;
        p.vx=p.vy=0;p.grounded=false;p.form=null;p.invincible=100;
    }""")
    start_y=state("players[0].y")
    advance(6)
    thermal = (state("players[0].y"),state("players[0].vy"))
    assert thermal[0] < start_y and thermal[1] < 0, (start_y,thermal)

    # A bubble vent carries a neutral swimmer; holding Jump is not required.
    play(1)
    clear_animals()
    page.evaluate("""() => {
        const s=WW.main.game.state,p=s.players[0];
        const v=s.setpieces.find(piece=>piece.kind==='bubbleVent');
        p.x=v.x;p.y=v.y+11;p.vx=p.vy=0;p.grounded=false;
        p.form='tideling';p.invincible=100;
    }""")
    advance()
    assert state("players[0].vy") < -.4, state("players[0].vy")

    # Away from vents, the swimmer sinks naturally, paddles upward, and dives.
    page.evaluate("""() => {
        const s=WW.main.game.state,p=s.players[0],w=WW.worlds.create(s.chapter);
        const pool=w.waterBodies[1];
        p.x=(pool.start+pool.end)*8;
        p.y=(pool.surface+4)*16;p.vx=p.vy=0;p.grounded=false;
        p.breachCooldown=0;
    }""")
    baseline=state("players[0].y")
    advance(10)
    sinking=(state("players[0].y"),state("players[0].vy"))
    assert sinking[0]>baseline+2 and sinking[1]>0, (baseline,sinking)
    page.keyboard.down("Space")
    advance(8)
    page.keyboard.up("Space")
    assert state("players[0].vy") < 0, state("players[0].vy")
    page.keyboard.down("s")
    advance(12)
    page.keyboard.up("s")
    assert state("players[0].vy") > 0, state("players[0].vy")

    # A tap made during the 0.15-second cooldown still spends precisely one
    # flap when the cooldown expires; holding the button won't use another.
    play(2)
    clear_animals()
    page.evaluate("""() => {
        const s=WW.main.game.state,p=s.players[0];
        p.x=19*16;p.y=22*16;p.vx=p.vy=0;p.grounded=false;
        p.coyote=0;p.form='skyling';p.flaps=4;
        p.flapCooldown=.12;p.flapBuffer=0;p.invincible=100;
    }""")
    page.keyboard.down("Space")
    advance(10)
    page.keyboard.up("Space")
    assert state("players[0].flaps")==3, state("players[0].flaps")
    advance(12)
    assert state("players[0].flaps")==3, "Held Jump should not drain charges"

    # Orb contact with the sloped ground causes a controlled bounce instead
    # of deleting the projectile on first impact.
    play(0)
    clear_animals()
    page.evaluate("""() => {
        const s=WW.main.game.state,w=WW.worlds.create(s.chapter);
        const x=31*16, c=Math.floor(x/16),fraction=x/16-c;
        const ground=(w.surface[c]*(1-fraction)+w.surface[c+1]*fraction)*16;
        s.projectiles.length=0;
        s.projectiles.push({kind:'orb',owner:0,x,y:ground-1,
            vx:2.5,vy:1.6,age:0,ttl:1,bounces:0});
    }""")
    advance()
    orb=state("projectiles[0]")
    assert orb and orb["bounces"]==1 and orb["vy"]<0, orb
    advance(4)
    assert state("projectiles.length")==1, "Orb should continue past first ground hit"

    assert not errors,errors
    browser.close()
    print("PASS: bloom timing/gates, real air and water currents, natural sinking, buffered flaps, terrain-skimming orbs")
