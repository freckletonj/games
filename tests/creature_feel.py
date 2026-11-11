"""Regression: stable creature facing, meaningful pursuit/gusts, feeding and visual identity."""
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

    def state(expr):
        return page.evaluate("WW.main.game.state."+expr)

    play(0)
    # An active Emberkit must be able to move beyond the old ±125 spawn leash.
    page.evaluate("""() => {
        const s=WW.main.game.state,a=s.animals.find(a=>a.kind==='emberkit'),p=s.players[0];
        s.animals.forEach(other=>{other.alive=other===a;other.respawn=99999;});
        a.homeX=a.x-120;
        a.dir=1;a.turnCooldown=0;a.chargeCooldown=100;a.windup=0;a.dashTime=0;
        a.trust=0;a.eating=0;a.aggroUntil=0;
        p.x=a.x+65;p.y=a.y;p.vx=p.vy=0;p.grounded=true;p.invincible=100;
    }""")
    advance(16)
    chase=page.evaluate("""() => {
        const a=WW.main.game.state.animals.find(a=>a.kind==='emberkit');
        return a.x-a.homeX;
    }""")
    assert chase > 125, chase

    # When no one is nearby, a fixed patrol boundary must not cause rapid
    # left-right sprite mirroring. Count real flips over two seconds.
    flips=page.evaluate("""() => {
        const game=WW.main.game,s=game.state,a=s.animals.find(a=>a.kind==='emberkit');
        s.players.forEach(p=>p.sleep=true);
        a.x=a.homeX+46;a.dir=1;a.turnCooldown=0;a.aggroUntil=0;
        a.chargeCooldown=100;a.windup=0;a.dashTime=0;
        let count=0,old=a.dir;
        for(let i=0;i<120;i++){
          game.update(1/60);
          if(a.dir!==old){count++;old=a.dir;}
        }
        return count;
    }""")
    assert flips <= 8, flips

    # Fast second snacks must register even while the first chewing animation
    # is running. Use an actual edible lure and the production wildlife loop.
    play(0)
    page.evaluate("""() => {
        const s=WW.main.game.state,a=s.animals.find(a=>a.kind==='springaroo');
        s.animals.forEach(other=>{other.alive=other===a;other.respawn=99999;});
        a.trust=60;a.eating=.8;a.stunned=a.stuck=a.trapped=0;
        a.distractedUntil=0;a.windup=0;a.dashTime=0;
        s.lures.length=0;
        s.lures.push({x:a.x,y:a.y-12,food:'berry',ttl:24,age:0,used:false});
        s.players[0].invincible=100;
    }""")
    advance()
    second=(state('animals.find(a=>a.kind==="springaroo").trust'),
            state('animals.find(a=>a.kind==="springaroo").distractedUntil'))
    assert second[0]==100 and second[1]>0,second

    # Real rapid button presses launch two physical berry projectiles; the
    # same Springaroo must gain 100 trust and be available for an orb capture.
    play(0)
    page.evaluate("""() => {
        const s=WW.main.game.state,p=s.players[0];
        const a=s.animals.find(a=>a.kind==='springaroo');
        s.animals.forEach(other=>{other.alive=other===a;other.respawn=99999;});
        a.trust=0;a.eating=0;a.stunned=a.stuck=a.trapped=0;
        a.distractedUntil=0;a.windup=0;a.dashTime=0;
        p.x=a.x-75;p.y=a.homeY;p.vx=p.vy=0;p.grounded=true;
        p.form=null;p.selectedFood=0;p.face=1;p.actionCD=0;p.invincible=100;
        s.lures.length=0;s.projectiles.length=0;
    }""")
    for attempt in range(2):
        page.keyboard.down("f")
        advance()
        page.keyboard.up("f")
        advance(25)
    advance(170)
    trust=state('animals.find(a=>a.kind==="springaroo").trust')
    assert trust==100,trust
    assert state('animals.find(a=>a.kind==="springaroo").distractedUntil')>0
    page.evaluate("""() => {
        const s=WW.main.game.state,p=s.players[0];
        const a=s.animals.find(a=>a.kind==='springaroo');
        p.x=a.x-29;p.y=a.y;p.vx=p.vy=0;p.face=1;p.actionCD=0;
    }""")
    page.keyboard.down("g")
    advance(12)
    page.keyboard.up("g")
    assert state("players[0].caught")=="springaroo"

    # Cloudwhisp warns before contact from significantly farther away than
    # the old 100px threshold, and its gust produces meaningful displacement.
    play(2)
    page.evaluate("""() => {
        const s=WW.main.game.state,a=s.animals.find(a=>a.kind==='cloudwhisp'),p=s.players[0];
        s.animals.forEach(other=>{other.alive=other===a;other.respawn=99999;});
        a.x=a.homeX;a.y=a.homeY;a.windup=0;a.gustTime=0;a.chargeCooldown=0;
        a.eating=0;a.stunned=a.stuck=a.trapped=0;a.distractedUntil=0;
        p.x=a.x+130;p.y=a.y+20;p.vx=p.vy=0;p.grounded=false;p.invincible=100;
    }""")
    advance()
    assert state('animals.find(a=>a.kind==="cloudwhisp").windup')>.35
    page.evaluate("""() => {
        const s=WW.main.game.state,a=s.animals.find(a=>a.kind==='cloudwhisp'),p=s.players[0];
        a.windup=0;a.dir=1;a.gustTime=.48;a.gustHit=[];a.chargeCooldown=100;
        p.x=a.x+90;p.y=a.y;p.vx=p.vy=0;p.windPush=0;
    }""")
    advance()
    gust=(state("players[0].vx"),state("players[0].windPush"))
    assert gust[0]>7 and gust[1]>.15,gust
    initial=state("players[0].x")
    advance(5)
    assert state("players[0].x")>initial+25

    # Eating state must come from the SAME character's sprite atlas rather than
    # switching to an unrelated third-party pose (the old states.webp cells).
    page.wait_for_function("""() => Object.keys(WW.catalog.creatures).every(
        name => !!WW.spriteAtlas.portrait(name))""")
    identity=page.evaluate("""() => {
        const species=Object.keys(WW.catalog.creatures),draw=WW.illustrations.draw;
        const atlas=WW.spriteAtlas.draw,usedStates=[],usedAtlases=[];
        WW.illustrations.draw=(ctx,name,...args)=>{
          if(name.startsWith('eat'))usedStates.push(name);
          return draw(ctx,name,...args);
        };
        WW.spriteAtlas.draw=(ctx,name,...args)=>{
          usedAtlases.push(name);return atlas(ctx,name,...args);
        };
        const canvas=document.createElement('canvas');canvas.width=200;canvas.height=200;
        const ctx=canvas.getContext('2d');
        species.forEach(name=>WW.art.draw(ctx,name,100,160,0,false,null,{action:'eat',time:.3}));
        WW.illustrations.draw=draw;WW.spriteAtlas.draw=atlas;
        return {usedStates,usedAtlases};
    }""")
    assert identity["usedStates"]==[],identity
    assert sorted(identity["usedAtlases"])==sorted(page.evaluate("Object.keys(WW.catalog.creatures)")),identity

    # Lures and airborne food invoke the single-fruit renderer, not full bush
    # scenery. Static atlas selection is not enough; check actual in-game draw.
    fruit=page.evaluate("""() => {
        const s=WW.main.game.state,ctx=document.querySelector('#game').getContext('2d');
        s.lures.push({x:100,y:200,food:'berry',age:0,ttl:24,used:false});
        s.projectiles.push({kind:'food',food:'berry',x:120,y:180,vx:1,vy:0,ttl:2,age:0});
        const orig=WW.art.drawFruit,drawn=[];
        WW.art.drawFruit=(...args)=>{drawn.push(args[1]);return orig(...args);};
        WW.main.game.render(ctx,1);
        WW.art.drawFruit=orig;
        return drawn;
    }""")
    assert fruit.count("berry")>=2,fruit

    assert not errors,errors
    browser.close()
    print("PASS: extended chase, stable facing, consecutive treats, early/strong gust, character continuity, single fruits")
