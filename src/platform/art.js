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

  function draw(ctx,name,x,y,frame=0,flip=false,playerId=null,pose={}) {
    if(name==='snack')return WW.illustrations.draw(ctx,'basket',x,y,25,27);
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