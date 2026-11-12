"""Quantitative platformer jump feel, water state and painted rider-attachment checks."""
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
    page.on("pageerror",lambda error:errors.append(str(error)))
    page.set_content(source,wait_until="domcontentloaded")

    def play(index):
        page.evaluate("(i)=>WW.main.play(i)",index)
        page.locator("#menu").wait_for(state="hidden")

    def advance(frames=1):
        page.evaluate("(n)=>{for(let i=0;i<n;i++)WW.main.game.update(1/60)}",frames)

    def st(expr):
        return page.evaluate("WW.main.game.state."+expr)

    def place_ground(x=15):
        page.evaluate("""x=>{
          const s=WW.main.game.state,p=s.players[0];
          const w=WW.worlds.create(s.chapter),px=x*16;
          p.x=px;p.y=w.surface[x]*16;p.vx=p.vy=0;
          p.grounded=true;p.coyote=.1;p.jumpsUsed=0;p.jumpBuffer=0;
          p.form=null;p.invincible=100;p.bloomBoostWindow=0;p.lastJumpPress=-100;
          s.animals.forEach(a=>{a.alive=false;a.respawn=99999});
        }""",x)

    play(0)
    def jump_arc(hold):
        place_ground()
        start=st("players[0].y")
        page.keyboard.down("Space")
        advance(hold)
        page.keyboard.up("Space")
        track=[st("players[0].y")]
        falling=False
        first_fall=None
        for i in range(60):
            advance()
            track.append(st("players[0].y"))
            if not falling and st("players[0].vy")>=0:
                falling=True
                first_fall=i
            if st("players[0].grounded") and i>1:
                break
        return {"height":start-min(track),"frames":hold+len(track),"fall":first_fall}

    tap=jump_arc(1)
    held=jump_arc(18)
    assert 6<tap["height"]<25,tap
    assert 28<held["height"]<47,held
    assert held["height"]>tap["height"]*1.8,(tap,held)
    assert held["frames"]<39,held

    # Unicorn still has a distinctive jump, but no 200px, slow-motion ascent.
    play(0)
    def unicorn_arc(hold):
        place_ground()
        page.evaluate("""() => {
          const s=WW.main.game.state,p=s.players[0],m=s.mounts[0];
          const w=WW.worlds.create(s.chapter);
          m.x=p.x;m.y=w.surface[15]*16;m.vx=m.vy=0;m.grounded=true;
          m.rider=0;p.mount=0;p.y=m.y-32;
        }""")
        start=st("mounts[0].y")
        page.keyboard.down("Space")
        advance(hold)
        page.keyboard.up("Space")
        heights=[st("mounts[0].y")]
        for _ in range(70):
            advance()
            heights.append(st("mounts[0].y"))
            if st("mounts[0].grounded"):break
        return start-min(heights)
    short=unicorn_arc(1)
    full=unicorn_arc(15)
    assert 15<short<60,short
    assert 55<full<105,full
    assert full>short*1.6,(short,full)

    # An underwater shelf is still inside the lake, despite its platform
    # marker overriding that location in the coarse tile grid.
    play(1)
    shelf=page.evaluate("""() => {
      const s=WW.main.game.state,w=WW.worlds.create(s.chapter);
      const span=w.platformSegments.find(p=>p.style==='shelf');
      const p=s.players[0];
      p.form='tideling';p.x=(span.x+2)*16;p.y=span.y*16+8;
      p.vx=p.vy=0;p.grounded=false;p.invincible=100;
      s.animals.forEach(a=>{a.alive=false;a.respawn=99999});
      return {tile:w.grid[span.y][span.x+2],y:p.y};
    }""")
    assert shelf["tile"]=="platform",shelf
    advance()
    assert 0<st("players[0].vy")<.2,st("players[0].vy")

    # Rising through a vent is passive; Down can overcome the current;
    # the maximum vertical speed stays bounded for both controls.
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],v=s.setpieces.find(v=>v.kind==='bubbleVent');
      p.x=v.x;p.y=v.y+11;p.vx=p.vy=0;p.grounded=false;p.breachCooldown=0;
    }""")
    advance(7)
    passive=st("players[0].vy")
    assert -3<passive<-.55,passive
    page.evaluate("WW.main.game.state.players[0].vy=0")
    page.keyboard.down("s")
    advance(16)
    page.keyboard.up("s")
    assert st("players[0].vy")>0,st("players[0].vy")

    # A breach is a single kick, never a repeated impulse while Jump is held.
    page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[0],w=WW.worlds.create(s.chapter);
      const b=w.waterBodies[1];
      p.x=(b.start+b.end)*8;p.y=b.surface*16+23;
      p.vx=p.vy=0;p.grounded=false;p.breachCooldown=0;
    }""")
    page.keyboard.down("Space")
    advance()
    first=st("players[0].vy")
    advance(4)
    later=st("players[0].vy")
    page.keyboard.up("Space")
    assert -4.6<=first<=-4.0,(first,later)
    assert later>first+0.5,(first,later)

    # Pose-specific saddle placement follows the painted mount identity,
    # while the separate real rider occupies the horse's back.
    placements=page.evaluate("""() => ['unicorn','pegasus'].map(name=>{
      const sheet=WW_EMBEDDED_ATLASES[name].manifest;
      return {name,size:[sheet.frameWidth,sheet.frameHeight],
        seatIdle:WW.spriteAtlas.seat(name,'idle'),
        seatRun:WW.spriteAtlas.seat(name,'run'),
        seatJump:WW.spriteAtlas.seat(name,'jump')};
    })""")
    for mount in placements:
        assert mount["size"]==[160,160],mount
        assert mount["seatIdle"]["y"]< -27,mount
        assert mount["seatRun"]!=mount["seatJump"],mount

    assert not errors,errors
    browser.close()
    print(f"PASS: variable short/full jump ({tap['height']:.1f}/{held['height']:.1f}px), "
          f"shorter Unicorn arc ({short:.1f}/{full:.1f}px), shelf water, currents, and saddle anchors")
