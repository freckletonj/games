// A forgiving two-stage springboard: touching a bloom always bounces.
// Press Jump while the upward launch is in progress for a visibly higher leap.
export const BLOOM_WINDOW=22; // about 0.36 s at 60Hz
const BLOOM_LAUNCH=-7.2;
export const BLOOM_BOOST=-10.35;

export function triggerBloom(p,bufferedJump=false){
  p.vy=bufferedJump?BLOOM_BOOST:BLOOM_LAUNCH;
  p.grounded=false;
  p.coyote=0;
  p.jumps=1;
  p.jumpBuffer=0;
  p.bloomWindow=bufferedJump?0:BLOOM_WINDOW;
  if(bufferedJump)p.bloomBoosts=(p.bloomBoosts||0)+1;
}
export function tryBloomBoost(p,jumpPressed){
  if(!jumpPressed||!(p.bloomWindow>0))return false;
  p.vy=BLOOM_BOOST;
  p.bloomWindow=0;
  p.jumps=1;
  p.jumpBuffer=0;
  p.bloomBoosts=(p.bloomBoosts||0)+1;
  return true;
}

export const BLOOM_COOLDOWN=1.1;
export const BLOOM_ART={width:256,height:224,rootY:208};

export function bloomFrame(time,cooldown){
  const sinceLaunch=BLOOM_COOLDOWN-cooldown;
  return sinceLaunch<.4?4+Math.min(3,Math.floor(sinceLaunch*10)):
    Math.floor(time*3)%4;
}
