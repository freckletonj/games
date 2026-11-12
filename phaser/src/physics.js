// Platformer geometry utilities. World-space feet are at y; falling is +y.
export function landingY(previousY,nextY,velocityY,grounded,x,floor,segments,tile=16){
  if(velocityY<0)return null;
  const stepAllowance=grounded?9:0;
  // A slope may rise under the feet between adjacent horizontal samples.
  // Always resolve a descending body against solid ground, even when its
  // previous frame was already marginally inside the uphill bank.
  let landing=nextY>=floor-stepAllowance?floor:null;
  for(const platform of segments){
    if(platform.kind!=='platform'||x<platform.x*tile-4||
       x>(platform.x+platform.length)*tile+4)continue;
    const top=platform.y*tile;
    if(previousY<=top+2&&nextY>=top&&
       (landing===null||top<landing))landing=top;
  }
  return landing;
}

export function safeHorizontalX(fromX,toX,footY,groundAt,swimming=false){
  // Swept terrain intersection (<=4 world units per sample) prevents a
  // swimmer from tunnelling into a steep beach wall and falling under
  // the heightfield. Players can walk up shallow ramps without snapping.
  const steps=Math.max(1,Math.ceil(Math.abs(toX-fromX)/4));
  const allowance=swimming?7:11;
  let x=fromX;
  for(let i=1;i<=steps;i++){
    const next=fromX+(toX-fromX)*i/steps;
    if(footY>groundAt(next)+allowance)break;
    x=next;
  }
  return x;
}

export function orbStep(orb,groundY,step=1){
  // Slow, predictable ballistic arc with a visible physical ground bounce.
  const x=orb.x+orb.vx*step;
  let y=orb.y+orb.vy*step;
  let vy=orb.vy+.14*step;
  let vx=orb.vx;
  let bounces=orb.bounces||0;
  const floor=groundY-8;
  if(y>=floor&&vy>0){
    y=floor;
    vy=-Math.max(.7,Math.min(2.2,vy*.62));
    vx*=.88;
    bounces++;
  }
  return {x,y,vx,vy,bounces,life:orb.life-step};
}

export function orbHitsAnimal(fromX,fromY,toX,toY,animalX,animalY){
  // Closest point on swept segment: even at low fps a shot cannot tunnel.
  const dx=toX-fromX,dy=toY-fromY;
  const distanceSquared=dx*dx+dy*dy;
  const fraction=distanceSquared===0?0:
    Math.max(0,Math.min(1,((animalX-fromX)*dx+(animalY-13-fromY)*dy)/distanceSquared));
  const x=fromX+fraction*dx,y=fromY+fraction*dy;
  return Math.abs(animalX-x)<20&&Math.abs(animalY-13-y)<23;
}
