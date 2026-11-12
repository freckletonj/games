// World-space powers: deterministic 60 Hz projectiles, with swept collision.
// These rules have no dependency on Phaser, sprites, or wall-clock time.
export const PROJECTILE_POWERS=Object.freeze({
  mossback:{speed:2.45,vy:-1.2,gravity:.085,life:84,radius:17,stun:3.7},
  prismtail:{speed:3,vy:-.35,gravity:-.006,life:78,radius:19,stun:3.2},
  skyling:{speed:3.8,vy:0,gravity:0,life:51,radius:18,stun:1.8,push:4.3},
  cloudwhisp:{speed:3.8,vy:0,gravity:0,life:51,radius:18,stun:1.8,push:4.3},
  emberkit:{speed:4.2,vy:-.25,gravity:.02,life:42,radius:14,stun:1.4}
});
export const HONEY_PUDDLE_TICKS=180;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function launchPower(form,x,y,face,owner){
  const settings=PROJECTILE_POWERS[form];
  if(!settings)return null;
  return {kind:form,x:x+face*15,y:y-20,
    vx:face*settings.speed,vy:settings.vy,life:settings.life,owner};
}

export function stepPower(shot,step,groundAt,worldWidth){
  const fromX=shot.x,fromY=shot.y;
  const settings=PROJECTILE_POWERS[shot.kind];
  shot.x=clamp(shot.x+shot.vx*step,0,worldWidth);
  shot.y+=shot.vy*step;
  shot.vy+=settings.gravity*step;
  shot.life-=step;
  const ground=shot.y>=groundAt(shot.x)-7;
  return {fromX,fromY,ground,
    expired:ground||shot.life<=0||shot.x<=0||shot.x>=worldWidth};
}

export function powerHitsCreature(shot,fromX,fromY,animal){
  if(animal.captured)return false;
  const dx=shot.x-fromX,dy=shot.y-fromY;
  const length2=dx*dx+dy*dy;
  const t=length2===0?0:clamp(
    ((animal.x-fromX)*dx+(animal.y-15-fromY)*dy)/length2,0,1);
  const x=fromX+dx*t,y=fromY+dy*t;
  const radius=PROJECTILE_POWERS[shot.kind].radius;
  return Math.hypot(animal.x-x,animal.y-15-y)<radius;
}

export function applyPowerHit(shot,animal){
  const settings=PROJECTILE_POWERS[shot.kind];
  animal.stun=Math.max(animal.stun,settings.stun);
  animal.windup=0;
  animal.dash=0;
  if(shot.kind==='prismtail'){
    animal.bubble=settings.stun;
    animal.bubbleRise=0;
  }
  if(settings.push)animal.knockVX=Math.sign(shot.vx)*settings.push;
  return shot.kind==='prismtail'?'bubble':
    shot.kind==='mossback'?'honey':
    settings.push?'gust':'spark';
}

export function honeyPuddleCatches(puddle,animal,groundAt){
  return !animal.captured&&!animal.flying&&
    Math.abs(animal.x-puddle.x)<17&&
    Math.abs(animal.y-groundAt(animal.x))<20;
}
