// Small, Phaser-independent interaction rules used by both the live Scene and
// deterministic quality scenarios. Units: world pixels and fixed 60 Hz ticks.
const CREATURE_PATROL_RADIUS=112;
export const BUBBLE_DURATION=3.2;
const BUBBLE_MAX_RISE=155;
export const HOVER_SECONDS=3.2;
const VENT_PUSH=.85;

export function chooseCreatureLure(animal,lures,groundAt){
  const radius=animal.flying?140:CREATURE_PATROL_RADIUS;
  return lures.filter(lure=>{
    if(!lure.landed||Math.abs(lure.x-animal.homeX)>radius||
      Math.abs(lure.x-animal.x)>=155)return false;
    if(animal.perch)return lure.y===animal.perch.y&&
      lure.x>=animal.perch.left&&lure.x<=animal.perch.right;
    if(animal.flying)return Math.abs(lure.y-animal.homeY)<80;
    if(Math.abs(lure.y-groundAt(lure.x))>=24)return false;
    // A fruit beyond a wall or discontinuity must not monopolize the AI.
    // Sample the route, not only the destination height.
    const samples=Math.ceil(Math.abs(lure.x-animal.x)/12);
    let floor=groundAt(animal.x);
    for(let i=1;i<=samples;i++){
      const next=groundAt(animal.x+(lure.x-animal.x)*i/samples);
      if(Math.abs(next-floor)>23)return false;
      floor=next;
    }
    return true;
  }).reduce((best,lure)=>!best||
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
