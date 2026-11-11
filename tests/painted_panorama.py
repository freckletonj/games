"""Ensure the generated painted panorama is really decoded and used in-game."""
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
    page.wait_for_function("WW.scenery.ready('painted-biomes')")
    assert page.evaluate("WW_EMBEDDED_SCENES['painted-biomes'].startsWith('data:image/webp;base64,')")
    report=page.evaluate("""() => {
      const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;
      const ctx=canvas.getContext('2d');
      const take=(biome,level,camera=250)=>{
        ctx.clearRect(0,0,480,270);
        WW.scenery.background(ctx,biome,camera,level);
        const data=ctx.getImageData(0,0,480,270).data;
        let hash=0,changed=0;
        for(let i=0;i<data.length;i+=4){
          hash=(hash*31+data[i]*5+data[i+1]*7+data[i+2])%1000000007;
          if(data[i+3]>0)changed++;
        }
        return {hash,changed};
      };
      const wet=WW.worldCompiler.compile(WW_EMBEDDED_DESIGNS['crystal-coast']);
      return {meadow:take('meadow',null),
              summit:take('summit',null),
              wet:take('coast',wet,1600),
              dry:take('coast',wet,0)};
    }""")
    assert all(value['changed']==480*270 for value in report.values()),report
    assert len({v['hash'] for v in report.values()})==4,report
    page.evaluate("WW.main.play(0)")
    page.locator('#menu').wait_for(state='hidden')
    page.screenshot(path=str(html.parent/'preview-painted-meadow.png'))
    page.evaluate("WW.main.play(1)")
    page.locator('#menu').wait_for(state='hidden')
    page.screenshot(path=str(html.parent/'preview-painted-coast.png'))
    page.evaluate("WW.main.play(2)")
    page.locator('#menu').wait_for(state='hidden')
    page.screenshot(path=str(html.parent/'preview-painted-summit.png'))
    assert not errors,errors
    browser.close()
    print('PASS: three diffusion-painted panorama rows embedded and drawn offline')
