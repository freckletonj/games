"""Painted mount atlases must render all eight real frames in the offline game."""
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
    page.wait_for_function("""() => ['unicorn','pegasus'].every(kind=>
      WW_EMBEDDED_ATLASES[kind]?.image.startsWith('data:image/avif;base64,') &&
      !!WW.spriteAtlas.portrait(kind))""")

    result=page.evaluate("""async () => {
      const names=['unicorn','pegasus'],report={};
      for(const name of names){
        const atlas=WW_EMBEDDED_ATLASES[name];
        const image=new Image();image.src=atlas.image;
        await image.decode();
        const canvas=document.createElement('canvas');canvas.width=320;canvas.height=160;
        const ctx=canvas.getContext('2d');
        const pixels=WW.spriteAtlas.portrait(name);
        const root=WW.catalog.mounts[name];
        const cells=[];
        const native=document.createElement('canvas');native.width=320;native.height=160;
        const nctx=native.getContext('2d');
        nctx.drawImage(image,0,0);
        for(let frame=0;frame<8;frame++){
          const ox=frame%4*80,oy=Math.floor(frame/4)*80;
          const data=nctx.getImageData(ox,oy,80,80).data;
          let opaque=0,top=80,bottom=-1,colorChecksum=0;
          for(let y=0;y<80;y++)for(let x=0;x<80;x++){
            const i=(y*80+x)*4,alpha=data[i+3];
            if(alpha>32){
              opaque++;top=Math.min(top,y);bottom=Math.max(bottom,y);
              colorChecksum=(colorChecksum*33+data[i]+data[i+1]*3+data[i+2]*7+alpha)>>>0;
            }
          }
          cells.push({opaque,top,bottom,checksum:colorChecksum,
            corner:data[3]});
        }
        report[name]={size:[image.naturalWidth,image.naturalHeight],cells,
          origin:atlas.manifest.origin,scale:atlas.manifest.worldScale,
          portrait:!!pixels,capturable:root.capturable};
      }
      return report;
    }""")
    for name, expected in (("unicorn",70),("pegasus",67)):
        specimen=result[name]
        assert specimen["size"]==[320,160],specimen
        assert specimen["origin"]=={"x":40,"y":expected},specimen
        assert specimen["scale"]>=1.0,specimen
        assert specimen["portrait"] and specimen["capturable"] is False,specimen
        assert all(c["opaque"]>950 and c["corner"]<32 for c in specimen["cells"]),specimen
        assert len({c["checksum"] for c in specimen["cells"]})>=7,specimen
    assert result["pegasus"]["cells"][6]["top"]<result["pegasus"]["cells"][0]["top"]-12

    # A contact sheet records the actual new game-asset frames, not a
    # hand-composed promotional image. It exposes identity/foot-pivot errors.
    page.evaluate("""() => {
      const actions=[['idle',0],['idle',.55],['run',0],['run',.12],
        ['run',.24],['run',.36],['jump',0],['hurt',0]];
      const canvas=document.createElement('canvas');canvas.id='mount-contact';
      canvas.width=4*146;canvas.height=4*132;
      const ctx=canvas.getContext('2d');
      ['unicorn','pegasus'].forEach((name,row)=>{
        actions.forEach(([action,time],index)=>{
          const x=(index%4)*146,y=(row*2+Math.floor(index/4))*132;
          ctx.fillStyle='#294e61';ctx.fillRect(x,y,146,132);
          ctx.fillStyle='#375a6e';ctx.fillRect(x+3,y+3,140,126);
          const displayed=WW.art.drawMount(ctx,name,x+72,y+99,false,{action,time,
            flying:name==='pegasus'&&action==='jump'});
          if(!displayed)throw Error('No painted '+name+' for '+action);
          ctx.fillStyle='#f2e6cb';ctx.font='12px sans-serif';
          ctx.textAlign='center';ctx.fillText(name+' '+action,x+73,y+120);
        });
      });
      document.body.appendChild(canvas);
    }""")
    page.locator("#mount-contact").screenshot(path=str(html.parent/"preview-painted-mount-atlases.png"))

    for index,kind in ((0,"unicorn"),(2,"pegasus")):
        page.evaluate("(index)=>WW.main.play(index)",index)
        page.locator("#menu").wait_for(state="hidden")
        page.evaluate("""() => {
          const s=WW.main.game.state,m=s.mounts[0],p=s.players[0];
          s.animals.forEach(a=>{a.alive=false;a.respawn=99999});
          p.mount=m.id;p.form=null;p.caught=null;p.invincible=100;
          m.rider=0;m.trust=100;m.vx=m.vy=0;m.phase=1;
          p.x=m.x;p.y=m.y-32;p.vx=p.vy=0;p.grounded=m.grounded;
          // The aerial camera needs time to settle on distant mount perches;
          // invincibility flashes must not hide the player in the visual proof.
          for(let i=0;i<45;i++)WW.main.game.update(1/60);
          p.invincible=0;
          WW.main.game.render(document.querySelector('#game').getContext('2d'),4);
        }""")
        page.locator("#game").screenshot(path=str(html.parent/f"preview-painted-{kind}-mounted.png"))
        played=page.evaluate("""kind => {
          const s=WW.main.game.state,m=s.mounts[0],p=s.players[0];
          return {kind:m.kind,playerMount:p.mount,frames:
            WW_EMBEDDED_ATLASES[kind].manifest.animations.run.frames};
        }""",kind)
        assert played["kind"]==kind and played["playerMount"]==0 and len(played["frames"])==4

    assert not errors,errors
    browser.close()
    print("PASS: two original painted AVIF atlases, 16 transparent frames, real mounted rendering and offline contact sheets")
