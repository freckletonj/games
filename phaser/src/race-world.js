import {createRaceState,raceHazardPose,stepRace} from './race-rules.js';

const SCROLLING=new Set(['groundScroll','flightScroll']);

export function createRaceWorld(spec){
  return {state:createRaceState(spec),hazards:[],retiredHazards:[],offscreenTicks:0};
}

export function raceRiderLeftBehind(spec,state,players){
  if(!SCROLLING.has(state.phase))return false;
  const frame=raceCameraFrame(spec,state,players);
  const leftEdge=frame.x-960/(2*frame.zoom);
  const grace=48;
  return players.some(player=>!player.assist&&
    (player.sleep||player.bubble||player.clouded||
      (state.phase==='flightScroll'&&!player.mount)||
      (player.mount?.x??player.x)<leftEdge-grace));
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

// The authored hazard bounds are authoritative. Mounted bodies use a small,
// consistent collision silhouette around their actual world-space saddle;
// the independently authored gap catches riders who never clear the floor.
export function raceHazardContact(hazard,mount){
  const [width,height]=hazard.size;
  const overlapsX=Math.abs(mount.x-hazard.x)<width/2+14;
  if(!overlapsX)return false;
  if(hazard.kind==='gap')
    return mount.grounded&&mount.y>=hazard.y-2;
  const top=hazard.y-height/2,bottom=hazard.y+height/2;
  return mount.y-5>=top&&mount.y-48<=bottom;
}

export function stepRaceWorld(spec,world,players,{paused=false,failed=false,recall=false}={}){
  const previous=world.state.phase;
  if(previous==='crash'){
    world.state=stepRace(spec,world.state,players,{paused,recall});
    if(world.state.restarted){
      world.hazards=[];world.offscreenTicks=0;
      if(world.state.checkpoint!=='sanctuary')world.retiredHazards=[];
    }
    return {state:world.state,transition:previous!==world.state.phase,
      restarted:world.state.restarted,hit:null};
  }
  const offscreen=raceRiderLeftBehind(spec,world.state,players);
  // The rescue zone is beyond the visible left edge, not the abstract
  // progress anchor. Let a rider recover from a momentary camera straggle.
  if(!paused)world.offscreenTicks=offscreen?world.offscreenTicks+1:0;
  // During the mount-selection stops everyone is on foot. This rule only
  // applies once the scrolling stage actually begins.
  const incapacitated=SCROLLING.has(world.state.phase)&&
    players.some(p=>!p.assist&&
      (p.sleep||p.bubble||p.clouded||p.trap||
        world.state.phase==='flightScroll'&&!p.mount));
  const leftBehind=incapacitated||world.offscreenTicks>=40;
  // No ground shortcut through the storm canyon. Falling below the
  // authored cloudline restarts both humans at their Pegasus sanctuary.
  const voidArea=spec.flightVoid;
  const fell=world.state.phase==='flightScroll'&&voidArea&&players.some(p=>
    !p.assist&&p.mount?.kind==='pegasus'&&
    p.mount.x>=voidArea.from*16&&p.mount.x<voidArea.to*16&&
    (p.mount.y>=voidArea.fallY*16||
      p.mount.y<=voidArea.ceilingY*16));
  const impact=failed?{id:'course-failure'}:leftBehind?
    {id:'fell-behind'}:fell?{id:'storm-clouds'}:false;
  world.state=stepRace(spec,world.state,players,{
    paused,failed:impact,recall
  });
  if(previous==='groundScroll'&&world.state.phase==='sanctuaryStop')
    world.retiredHazards=world.hazards.map(h=>({...h}));
  if(world.state.restarted){
    world.offscreenTicks=0;
    if(world.state.checkpoint!=='sanctuary')world.retiredHazards=[];
  }
  if(!paused&&!world.state.restarted)constrainRaceRiders(spec,world.state,players);
  const scrolling=SCROLLING.has(world.state.phase);
  world.hazards=scrolling?spec.hazards.filter(h=>h.stage===world.state.phase)
    .map(h=>({id:h.id,kind:h.kind,size:h.size,warningDistance:h.warningDistance,
      ...raceHazardPose(h,world.state.tick)})):[];
  // Apply physical contact after mounted movement and the fixed-tick hazard
  // poses have advanced. Everyone recalls together; hazards never move
  // while the two sanctuary gates are waiting.
  const collision=paused?null:world.hazards.find(hazard=>players.some(player=>
    !player.assist&&player.mount&&
    raceHazardContact(hazard,player.mount)));
  if(collision){
    world.state=stepRace(spec,world.state,players,{failed:collision});
    // Keep the collider on screen throughout the short crash animation.
  }
  return {state:world.state,transition:previous!==world.state.phase,
    restarted:world.state.restarted,hit:collision?.id??null};
}

export function raceCameraFrame(spec,state,players,viewport={width:960,height:540,
  defaultZoom:2}){
  const center=kind=>{
    const positions=spec.mountEncounters.filter(m=>m.kind===kind).map(m=>m.at[0]*16);
    return positions.reduce((total,x)=>total+x,0)/positions.length;
  };
  const corral=center('unicorn'),sanctuary=center('pegasus');
  const ground=spec.racePhases.find(phase=>phase.id==='groundScroll');
  const flight=spec.racePhases.find(phase=>phase.id==='flightScroll');
  const finish=spec.racePhases.find(phase=>phase.id==='finished').anchor+32;
  let x=corral;
  const phase=state.phase==='crash'?state.crash.fromPhase:state.phase;
  if(phase==='groundScroll'){
    const progress=(state.anchor-ground.from)/(ground.to-ground.from);
    const plain=corral+state.anchor-ground.from;
    // Spread camera alignment over the whole run, not the last quarter.
    // A late correction previously *accelerated* the viewport at the gate
    // while the race itself decelerated.
    const t=Math.max(0,Math.min(1,progress));
    const blend=t*t*t*(t*(t*6-15)+10);
    x=plain+blend*(sanctuary-(corral+ground.to-ground.from));
  }else if(phase==='flightScroll'){
    const progress=(state.anchor-flight.from)/(flight.to-flight.from);
    x=sanctuary+(finish-sanctuary)*progress;
  }else if(phase==='sanctuaryStop'||phase==='waitingForPegasi')
    x=sanctuary;
  else if(phase==='finished')x=finish;
  const human=players.filter(player=>!player.assist);
  const feet=human.map(player=>player.mount??player);
  const average=feet.length?
    feet.reduce((sum,person)=>sum+person.y,0)/feet.length:
    spec.ridge[0][1]*16;
  const spread=feet.length>1?
    Math.max(...feet.map(person=>person.x))-
      Math.min(...feet.map(person=>person.x)):0;
  const zoom=Math.max(viewport.defaultZoom*.74,
    Math.min(viewport.defaultZoom,
      viewport.width/(spread+150)));
  // In flight, keep the dangerous lower cloudline near the viewport bottom
  // rather than framing an empty sky above the rider.
  return {x,y:average-(phase==='flightScroll'?0:70),zoom};
}
