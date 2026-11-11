"""Physical regression: finite wingbeats, landing and wind-ring recharge."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html=Path(__file__).parents[1]/'dist'/'wonderwood.html'
source=html.read_text().replace('requestAnimationFrame(frame);','')
source=source.replace('<script>\nwindow.WW',
    '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>\nwindow.WW',1)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':810})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(source,wait_until='domcontentloaded')
    page.evaluate('WW.main.play(2)')
    page.locator('#menu').wait_for(state='hidden')
    report=page.evaluate("""() => {
      const game=WW.main.game,s=game.state,p=s.players[0];
      s.animals.forEach(a=>{a.alive=false;a.respawn=9999});
      const keys=WW.input.actions;
      const input=(tap=false)=>({left:false,right:false,down:false,jump:tap,
        pressed:Object.fromEntries(keys.map(k=>[k,k==='jump'&&tap])),
        released:Object.fromEntries(keys.map(k=>[k,false]))});
      const read=WW.input.read;
      // Budget the four finite wingbeats in air *outside* all thermal
      // columns. Wind-assisted recharge is tested separately below.
      const w=WW.worlds.create(s.chapter);
      let x=20;
      while(w.thermalVolumes.some(v=>x>=v.x-2&&x<v.x+v.width+2))x+=2;
      p.form='skyling';p.flaps=4;p.flapCooldown=0;p.flapBuffer=0;
      p.x=x*16;p.y=Math.max(190,w.surface[x]*16-230);
      p.vx=p.vy=0;p.grounded=false;p.coyote=0;p.invincible=100;
      const startY=p.y;
      let count=0,highest=p.y;
      WW.input.read=()=>input(count++%11===0);
      for(let i=0;i<62;i++){
        game.update(1/60);
        highest=Math.min(highest,p.y);
      }
      const exhausted={flaps:p.flaps,highest,start:startY,y:p.y};
      p.x=123*16;p.y=35*16;p.vx=p.vy=0;p.flaps=0;p.flapRecharge=0;
      p.flapCooldown=0;p.grounded=false;
      // A wind-ring explicitly restores stored lift.
      const ring=s.setpieces.find(z=>z.kind==='windRing'&&z.x/16>110&&z.x/16<135);
      p.x=ring.x;p.y=ring.y+13;
      WW.input.read=()=>input(false);
      for(let i=0;i<5;i++)game.update(1/60);
      const restored=p.flaps;
      // Restore landing on an actual platform in the game's physics.
      p.x=119*16;p.y=35*16-12;p.vy=1;p.flaps=0;
      for(let i=0;i<40;i++)game.update(1/60);
      const landed={flaps:p.flaps,grounded:p.grounded};
      WW.input.read=read;
      return {exhausted,restored,landed};
    }""")
    assert report['exhausted']['flaps']==0,report
    assert report['exhausted']['highest'] < report['exhausted']['start'],report
    assert report['exhausted']['highest'] > report['exhausted']['start']-190,report
    assert report['restored']>=2,report
    assert report['landed']['flaps']==4,report
    assert not errors,errors
    browser.close()
    print('PASS: finite wingbeats, authored wind-ring recharge, safe platform recovery')
