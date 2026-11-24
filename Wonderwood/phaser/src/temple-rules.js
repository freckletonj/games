// Sunken Temple mechanics. All water, crate, latch and wheel states advance
// at 60 Hz; scene visuals must not determine any collision or activation.
const TILE=16;
const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));

export function createTempleState(spec){
  return {tick:0,
    surfaces:Object.fromEntries(spec.waterVolumes.map(v=>[v.id,v.startSurface])),
    modes:Object.fromEntries(spec.waterControllers.filter(c=>c.kind==='valve')
      .map(c=>[c.id,c.initial])),
    plates:Object.fromEntries(spec.pressurePlates.map(p=>[p.id,false])),
    gates:Object.fromEntries(spec.gates.map(g=>[g.id,false])),
    released:false,chargeTicks:0,wheelActive:false,wheelAngle:0};
}

export function setTempleValve(spec,state,valveId,mode){
  const valve=spec.valves.find(v=>v.id===valveId);
  if(!valve||!valve.modes.includes(mode))throw Error('Invalid temple valve setting');
  return {...state,modes:{...state.modes,[valve.controller]:mode}};
}

export function releaseTempleWheel(spec,state,releaseId){
  if(!spec.releases.some(release=>release.id===releaseId))
    throw Error('Invalid temple release');
  return {...state,released:true};
}

export function buoyantPosition(spec,state,id){
  const object=spec.buoyantObjects.find(o=>o.id===id);
  const surface=state.surfaces[object.volume]*TILE;
  const volume=spec.waterVolumes.find(v=>v.id===object.volume);
  const floor=volume.groundBottom*TILE;
  return {x:object.home[0]*TILE,
    y:object.kind==='crate'?
      Math.min(surface+object.floatOffset,floor-object.size[1]):
      Math.min(object.home[1]*TILE,surface+object.floatOffset)};
}

export function buoyantCarry(spec,previous,next,id){
  const prior=buoyantPosition(spec,previous,id);
  const after=buoyantPosition(spec,next,id);
  return {x:after.x-prior.x,y:after.y-prior.y};
}

export function templeCurrentAt(spec,state,x,y){
  for(const current of spec.currents){
    const volume=spec.waterVolumes.find(v=>v.id===current.volume);
    const controller=spec.waterControllers.find(c=>c.volume===volume.id);
    if(x>=volume.from*TILE&&x<volume.to*TILE&&
       y>=state.surfaces[volume.id]*TILE&&y<volume.groundBottom*TILE&&
       state.modes[controller.id]===current.activeWhen)
      return current.direction*current.forcePerTick;
  }
  return 0;
}

// Crates press *floor* sockets with their bottom face, not imaginary
// proximity triggers at their floating top. Once solved, the mechanical
// ratchet retains the gate state even if the player refills the basin.
export function stepTemple(spec,state,{cratePositions={}}={}){
  const tick=state.tick+1;
  const surfaces={...state.surfaces};
  for(const controller of spec.waterControllers){
    const volume=spec.waterVolumes.find(v=>v.id===controller.volume);
    let next=surfaces[volume.id];
    if(controller.kind==='triangle'){
      // Give players a safe boarding and disembarking window at both
      // extremes rather than reversing the raft on the exact peak tick.
      const rise=controller.halfPeriodTicks,hold=controller.holdTicks??0;
      const elapsed=Math.max(0,tick-(controller.startDelayTicks??0));
      const phase=elapsed%(2*(rise+hold));
      const fill=phase<rise?phase/rise:
        phase<rise+hold?1:
        phase<2*rise+hold?1-(phase-rise-hold)/rise:0;
      next=volume.minSurface+(volume.maxSurface-volume.minSurface)*fill;
    }else{
      const mode=controller.kind==='linked'?
        ((state.wheelActive||state.released&&
          surfaces[spec.waterControllers.find(c=>c.id===controller.upstream).volume]
            <=controller.threshold)?'fill':'drain'):
        state.modes[controller.id];
      const rate=controller.ratePerTick;
      next=clamp(next+(mode==='fill'?-rate:mode==='drain'?rate:0),
        volume.maxSurface,volume.minSurface);
      if(mode==='fill'&&Math.abs(next-volume.maxSurface)<1e-8)
        next=volume.maxSurface;
      if(mode==='drain'&&Math.abs(next-volume.minSurface)<1e-8)
        next=volume.minSurface;
    }
    surfaces[volume.id]=next;
  }
  const interim={...state,tick,surfaces};
  const plates=Object.fromEntries(spec.pressurePlates.map(plate=>{
    const crate=cratePositions[plate.requires]||
      buoyantPosition(spec,interim,plate.requires);
    const object=spec.buoyantObjects.find(o=>o.id===plate.requires);
    const [cellX,cellY]=plate.at;
    const touching=Math.abs(crate.x-cellX*TILE)<=plate.radius&&
      Math.abs(crate.y+object.size[1]-cellY*TILE)<2;
    return [plate.id,Boolean(state.plates[plate.id]||touching)];
  }));
  // The raft is the only way back to the upper control. A failed drain
  // must refill too, or missing the socket permanently strands the player.
  // Ignore the initially empty basin: this retry only follows a real drain.
  const sluice=spec.waterVolumes.find(volume=>volume.id==='sluice');
  const missedSocket=state.modes['sluice-valve']==='drain'&&
    state.surfaces.sluice<sluice.minSurface&&
    surfaces.sluice===sluice.minSurface&&!plates['sluice-plate'];
  const modes=(plates['sluice-plate']&&!state.plates['sluice-plate']||
    missedSocket)?
    {...state.modes,'sluice-valve':'fill'}:state.modes;
  const wheel=spec.waterwheel;
  const head=spec.waterControllers.find(c=>c.id===wheel.upstream);
  const flowing=state.released&&surfaces[head.volume]<=wheel.engageSurface;
  const chargeTicks=flowing?Math.min(wheel.chargeTicks,state.chargeTicks+1):
    state.chargeTicks;
  const wheelActive=state.wheelActive||chargeTicks>=wheel.chargeTicks;
  const gates=Object.fromEntries(spec.gates.map(gate=>
    [gate.id,gate.opensWhen===wheel.id?wheelActive:
      Boolean(plates[gate.opensWhen])]));
  const wheelAngle=(state.wheelAngle+(flowing?0.028:0))%(2*Math.PI);
  return {...interim,modes,plates,gates,chargeTicks,wheelActive,wheelAngle};
}
