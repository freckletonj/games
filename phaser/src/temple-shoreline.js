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


// A basin's widest wet span need not occur at its highest tide: some
// authored banks have plateaus. Build one mask that covers every tide phase.
export function templeWaterMaskBounds(volume,groundAt){
  let left=Infinity,right=-Infinity;
  for(let surface=volume.maxSurface;surface<=volume.minSurface+.001;surface+=.25){
    const shore=templeShoreBounds({
      start:volume.from,end:volume.to,surface
    },groundAt);
    left=Math.min(left,shore.left);
    right=Math.max(right,shore.right);
  }
  // A little subpixel tolerance prevents mask seams at fractional heights.
  return {left:left-4,right:right+4,y:volume.maxSurface*TILE};
}
