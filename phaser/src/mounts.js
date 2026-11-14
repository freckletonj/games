import {landingY,platformTopAt,safeHorizontalX} from './physics.js';

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
  m.vx+=(direction*settings.speed-m.vx)*Math.min(1,(m.grounded?.19:.12)*step);
  if(!direction&&Math.abs(m.vx)<.06)m.vx=0;
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
  const dx=safeX-m.x;
  if(dx)m.face=Math.sign(dx);
  m.x=safeX;
  const prior=m.y;
  m.y=clamp(m.y+m.vy*step,15,world.height-10);
  const landing=landingY(prior,m.y,m.vy,m.grounded,m.x,
    world.groundAt(m.x),world.platformSegments,world.tile);
  if(landing!==null){
    m.y=landing;m.vy=0;m.grounded=true;m.flaps=0;
  }else m.grounded=false;
  const action=m.grounded?(dx?'run':'idle'):
    m.kind==='pegasus'&&m.vy<0?'flap':m.vy<0?'jump':'glide';
  return {action,launch};
}


// Wild mounts cycle through aims on either side of home with time to graze
// between walks. An approach can trigger one rear until everyone backs away.
export function stepWildMount(m,near,food,step,time,world){
  m.chew=Math.max(0,m.chew-step/60);
  m.rear=Math.max(0,m.rear-step/60);
  if(!near)m.approached=false;
  if(!m.grounded){
    m.vy=Math.min(7.5,m.vy+.4*step);
    const y=m.y+m.vy*step;
    const floor=landingY(m.y,y,m.vy,false,m.x,
      world.groundAt(m.x),world.platformSegments,world.tile);
    m.y=floor??y;
    if(floor!==null){m.vy=0;m.grounded=true;}
    return m.grounded?'idle':m.vy<0?'jump':'glide';
  }
  if(m.chew>0)return 'eat';
  if(near&&!m.approached&&!food){
    m.approached=true;
    m.rear=.66;
    m.face=near.x<m.x?-1:1;
  }
  if(m.rear>0)return 'rear';
  const cycle=(time+m.homeX*2)%8400;
  const grazing=cycle>=2400&&cycle<4400||cycle>=6800;
  if(!food&&(near||grazing))return near?'idle':'eat';
  const radius=m.perched?24:44;
  const target=food?.x??m.homeX+(cycle<2400?radius:-radius);
  const previous=m.x;
  const next=clamp(m.x+clamp(target-m.x,-.63*step,.63*step),
    m.perched?m.homeX-24:10,m.perched?m.homeX+24:world.width-10);
  if(m.perched)m.x=next;
  else {
    const priorFloor=m.y;
    const nextFloor=world.groundAt(next);
    const shelf=platformTopAt(next,m.y-2,m.y+2,world.platformSegments,world.tile);
    if(shelf!==null||Math.abs(nextFloor-priorFloor)<=4&&
       !world.inWater(next,nextFloor-8)){
      m.x=safeHorizontalX(m.x,next,m.y,world.groundAt);
      if(m.x===next)m.y=shelf??nextFloor;
    }
  }
  if(m.x===previous)return 'idle';
  m.face=Math.sign(m.x-previous);
  return 'run';
}

export function landsOnMount(p,previousY,m){
  const seat=seatFor(m.kind,m.grounded?'idle':'jump');
  const top=m.y+seat.y;
  const backX=m.x+seat.x*m.face;
  return !p.mount&&!p.sleep&&!p.bubble&&!p.trap&&p.vy>0&&
    previousY<=top+2&&p.y>=top&&Math.abs(p.x-backX)<21;
}
