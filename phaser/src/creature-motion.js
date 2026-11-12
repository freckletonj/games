import {tickDistraction} from './creatures.js';
import {advanceBubbleLift} from './gameplay-rules.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Both enemies tell the player what is coming. Emberkit rushes along the
// floor; Prismtail has a longer tell, then hops in an avoidable arc.
export const ATTACKS=Object.freeze({
  emberkit:{windup:.55,duration:.22,speed:2.6,lift:0},
  prismtail:{windup:.75,duration:.42,speed:1.85,lift:25}
});

// Pure simulation state updates; visuals, treat consumption and contacts
// remain with the scene. All timer values are in seconds.
export function tickCreatureRespawn(animal,step){
  if(!animal.captured)return 'active';
  animal.respawn-=step/60;
  if(animal.respawn>0)return 'waiting';
  animal.captured=false;animal.trust=0;animal.distraction=0;
  animal.respawn=0;animal.stun=0;animal.bubble=0;animal.bubbleRise=0;
  animal.knockVX=0;
  animal.windup=0;animal.dash=0;
  animal.x=animal.homeX;animal.y=animal.homeY;
  return 'returned';
}

export function stepCreatureMotion(animal,lure,step,time,world){
      animal.stun=Math.max(0,animal.stun-step/60);
      animal.bubble=Math.max(0,animal.bubble-step/60);
      const bubbleLift=advanceBubbleLift(animal,step);
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
      const speed=animal.stun || bubbleLift>0 || friendly || animal.windup>0 ? 0 :
        lure ? .55 : animal.kind==='prismtail' ? .76 : .36;
      const slope=animal.flying?0:
        (world.groundAt(animal.x+2)-world.groundAt(animal.x-2))/4;
      const groundSpeed=animal.flying?speed:
        speed/Math.hypot(1,slope);
      animal.x+=clamp(diff,-groundSpeed*step,groundSpeed*step);
      if(animal.knockVX){
        // A gust pushes over multiple simulation frames. No instantaneous
        // teleport into collision geometry or misleading one-frame impulse.
        animal.x=clamp(animal.x+animal.knockVX*step,10,world.width-10);
        animal.knockVX*=Math.pow(.82,step);
        if(Math.abs(animal.knockVX)<.08)animal.knockVX=0;
      }
      if(animal.dash>0){
        const attack=ATTACKS[animal.kind];
        animal.x=clamp(animal.x+animal.attackFace*attack.speed*step,
          10,world.width-10);
        animal.dash=Math.max(0,animal.dash-step/60);
      }
      if(animal.windup>0||animal.dash>0)animal.face=animal.attackFace;
      else if(Math.abs(diff)>2)animal.face=Math.sign(diff);
      if(animal.flying){
        const rest=animal.homeY+Math.sin(time*.0014+animal.homeX)*7;
        const wanted=lure?Math.min(rest+40,lure.y-15):rest;
        animal.y+=(wanted-bubbleLift-animal.y)*.035*step;
      }else{
        const attack=ATTACKS[animal.kind];
        const hop=attack?.lift&&animal.dash>0?
          attack.lift*Math.sin(Math.PI*(1-animal.dash/attack.duration)):0;
        animal.y=world.groundAt(animal.x)-bubbleLift-hop;
      }
      return {friendly,diff};

}

export function creatureAction(animal,lure,diff){
  return animal.stun||animal.bubbleRise>0?'stunned':
    animal.windup>0?'alert':animal.dash>0?'dash':
    animal.distraction>0?'happy':lure?'run':
    animal.flying?'flap':Math.abs(diff)>6?'run':'idle';
}

export function stepCreatureThreat(animal,close,hasLure,step){
  const attack=ATTACKS[animal.kind];
  if(!attack||animal.distraction>0||animal.stun>0)return;
  if(animal.windup>0){
    animal.windup=Math.max(0,animal.windup-step/60);
    if(animal.windup===0){
      animal.dash=attack.duration;animal.attack=1.25;
    }
  }else if(animal.attack===0&&animal.dash===0&&close&&!hasLure){
    animal.windup=attack.windup;
    animal.attackFace=close.x>=animal.x?1:-1;
    animal.face=animal.attackFace;
  }
}

// A creature's back acts as a forgiving springboard for any player form.
// Stomp impact always supplies the normal hop; a fresh jump input during the
// following 14 simulation frames turns it into a stronger, earned bounce.
export function stompCreature(player){
  player.vy=-4.4;
  player.grounded=false;
  player.coyote=0;
  player.creatureBounceWindow=14;
}
