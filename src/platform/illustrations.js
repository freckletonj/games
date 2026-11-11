window.WW = window.WW || {};
// Painted storybook sprites. Environment sheets have a 4 x 2 grid; character
// eating and KO states use 3 x 3. Source and geometry remain independent.
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
    stones:['flora',6],moonStone:['flora',7],
    eatSpringaroo:['states',0],eatTideling:['states',1],
    eatSkyling:['states',2],eatMossback:['states',3],
    eatPrismtail:['states',4],eatGlimmermoth:['states',5],
    eatCloudwhisp:['states',6],eatEmberkit:['states',7],
    heroSleep:['states',8]
  };
  const sheets = Object.fromEntries(
    Object.entries(window.WW_EMBEDDED_ILLUSTRATIONS || {}).map(([key,url]) => {
      const asset={image:null,ready:false};
      const image=new Image();
      image.addEventListener('load',()=>{
        asset.image=WW.paintCleanup(image);
        asset.ready=true;
      });
      image.src=url;
      return [key,asset];
    })
  );
  const dimensions = sheet => sheet === 'states' ? [3,3] : [4,2];
  const ready = name => {
    const source = names[name];
    const asset = source && sheets[source[0]];
    if (!asset?.ready) return false;
    const [columns,rows] = dimensions(source[0]);
    return asset.image.width % columns === 0 && asset.image.height % rows === 0;
  };
  // The world position is the *bottom center* of the painted sprite.
  // Keep collision geometry in the semantic level; art never changes physics.
  function draw(ctx,name,x,y,w,h,opacity=1) {
    if (!ready(name)) return false;
    const [sheet,frame]=names[name],image=sheets[sheet].image;
    const [columns,rows]=dimensions(sheet);
    const cw=image.width/columns,ch=image.height/rows;
    ctx.save();
    ctx.globalAlpha*=opacity;
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    ctx.drawImage(image,(frame%columns)*cw,Math.floor(frame/columns)*ch,cw,ch,
      x-w/2,y-h,w,h);
    ctx.restore();
    return true;
  }
  return {draw,ready,names:Object.keys(names)};
})();