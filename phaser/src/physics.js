// Pure platformer geometry utilities. World-space feet are at y and falling is +y.
export function landingY(previousY, nextY, velocityY, grounded, x, floor, segments, tile=16) {
  if (velocityY < 0) return null;
  const stepAllowance = grounded ? 9 : 0;
  let landing = null;
  if (previousY <= floor + (grounded ? 12 : 1) && nextY >= floor-stepAllowance)
    landing=floor;
  for (const platform of segments) {
    if(platform.kind!=='platform' || x<platform.x*tile-4 ||
      x>(platform.x+platform.length)*tile+4)continue;
    const top=platform.y*tile;
    // One-way ledges only catch a character crossing from above.
    if(previousY<=top+2 && nextY>=top && (landing===null || top<landing))
      landing=top;
  }
  return landing;
}

export function orbHitsAnimal(fromX,fromY,toX,toY,animalX,animalY) {
  // Closest point on the swept segment: fast gamepad/low-FPS shots cannot
  // teleport through an animal between rendering frames.
  const dx=toX-fromX,dy=toY-fromY;
  const distanceSquared=dx*dx+dy*dy;
  const fraction=distanceSquared===0 ? 0 :
    Math.max(0,Math.min(1,((animalX-fromX)*dx+(animalY-13-fromY)*dy)/distanceSquared));
  const x=fromX+fraction*dx,y=fromY+fraction*dy;
  return Math.abs(animalX-x)<20 && Math.abs(animalY-13-y)<23;
}
