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

export function enemyTellFrame(kind){
  return kind==='prismtail'?EFFECT_FRAMES.bubble:
    kind==='emberkit'?EFFECT_FRAMES.spark:null;
}

// The 180×270 illustrated frames include substantial transparent bottom
// padding. These observed opaque baselines keep props attached to terrain
// without shifting semantic collision coordinates. A <=10% alpha threshold
// was used to locate each source-painted bottom pixel.
export const ILLUSTRATION_FRAME_HEIGHT=270;
export const PROP_FEET=Object.freeze({
  snack:229,checkpoint:243,exit:246
});
export const SETPIECE_FEET=Object.freeze({
  bounceBloom:162,bubbleVent:211,windRing:155,
  honeyPuddle:241
});
export function paintedFootOrigin(kind){
  return (PROP_FEET[kind]??SETPIECE_FEET[kind]??ILLUSTRATION_FRAME_HEIGHT)/
    ILLUSTRATION_FRAME_HEIGHT;
}

export function setpieceFrame(kind){
  return {bounceBloom:EFFECT_FRAMES.petal,
    windRing:EFFECT_FRAMES.gust,
    bubbleVent:EFFECT_FRAMES.bubble}[kind];
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
