window.WW = window.WW || {};
WW.art = (() => {
  // Native 32×40 illustrations, rather than 12×16 colored masks. The canvas
  // itself renders at 2× logical resolution, keeping the edges crisp.
  const kinds=['hero','springaroo','skyling','tideling','snack'];
  const sw=32,sh=40,frames=4;
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
    const bounce=f===1?-1:f===3?1:0;
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
    const bounce=f===1?-2:f===3?1:0;
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
  kinds.forEach((name,index)=>{
    for(let f=0;f<frames;f++){
      g.save();g.translate(index*sw*frames+f*sw,0);
      // soft pixel-glow behind magical creatures; no network assets.
      if(name!=='hero'&&name!=='snack'){
        oval(16,27,14,12,'#376b7d22');shine(2+f*2,11+f,1.1);
      }
      ({hero,springaroo,skyling,tideling,snack})[name](f);
      g.restore();
    }
  });
  function draw(ctx,name,x,y,frame=0,flip=false,playerId=null) {
    const index=Math.max(0,kinds.indexOf(name));
    ctx.save();ctx.translate(Math.round(x),Math.round(y));
    if(flip)ctx.scale(-1,1);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(sheet,index*sw*frames+(Math.floor(frame)%frames)*sw,0,sw,sh,-14,-32,28,34);
    // A distinct scarf/crest for each child, even when they wear animal forms.
    if(playerId!==null){
      ctx.fillStyle=playerId===0?'#ffd57f':'#b4a0ff';ctx.fillRect(-5,-8,10,2);
      ctx.fillStyle=playerId===0?'#fff0ba':'#e5ddff';ctx.fillRect(-2,-8,3,2);
    }
    ctx.restore();
  }
  return {draw};
})();
