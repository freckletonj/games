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
        'effects','flora','landmarks','props','states'
    ]
    page.wait_for_function("WW.illustrations.names.every(WW.illustrations.ready)")
    # Transparency extraction left pure red/yellow matte patches around some
    # generated illustrations. Runtime cleanup must discard those pixels while
    # keeping real painted oranges and golds visible.
    matte = page.evaluate("""async () => {
      const image=new Image();
      image.src=WW_EMBEDDED_ILLUSTRATIONS.props;
      await image.decode();
      const before=document.createElement('canvas');
      before.width=image.naturalWidth;before.height=image.naturalHeight;
      const source=before.getContext('2d');
      source.drawImage(image,0,0);
      const cleaned=WW.paintCleanup(image);
      const countKey=context=>{
        const pixels=context.getImageData(0,0,before.width,before.height).data;
        let count=0;
        for(let i=0;i<pixels.length;i+=4){
          const [r,g,b,a]=pixels.slice(i,i+4);
          if(a>12&&((r>232&&g<100&&b<118)||(r>232&&g>211&&b<130)))count++;
        }
        return count;
      };
      const synthetic=document.createElement('canvas');
      synthetic.width=8;synthetic.height=6;
      const g=synthetic.getContext('2d');
      g.fillStyle='#ff0000';g.fillRect(1,2,1,1);
      g.fillStyle='#ffffff';g.fillRect(2,2,2,1);
      g.fillStyle='#ffff00';g.fillRect(4,2,1,1);
      g.fillStyle='#e59b4d';g.fillRect(6,2,1,1);
      const sample=new Image();sample.src=synthetic.toDataURL();
      await sample.decode();
      const result=WW.paintCleanup(sample).getContext('2d');
      const alpha=x=>result.getImageData(x,2,1,1).data[3];
      return {before:countKey(source),after:countKey(cleaned.getContext('2d')),
        synthetic:[alpha(1),alpha(2),alpha(3),alpha(4),alpha(6)]};
    }""")
    assert matte['before'] > 10 and matte['after'] == 0, matte
    assert matte['synthetic'] == [0,0,0,0,255], matte
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
    assert len(result['counts']) == 41,result
    assert result['frames'] == [[720,540]]*4+[[288,288]],result['frames']
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

    # Every animal must draw its own painted eating graphic, rather than
    # recycling the idle frame. The hero's KO image is also a separate cutout.
    page.wait_for_function("""() => Object.keys(WW.catalog.creatures).every(
      name => !!WW.spriteAtlas.portrait(name)) && !!WW.spriteAtlas.portrait('hero')""")
    states=page.evaluate("""() => {
      const c=document.createElement('canvas');c.width=c.height=100;
      const ctx=c.getContext('2d');
      function pixels(name,action){
        ctx.clearRect(0,0,100,100);
        const painted=WW.art.draw(ctx,name,50,81,0,false,null,{action,time:.35});
        return [painted,[...ctx.getImageData(0,0,100,100).data]];
      }
      return [...Object.keys(WW.catalog.creatures),'hero'].map(name=>{
        const [eatOkay,eat]=pixels(name,name==='hero'?'sleep':'eat');
        const [idleOkay,idle]=pixels(name,'idle');
        const count=eat.filter((v,i)=>i%4===3&&v>32).length;
        return [name,eatOkay,idleOkay,count,eat.some((v,i)=>v!==idle[i])];
      });
    }""")
    assert len(states)==9, states
    assert all(eat and idle and count>100 and distinct
               for name,eat,idle,count,distinct in states), states

    page.evaluate('WW.main.play(0)')
    page.locator('#menu').wait_for(state='hidden')
    stars=page.evaluate("""() => {
      const state=WW.main.game.state,player=state.players[0];
      player.sleep=true;player.health=0;
      state.animals.forEach(animal=>animal.alive=false);
      const c=document.createElement('canvas');c.width=1440;c.height=810;
      const ctx=c.getContext('2d');
      const original=WW.illustrations.draw,positions=[];
      WW.illustrations.draw=(context,name,x,y,w,h,opacity)=>{
        if(name==='spark')positions.push([x,y]);
        return original(context,name,x,y,w,h,opacity);
      };
      WW.main.game.render(ctx,1.3);
      const first=positions.map(pair=>pair.slice());
      positions.length=0;
      WW.main.game.render(ctx,2.0);
      const second=positions.map(pair=>pair.slice());
      WW.illustrations.draw=original;
      return {first,second};
    }""")
    assert len(stars['first'])==len(stars['second'])==3,stars
    assert stars['first']!=stars['second'],'Dizzy stars must orbit independently of the hero image'

    # One contact sheet records the actual integrated art at in-game scale.
    page.evaluate("""() => {
      const names=WW.illustrations.names;
      const canvas=document.createElement('canvas');canvas.id='illustrations-preview';
      canvas.width=8*146;canvas.height=Math.ceil(names.length/8)*184;
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
    print('PASS: 41 transparent painted assets, gates, landmarks, eating and KO states and offline contact sheet')
