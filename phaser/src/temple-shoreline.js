// The authored basin bounds describe the flat floor, not the shoreline.
// Intersect the live water height with the compiled terrain on both banks.
const TILE=16;

function bankCrossing(cell,direction,surfaceY,groundAt){
  const at=cell*TILE;
  if(groundAt(at)<=surfaceY)return at;
  let wet=at;
  for(let i=0;i<64;i++){
    const next=wet+direction*4;
    if(groundAt(next)<=surfaceY){
      let dry=wet,bank=next;
      for(let step=0;step<9;step++){
        const middle=(dry+bank)/2;
        if(groundAt(middle)>surfaceY)dry=middle;
        else bank=middle;
      }
      return bank;
    }
    wet=next;
  }
  return at;
}

export function templeShoreBounds(basin,groundAt){
  const y=basin.surface*TILE;
  return {
    left:bankCrossing(basin.start,-1,y,groundAt),
    right:bankCrossing(basin.end,1,y,groundAt),
    y
  };
}
