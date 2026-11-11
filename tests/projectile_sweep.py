"""Fast projectile collision must respect walls and moving animal hitboxes."""
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

    blocked=page.evaluate("""() => {
        const level=WW.worlds.create(WW.chapters[0]);
        for(const row of level.grid)row[100]='ground';
        const game=WW.games.animals.start(level),s=game.state,p=s.players[0];
        const a=s.animals.find(a=>a.kind==='springaroo');
        s.animals.forEach(other=>{other.alive=other===a;other.respawn=99999;});
        a.x=100*16+25;a.y=level.surface[100]*16;a.homeX=a.x;
        a.homeY=a.y;a.eating=1;a.trust=100;a.distractedUntil=99999;
        p.invincible=100;p.caught=null;
        s.projectiles.length=0;
        s.projectiles.push({kind:'orb',owner:0,x:100*16-22,
          y:a.y-14,vx:23,vy:0,ttl:1,age:0,bounces:0});
        game.update(.045);
        const result={alive:a.alive,caught:p.caught,remaining:s.projectiles.length};
        game.stop();return result;
    }""")
    assert blocked=={"alive":True,"caught":None,"remaining":0},blocked

    hit=page.evaluate("""() => {
        const level=WW.worlds.create(WW.chapters[0]);
        const game=WW.games.animals.start(level),s=game.state,p=s.players[0];
        const a=s.animals.find(a=>a.kind==='springaroo');
        s.animals.forEach(other=>{other.alive=other===a;other.respawn=99999;});
        a.x=100*16+25;a.y=level.surface[100]*16;a.homeX=a.x;
        a.homeY=a.y;a.eating=1;a.trust=100;a.distractedUntil=99999;
        p.invincible=100;p.caught=null;
        s.projectiles.length=0;
        s.projectiles.push({kind:'orb',owner:0,x:a.x-48,
          y:a.y-14,vx:45,vy:0,ttl:1,age:0,bounces:0});
        game.update(.045);
        const result={alive:a.alive,caught:p.caught,remaining:s.projectiles.length};
        game.stop();return result;
    }""")
    assert hit=={"alive":False,"caught":"springaroo","remaining":0},hit

    assert not errors,errors
    browser.close()
    print("PASS: fast capture orbs cannot pass through walls or skip creatures at long frame steps")
