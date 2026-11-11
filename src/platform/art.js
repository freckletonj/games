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


  // A continuous animated mount illustration. If a painted character atlas
  // is added later, use it directly; keep the same ground/saddle pivots.
  function drawMount(ctx,kind,x,y,flip=false,pose={}){
    if(WW.spriteAtlas.draw(ctx,kind,x,y,0,flip,null,pose))return true;
    const pegasus=kind==='pegasus',time=pose.time||0;
    const stride=pose.action==='run'?Math.sin(time*2.2)*4:0;
    const wing=Math.sin(time*5.8)*.36;
    ctx.save();ctx.translate(x,y);
    if(flip)ctx.scale(-1,1);
    if(!pose.flying){
      ctx.fillStyle='#26334830';ctx.beginPath();ctx.ellipse(0,1,27,3,0,0,Math.PI*2);ctx.fill();
    }
    const coat=ctx.createLinearGradient(-20,-43,28,-8);
    coat.addColorStop(0,pegasus?'#fffef3':'#fbedff');
    coat.addColorStop(.47,pegasus?'#e3efff':'#f7d6f2');
    coat.addColorStop(1,pegasus?'#a6bedb':'#c4a5dc');
    // Soft, layered tail with a consistent root at the rump.
    for(let i=0;i<4;i++){
      ctx.lineCap='round';ctx.lineWidth=3.8-i*.35;
      ctx.strokeStyle=pegasus?['#fff0c8','#edc9a5','#ffe6d2','#c8c0f4'][i]:
        ['#f49bbd','#ffd9a1','#b7a3f4','#f8e7ff'][i];
      ctx.beginPath();ctx.moveTo(-22,-28+i);
      ctx.bezierCurveTo(-37,-43+i,-42+Math.sin(time*2+i)*3,-16+i,-49,-27+i*3);
      ctx.stroke();
    }
    // Animated hooves stay separated from the body and never affect collision.
    for(const [xx,phase] of [[-18,0],[-8,Math.PI],[11,Math.PI],[20,0]]){
      const swing=stride*Math.sin(phase+time*2.1);
      ctx.lineCap='round';ctx.strokeStyle='#8d7aaf';
      ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(xx,-19);
      ctx.lineTo(xx+swing*.45,-8);ctx.lineTo(xx+swing, -2-Math.abs(swing)*.35);ctx.stroke();
      ctx.strokeStyle=pegasus?'#f3c57c':'#e6a2dc';ctx.lineWidth=6.4;
      ctx.beginPath();ctx.moveTo(xx+swing-2,-1-Math.abs(swing)*.35);
      ctx.lineTo(xx+swing+3,-1-Math.abs(swing)*.35);ctx.stroke();
    }
    ctx.strokeStyle='#987ca9';ctx.lineWidth=1.8;ctx.fillStyle=coat;
    ctx.beginPath();ctx.ellipse(-4,-25,24,12,-.1,0,Math.PI*2);ctx.fill();ctx.stroke();
    // The rearing wing is behind the mane and saddle and flaps independently.
    if(pegasus){
      ctx.save();ctx.translate(-9,-29);ctx.rotate(-.2-wing);
      const feather=ctx.createLinearGradient(-25,-48,18,6);
      feather.addColorStop(0,'#ffffff');
      feather.addColorStop(.6,'#d6e6ff');feather.addColorStop(1,'#aaabd9');
      ctx.fillStyle=feather;ctx.strokeStyle='#a5a6cd';ctx.lineWidth=1.2;
      ctx.beginPath();
      ctx.moveTo(8,4);ctx.bezierCurveTo(-24,-7,-29,-44,-32,-48);
      ctx.quadraticCurveTo(-17,-42,-5,-26);
      ctx.quadraticCurveTo(15,-32,17,-10);ctx.closePath();ctx.fill();ctx.stroke();
      for(let i=0;i<5;i++){
        ctx.beginPath();ctx.moveTo(2,0);
        ctx.quadraticCurveTo(-18-i*2,-24-i*3,-15-i*4,-35-i*2);
        ctx.strokeStyle='#f9faffb0';ctx.stroke();
      }
      ctx.restore();
    }
    // Neck, jaw, and ears use the same coat to keep one coherent character.
    ctx.fillStyle=coat;ctx.strokeStyle='#9b84b4';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(9,-31);
    ctx.bezierCurveTo(14,-36,12,-48,20,-47);
    ctx.lineTo(29,-36);ctx.lineTo(23,-23);ctx.lineTo(15,-20);
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(27,-43,11,7,.12,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle=pegasus?'#e6b8ac':'#d8a0d0';
    ctx.beginPath();ctx.moveTo(21,-46);ctx.lineTo(20,-55);ctx.lineTo(26,-49);ctx.fill();
    if(!pegasus){
      const horn=ctx.createLinearGradient(25,-67,35,-43);
      horn.addColorStop(0,'#fff6ca');horn.addColorStop(1,'#e4b4ff');
      ctx.fillStyle=horn;ctx.strokeStyle='#b07fc4';ctx.lineWidth=.8;
      ctx.beginPath();ctx.moveTo(28,-49);ctx.lineTo(38,-67);ctx.lineTo(33,-48);
      ctx.closePath();ctx.fill();ctx.stroke();
    }
    const mane=pegasus?['#ffe8b0','#f7cba6','#e8d8f8']:
      ['#ffa8ce','#e6b5ff','#ffeab3'];
    for(let i=0;i<3;i++){
      ctx.strokeStyle=mane[i];ctx.lineCap='round';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(19+i*2,-52);
      ctx.bezierCurveTo(10-i*4,-59,5-i*4,-44,11-i*4,-38+i*4);
      ctx.stroke();
    }
    ctx.fillStyle='#3d3768';ctx.beginPath();ctx.ellipse(30,-44,1.4,1.8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffffff';ctx.fillRect(30,-45,1,1);
    ctx.fillStyle='#d9a3b7';ctx.beginPath();ctx.ellipse(35,-39,2,1.3,0,0,Math.PI*2);ctx.fill();
    // A consistent saddle is the player's visible landing/mounting target.
    ctx.fillStyle=pegasus?'#6687bd':'#ae80ca';ctx.strokeStyle='#fae9c3';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(-14,-35);ctx.quadraticCurveTo(-1,-42,10,-34);
    ctx.lineTo(10,-29);ctx.quadraticCurveTo(-1,-33,-14,-29);
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.restore();return true;
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

  return {draw,drawFruit,drawMount,portrait:name=>WW.spriteAtlas.portrait(name)||empty,foodIcon};
})();