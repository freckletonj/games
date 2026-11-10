window.WW = window.WW || {};
// Hand-painted storybook sprites. Each committed sheet contains a 4 x 2 atlas;
// its cell order is defined here so art and gameplay geometry stay independent.
WW.illustrations = (() => {
  const names = {
    gateClosed:['props',0],gateOpen:['props',1],
    checkpointOff:['props',2],checkpointOn:['props',3],
    sign:['props',4],basket:['props',5],star:['props',6],relic:['props',7],
    honey:['effects',0],honeyPuddle:['effects',1],
    bubble:['effects',2],bubbleTrap:['effects',3],
    gust:['effects',4],petal:['effects',5],splash:['effects',6],spark:['effects',7],
    lanternTree:['landmarks',0],crystal:['landmarks',1],
    reef:['landmarks',2],observatory:['landmarks',3],
    island:['landmarks',4],pond:['landmarks',5],
    lantern:['landmarks',6],shells:['landmarks',7],
    berryBush:['flora',0],nectarFruit:['flora',1],
    stardropFruit:['flora',2],mushrooms:['flora',3],
    flowers:['flora',4],reeds:['flora',5],
    stones:['flora',6],moonStone:['flora',7]
  };
  const sheets = Object.fromEntries(
    Object.entries(window.WW_EMBEDDED_ILLUSTRATIONS || {}).map(([key,url]) => {
      const image = new Image();
      image.src = url;
      return [key,image];
    })
  );
  const ready = name => {
    const source = names[name];
    const image = source && sheets[source[0]];
    return !!(image && image.complete && image.naturalWidth &&
      image.naturalWidth % 4 === 0 && image.naturalHeight % 2 === 0);
  };
  // The world position is the *bottom center* of the painted sprite.
  // Keep collision geometry in the semantic level; art never changes physics.
  function draw(ctx,name,x,y,w,h,opacity=1) {
    if (!ready(name)) return false;
    const [sheet,frame]=names[name],image=sheets[sheet];
    const cw=image.naturalWidth/4,ch=image.naturalHeight/2;
    ctx.save();
    ctx.globalAlpha*=opacity;
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    ctx.drawImage(image,(frame%4)*cw,Math.floor(frame/4)*ch,cw,ch,
      x-w/2,y-h,w,h);
    ctx.restore();
    return true;
  }
  return {draw,ready,names:Object.keys(names)};
})();