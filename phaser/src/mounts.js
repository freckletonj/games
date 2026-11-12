// Original Wonderwood painted Unicorn and Pegasus from PR #6.
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
