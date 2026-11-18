// Sunken Temple candidate: water and linked mechanisms use the same 60 Hz
// tick as the production game. Cells in the level spec map to 16 world pixels.
const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));

export function createTempleState(spec){
  return {tick:0,
    surfaces:Object.fromEntries(spec.waterVolumes.map(volume=>
      [volume.id,volume.startSurface])),
    modes:Object.fromEntries(spec.waterControllers.filter(c=>c.kind==='valve')
      .map(controller=>[controller.id,controller.initial])),
    plates:Object.fromEntries(spec.pressurePlates.map(plate=>[plate.id,false])),
    gates:Object.fromEntries(spec.gates.map(gate=>[gate.id,false])),
    wheelActive:false,wheelAngle:0};
}

export function setTempleValve(spec,state,valveId,mode){
  const valve=spec.valves.find(valve=>valve.id===valveId);
  if(!valve||!valve.modes.includes(mode))throw Error('Invalid temple valve setting');
  return {...state,modes:{...state.modes,[valve.controller]:mode}};
}

export function buoyantPosition(spec,state,id){
  const object=spec.buoyantObjects.find(object=>object.id===id);
  const surface=state.surfaces[object.volume]*16;
  return {x:object.home[0]*16,
    y:Math.min(object.home[1]*16,surface+object.floatOffset)};
}

export function buoyantCarry(spec,previous,next,id){
  const prior=buoyantPosition(spec,previous,id);
  const after=buoyantPosition(spec,next,id);
  return {x:after.x-prior.x,y:after.y-prior.y};
}

export function templeCurrentAt(spec,state,x,y){
  for(const current of spec.currents){
    const volume=spec.waterVolumes.find(volume=>volume.id===current.volume);
    const controller=spec.waterControllers.find(controller=>
      controller.volume===current.volume);
    if(x>=volume.from*16&&x<volume.to*16&&
       y>=state.surfaces[volume.id]*16&&y<volume.groundBottom*16&&
       state.modes[controller.id]===current.activeWhen)
      return current.direction*current.forcePerTick;
  }
  return 0;
}

export function stepTemple(spec,state,{cratePositions={}}={}){
  const tick=state.tick+1;
  const surfaces={...state.surfaces};
  // Order: water controllers -> buoyant positions -> plate contacts ->
  // sluice gates and waterwheel -> collision support -> rendered visuals.
  for(const controller of spec.waterControllers){
    const volume=spec.waterVolumes.find(volume=>volume.id===controller.volume);
    let next=surfaces[volume.id];
    if(controller.kind==='triangle'){
      const period=controller.halfPeriodTicks*2;
      const distance=Math.abs((tick%period)-controller.halfPeriodTicks);
      const fill=(controller.halfPeriodTicks-distance)/controller.halfPeriodTicks;
      next=volume.minSurface+(volume.maxSurface-volume.minSurface)*fill;
    }else{
      const mode=controller.kind==='linked'?
        (surfaces[spec.waterControllers.find(c=>c.id===controller.upstream).volume]
          <=controller.threshold?'fill':'drain'):
        state.modes[controller.id];
      const rate=controller.ratePerTick;
      next=clamp(next+(mode==='fill'?-rate:mode==='drain'?rate:0),
        volume.maxSurface,volume.minSurface);
      // Snap exact endpoints: repeated fractional additions otherwise leave
      // surfaces at e.g. 45.00000000000057 even after a completed fill.
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
    const [cellX,cellY]=plate.at;
    return [plate.id,Math.abs(crate.x-cellX*16)<=plate.radius&&
      Math.abs(crate.y-cellY*16)<=plate.radius];
  }));
  const wheel=spec.waterwheel;
  const wheelController=spec.waterControllers.find(c=>c.id===wheel.upstream);
  const wheelActive=surfaces[wheelController.volume]<=wheel.engageSurface;
  const gates=Object.fromEntries(spec.gates.map(gate=>
    [gate.id,gate.opensWhen===wheel.id?wheelActive:
      Boolean(plates[gate.opensWhen])]));
  const wheelAngle=(state.wheelAngle+(wheelActive?0.028:0))%(2*Math.PI);
  return {...interim,plates,gates,wheelActive,wheelAngle};
}
