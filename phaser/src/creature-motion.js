import {tickDistraction} from './creatures.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Pure simulation state updates; visuals, treat consumption and contacts
// remain with the scene. All timer values are in seconds.
export function tickCreatureRespawn(animal,step){
  if(!animal.captured)return 'active';
  animal.respawn-=step/60;
  if(animal.respawn>0)return 'waiting';
  animal.captured=false;animal.trust=0;animal.distraction=0;
  animal.respawn=0;animal.stun=0;animal.bubble=0;
  animal.windup=0;animal.dash=0;
  animal.x=animal.homeX;animal.y=animal.homeY;
  return 'returned';
}

export function stepCreatureMotion(animal,lure,step,time,world){
      animal.stun=Math.max(0,animal.stun-step/60);
      animal.bubble=Math.max(0,animal.bubble-step/60);
      const trust=tickDistraction(animal.trust,animal.distraction,step/60);
      animal.trust=trust.trust;animal.distraction=trust.seconds;
      animal.attack=Math.max(0,animal.attack-step/60);
      const friendly=animal.distraction>0;
      if(friendly||animal.stun>0){
        animal.windup=0;animal.dash=0;
      }
      let target=lure?.x ?? (animal.homeX+Math.sin(time*.00055+animal.homeX)*32);
      const diff=target-animal.x;
      // At full trust, pause in place for the player's capture attempt.
      // Without this a friendly animal immediately wandered out of orb range.
      const speed=animal.stun || animal.bubble>0 || friendly || animal.windup>0 ? 0 :
        lure ? .55 : animal.kind==='prismtail' ? .76 : .36;
      animal.x+=clamp(diff,-speed*step,speed*step);
      if(animal.dash>0){
        animal.x=clamp(animal.x+animal.attackFace*2.6*step,10,world.width-10);
        animal.dash=Math.max(0,animal.dash-step/60);
      }
      if(Math.abs(diff)>2)animal.face=Math.sign(diff);
      if(animal.flying){
        const rest=animal.homeY+Math.sin(time*.0014+animal.homeX)*7;
        const wanted=lure?Math.min(rest+40,lure.y-15):rest;
        animal.y+=(wanted-animal.y)*.035*step;
      }else animal.y=world.groundAt(animal.x)-(animal.bubble>0?22:0);
      return {friendly,diff};

}

export function creatureAction(animal,lure,diff){
  return animal.stun||animal.bubble>0?'stunned':
    animal.windup>0?'alert':animal.dash>0?'dash':
    lure?'run':animal.flying?'flap':Math.abs(diff)>6?'run':
    animal.distraction>0?'happy':'idle';
}

export function stepCreatureThreat(animal,close,hasLure,step){
  const hostile=animal.kind==='emberkit'||animal.kind==='prismtail';
  const friendly=animal.distraction>0;
  if(hostile&&!friendly&&animal.stun===0){
    if(animal.windup>0){
      animal.windup=Math.max(0,animal.windup-step/60);
      if(animal.windup===0){animal.dash=.22;animal.attack=1.25;}
    }else if(animal.attack===0&&animal.dash===0&&close&&!hasLure){
      animal.windup=.55;
      animal.attackFace=close.x>=animal.x?1:-1;
    }
  }
}
