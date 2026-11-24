window.WW = window.WW || {};
// All characters are now drawn from painted, frame-accurate image atlases.
// Food illustrations are clipped from the committed transparent flora atlas.
WW.art = (() => {
  const empty='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  const icons={};
  const fruit={
    berry:'berryBush',nectar:'nectarFruit',star:'stardropFruit',
    honey:'honey',marshmallow:'stardropFruit'
  };

  const eatingSprites={
    springaroo:[43,39],tideling:[43,38],skyling:[43,39],
    mossback:[44,37],prismtail:[43,39],glimmermoth:[43,38],
    cloudwhisp:[43,38],emberkit:[42,39]
  };

  function draw(ctx,name,x,y,frame=0,flip=false,playerId=null,pose={}) {
    if(name==='snack')return WW.illustrations.draw(ctx,'basket',x,y,25,27);

    if(pose.action==='eat' && eatingSprites[name]){
      const sprite='eat'+name[0].toUpperCase()+name.slice(1);
      if(WW.illustrations.ready(sprite)){
        const [w,h]=eatingSprites[name];
        const chew=Math.sin((pose.time||0)*14);
        ctx.save();
        ctx.translate(x,y);
        if(flip)ctx.scale(-1,1);
        ctx.scale(1+chew*.018,1-chew*.023);
        WW.illustrations.draw(ctx,sprite,0,0,w,h);
        ctx.restore();
        return true;
      }
    }

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

  return {draw,portrait:name=>WW.spriteAtlas.portrait(name)||empty,foodIcon};
})();