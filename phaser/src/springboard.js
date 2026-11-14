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
