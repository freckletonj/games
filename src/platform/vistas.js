window.WW=window.WW||{};
// Painted landmark compositions only. The old giant opaque ovals, arches and
// vector tree trunks obscured the detailed parallax paintings and gameplay.
// Every item below is an actual cutout from the existing painted atlas.
WW.vistas=(()=>{
  const T=16;
  // [painted cutout, x offset, bottom offset, width, height, opacity].
  // Each scene has an authored focal point, small supporting details, and
  // deliberate negative space. The collision map is always authoritative.
  const compositions={
    'root-arch':[
      ['lanternTree',-91,10,129,175,.86],
      ['flowers',78,4,51,45,.85]],
    'elder-tree':[
      ['lanternTree',0,10,160,209,.98],
      ['flowers',-91,4,56,39,.91],['flowers',91,4,54,39,.89]],
    'lily-garden':[
      ['pond',0,11,176,99,.87],
      ['flowers',-95,5,57,41,.93],['flowers',91,5,55,42,.93]],
    'firefly-ruins':[
      ['lantern',-11,6,100,146,.96],
      ['stones',-94,7,66,47,.82],['mushrooms',91,5,54,45,.92]],
    'shell-cove':[
      ['shells',-82,10,120,84,.88],
      ['reef',64,10,107,102,.81]],
    'reef-arch':[
      ['reef',-87,11,116,111,.91],
      ['reef',86,11,115,111,.91],['shells',0,7,67,52,.72]],
    'tide-temple':[
      ['observatory',0,12,128,165,.9],
      ['reef',-106,10,99,94,.83],['shells',102,9,87,66,.84]],
    'sunken-ruin':[
      ['observatory',0,12,133,155,.8],
      ['reef',-106,9,114,113,.9],['reef',104,9,110,109,.89]],
    'pearl-shrine':[
      ['crystal',0,14,122,147,.96],
      ['shells',-101,11,99,72,.77],['shells',97,10,92,67,.78]],
    'willow-arch':[
      ['lanternTree',-89,11,128,166,.81],
      ['pond',13,9,146,84,.75],['reeds',103,7,50,56,.9]],
    'moon-gate':[
      ['observatory',0,13,135,170,.92],
      ['moonStone',-91,8,79,82,.8],['moonStone',91,8,79,82,.8]],
    'wind-temple':[
      ['observatory',0,12,131,167,.91],
      ['moonStone',-92,8,82,86,.8],['stones',97,8,77,56,.86]],
    'floating-garden':[
      ['island',0,21,190,168,.91],
      ['flowers',-92,8,61,45,.8],['flowers',91,8,57,45,.83]],
    'aurora-spire':[
      ['crystal',0,13,139,171,.97],
      ['observatory',-93,11,114,147,.64],
      ['moonStone',104,9,88,88,.91]]
  };
  const lightColors={meadow:'#f9dfa9',coast:'#b9f9e9',summit:'#e2d2fc'};
  function paint(ctx,v,biome){
    const scale=Math.min(1.1,v.span*T/330);
    const accent=lightColors[biome]||lightColors.meadow;
    ctx.save();ctx.translate((v.x+.5)*T,v.y*T);ctx.scale(scale,scale);
    if(v.role==='reveal'||v.role==='reward'){
      const halo=ctx.createRadialGradient(0,-91,5,0,-91,126);
      halo.addColorStop(0,accent+'45');
      halo.addColorStop(1,accent+'00');
      ctx.fillStyle=halo;ctx.fillRect(-130,-220,260,248);
    }
    for(const [asset,x,y,w,h,opacity] of compositions[v.kind]||[])
      WW.illustrations.draw(ctx,asset,x,y,w,h,opacity);
    ctx.restore();
  }
  function draw(ctx,level,cameraX,cameraY,time){
    for(const v of level.vistas||[]){
      const x=(v.x+.5)*T,y=v.y*T,r=v.span*T*.65;
      if(x+r<cameraX-60||x-r>cameraX+540||
         y+55<cameraY-60||y-245>cameraY+320)continue;
      paint(ctx,v,level.biome||'meadow');
    }
  }
  function atmosphere(ctx,level,cameraX,time){
    // Reward landmarks receive a gentle localized warm/cool wash;
    // ordinary scenery has no fullscreen colored geometric overlays.
    for(const v of level.vistas||[]){
      if(v.role!=='reveal'&&v.role!=='reward')continue;
      const x=(v.x+.5)*T-cameraX;
      if(x<-180||x>660)continue;
      const halo=ctx.createRadialGradient(x,95,5,x,95,145);
      const accent=lightColors[level.biome]||lightColors.meadow;
      halo.addColorStop(0,accent+'19');
      halo.addColorStop(1,accent+'00');
      ctx.fillStyle=halo;ctx.fillRect(0,0,480,270);
    }
  }
  return {draw,atmosphere};
})();
