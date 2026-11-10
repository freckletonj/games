window.WW = window.WW || {};
// Interaction positions come from the semantic level. Painted, transparent PNG
// sprites replace the original flat Canvas path illustrations.
WW.props = (() => {
  const draw = (ctx,name,x,y,w,h,alpha=1) =>
    WW.illustrations.draw(ctx,name,x,y,w,h,alpha);

  function sign(ctx,x,y,title,biome,time) {
    draw(ctx,'sign',x,y+1,62,82);
    // The only dynamically composed element is the authored sign's text.
    // Its background, wood grain, carvings and lantern are raster paintings.
    ctx.save();
    ctx.font='bold 6px system-ui,sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillStyle='#fff2d9';
    ctx.shadowColor='#352338';
    ctx.shadowBlur=2;
    ctx.fillText(title,x+2,y-47,44);
    ctx.restore();
  }

  function gate(ctx,x,y,open,biome,time) {
    draw(ctx,open?'gateOpen':'gateClosed',x,y+8,53,65);
  }

  function checkpoint(ctx,x,y,lit,biome,time) {
    draw(ctx,lit?'checkpointOn':'checkpointOff',x,y+8,53,51);
  }

  function light(ctx,x,y,color,time) {
    ctx.save();
    ctx.translate(x,y+10);
    ctx.rotate(Math.sin(time*2)*.035);
    draw(ctx,'relic',0,0,34,38);
    ctx.restore();
  }

  function star(ctx,x,y,time) {
    ctx.save();
    ctx.translate(x,y+10);
    ctx.rotate(Math.sin(time*3)*.095);
    draw(ctx,'star',0,0,28,28);
    ctx.restore();
  }

  function snack(ctx,x,y,time=0) {
    draw(ctx,'basket',x,y+1,31,33);
  }

  return {sign,gate,checkpoint,light,star,snack};
})();