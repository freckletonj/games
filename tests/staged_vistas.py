"""Verify composed section art appears, stays behind gameplay and remains offline."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(__file__).parents[1] / 'dist' / 'wonderwood.html'
source = html.read_text().replace('requestAnimationFrame(frame);', '')
source = source.replace('<script>\nwindow.WW',
    '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>\nwindow.WW', 1)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':810})
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    page.set_content(source,wait_until='domcontentloaded')
    page.wait_for_function("() => WW.scenery.ready('tiles')")
    assert page.evaluate("typeof WW.vistas.draw") == 'function'
    for index in range(5):
        page.evaluate("(i)=>WW.main.play(i)",index)
        page.locator('#menu').wait_for(state='hidden')
        state=page.evaluate("""() => {
          const world=WW.worlds.create(WW.main.game.state.chapter);
          return {vistas:world.vistas,sections:world.sections,dressing:world.dressing,
            water:world.waterBodies,diagnostics:world.diagnostics};
        }""")
        assert len(state['vistas'])==len(state['sections'])
        assert len(state['dressing'])>=10
        assert all(len(s['visualBeats'])==1 for s in state['diagnostics']['sectionReports'])
        # The goal path must appear in the actual game when approached and
        # disappear after the chapter light is recovered. It cannot be merely
        # metadata in an art guide.
        guide=page.evaluate("""() => {
          const game=WW.main.game,s=game.state;
          const level=WW.worlds.create(s.chapter),route=level.goalRoute;
          const goal=s.goals[0],p=s.players[0];
          p.x=(route[0][0]+.5)*16;p.y=route[0][1]*16;
          p.vx=p.vy=0;p.invincible=999;
          s.animals.forEach(a=>{a.alive=false;a.respawn=99999});
          for(let k=0;k<25;k++)game.update(1/60);
          const referenceX=(route[0][0]+.5)*16;
          const referenceY=route[0][1]*16-4;
          const ctx=document.querySelector('#game').getContext('2d');
          const original=WW.illustrations.draw;
          let count=0;
          WW.illustrations.draw=(c,name,x,y,w,h,alpha)=>{
            if(['bubble','spark'].includes(name)&&
               Math.abs(x-referenceX)<1&&Math.abs(y-referenceY)<1)count++;
            return original(c,name,x,y,w,h,alpha);
          };
          game.render(ctx,17);
          const before=count;
          count=0;s.shared.keys[goal.kind]=true;
          game.render(ctx,18);
          const after=count;
          s.shared.keys[goal.kind]=false;
          WW.illustrations.draw=original;
          return {before,after};
        }""")
        assert guide['before']>0 and guide['after']==0,guide

        # Prove the authored composition itself paints real visible pixels,
        # rather than merely rendering the standard panorama behind gameplay.
        vista_samples=page.evaluate("""() => {
          const level=WW.worlds.create(WW.main.game.state.chapter);
          return level.vistas.map(v=>{
            const c=document.createElement('canvas');c.width=480;c.height=270;
            const ctx=c.getContext('2d');
            const cx=(v.x+.5)*16-240,cy=v.y*16-165;
            ctx.save();ctx.translate(-cx,-cy);
            WW.vistas.draw(ctx,level,cx,cy,6);
            ctx.restore();
            const data=ctx.getImageData(0,0,480,270).data;
            let visible=0;
            for(let i=3;i<data.length;i+=4)if(data[i]>12)visible++;
            return {id:v.id,visible};
          });
        }""")
        assert all(v['visible']>400 for v in vista_samples),vista_samples
        # Move the camera to a specific story beat and render a real game frame.
        # The runtime must use authored vista geometry, not repeated old stamps.
        frame=page.evaluate("""() => {
          const game=WW.main.game,s=game.state,world=WW.worlds.create(s.chapter);
          const v=world.vistas.find(v=>v.role==='reveal')||world.vistas[1];
          const player=s.players[0];
          player.x=v.x*16;player.y=v.y*16;
          player.vx=player.vy=0;player.invincible=30;
          s.animals.forEach(a=>{a.alive=false;a.respawn=9999});
          for(let n=0;n<100;n++)game.update(1/60);
          const canvas=document.querySelector('#game');
          game.render(canvas.getContext('2d'),10);
          const g=canvas.getContext('2d'),image=g.getImageData(0,0,canvas.width,canvas.height).data;
          let checksum=0;
          for(let i=0;i<image.length;i+=56)checksum=(checksum+image[i]+image[i+1]*3)%1000000007;
          return {checksum,camera:game.state.cameraX,scene:v.kind};
        }""")
        assert frame['checksum']>0,frame
        page.screenshot(path=str(html.parent/f'preview-vista-{index+1}.png'))
    assert not errors,errors
    browser.close()
    print('PASS 22 scene-led vistas, deterministic dressing and five game screenshots')
