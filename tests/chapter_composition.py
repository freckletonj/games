"""Rendering regression for non-repeating backdrops and grounded bridge art."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).parents[1]
source = (root/'dist'/'wonderwood.html').read_text()
source = source.replace('requestAnimationFrame(frame);','')
source = source.replace('<script>\nwindow.WW',
    '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>\nwindow.WW',1)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True,args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':810})
    errors = []
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(source,wait_until='domcontentloaded')
    page.wait_for_function("""() =>
      ['backdrop','coastBackdrop','summitBackdrop','painted-biomes']
        .every(name=>WW.scenery.ready(name))""")
    result = page.evaluate("""() => {
      const ids=['first-forest','crystal-coast','starfall-summit',
        'willow-wetlands','cloud-gardens'];
      const render=(id,cameraX,cameraY=0)=>{
        const level=WW.worlds.create(WW.chapters.find(c=>c.id===id));
        const canvas=document.createElement('canvas');
        canvas.width=480;canvas.height=270;
        const ctx=canvas.getContext('2d');
        const original=ctx.drawImage.bind(ctx);
        let draws=0;
        ctx.drawImage=(...args)=>{draws++;return original(...args);};
        WW.scenery.background(ctx,level.biome,cameraX,level,cameraY);
        const pixels=ctx.getImageData(0,0,480,270).data;
        let hash=0,opaque=0;
        for(let i=0;i<pixels.length;i+=32){
          hash=(hash*31+pixels[i]*7+pixels[i+1]*11+pixels[i+2]*3)%1000000007;
          if(pixels[i+3]===255)opaque++;
        }
        return {hash,draws,opaque};
      };
      const initial=Object.fromEntries(ids.map(id=>[id,render(id,0)]));
      const meadow=WW.worlds.create(WW.chapters[0]);
      const distant=render('first-forest',meadow.width*16-480);
      const coastal=render('crystal-coast',53*16-240,36*16-130);
      const wetland=render('willow-wetlands',66*16-240,35*16-130);
      // The underwater painting must differ only inside actual water.
      const mask=(()=>{
        const level=WW.worlds.create(WW.chapters[1]);
        const x=53*16-240,y=36*16-130;
        const draw=withBasin=>{
          const c=document.createElement('canvas');c.width=480;c.height=270;
          const g=c.getContext('2d');
          const basins=level.waterBodies;
          if(!withBasin)level.waterBodies=[];
          WW.scenery.background(g,'coast',x,level,y);
          level.waterBodies=basins;
          const sample=(px,py)=>[...g.getImageData(px,py,1,1).data];
          return {sky:sample(280,65),water:sample(280,205)};
        };
        return {wet:draw(true),dry:draw(false)};
      })();
      const level=meadow;
      const bridge=level.platformSegments.find(s=>
        s.style==='bridge'&&s.x>=140&&s.x<160);
      const paintSupport=withWorld=>{
        const c=document.createElement('canvas');c.width=250;c.height=140;
        const g=c.getContext('2d');
        g.save();g.translate(35-bridge.x*16,35-bridge.y*16);
        WW.scenery.platformSpan(g,'meadow',bridge,0,withWorld?level:null);
        g.restore();
        return g.getImageData(44,85,1,1).data[3];
      };
      return {initial,distant,coastal,wetland,mask,
        supportWithWorld:paintSupport(true),
        supportWithoutWorld:paintSupport(false)};
    }""")
    initial=result['initial']
    assert all(d['draws']==1 for d in initial.values()),result
    assert result['coastal']['draws']==2,result
    assert result['wetland']['draws']==2,result
    assert all(d['opaque']>=4000 for d in initial.values()),result
    assert result['distant']['hash'] != initial['first-forest']['hash'],result
    for a,b in [('first-forest','willow-wetlands'),
                ('crystal-coast','willow-wetlands'),
                ('starfall-summit','cloud-gardens')]:
        assert initial[a]['hash'] != initial[b]['hash'],(a,b,result)
    assert result['mask']['wet']['sky']==result['mask']['dry']['sky'],result
    assert result['mask']['wet']['water']!=result['mask']['dry']['water'],result
    assert result['supportWithWorld']>result['supportWithoutWorld'],result
    # Capture the real playable waterline in both coastal chapters, not just
    # an offscreen art-only swatch; these screenshots are CI review assets.
    for chapter in [1,3]:
        page.evaluate('(i)=>WW.main.play(i)',chapter)
        page.locator('#menu').wait_for(state='hidden')
        page.evaluate("""() => {
          const game=WW.main.game,s=game.state,p=s.players[0];
          const level=WW.worlds.create(s.chapter);
          const basin=level.waterBodies[0];
          p.x=basin.start*16+80;
          p.y=basin.surface*16-5;
          p.form='tideling';p.caught='tideling';
          p.vx=p.vy=0;p.health=3;p.invincible=999;
          s.animals.forEach(a=>{a.alive=false;a.respawn=9999});
          for(let i=0;i<90;i++)game.update(1/60);
          game.render(document.querySelector('#game').getContext('2d'),6);
        }""")
        name='crystal-coast' if chapter==1 else 'willow-wetlands'
        page.screenshot(path=str(root/'dist'/f'preview-composition-{name}.png'))
    assert not errors,errors
    browser.close()
    print('PASS: single uninterrupted panorama per chapter, distinct palettes,')
    print('      basin-only underwater art and physically grounded bridges')
