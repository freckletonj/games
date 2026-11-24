// The core and corona expand quickly; the sparks linger and fall away.
// All positions come from elapsed simulation ticks, including while paused.
const BURST_TICKS=38;

export function captureBurst(scene,x,y){
  const art=scene.add.graphics().setPosition(x,y).setDepth(42);
  return {art,age:0};
}

export function drawCaptureBurst({art,age}){
  art.clear();
  const t=age/BURST_TICKS;
  const flash=Math.max(0,1-age/11);
  const ring=Math.min(1,age/3)*(1-t)**2;
  for(let layer=4;layer>=1;layer--){
    art.fillStyle(layer===1?0xffffff:0xc5eaff,flash*.16);
    art.fillCircle(0,0,layer*(4+age*.56));
  }
  art.fillStyle(0xffffff,flash*.9);
  art.fillCircle(0,0,2+age*.34);
  for(const [radius,color,opacity] of [[9+31*t,0xc6eaff,.48],[5+23*t,0xfff7df,.8]]){
    art.lineStyle(1.4-t,color,ring*opacity);
    art.strokeCircle(0,0,radius);
  }
  for(let i=0;i<14;i++){
    const angle=i*Math.PI*2/14+(i%3)*.11;
    const reach=(18+(i*13)%35)*Math.sin(t*Math.PI*.5);
    const x=Math.cos(angle)*reach, y=Math.sin(angle)*reach+t*t*12;
    const light=(1-t)**1.4*(.65+.35*Math.cos(age*.55+i));
    const size=(2+i%4)*(1-t*.65);
    art.fillStyle(i%3===0?0xffe3a6:0xffffff,light);
    art.fillPoints([{x:x-size,y},{x:x-.5,y:y-.5},{x,y:y-size*1.65},
      {x:x+.5,y:y-.5},{x:x+size,y},{x:x+.5,y:y+.5},
      {x,y:y+size*1.65},{x:x-.5,y:y+.5}],true);
  }
  return age<BURST_TICKS;
}
