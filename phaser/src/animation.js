// Every Wonderwood form uses the same action vocabulary and one predictable
// foot-anchored sprite contract. All poses remain artist-drawn atlas frames;
// small secondary motion adds anticipation and weight without stretching tiles.
export const ACTIONS = Object.freeze([
  'idle','run','jump','fall','land','feed','capture','transform',
  'eat','happy','alert','hurt','stunned','dash','flap','glide','swim','sleep'
]);

const ALIASES = {
  land:'idle',feed:'eat',capture:'alert',transform:'happy',
  stunned:'hurt',dash:'run',flap:'run',glide:'fall',swim:'run'
};
const ONCE = new Set(['land','feed','capture','transform','hurt','stunned','alert']);
const clamp=(value,minimum,maximum)=>Math.max(minimum,Math.min(maximum,value));

export function poseFor(manifest, action, elapsed, motion=0, phase=0) {
  const animations=manifest.animations;
  const key=action==='flap'&&animations.run?'run':
    action==='glide'&&animations.jump?'jump':ALIASES[action]||action;
  const clip=animations[key]||animations.idle;
  const index=ONCE.has(action) ?
    Math.min(clip.frames.length-1,Math.floor(elapsed*clip.fps)) :
    Math.floor(Math.max(0,elapsed)*clip.fps)%clip.frames.length;
  const base=clip.frames[index];
  const cycle=elapsed*Math.PI*2;
  const breath=Math.sin(cycle*1.8+phase);
  let sx=1,sy=1,rotation=0,dy=0,dx=0;
  switch(action) {
    case 'idle':
      sx=1+.014*breath;sy=1-.014*breath;dy=-.4*(breath+1);break;
    case 'run': {
      const pace=clamp(Math.abs(motion)/2.5,.3,1.2);
      const gait=Math.sin(cycle*(1.35+pace));
      sx=1+(.018+.016*pace)*gait;
      sy=1-(.025+.025*pace)*Math.abs(gait);
      dy=-(.8+1.4*pace)*Math.abs(gait);
      rotation=.028*Math.sign(motion)*pace+.008*gait;
      break;
    }
    case 'jump': {
      // Stretch most strongly at takeoff, then settle back toward the
      // painted silhouette instead of staying permanently elongated.
      const launch=Math.exp(-elapsed*4.5);
      sx=1-.12*launch;sy=1+.15*launch;dy=-2.3*launch;
      break;
    }
    case 'fall':{
      const hang=1-Math.exp(-elapsed*6);
      sx=1+.045*hang;sy=1-.035*hang;
      rotation=clamp(motion,-3,3)*.012;
      break;
    }
    case 'land': {
      const impact=Math.exp(-elapsed*12);
      sx=1+.15*impact;sy=1-.17*impact;dy=1.2*impact;break;
    }
    case 'flap': {
      const wings=Math.sin(cycle*4);
      sy=1+.052*wings;sx=1-.027*wings;dy=-2.3*wings;break;
    }
    case 'glide':sy=.91;sx=1.08;dy=.4*Math.sin(cycle);break;
    case 'swim':
      rotation=.09*Math.sin(cycle*1.6);sy=.98+.025*Math.sin(cycle*2);
      dy=1.4*Math.sin(cycle*2);break;
    case 'feed':rotation=-.09;sy=.96;dx=2;break;
    case 'capture':rotation=-.15; sx=.97;sy=1.04;dx=3;break;
    case 'transform': {
      const pulse=Math.sin(clamp(elapsed/.56,0,1)*Math.PI);
      sx=1+.12*pulse;sy=1+.12*pulse;dy=-5*pulse;break;
    }
    case 'eat':sy=.94+.035*breath;rotation=.045*breath;break;
    case 'happy':sy=1+.055*breath;dy=-2.2*Math.abs(breath);break;
    case 'alert':sx=1.06;sy=.98;rotation=.045*breath;break;
    case 'dash':sx=1.13;sy=.92;rotation=.06*Math.sign(motion||1);break;
    case 'stunned':rotation=.11*Math.sin(cycle*2);sy=.89;break;
    case 'hurt':sx=1.06;sy=.93;rotation=.08;break;
    case 'sleep':sy=.92;dy=1.5;break;
    default:break;
  }
  return {frame:base,sx,sy,rotation,dx,dy};
}

export function gesture(entity,action,duration){
  entity.gesture=action;
  entity.gestureTime=duration;
}
