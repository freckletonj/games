export const CLOUD_TICKS=5*60;
export const CLOUD_COOLDOWN=30*60;
export const CLOUD_RANGE=135;

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function steerCloud(player,actions,jumpClimbs=false){
  const x=Number(actions.right)-Number(actions.left);
  const y=Number(actions.down)-Number(actions.up||(jumpClimbs&&actions.jump));
  const speed=2.7/Math.max(1,Math.hypot(x,y));
  player.vx+=(x*speed-player.vx)*.2;
  player.vy+=(y*speed-player.vy)*.2;
  if(x)player.face=x;
}

export function fitAssistToView(player,left,top,width,height,worldWidth,worldHeight){
  player.x=clamp(player.x,Math.max(30,left+30),Math.min(worldWidth-30,left+width-30));
  player.y=clamp(player.y,Math.max(44,top+44),Math.min(worldHeight-13,top+height-13));
}

export function closestCloudTarget(origin,candidates,clear){
  let nearest=null, range=CLOUD_RANGE;
  for(const target of candidates){
    const distance=Math.hypot(target.x-origin.x,target.y-15-origin.y);
    if(distance<range&&clear(target)){
      nearest=target;
      range=distance;
    }
  }
  return nearest;
}
