window.WW = window.WW || {};
WW.art = (() => {
  // 64×80 pixel-art sprite frames, with detailed magical silhouettes and micro-highlights.
  // All frames and HUD portraits are drawn locally; no fetched textures.
  const kinds=['hero','springaroo','skyling','tideling','cloudwhisp','prismtail','mossback','glimmermoth','emberkit','snack'];
  const sw=64,sh=80,frames=6;
  const sheet=document.createElement('canvas');sheet.width=sw*frames*kinds.length;sheet.height=sh;
  const g=sheet.getContext('2d');g.imageSmoothingEnabled=false;
  function oval(x,y,rx,ry,color){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();}
  function shape(points,color){g.fillStyle=color;g.beginPath();g.moveTo(...points[0]);for(let i=1;i<points.length;i++)g.lineTo(...points[i]);g.closePath();g.fill();}
  function line(points,color,width=2){g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(...points[0]);for(let i=1;i<points.length;i++)g.lineTo(...points[i]);g.stroke();}
  function shine(x,y,r=1){oval(x,y,r,r,'#fffce7');}
  function eyes(x=11,y=19,dx=10,color='#263452'){oval(x,y,1.5,2,color);oval(x+dx,y,1.5,2,color);shine(x-.4,y-.7,.55);shine(x+dx-.4,y-.7,.55);}
  function feet(color,phase){
    oval(11,35+(phase?1:0),5,3,color);oval(21,35+(phase?-1:0),5,3,color);
    oval(11,36+(phase?1:0),2,1,'#fff3dc');oval(21,36+(phase?-1:0),2,1,'#fff3dc');
  }
  function hero(f){
    const bounce=f===1||f===4?-2:f===3||f===5?1:0;
    feet('#354d79',f%2);
    shape([[8,24+bounce],[24,24+bounce],[27,34+bounce],[5,34+bounce]],'#2d547f');
    oval(16,28+bounce,10,7,'#597ead');
    line([[9,29],[16,30],[23,28]],'#f9da89',2);
    oval(16,17+bounce,11,12,'#433755');
    oval(16,18+bounce,9,10,'#ffd2a6');
    oval(8,24+bounce,2,4,'#ebac9b');oval(24,24+bounce,2,4,'#ebac9b');
    oval(10,11+bounce,7,5,'#5b405f');oval(21,10+bounce,7,5,'#5b405f');
    shape([[5,12+bounce],[9,5+bounce],[23,5+bounce],[27,12+bounce]],'#4c3858');
    line([[7,12+bounce],[16,9+bounce],[25,12+bounce]],'#76536c',2);
    eyes(12,19+bounce,8);oval(16,24+bounce,2,1,'#d97785');
    oval(4,27,3,4,'#d1a1a1');oval(28,27,3,4,'#d1a1a1');
    shape([[10,27],[16,24],[22,27],[20,31],[12,31]],'#ffcb8d');
    shine(12,12,1.2);
  }
  function springaroo(f){
    const bounce=f===1||f===4?-3:f===3||f===5?1:0;
    shape([[21,29+bounce],[28,25+bounce],[30,28+bounce],[29,33+bounce],[22,35+bounce]],'#8e4979');
    line([[23,28+bounce],[27,31+bounce],[29,30+bounce]],'#ffca8a',2);
    feet('#8a4875',f%2);
    oval(16,27+bounce,11,11,'#bb668d');oval(16,29+bounce,7,6,'#ffd298');
    shape([[7,17+bounce],[5,2+bounce],[11,5+bounce],[14,16+bounce]],'#9e567e');
    shape([[21,16+bounce],[24,1+bounce],[29,4+bounce],[25,19+bounce]],'#9e567e');
    shape([[8,12+bounce],[8,5+bounce],[12,12+bounce]],'#f6abce');
    shape([[23,12+bounce],[25,5+bounce],[26,13+bounce]],'#f6abce');
    oval(16,19+bounce,12,10,'#da89a8');
    oval(16,24+bounce,7,4,'#ffcaac');eyes(11,19+bounce,10);
    oval(16,24+bounce,2,1.5,'#9a4979');
    shape([[16,7+bounce],[18,12+bounce],[24,14+bounce],[18,16+bounce],[16,21+bounce],[14,16+bounce],[8,14+bounce],[14,12+bounce]],'#ffe48d');
    oval(8,27+bounce,3,3,'#eeb9cf');oval(24,27+bounce,3,3,'#eeb9cf');
    shine(16,14+bounce,1.2);
  }
  function skyling(f){
    const spread=f%2===0?14:10;
    shape([[14,21],[2,13-(f%2)*3],[3,27],[12,30]],'#6198c7');
    shape([[18,21],[30,13-(f%2)*3],[29,27],[20,30]],'#6198c7');
    shape([[13,23],[2,17],[6,29],[13,27]],'#8ce5e4');
    shape([[19,23],[30,17],[26,29],[19,27]],'#8ce5e4');
    line([[4,22],[10,23],[14,26]],'#c7f9db',2);line([[28,22],[22,23],[18,26]],'#c7f9db',2);
    oval(16,25,9,10,'#485baf');oval(16,27,6,8,'#adccef');
    oval(16,15,11,9,'#8f8acc');
    shape([[12,8],[16,2],[20,8]],'#f5e7a5');
    shape([[5,11],[1,8],[5,6],[9,10]],'#c3ebf4');
    shape([[27,11],[31,8],[27,6],[23,10]],'#c3ebf4');
    eyes(11,16,10,'#27345c');shape([[14,22],[16,25],[18,22]],'#ffd891');
    feet('#f1b879',f%2);
    shine(10,11,1.1);shine(24,12,1);
  }
  function tideling(f){
    const wave=f%2?2:-2;
    shape([[22,25],[28,24+wave],[30,17+wave],[31,28+wave],[28,34],[21,33]],'#327d92');
    shape([[25,25],[30,22+wave],[30,29+wave]],'#84e9d4');
    feet('#3a7f99',f%2);
    oval(16,28,12,10,'#358ca7');oval(16,29,8,7,'#b1e9dd');
    shape([[6,17],[4,7],[11,13]],'#328ca7');shape([[26,17],[28,7],[21,13]],'#328ca7');
    shape([[6,14],[7,10],[11,15]],'#8de5df');shape([[26,14],[25,10],[21,15]],'#8de5df');
    oval(16,19,12,10,'#58b7bf');oval(16,24,7,4,'#d0f3e2');
    eyes(11,19,10);oval(16,24,2,1.5,'#33546d');
    oval(6,24,4,2,'#7cdbc7');oval(26,24,4,2,'#7cdbc7');
    line([[5,22],[1,20]],'#d5fcfa',1);line([[27,22],[31,20]],'#d5fcfa',1);
    shape([[13,7],[16,2],[19,7],[16,13]],'#f8e49c');shine(16,7,1.1);
  }
  function snack(f){
    oval(16,25,10,9,'#b14486');oval(16,24,9,8,'#f38ab3');oval(12,21,3,2,'#ffc8d8');
    oval(21,27,2,2,'#ffe2bf');oval(12,28,1.5,1.5,'#ffe2bf');
    shape([[15,17],[13,11],[19,15],[22,10],[22,19]],'#4f9b75');line([[16,18],[16,11]],'#356f5a');
    if(f%2)shine(24,16,1.3);
  }

  // These five additional guardians use individual silhouettes and accent palettes,
  // not recolored copies of the same animal.
  function cloudwhisp(f) {
    const bob=f%2?-2:0;
    oval(6,27+bob,6,6,'#948dd6');oval(26,27+bob,6,6,'#948dd6');
    oval(16,28+bob,12,10,'#c9b8fa');oval(16,31+bob,8,5,'#f7eaff');
    shape([[8,22+bob],[2,16+bob],[8,10+bob],[12,16+bob]],'#9d9ce6');
    shape([[24,22+bob],[30,16+bob],[24,10+bob],[20,16+bob]],'#9d9ce6');
    oval(16,17+bob,12,9,'#efe0ff');
    oval(11,17+bob,2,3,'#62558a');oval(21,17+bob,2,3,'#62558a');
    oval(16,22+bob,2,1,'#ed9cc8');
    shape([[12,8+bob],[15,1+bob],[17,8+bob],[21,3+bob],[21,13+bob]],'#d5f7ff');
    shine(15,6+bob,2);line([[8,29+bob],[15,33+bob],[24,29+bob]],'#fffbeb',1);
  }
  function prismtail(f){
    const wave=f%2?2:-2;
    shape([[23,28],[29,24+wave],[31,18+wave],[27,18+wave],[25,24]],'#fa805d');
    shape([[25,25],[30,19+wave],[29,27]],'#fff1a9');
    feet('#ac637a',f%2);
    oval(16,28,10,10,'#dc7ca1');oval(16,29,7,6,'#ffd1b0');
    shape([[6,15],[3,3],[13,10]],'#b9628f');shape([[26,15],[29,3],[19,10]],'#b9628f');
    shape([[7,13],[6,7],[12,12]],'#ffe6a2');shape([[25,13],[26,7],[20,12]],'#ffe6a2');
    oval(16,19,12,10,'#ffb59b');eyes(10,19,12);
    oval(16,25,2,2,'#764767');
    shape([[16,4],[19,10],[26,11],[21,16],[22,23],[16,19],[10,23],[11,16],[6,11],[13,10]],'#ffe293');
    shine(16,13,1.6);
  }
  function mossback(f){
    feet('#678c5f',f%2);
    oval(16,29,14,10,'#699a76');
    oval(16,26,12,10,'#547b6c');
    oval(16,24,10,9,'#91bc7a');
    for(let x=7;x<=25;x+=6){shape([[x,20],[x-3,13-(x%3)],[x+4,18]],x%2?'#a8df8a':'#74c797');}
    shape([[6,18],[2,7],[11,12]],'#759a6b');shape([[26,18],[30,7],[21,12]],'#759a6b');
    oval(16,21,12,9,'#b4d991');oval(16,24,7,4,'#e6f0b1');
    eyes(11,21,10,'#354c59');oval(16,26,2,1.5,'#6a7850');
    for(let x=7;x<28;x+=7){oval(x,29+(x%3),2,2,'#f0dc8c');}
    shine(11,10,1.5);
  }
  function glimmermoth(f){
    const flap=f%2?3:-1;
    shape([[16,20],[2,5+flap],[1,25],[13,30]],'#f3adf5');
    shape([[16,20],[30,5+flap],[31,25],[19,30]],'#e4adff');
    shape([[13,25],[3,27],[5,35],[15,33]],'#a7e4f1');
    shape([[19,25],[29,27],[27,35],[17,33]],'#a7e4f1');
    oval(16,26,6,9,'#7663b2');oval(16,28,3,5,'#fce3b1');
    oval(16,17,8,8,'#b385db');eyes(12,18,8,'#fff2ee');
    line([[13,12],[8,4]],'#9cebe9',1.5);line([[19,12],[24,4]],'#9cebe9',1.5);
    shine(7,6,2);shine(25,6,2);
    oval(6,17+flap,3,3,'#ffedba');oval(26,17+flap,3,3,'#ffedba');
  }
  function emberkit(f){
    const flame=f%2?2:0;
    shape([[21,31],[29,30],[31,17+flame],[26,22],[29,14+flame],[22,19]],'#ff9856');
    shape([[24,30],[30,23],[27,26]],'#fff0a3');
    feet('#a44f73',f%2);
    oval(16,27,11,10,'#f48777');oval(16,30,7,5,'#ffe4b1');
    shape([[7,16],[4,3],[13,10]],'#a6537c');shape([[25,16],[28,3],[19,10]],'#a6537c');
    shape([[7,13],[6,7],[12,13]],'#ffcb84');shape([[25,13],[26,7],[20,13]],'#ffcb84');
    oval(16,19,11,9,'#ffac85');eyes(11,19,10);oval(16,24,2,2,'#704460');
    shape([[11,9],[13,1+flame],[16,7],[19,0],[22,11],[17,14]],'#ffd173');
    shape([[14,9],[16,4+flame],[19,10]],'#fff9bd');shine(16,9,1.3);
  }
  kinds.forEach((name,index)=>{
    for(let f=0;f<frames;f++){
      g.save();g.translate(index*sw*frames+f*sw,0);g.scale(2,2);
      // soft pixel-glow behind magical creatures; no network assets.
      if(name!=='hero'&&name!=='snack'){
        oval(16,27,14,12,'#376b7d22');shine(2+f*2,11+f,1.1);
      }
      ({hero,springaroo,skyling,tideling,cloudwhisp,prismtail,mossback,glimmermoth,emberkit,snack})[name](f);
      g.restore();
    }
  });
  // A sparse high-resolution dither pass adds fur and wing texture to every 64×80
  // sprite. It is applied once at asset creation, not every animation frame.
  const pixels=g.getImageData(0,0,sheet.width,sheet.height);
  for(let y=0;y<sheet.height;y++)for(let x=0;x<sheet.width;x++){
    const i=(y*sheet.width+x)*4;
    if(pixels.data[i+3]<200)continue;
    const grain=((x*31+y*17)^(x*y*7))%43;
    if(grain===0||grain===5){
      const amount=grain===0?24:-13;
      for(let c=0;c<3;c++)pixels.data[i+c]=Math.max(0,Math.min(255,pixels.data[i+c]+amount));
    }
  }
  g.putImageData(pixels,0,0);
  // Side-view stage sprites are distinct from the large front-facing field-guide portraits.
  // Every animal reads as a different silhouette, even before its colors are visible.
  function drawWorldSprite(ctx,name,time,action){
    const step=Math.sin(time*12),flap=Math.sin(time*13);
    const eat=action==='eat',happy=action==='happy',jump=action==='jump';
    const oval=(x,y,rx,ry,color)=>{
      ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
    };
    const poly=(points,color)=>{
      ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...points[0]);
      for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);
      ctx.closePath();ctx.fill();
    };
    const stroke=(points,color,w=2)=>{
      ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';
      ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.stroke();
    };
    const eye=(x,y)=>{
      if(eat){stroke([[x-2,y],[x+2,y]],'#384559',1.3);return;}
      oval(x,y,1.6,1.9,'#273c4e');oval(x+.4,y-.7,.6,.6,'#fff8e4');
    };
    const feet=(color,pace=1)=>{
      oval(-7,-2+step*pace,4,2.6,color);oval(7,-2-step*pace,4,2.6,color);
    };
    const pink='#ffb2be',ivory='#f8e8c5',night='#334257';
    if(name==='hero'){
      feet('#32476b',action==='run'?3:0);
      poly([[-10,-7],[-8,-20],[3,-23],[9,-7]],'#2e577c');
      poly([[-12,-13],[-15,-19],[-7,-22],[-4,-13]],'#f5c381');
      oval(0,-21,9,10,'#ffd3ae');
      poly([[-9,-24],[-10,-31],[-1,-34],[10,-27],[7,-23],[0,-27]],'#4c3a5d');
      oval(5,-23,2.5,3,'#ffe6c6');eye(6,-23);
      stroke([[-4,-11],[5,-10],[10,-13]],'#ffd78c',2.5);
      oval(-9,-13+step*1.3,2.8,4,'#f7b998');
      if(action==='run')oval(10,-12-step*2,2.5,4,'#ffd3ae');
    }else if(name==='springaroo'){
      stroke([[-8,-11],[-18,-11-step*2],[-21,-5]],'#ad5e83',5);
      feet('#9d567e',action==='run'?3:1);
      oval(-1,-13,12,10,'#c77597');oval(2,-10,8,5,'#f9c9ad');
      poly([[0,-20],[-1,-35+flap*2],[5,-33+flap*2],[8,-19]],'#a95d85');
      poly([[7,-20],[10,-38-flap*2],[16,-35-flap*2],[15,-20]],'#b96991');
      poly([[3,-24],[3,-33+flap*2],[5,-32],[6,-23]],'#f8b5c3');
      oval(7,-20,9,8,'#dc8eab');oval(12,-16,6,4,'#ffd8c6');eye(12,-21);
      oval(17,-15,1.6,1.5,'#9f536d');
      oval(-10,-9,3,3,'#f2a3b8');
    }else if(name==='tideling'){
      poly([[-8,-13],[-20,-22+flap*3],[-17,-10],[-22,-3+flap*3],[-9,-7]],'#3b8aa4');
      poly([[-19,-21+flap*3],[-16,-12],[-19,-7]],'#96eadc');
      feet('#34869b',action==='run'?2:1);
      oval(0,-11,12,9,'#409bb0');oval(2,-9,8,5,'#afe6d6');
      poly([[5,-20],[4,-30],[10,-24],[16,-29],[14,-18]],'#328ca1');
      oval(8,-19,9,7,'#64b8bf');oval(13,-15,6,3.8,'#d8f4e6');eye(12,-21);
      oval(18,-15,1.6,1.6,'#456178');
      stroke([[3,-17],[-1,-15]],'#e6f6e9',1.2);
    }else if(name==='skyling'){
      const wing=flap*(action==='idle'?3:7);
      poly([[-4,-16],[-17,-25-wing],[-15,-7+wing],[-2,-10]],'#618cc5');
      poly([[4,-15],[15,-26+wing],[17,-6-wing],[1,-9]],'#83c7d4');
      poly([[-12,-19-wing],[-8,-12],[-5,-12]],'#b7f1df');
      oval(0,-13,8,10,'#5a66a9');oval(2,-10,5,7,'#c6dbed');
      oval(5,-20,8,8,'#9899d5');
      poly([[10,-21],[15,-19],[10,-17]],'#f4ce85');
      eye(8,-21);oval(2,-26,2,2,'#f8e7b3');
      if(jump||happy){oval(-15,-24-wing,2,2,'#e3f8f0');}
    }else if(name==='mossback'){
      feet('#648b71',action==='run'?2:1);
      oval(0,-10,14,11,'#3c6b67');
      oval(-2,-15,13,11,'#75a17b');
      oval(-2,-16,10,7,'#a8d59b');
      for(let i=0;i<4;i++)poly([[-11+i*6,-20],[-9+i*6,-29-i%2*3],[-6+i*6,-21]],i%2?'#96c986':'#60a88c');
      oval(10,-13,8,7,'#c0df9d');eye(13,-14);
      oval(16,-10,2,2,'#738d61');
    }else if(name==='prismtail'){
      poly([[-7,-11],[-16,-16+flap*3],[-23,-23],[-19,-13],[-23,-8],[-10,-7]],'#f5a277');
      poly([[-21,-22],[-16,-15],[-22,-10]],'#ffe4a2');
      feet('#aa607e',action==='run'?3.5:2);
      oval(-1,-12,12,7.5,'#cf759b');
      poly([[5,-18],[7,-28],[12,-22],[18,-26],[16,-17]],'#b9618e');
      oval(9,-17,9,7,'#f3a98c');oval(14,-14,5,3,'#ffe0b5');eye(12,-19);
      poly([[2,-18],[1,-22],[6,-19]],'#ffe79b');
    }else if(name==='glimmermoth'){
      const w=flap*3.5;
      poly([[-1,-15],[-16,-29-w],[-15,-10],[0,-8]],'#f3b0e6');
      poly([[0,-17],[12,-30+w],[16,-9],[1,-8]],'#c5b6ee');
      poly([[-1,-10],[-11,-5],[-7,-2],[1,-7]],'#91d1dd');
      oval(1,-15,5,10,'#7d6aa9');oval(6,-21,6,6,'#b397d3');eye(9,-22);
      stroke([[5,-26],[3,-31]],'#a9e9db',1);
      oval(3,-31,2,2,'#ffeeb4');
      oval(-9,-17-w,2.5,2.5,'#fff2bb');
    }else if(name==='cloudwhisp'){
      oval(-10,-12+flap*2,8,7,'#a79bd9');
      oval(9,-12-flap*2,8,8,'#bcb1e7');
      oval(-2,-17,12,11,'#e0d2f5');oval(3,-12,13,8,'#f3e9f7');
      poly([[-7,-7],[-13,0],[-1,-3]],'#b1a0e7');
      poly([[4,-7],[10,1],[15,-10]],'#a5b7de');
      eye(6,-18);oval(10,-14,1.5,1.2,'#dc9bb9');
      oval(-11,-23,3,2,'#dcf1f4');
    }else if(name==='emberkit'){
      poly([[-8,-12],[-19,-22+flap*3],[-16,-11],[-23,-6],[-10,-6]],'#ff996b');
      poly([[-19,-22+flap*3],[-14,-15],[-19,-11]],'#ffe1a0');
      feet('#ab5970',action==='run'?3:1);
      oval(0,-12,11,9,'#e88b7b');oval(2,-9,7,4,'#ffd6b0');
      poly([[5,-18],[4,-30],[11,-24],[15,-31],[18,-18]],'#b85e79');
      oval(9,-19,8,8,'#ffa481');oval(14,-15,6,4,'#ffdfb4');eye(12,-21);
      poly([[-5,-20],[1,-28],[2,-21]],'#f9ce82');
      oval(18,-14,1.7,1.4,'#694b61');
    }else{
      oval(0,-12,10,9,'#ed9ec4');oval(3,-15,3,3,'#ffe4cc');
    }
    if(happy||eat){
      ctx.globalAlpha=.9;oval(0,-33+Math.sin(time*8)*1.5,2.1,2.1,pink);ctx.globalAlpha=1;
    }
  }

  function draw(ctx,name,x,y,frame=0,flip=false,playerId=null,pose={}) {
    if(WW.spriteAtlas.draw(ctx,name,x,y,frame,flip,playerId,pose))return;
    const index=Math.max(0,kinds.indexOf(name));
    const action=pose.action||'idle',time=pose.time??(frame/3);
    const snack=name==='snack';
    const explorer=playerId!==null;
    const sizes={
      hero:[30,36],springaroo:[29,32],skyling:[31,32],tideling:[30,30],
      cloudwhisp:[28,27],prismtail:[28,30],mossback:[29,27],
      glimmermoth:[26,28],emberkit:[30,31],snack:[23,25]
    };
    const [w,h]=sizes[name]||sizes.hero;
    const running=action==='run',jumping=action==='jump',eating=action==='eat';
    const bounce=running?Math.abs(Math.sin(time*15))*3:
      jumping?-4:eating?2:Math.sin(time*2.8+index)*.9;
    const stretch=jumping?1.12:action==='hurt'?.85:running?1+.055*Math.sin(time*15):1;
    const squash=eating?.9:jumping?.91:running?1-.025*Math.sin(time*15):1;
    const lean=running?Math.sin(time*15)*.08:action==='hurt'?.22:0;
    ctx.save();ctx.translate(Math.round(x),Math.round(y+bounce));
    if(flip)ctx.scale(-1,1);
    ctx.transform(squash,0,lean,stretch,0,0);
    if(!snack)ctx.scale(explorer?.91:.82,explorer?.91:.82);
    ctx.imageSmoothingEnabled=false;
    const spriteFrame=(Math.floor(frame)%frames+frames)%frames;
    if(name==='snack')ctx.drawImage(sheet,index*sw*frames+spriteFrame*sw,0,sw,sh,-w/2,-h,w,h);
    else drawWorldSprite(ctx,name,time,action);
    // Character-specific secondary animation makes motion readable at small scale.
    if(name==='skyling'&&action!=='eat'){
      const flap=Math.sin(time*12)*4;
      ctx.fillStyle='#a7f4e4';
      ctx.fillRect(-w/2-2,-19-flap/2,5,3);
      ctx.fillRect(w/2-3,-17+flap/2,5,3);
    }
    if(name==='glimmermoth'){
      ctx.fillStyle='#fff4be';
      ctx.globalAlpha=.45+.4*Math.abs(Math.sin(time*7));
      ctx.fillRect(-w/2-2,-h+9,3,3);ctx.fillRect(w/2,-h+5,3,3);
      ctx.globalAlpha=1;
    }
    if(name==='springaroo'&&jumping){
      ctx.fillStyle='#fce4aa';ctx.fillRect(-13,-5,5,2);ctx.fillRect(9,-7,4,2);
    }
    if(playerId!==null){
      ctx.fillStyle=playerId===0?'#ffd57f':'#b4a0ff';ctx.fillRect(-5,-8,10,2);
      ctx.fillStyle=playerId===0?'#fff0ba':'#e5ddff';ctx.fillRect(-2,-8,3,2);
    }
    ctx.restore();
  }

  const portraits = Object.fromEntries(kinds.map(name=>{
    const canvas=document.createElement('canvas');canvas.width=56;canvas.height=56;
    const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;
    context.fillStyle='#203c55';context.fillRect(0,0,56,56);
    const i=kinds.indexOf(name);
    context.drawImage(sheet,i*sw*frames,0,sw,sh,2,0,52,56);
    return [name,canvas.toDataURL()];
  }));
  const foodColors={berry:['#ff91c2','#bc427d'],star:['#fff5b5','#d3a755'],nectar:['#a2fff0','#5ba9cd'],honey:['#ffd187','#d17f55'],marshmallow:['#ecdaff','#a197de']};
  const foodIcons=Object.fromEntries(Object.entries(foodColors).map(([name,[light,dark]])=>{
    const canvas=document.createElement('canvas');canvas.width=36;canvas.height=36;
    const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
    c.fillStyle='#294563';c.fillRect(0,0,36,36);
    c.fillStyle=dark;c.fillRect(7,13,22,18);c.fillStyle=light;c.fillRect(9,11,18,17);
    c.fillStyle='#fffce2';c.fillRect(12,15,5,4);c.fillRect(21,21,3,3);
    if(name==='star'){c.fillStyle='#fff9dc';c.beginPath();for(let j=0;j<10;j++){const a=j*Math.PI/5-Math.PI/2,r=j%2?8:15;c.lineTo(18+Math.cos(a)*r,18+Math.sin(a)*r);}c.closePath();c.fill();}
    if(name==='nectar'){c.fillStyle='#96e7f5';c.fillRect(14,5,8,8);c.fillStyle='#e6fff2';c.fillRect(15,7,5,3);}
    if(name==='honey'){c.fillStyle='#9e6b50';c.fillRect(12,7,12,5);}
    if(name==='berry'){c.fillStyle='#7fd68e';c.fillRect(17,7,5,8);}
    if(name==='marshmallow'){c.fillStyle='#fff7ff';c.fillRect(11,12,13,11);}
    return [name,canvas.toDataURL()];
  }));
  return {draw,portrait:name=>WW.spriteAtlas.portrait(name)||portraits[name]||portraits.hero,foodIcon:name=>foodIcons[name]||foodIcons.berry};
})();
