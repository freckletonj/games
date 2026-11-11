"""Rideable mount regression: feeding, actual boarding, movement, flight, capture immunity and co-op."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html=Path(__file__).parents[1]/"dist"/"wonderwood.html"
source=html.read_text().replace("requestAnimationFrame(frame);","")
source=source.replace('<script>\nwindow.WW',
    '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>\nwindow.WW',1)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--no-sandbox"])
    page=browser.new_page(viewport={"width":1440,"height":810})
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    page.set_content(source,wait_until="domcontentloaded")

    def play(index):
        page.evaluate("(i)=>WW.main.play(i)",index)
        page.locator("#menu").wait_for(state="hidden")

    def advance(frames=1):
        page.evaluate("(n)=>{for(let i=0;i<n;i++)WW.main.game.update(1/60)}",frames)

    def state(expr):
        return page.evaluate("WW.main.game.state."+expr)

    assert page.evaluate("Object.keys(WW.catalog.forms).length")==8
    assert page.evaluate("Object.keys(WW.catalog.creatures).length")==8
    assert page.evaluate("Object.keys(WW.catalog.mounts).sort()")==["pegasus","unicorn"]
    assert page.evaluate("Object.values(WW.catalog.mounts).every(m=>m.capturable===false)")

    def tame_and_board(kind):
        page.evaluate("""kind=>{
            const s=WW.main.game.state,p=s.players[0],m=s.mounts.find(m=>m.kind===kind);
            s.animals.forEach(a=>{a.alive=false;a.respawn=99999;});
            s.lures.length=0;s.projectiles.length=0;
            m.trust=0;m.eating=0;m.rider=null;m.vx=m.vy=0;
            p.mount=null;p.mountCooldown=0;p.form=null;p.caught=null;
            p.invincible=100;
            s.lures.push({x:m.x,y:m.y,food:WW.catalog.mounts[kind].favorite,
              age:0,ttl:24,used:false});
        }""",kind)
        advance()
        assert state(f'mounts.find(m=>m.kind==="{kind}").trust')==60
        page.evaluate("""kind=>{
            const s=WW.main.game.state,m=s.mounts.find(m=>m.kind===kind);
            s.lures.push({x:m.x,y:m.y,food:WW.catalog.mounts[kind].favorite,
              age:0,ttl:24,used:false});
        }""",kind)
        advance()
        assert state(f'mounts.find(m=>m.kind==="{kind}").trust')==100
        # Jump onto the animal's saddle from above; no orb or special key.
        page.evaluate("""kind=>{
            const s=WW.main.game.state,p=s.players[0],m=s.mounts.find(m=>m.kind===kind);
            p.x=m.x;p.y=m.y-32;p.vx=0;p.vy=5.5;p.grounded=false;p.coyote=0;
        }""",kind)
        advance(2)
        assert state('players[0].mount') is not None,kind
        assert state(f'mounts.find(m=>m.kind==="{kind}").rider')==0

    play(0)
    assert state("mounts.map(m=>m.kind)")==["unicorn"]

    # Verify real thrown berries, not only injected lures, tame a roaming mount.
    page.evaluate("""()=>{
        const s=WW.main.game.state,p=s.players[0],m=s.mounts[0];
        s.animals.forEach(a=>{a.alive=false;a.respawn=99999;});
        p.x=m.x-55;p.y=m.y;p.vx=p.vy=0;p.grounded=true;
        p.form=null;p.selectedFood=0;p.face=1;p.actionCD=0;p.invincible=100;
        m.trust=0;m.eating=0;s.lures.length=0;s.projectiles.length=0;
    }""")
    for attempt in range(2):
        page.keyboard.down("f")
        advance()
        page.keyboard.up("f")
        advance(27)
    advance(130)
    assert state("mounts[0].trust")==100,state("mounts[0]")

    play(0)
    tame_and_board("unicorn")

    # Relocate to a real continuous dry ramp for repeatable movement checks.
    page.evaluate("""()=>{
        const s=WW.main.game.state,p=s.players[0],m=s.mounts[0];
        const world=WW.worlds.create(s.chapter);
        m.x=15*16;m.y=world.surface[15]*16;m.vx=m.vy=0;m.grounded=true;
        p.x=m.x;p.y=m.y-23;p.vx=p.vy=0;p.grounded=true;
    }""")
    start=state("players[0].x")
    page.keyboard.down("d")
    advance(24)
    page.keyboard.up("d")
    unicorn=(state("players[0].x"),state("players[0].vx"))
    assert unicorn[0]>start+65 and unicorn[1]>3.5,(start,unicorn)
    page.keyboard.down("Space")
    advance()
    page.keyboard.up("Space")
    assert state("mounts[0].vy") < -8.5,state("mounts[0].vy")
    assert state("players[0].mount")==0
    page.evaluate('WW.main.game.render(document.querySelector("#game").getContext("2d"),4)')
    page.locator("#game").screenshot(path=str(html.parent/"preview-unicorn.png"))
    page.keyboard.down("t")
    advance()
    page.keyboard.up("t")
    assert state("players[0].mount") is None
    assert state("mounts[0].rider") is None

    # A capture orb cannot capture a mount or replace the latest captured form.
    play(0)
    page.evaluate("""()=>{
        const s=WW.main.game.state,p=s.players[0],m=s.mounts[0];
        s.animals.forEach(a=>{a.alive=false;a.respawn=99999;});
        p.caught='springaroo';p.form=null;p.invincible=100;
        s.projectiles.push({kind:'orb',owner:0,x:m.x,y:m.y-19,
          vx:0,vy:0,ttl:1,age:0,bounces:0});
    }""")
    advance()
    assert state("players[0].caught")=="springaroo"
    assert state("mounts[0].rider") is None

    play(2)
    assert state("mounts.map(m=>m.kind)")==["pegasus"]
    perch=state("mounts[0].y")
    advance(20)
    assert abs(state("mounts[0].y")-perch)<2, "Pegasus must stay on its authored ledge"
    assert page.evaluate("""()=>{
      const s=WW.main.game.state,m=s.mounts[0],w=WW.worlds.create(s.chapter);
      return m.y < w.surface[Math.floor(m.x/16)]*16-100;
    }"""), "Pegasus should be on a raised shelf, not the ground-floor route"
    tame_and_board("pegasus")
    page.evaluate("""()=>{
        const s=WW.main.game.state,p=s.players[0],m=s.mounts[0];
        const world=WW.worlds.create(s.chapter);
        m.x=40*16;m.y=world.surface[40]*16;m.vx=m.vy=0;m.grounded=true;
        p.x=m.x;p.y=m.y-23;p.vx=p.vy=0;p.grounded=true;p.flaps=4;
    }""")
    skyStart=state("players[0].y")
    page.keyboard.down("Space")
    advance(80)
    page.keyboard.up("Space")
    sky=(state("players[0].y"),state("players[0].flaps"),state("players[0].mount"))
    assert sky[0]<skyStart-140,(skyStart,sky)
    assert sky[1]==4 and sky[2]==0,sky
    page.evaluate('WW.main.game.render(document.querySelector("#game").getContext("2d"),5)')
    page.locator("#game").screenshot(path=str(html.parent/"preview-pegasus.png"))
    page.keyboard.down("s")
    advance(18)
    page.keyboard.up("s")
    assert state("mounts[0].vy")>0,state("mounts[0].vy")
    page.evaluate('WW.main.game.render(document.querySelector("#game").getContext("2d"),5)')

    # If P2 falls behind while mounted, the follower bubble releases the mount.
    page.evaluate("WW.storage.data.settings.players=2")
    play(0)
    assert len(state("players"))==2
    page.evaluate("""()=>{
        const s=WW.main.game.state,m=s.mounts[0],p=s.players[1];
        p.mount=m.id;m.rider=p.id;p.x=m.x;p.y=m.y-23;
        p.bubble=false;p.bubbleGrace=0;p.sleep=false;
    }""")
    advance()
    assert state("players[1].bubble")
    assert state("players[1].mount") is None
    assert state("mounts[0].rider") is None

    assert not errors,errors
    browser.close()
    print("PASS: feed-to-ride Unicorn/Pegasus, fast jumping, unlimited flight, orb immunity, dismount and co-op")
