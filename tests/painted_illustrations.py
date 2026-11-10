"""Verify every illustrated frame is embedded, decoded and visibly rendered offline."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html=Path(__file__).parents[1]/'dist'/'wonderwood.html'
source=html.read_text().replace('requestAnimationFrame(frame);','')
source=source.replace('<script>\nwindow.WW',
    '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>\nwindow.WW',1)

with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':810})
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(source,wait_until='domcontentloaded')
    assert page.evaluate("Object.keys(WW_EMBEDDED_ILLUSTRATIONS).sort()") == [
        'effects','flora','landmarks','props'
    ]
    page.wait_for_function("WW.illustrations.names.every(WW.illustrations.ready)")
    result=page.evaluate("""() => {
      const canvas=document.createElement('canvas');
      canvas.width=128;canvas.height=160;
      const ctx=canvas.getContext('2d');
      const counts=WW.illustrations.names.map(name=>{
        ctx.clearRect(0,0,128,160);
        const painted=WW.illustrations.draw(ctx,name,64,138,100,126);
        const pixels=ctx.getImageData(0,0,128,160).data;
        const visible=pixels.filter((value,index)=>index%4===3&&value>32).length;
        return [name,painted,visible];
      });
      const frames=Object.values(WW_EMBEDDED_ILLUSTRATIONS).map(url=>{
        const image=new Image();image.src=url;
        return [image.naturalWidth,image.naturalHeight];
      });
      return {counts,frames};
    }""")
    assert len(result['counts']) == 32,result
    assert result['frames'] == [[320,240]]*4,result['frames']
    assert all(painted and pixels>50 for name,painted,pixels in result['counts']),result['counts']

    # Renderer uses the same real illustrations for gates, campfires, collectibles
    # and all authored landmark types, without vector fallback.
    checks=page.evaluate("""() => {
      const c=document.createElement('canvas');c.width=c.height=220;
      const ctx=c.getContext('2d');
      const pixels=()=>[...ctx.getImageData(0,0,220,220).data];
      WW.props.gate(ctx,110,180,false,'meadow',0);
      const closed=pixels();
      ctx.clearRect(0,0,220,220);
      WW.props.gate(ctx,110,180,true,'meadow',0);
      const opened=pixels();
      const distinct=opened.some((v,i)=>v!==closed[i]);
      const landmarks=['tree','crystal','reef','observatory','island','pond','lantern','shells'];
      return {distinct,landmarks:landmarks.map(kind=>{
        ctx.clearRect(0,0,220,220);
        ctx.save();ctx.translate(110,180);
        const painted=WW.scenery.landmark(ctx,'meadow',kind,0);
        ctx.restore();
        return [kind,painted,ctx.getImageData(0,0,220,220).data.some((v,i)=>i%4===3&&v>0)];
      })};
    }""")
    assert checks['distinct'],checks
    assert all(painted and visible for name,painted,visible in checks['landmarks']),checks

    # One contact sheet records the actual integrated art at in-game scale.
    page.evaluate("""() => {
      const names=WW.illustrations.names;
      const canvas=document.createElement('canvas');canvas.id='illustrations-preview';
      canvas.width=8*146;canvas.height=4*184;
      const ctx=canvas.getContext('2d');
      names.forEach((name,i)=>{
        const x=i%8*146,y=Math.floor(i/8)*184;
        ctx.fillStyle='#26394a';ctx.fillRect(x,y,146,184);
        ctx.fillStyle='#3d5865';ctx.fillRect(x+2,y+2,142,180);
        WW.illustrations.draw(ctx,name,x+73,y+147,128,134);
        ctx.font='bold 11px system-ui';ctx.fillStyle='#fff1cc';
        ctx.textAlign='center';ctx.fillText(name,x+73,y+172,140);
      });
      document.body.appendChild(canvas);
    }""")
    page.locator('#illustrations-preview').screenshot(
        path=str(html.parent/'preview-illustrations.png'))
    assert not errors,errors
    browser.close()
    print('PASS: 32 transparent painted assets, gates, eight landmarks and offline contact sheet')
