// Small, Phaser-independent interaction rules used by both the live Scene and
// deterministic quality scenarios. Units: world pixels and fixed 60 Hz ticks.
export const CREATURE_PATROL_RADIUS=112;
export const BUBBLE_DURATION=3.2;
export const BUBBLE_MAX_RISE=155;
export const HOVER_SECONDS=3.2;
export const VENT_PUSH=.85;

export function chooseCreatureLure(animal,lures,groundAt){
  const radius=animal.flying?140:CREATURE_PATROL_RADIUS;
  return lures.filter(lure=>lure.landed&&
    Math.abs(lure.x-animal.homeX)<=radius&&
    Math.abs(lure.x-animal.x)<155&&
    (animal.flying?
      Math.abs(lure.y-animal.homeY)<80:
      Math.abs(lure.y-groundAt(lure.x))<24))
    .reduce((best,lure)=>!best||
      Math.abs(lure.x-animal.x)<Math.abs(best.x-animal.x)?lure:best,null);
}

export function advanceBubbleLift(animal,step){
  const current=animal.bubbleRise||0;
  animal.bubbleRise=animal.bubble>0?
    Math.min(BUBBLE_MAX_RISE,current+1.8*step):
    Math.max(0,current-2.7*step);
  return animal.bubbleRise;
}

export function ventContains(player,vent,inWater){
  return inWater&&Math.abs(player.x-vent.x)<21&&
    player.y>=vent.y-110&&player.y<=vent.y+20;
}

export function applyVentLift(player,step){
  player.vy=Math.max(-4.2,player.vy-VENT_PUSH*step);
}
