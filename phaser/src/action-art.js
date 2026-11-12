// Illustrated action vocabulary from src/platform/illustrations.js. Keep the
// Phaser remake aligned with the existing 4x2 effects and 3x3 state atlases.
export const EFFECT_FRAMES=Object.freeze({
  honey:0,honeyPuddle:1,bubble:2,bubbleTrap:3,
  gust:4,petal:5,splash:6,spark:7
});
const EATING_FRAMES=Object.freeze({
  springaroo:0,tideling:1,skyling:2,mossback:3,
  prismtail:4,glimmermoth:5,cloudwhisp:6,emberkit:7
});

export function paintedAction(kind,action){
  if(action==='eat'&&EATING_FRAMES[kind]!==undefined)
    return {frame:EATING_FRAMES[kind],width:43,height:39};
  if(kind==='hero'&&action==='sleep')
    return {frame:8,width:49,height:41};
  return null;
}

export function powerFrame(kind){
  return {
    springaroo:EFFECT_FRAMES.petal,
    tideling:EFFECT_FRAMES.splash,
    skyling:EFFECT_FRAMES.gust,
    mossback:EFFECT_FRAMES.honey,
    prismtail:EFFECT_FRAMES.bubble,
    glimmermoth:EFFECT_FRAMES.petal,
    cloudwhisp:EFFECT_FRAMES.gust,
    emberkit:EFFECT_FRAMES.spark
  }[kind]??EFFECT_FRAMES.spark;
}
