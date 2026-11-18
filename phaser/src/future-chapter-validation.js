// Validation for the three unregistered future chapters. Their common static
// geometry is also validated by the production semantic world compiler.
export function validateFutureChapter(spec){
  const fail=message=>{throw Error(spec.id+': '+message)};
  const groups=['waterVolumes','waterControllers','valves','buoyantObjects',
    'pressurePlates','gates','currents','lightSources','mirrors','shutters',
    'occluders','beamTargets','phasePlatforms','racePhases','mountEncounters',
    'hazards','flightVolumes'];
  const named=Object.fromEntries(groups.map(group=>
    [group,new Map((spec[group]??[]).map(item=>[item.id,item]))]));
  const entries=groups.flatMap(group=>spec[group]??[]);
  if(new Set(entries.map(item=>item.id)).size!==entries.length)
    fail('repeated dynamic object ID');
  const needs=(group,id)=>{if(!named[group].has(id))fail('unknown '+group+' reference: '+id)};
  if(spec.waterVolumes){
    let previous=0;
    for(const v of spec.waterVolumes){
      if(v.from<previous||v.to>spec.width||v.to<=v.from||
         !(v.maxSurface<v.minSurface&&v.minSurface<v.groundBottom&&
           v.groundBottom<spec.height&&
           v.startSurface>=v.maxSurface&&v.startSurface<=v.minSurface))
        fail('invalid water volume '+v.id);
      previous=v.to;
    }
    for(const c of spec.waterControllers){
      needs('waterVolumes',c.volume);
      if(c.kind==='linked'){needs('waterControllers',c.upstream);
        if(!(c.ratePerTick>0))fail('invalid linked rate')}
      else if(c.kind==='triangle'){
        if(!Number.isInteger(c.halfPeriodTicks)||c.halfPeriodTicks<=0)
          fail('invalid tide period');
      }else if(c.kind==='valve'){
        if(!(c.ratePerTick>0)||!['fill','drain','hold'].includes(c.initial))
          fail('invalid valve controller');
      }else fail('unknown water controller');
    }
    for(const v of spec.valves)needs('waterControllers',v.controller);
    for(const b of spec.buoyantObjects)needs('waterVolumes',b.volume);
    for(const p of spec.pressurePlates){needs('buoyantObjects',p.requires);needs('gates',p.opens)}
    for(const g of spec.gates)needs('pressurePlates',g.opensWhen);
    for(const c of spec.currents)needs('waterVolumes',c.volume);
    needs('waterControllers',spec.waterwheel.upstream);
  }
  if(spec.lightSources){
    for(const m of spec.mirrors){
      if(!m.angles.includes(m.initial)||m.angles.some(a=>!Number.isFinite(a)))
        fail('invalid mirror detents');
    }
    for(const s of spec.shutters)if(!s.states.includes(s.initial))
      fail('invalid shutter state');
    for(const o of spec.occluders)
      if(!Number.isInteger(o.periodTicks)||o.periodTicks<=0)fail('invalid occluder');
    for(const t of spec.beamTargets)needs('lightSources',t.source);
    for(const p of spec.phasePlatforms){
      needs('beamTargets',p.target);
      if(!['lit','shadow'].includes(p.rule)||!(p.previewTicks>0))
        fail('invalid phase platform');
    }
  }
  if(spec.racePhases){
    const order=['waitingForUnicorns','groundScroll','sanctuaryStop',
      'waitingForPegasi','flightScroll','finished'];
    if(spec.racePhases.map(p=>p.id).join(',')!==order.join(','))
      fail('race phases out of order');
    for(const id of ['groundScroll','flightScroll']){
      const p=named.racePhases.get(id);
      if(!(p.speed>0&&p.from<p.to))fail('invalid scroll segment');
    }
    const midpoint=named.racePhases.get('sanctuaryStop').anchor/(spec.width*16);
    if(midpoint<.45||midpoint>.55)fail('sanctuary must stop near halfway');
    for(const kind of ['unicorn','pegasus'])
      if(spec.mountEncounters.filter(m=>m.kind===kind).length<2)
        fail('need two '+kind+' mounts for co-op');
    for(const h of spec.hazards){
      if(!['groundScroll','flightScroll'].includes(h.stage))
        fail('hazard outside scrolling phase');
      if(h.motion&&(!Number.isInteger(h.motion.periodTicks)||
        h.motion.periodTicks<=0))fail('invalid hazard period');
      if(!(h.warningDistance>0))fail('hazard lacks early warning');
    }
  }
  return true;
}
