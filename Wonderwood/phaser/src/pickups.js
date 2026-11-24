export const PICKUPS=Object.freeze({
  dandelion:{frame:0,size:23,notice:'Dandelion · Higher jumps and softer falls for 5 seconds'},
  iceWater:{frame:1,size:21,notice:'Ice water · Slippery feet for 5 seconds'},
  toadstool:{frame:2,size:23,notice:'Bouncy toadstool!'}
});

export const PICKUP_ART=Object.freeze({fluff:3,iceCube:4,spores:5});
export const PICKUP_FRAME=144;
const EFFECT_TICKS=5*60;
export const DANDELION_BOOST=1.25;
export const JUMP_EVENTS=new Set(['jump','waterJump','breach','doubleJump','wallJump',
  'flap','bloomBoost','creatureBounceBoost','ropeJump']);

export function takePickup(player,kind){
  if(kind==='dandelion'||kind==='iceWater')player[kind]=EFFECT_TICKS;
  else {
    player.vy=Math.min(player.vy,-8.8);
    player.grounded=false;
    player.floating=false;
    player.onPlatform=null;
    player.coyote=0;
    player.jumpBuffer=0;
    player.jumps=1;
  }
}
