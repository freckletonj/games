// Preserve the compiled outdoor heightfield and one-way platform tops in world pixels.
export function surfaceGroundAt(level,x){
  const position=Math.max(0,Math.min(x/16,level.width));
  const cell=Math.min(Math.floor(position),level.width-1);
  const t=position-cell;
  return (level.surface[cell]*(1-t)+level.surface[cell+1]*t)*16;
}

export function surfaceMaterialColumn(level,x){
  const floor=surfaceGroundAt(level,x);
  const pool=level.waterBodies.find(b=>x>=b.start*16&&x<b.end*16);
  const shelves=level.platformSegments.filter(p=>p.kind==='platform'&&
    x>=p.x*16&&x<(p.x+p.length)*16);
  return y=>{
    if(y>=floor)return 'rock';
    if(shelves.some(p=>y>=p.y*16&&y<p.y*16+20))return 'shelf';
    return pool&&y>=pool.surface*16?'water':'air';
  };
}
