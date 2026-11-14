import {landingY,safeHorizontalX} from './physics.js';

// Neither species is capturable or usable as a transformed creature.
export const MOUNTS=Object.freeze({
  unicorn:{favorite:'berry',speed:4.2,jump:-8.1,kind:'ground'},
  pegasus:{favorite:'star',speed:3.45,jump:-6.5,kind:'flight'}
});
export const LOCATIONS=Object.freeze({
  'first-forest':[['unicorn',48]],
  'starfall-summit':[['pegasus',58,41],['pegasus',276,29]],
  'willow-wetlands':[['unicorn',122]],
  'cloud-gardens':[['pegasus',28],['pegasus',300,23]]
});

export function seatFor(kind,action){
  const seats=kind==='pegasus'?
    {idle:{x:-5,y:-32},run:{x:-6,y:-31},jump:{x:-4,y:-31}}:
    {idle:{x:-9,y:-38},run:{x:-10,y:-37},jump:{x:-9,y:-37}};
  return seats[action]||seats.idle;
}
export function mountState(kind,trust){
  return trust>=100?'ready':trust>0?'interested':'wild';
}

const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));

// Advances only mounted movement/collision state; no Phaser scene, sprites,
// camera or effects. The caller owns visuals and the mounted rider's pose.
export function stepMountedMotion(m,actions,step,world){
  const settings=MOUNTS[m.kind];
  const direction=Number(actions.right)-Number(actions.left);
  if(direction)m.face=direction;
  m.vx+=(direction*settings.speed-m.vx)*Math.min(1,(m.grounded?.19:.12)*step);
  m.flapWait=Math.max(0,m.flapWait-step);
  let launch=null;
  if(actions.jumpPressed){
    if(m.grounded){
      m.vy=settings.jump;m.grounded=false;m.flaps=1;m.flapWait=8;
      launch='takeoff';
    }else if(settings.kind==='flight'&&m.flapWait===0){
      m.vy=Math.min(m.vy,-5.4);m.flapWait=8;m.flaps++;
      launch='wingbeat';
    }
  }
  m.vy+=(settings.kind==='flight'?.28:.43)*step;
  if(settings.kind==='flight'&&actions.down&&!m.grounded)
    m.vy+=.35*step;
  m.vy=clamp(m.vy,-9,7.5);
  // On a hill, preserve the mount's speed along the surface, not just X.
  // Otherwise a Unicorn's 4.2px horizontal step can cross 7px vertically.
  const slope=m.grounded?
    (world.groundAt(m.x+2)-world.groundAt(m.x-2))/4:0;
  const groundVx=m.grounded?m.vx/Math.hypot(1,slope):m.vx;
  const nextX=clamp(m.x+groundVx*step,12,world.width-12);
  const safeX=safeHorizontalX(m.x,nextX,m.y,world.groundAt);
  if(Math.abs(safeX-nextX)>.2)m.vx=0;
  m.x=safeX;
  const prior=m.y;
  m.y=clamp(m.y+m.vy*step,15,world.height-10);
  const landing=landingY(prior,m.y,m.vy,m.grounded,m.x,
    world.groundAt(m.x),world.platformSegments,world.tile);
  if(landing!==null){
    m.y=landing;m.vy=0;m.grounded=true;m.flaps=0;
  }else m.grounded=false;
  const action=m.grounded?(Math.abs(m.vx)>.4?'run':'idle'):
    m.kind==='pegasus'&&m.vy<0?'flap':m.vy<0?'jump':'glide';
  return {action,launch};
}
