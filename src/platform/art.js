window.WW = window.WW || {};
// All characters are now drawn from painted, frame-accurate image atlases.
// Inventory food portraits come from the flora atlas; airborne treats are single fruits.
WW.art = (() => {
  const empty='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  const icons={};
  const fruit={
    berry:'berryBush',nectar:'nectarFruit',star:'stardropFruit',
    honey:'honey',marshmallow:'stardropFruit'
  };


  function draw(ctx,name,x,y,frame=0,flip=false,playerId=null,pose={}) {
    if(name==='snack')return WW.illustrations.draw(ctx,'basket',x,y,25,27);


    if(name==='hero' && pose.action==='sleep' && WW.illustrations.ready('heroSleep')){
      ctx.save();
      ctx.translate(x,y+3);
      if(flip)ctx.scale(-1,1);
      ctx.scale(1,1+Math.sin((pose.time||0)*2)*.008);
      WW.illustrations.draw(ctx,'heroSleep',0,0,49,41);
      ctx.restore();
      return true;
    }

    return WW.spriteAtlas.draw(ctx,name,x,y,frame,flip,playerId,pose);
  }


  // Tiny single-fruit illustrations for thrown food and settled lures.
  // Berry bushes and baskets are scenery/pickups, never airborne projectiles.
  function drawFruit(ctx,kind,x,y,size=12){
    const palette={
      berry:['#ffb8d2','#f15a90','#a83b72'],
      nectar:['#d6fff0','#62dbc3','#2eae9d'],
      star:['#fff4bd','#f9d56b','#d89c4d']
    }[kind]||['#ffb8d2','#f15a90','#a83b72'];
    ctx.save();ctx.translate(x,y);
    const radius=size*.42;
    const glow=ctx.createRadialGradient(-radius*.34,-radius*.44,1,0,0,radius*1.5);
    glow.addColorStop(0,palette[0]);glow.addColorStop(.65,palette[1]);
    glow.addColorStop(1,palette[2]);
    ctx.fillStyle=glow;
    ctx.beginPath();
    ctx.ellipse(0,0,radius,radius*(kind==='nectar'?1.15:1),0,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle=palette[2];ctx.lineWidth=.7;ctx.stroke();
    ctx.fillStyle='#76bf83';
    ctx.beginPath();ctx.moveTo(0,-radius*.78);
    ctx.quadraticCurveTo(-radius*.8,-radius*1.72,-radius*.95,-radius*1.15);
    ctx.quadraticCurveTo(-radius*.45,-radius*.85,0,-radius*.78);
    ctx.fill();
    ctx.fillStyle='#ffffffbd';
    ctx.beginPath();ctx.ellipse(-radius*.3,-radius*.28,radius*.17,radius*.25,-.5,0,Math.PI*2);ctx.fill();
    ctx.restore();
    return true;
  }

  function foodIcon(name) {
    const key=fruit[name]||fruit.berry;
    if(icons[key])return icons[key];
    if(!WW.illustrations.ready(key))return empty;
    const canvas=document.createElement('canvas');
    canvas.width=36;canvas.height=36;
    const ctx=canvas.getContext('2d');
    WW.illustrations.draw(ctx,key,18,35,34,34);
    icons[key]=canvas.toDataURL('image/png');
    return icons[key];
  }

  return {draw,drawFruit,portrait:name=>WW.spriteAtlas.portrait(name)||empty,foodIcon};
})();