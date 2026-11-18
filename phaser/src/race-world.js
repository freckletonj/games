import {createRaceState,raceHazardPose,stepRace} from './race-rules.js';

const SCROLLING=new Set(['groundScroll','flightScroll']);

export function createRaceWorld(spec){
  return {state:createRaceState(spec),hazards:[]};
}

export function raceRiderLeftBehind(spec,state,players){
  if(!SCROLLING.has(state.phase))return false;
  return players.some(player=>!player.assist&&
    (player.sleep||player.bubble||player.clouded||
      !player.mount||player.mount.x<state.anchor-spec.camera.behind));
}

// The progress anchor runs independently of Phaser's camera and rendered
// sprites. A rider can accelerate faster than the scroll but cannot skip
// authored obstacles by galloping beyond the approaching camera window.
export function constrainRaceRiders(spec,state,players){
  if(!SCROLLING.has(state.phase))return;
  for(const player of players){
    if(!player.mount||player.assist)continue;
    const mount=player.mount;
    const limit=state.anchor+spec.camera.ahead;
    if(mount.x>limit){
      mount.x=limit;
      mount.vx=0;
      player.x=limit;
    }
  }
}

export function stepRaceWorld(spec,world,players,{paused=false,failed=false,recall=false}={}){
  const previous=world.state.phase;
  const leftBehind=raceRiderLeftBehind(spec,world.state,players);
  world.state=stepRace(spec,world.state,players,{
    paused,failed:failed||leftBehind,recall
  });
  if(!paused&&!world.state.restarted)constrainRaceRiders(spec,world.state,players);
  const scrolling=SCROLLING.has(world.state.phase);
  world.hazards=scrolling?spec.hazards.filter(h=>h.stage===world.state.phase)
    .map(h=>({id:h.id,kind:h.kind,size:h.size,warningDistance:h.warningDistance,
      ...raceHazardPose(h,world.state.tick)})):[];
  return {state:world.state,transition:previous!==world.state.phase,
    restarted:world.state.restarted};
}
