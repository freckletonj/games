// Deterministic 60 Hz rules for the Skybound Stampede level candidate.
// The Phaser scene will supply its real human players and mounted-creature
// references; camera and obstacle sprites must follow this state, not drive it.
export function raceReadiness(players,kind){
  const humans=players.filter(player=>!player.assist);
  const mounted=humans.filter(player=>player.mount?.kind===kind&&
    (player.mount.rider===undefined||player.mount.rider===player.id)&&
    !player.sleep&&!player.bubble&&!player.clouded);
  const distinct=new Set(mounted.map(player=>player.mount)).size===mounted.length;
  return {ready:humans.length>0&&mounted.length===humans.length&&distinct,
    mounted:mounted.length,required:humans.length};
}

export function raceHazardPose(hazard,tick){
  const [cellX,cellY]=hazard.home;
  const pose={x:cellX*16,y:cellY*16,rotation:0};
  if(!hazard.motion)return pose;
  const {axis,amplitude=0,periodTicks,phaseTicks=0}=hazard.motion;
  const phase=2*Math.PI*((tick+phaseTicks)%periodTicks)/periodTicks;
  if(axis==='x')pose.x+=amplitude*Math.sin(phase);
  if(axis==='y')pose.y+=amplitude*Math.sin(phase);
  // Rocks descend steadily, briefly disappear into the cloud bank and
  // restart overhead; their world-space collider follows the same pose.
  if(axis==='fall')pose.y+=amplitude*(
    ((tick+phaseTicks)%periodTicks)/periodTicks-.5);
  if(axis==='rotation')pose.rotation=phase;
  return pose;
}

export const CRASH_TICKS=54; // 0.9 seconds to see the impact before recall

export function createRaceState(spec){
  return {phase:'waitingForUnicorns',anchor:spec.racePhases[0].anchor,
    tick:0,checkpoint:'corral',activeIds:[],restarted:false};
}

export function restartRace(spec,state){
  const sanctuary=state.checkpoint==='sanctuary';
  return {...createRaceState(spec),
    phase:sanctuary?'waitingForPegasi':'waitingForUnicorns',
    anchor:spec.racePhases.find(phase=>phase.id===(
      sanctuary?'waitingForPegasi':'waitingForUnicorns')).anchor,
    checkpoint:state.checkpoint,restarted:true};
}

export function stepRace(spec,state,players,{paused=false,failed=false,recall=false}={}){
  if(paused)return state;
  if(recall)return restartRace(spec,state);
  if(state.phase==='crash'){
    if(state.crash.remaining<=1)return restartRace(spec,state);
    return {...state,crash:{...state.crash,
      remaining:state.crash.remaining-1},restarted:false};
  }
  if(failed)return {...state,phase:'crash',crash:{
    fromPhase:state.phase,hit:failed.id??null,
    x:failed.x??null,y:failed.y??null,
    remaining:CRASH_TICKS},restarted:false};
  const humans=players.filter(player=>!player.assist);
  const activeIds=humans.map(player=>player.id).sort((a,b)=>a-b);
  // A mid-scroll join/drop-out resets the whole party at its safe stop.
  if(state.phase==='groundScroll'||state.phase==='flightScroll'){
    if(activeIds.join(',')!==state.activeIds.join(','))
      return restartRace(spec,state);
    const required=state.phase==='groundScroll'?'unicorn':'pegasus';
    if(!raceReadiness(players,required).ready){
      // A voluntary Unicorn dismount is not a crash. Hold the ground-course
      // clock and camera until every healthy explorer boards again. Lost,
      // stunned or wrongly mounted riders still use normal recovery.
      if(state.phase==='groundScroll'&&humans.every(p=>
        !p.sleep&&!p.bubble&&!p.clouded&&!p.trap&&
        (!p.mount||p.mount.kind==='unicorn'&&
          (p.mount.rider===undefined||p.mount.rider===p.id))))
        return {...state,restarted:false};
      return restartRace(spec,state);
    }
    const phase=spec.racePhases.find(phase=>phase.id===state.phase);
    // Accelerate gently after each mount gate and ease into the sanctuary
    // and finish instead of starting/stopping at full scroll speed.
    const smooth=t=>t*t*(3-2*t);
    const enter=.55+.45*smooth(Math.min(1,(state.tick+1)/145));
    const leave=.22+.78*smooth(Math.min(1,(phase.to-state.anchor)/180));
    const anchor=Math.min(phase.to,state.anchor+phase.speed*enter*leave);
    if(anchor===phase.to){
      const next=phase.next;
      return {...state,anchor,tick:state.tick+1,
        phase:next,checkpoint:next==='sanctuaryStop'?'sanctuary':state.checkpoint,
        restarted:false};
    }
    return {...state,anchor,tick:state.tick+1,restarted:false};
  }
  if(state.phase==='sanctuaryStop')
    return {...state,phase:'waitingForPegasi',tick:0,activeIds:[],restarted:false};
  if(state.phase==='waitingForUnicorns'||state.phase==='waitingForPegasi'){
    const required=state.phase==='waitingForUnicorns'?'unicorn':'pegasus';
    if(!raceReadiness(players,required).ready)return {...state,restarted:false};
    const next=state.phase==='waitingForUnicorns'?'groundScroll':'flightScroll';
    return {...state,phase:next,activeIds,tick:0,restarted:false};
  }
  return {...state,restarted:false}; // finish remains stopped
}
