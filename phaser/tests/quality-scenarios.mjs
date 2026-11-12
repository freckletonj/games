// Reusable deterministic, render-independent gameplay quality probes.
// All trajectories use the SAME 60 Hz production functions as the Scene.
import {stepPlayerMotion} from '../src/player-motion.js';
import {stepCreatureMotion} from '../src/creature-motion.js';
import {orbStep} from '../src/physics.js';
import {chooseCreatureLure,advanceBubbleLift,BUBBLE_DURATION,HOVER_SECONDS,
  ventContains,applyVentLift} from '../src/gameplay-rules.js';

export const controls={left:false,right:false,down:false,jump:false,jumpPressed:false};

export function explorer(form=null,x=100,y=500){
  return {id:0,x,y,vx:0,vy:0,face:1,grounded:true,coyote:5,
    jumpBuffer:0,jumps:0,flaps:0,flapWait:0,creatureBounceWindow:0,
    powers:0,hover:0,breach:0,bloomWindow:0,bloomBoosts:0,form};
}

export function world(groundAt=()=>500,inWater=()=>false){
  return {width:2200,height:1400,tile:16,groundAt,inWater,
    waterBodies:[],thermalVolumes:[],platformSegments:[]};
}

export function tracePlayer(player,terrain,ticks,actions=()=>controls){
  const trace=[{x:player.x,y:player.y,vx:player.vx,vy:player.vy,
    grounded:player.grounded}];
  for(let tick=0;tick<ticks;tick++){
    stepPlayerMotion(player,actions(tick),1,terrain);
    trace.push({x:player.x,y:player.y,vx:player.vx,vy:player.vy,
      grounded:player.grounded});
  }
  return trace;
}

export function orbOnHill(){
  const ground=x=>x<115?480:x<205?480-(x-115)*.34:449.4;
  let orb={x:50,y:460,vx:2.15,vy:-1,bounces:0,life:170};
  let postBounceApex=0,maxX=orb.x;
  for(let i=0;i<135;i++){
    orb=orbStep(orb,ground(orb.x+orb.vx));
    if(orb.bounces>0)
      postBounceApex=Math.max(postBounceApex,ground(orb.x)-8-orb.y);
    maxX=Math.max(maxX,orb.x);
  }
  return {bounces:orb.bounces,postBounceApex,maxX,
    climbedHill:maxX>205,remainingLife:orb.life};
}

export function slopeRun(form=null){
  const surface=x=>500-1.4*(x-100);
  const inWater=form==='tideling'?(x,y)=>y>=0&&y<=surface(x)+3:()=>false;
  const terrain=world(surface,inWater);
  if(form==='tideling')terrain.waterBodies=[{start:0,end:130,surface:0}];
  const player=explorer(form);
  const trace=tracePlayer(player,terrain,90,()=>({...controls,right:true}));
  let maxSurfaceSpeed=0;
  for(let i=1;i<trace.length;i++){
    if(trace[i-1].grounded&&trace[i].grounded)
      maxSurfaceSpeed=Math.max(maxSurfaceSpeed,Math.hypot(
        trace[i].x-trace[i-1].x,trace[i].y-trace[i-1].y));
  }
  return {travelX:player.x-100,maxSurfaceSpeed,
    endGroundError:player.y-surface(player.x),grounded:player.grounded};
}

export function berryReacquisition(){
  const animal={kind:'springaroo',x:100,y:500,homeX:100,homeY:500,
    face:1,flying:false,stun:0,bubble:0,trust:0,distraction:0,
    attack:0,windup:0,dash:0,attackFace:1};
  const impossible={x:247,y:500,landed:true,food:'berry'};
  const suspended={x:125,y:420,landed:true,food:'berry'};
  const near={x:126,y:500,landed:true,food:'berry'};
  const ignored=chooseCreatureLure(animal,[impossible,suspended],()=>500)===null;
  const chosen=chooseCreatureLure(animal,[impossible,suspended,near],()=>500);
  for(let tick=0;tick<30;tick++)
    stepCreatureMotion(animal,chosen,1,tick*1000/60,
      {width:2200,groundAt:()=>500});
  return {ignoredUnreachable:ignored,selectedNear:chosen===near,
    walkedTowardNear:animal.x>105,animalX:animal.x};
}

export function bubbleFloat(){
  const animal={kind:'prismtail',x:100,y:500,homeX:100,homeY:500,
    face:1,flying:false,stun:BUBBLE_DURATION,bubble:BUBBLE_DURATION,
    bubbleRise:0,trust:0,distraction:0,attack:0,windup:0,dash:0,
    attackFace:1};
  let minimumY=animal.y,airborneTicks=0;
  for(let i=0;i<280;i++){
    stepCreatureMotion(animal,null,1,i*1000/60,
      {width:2200,groundAt:()=>500});
    minimumY=Math.min(minimumY,animal.y);
    if(animal.bubbleRise>0)airborneTicks++;
  }
  return {lift:500-minimumY,airborneTicks,restingY:animal.y,
    remainingBubble:animal.bubble};
}

export function hoverGlide(){
  const player=explorer('glimmermoth',100,250);
  player.grounded=false;player.coyote=0;player.hover=HOVER_SECONDS;
  const trace=tracePlayer(player,world(()=>900),125);
  return {descent:player.y-250,remainingHover:player.hover,
    maxFallingSpeed:Math.max(...trace.map(p=>p.vy))};
}

export function emberkitSprint(){
  const base=explorer(),emberkit=explorer('emberkit');
  const right=()=>({...controls,right:true});
  tracePlayer(base,world(),90,right);
  tracePlayer(emberkit,world(),90,right);
  return {normalDistance:base.x-100,emberkitDistance:emberkit.x-100,
    distanceRatio:(emberkit.x-100)/(base.x-100)};
}

export function underwaterVent(){
  const terrain=world(()=>500,(x,y)=>y>=300&&y<=503);
  terrain.waterBodies=[{start:0,end:130,surface:300/16}];
  const player=explorer('tideling',200,480);
  player.grounded=false;player.coyote=0;
  const vent={x:200,y:500};
  let activeTicks=0,minY=player.y;
  for(let i=0;i<65;i++){
    stepPlayerMotion(player,controls,1,terrain);
    if(ventContains(player,vent,terrain.inWater(player.x,player.y-8))){
      applyVentLift(player,1);
      activeTicks++;
    }
    minY=Math.min(minY,player.y);
  }
  return {lift:480-minY,activeTicks,finalY:player.y,
    rejectsDryPlayer:!ventContains({x:200,y:490},vent,false),
    rejectsDistantPlayer:!ventContains({x:260,y:490},vent,true)};
}

export function qualityReport(){
  return {schemaVersion:1,tickRate:60,
    captureOrb:orbOnHill(),
    slope:{walk:slopeRun(),swim:slopeRun('tideling')},
    berryTargeting:berryReacquisition(),
    bubbleAttack:bubbleFloat(),
    glimmermothHover:hoverGlide(),
    emberkitSpeed:emberkitSprint(),
    waterVent:underwaterVent()};
}
