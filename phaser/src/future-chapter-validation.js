// Validation for the three unregistered future chapters. Their common static
// geometry is also validated by the production semantic world compiler.
export function validateFutureChapter(spec){
  const fail=message=>{throw Error(spec.id+': '+message)};
  const groups=['waterVolumes','waterControllers','valves','buoyantObjects',
    'pressurePlates','gates','currents','releases','obstacles','linkedPlatforms','lightSources','mirrors','shutters',
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
        if(!Number.isInteger(c.halfPeriodTicks)||c.halfPeriodTicks<=0||
           !Number.isInteger(c.holdTicks??0)||(c.holdTicks??0)<0||
           !Number.isInteger(c.startDelayTicks??0)||(c.startDelayTicks??0)<0)
          fail('invalid tide period');
      }else if(c.kind==='valve'){
        if(!(c.ratePerTick>0)||!['fill','drain','hold'].includes(c.initial))
          fail('invalid valve controller');
      }else fail('unknown water controller');
    }
    for(const v of spec.valves){
      needs('waterControllers',v.controller);
      if(!Array.isArray(v.at)||v.at.length!==2||v.at.some(n=>!Number.isFinite(n))||
         !(v.reach>0)||!v.modes?.length)fail('invalid valve '+v.id);
    }
    for(const release of spec.releases??[])
      if(!Array.isArray(release.at)||release.at.length!==2||
         release.at.some(n=>!Number.isFinite(n))||!(release.reach>0))
        fail('invalid release '+release.id);
    for(const wall of spec.obstacles??[])
      if(!(wall.left>=0&&wall.right<=spec.width&&wall.left<wall.right&&
           wall.top>=0&&wall.bottom<spec.height&&wall.top<wall.bottom))
        fail('invalid obstacle '+wall.id);
    needs('releases',spec.waterwheel.release);
    if(!Number.isInteger(spec.waterwheel.chargeTicks)||
       spec.waterwheel.chargeTicks<=0)fail('invalid wheel charge');
    for(const b of spec.buoyantObjects)needs('waterVolumes',b.volume);
    for(const p of spec.pressurePlates){needs('buoyantObjects',p.requires);needs('gates',p.opens)}
    for(const g of spec.gates)if(g.opensWhen!==spec.waterwheel.id)
      needs('pressurePlates',g.opensWhen);
    for(const c of spec.currents)needs('waterVolumes',c.volume);
    needs('waterControllers',spec.waterwheel.upstream);
    for(const platform of spec.linkedPlatforms??[]){
      if(platform.enabledWhen!==spec.waterwheel.id||
         platform.home[0]*16-platform.size[0]/2<0||
         platform.home[0]*16+platform.size[0]/2>spec.width*16||
         platform.size[0]<=0||platform.size[1]<=0)
        fail('invalid wheel-linked platform '+platform.id);
      if(platform.readyWhenSurface){
        needs('waterVolumes',platform.readyWhenSurface.volume);
        const volume=named.waterVolumes.get(platform.readyWhenSurface.volume);
        if(!Number.isFinite(platform.readyWhenSurface.atMost)||
           platform.readyWhenSurface.atMost<volume.maxSurface||
           platform.readyWhenSurface.atMost>volume.minSurface)
          fail('invalid bridge readiness level '+platform.id);
      }
    }
  }
  if(spec.lightSources){
    for(const control of [...spec.mirrors,...spec.shutters]){
      if(!Array.isArray(control.controlAt)||
         control.controlAt.length!==2||
         control.controlAt.some((n,i)=>!Number.isFinite(n)||
           n<0||n>=(i===0?spec.width:spec.height))||
         !(control.reach>0))
        fail('invalid reachable optical control '+control.id);
    }
    for(const m of spec.mirrors){
      if(!m.angles.includes(m.initial)||m.angles.some(a=>!Number.isFinite(a)))
        fail('invalid mirror detents');
    }
    for(const s of spec.shutters)if(!s.states.includes(s.initial))
      fail('invalid shutter state');
    for(const o of spec.occluders)
      if(!Number.isInteger(o.periodTicks)||o.periodTicks<=0)fail('invalid occluder');
    for(const t of spec.beamTargets){
      needs('lightSources',t.source);
      if(t.store!==undefined&&typeof t.store!=='boolean')
        fail('invalid receiver storage '+t.id);
      // Each staged receiver must name an earlier receiver: no cyclic
      // prerequisites or ambiguous within-tick charge order.
      for(const required of t.requiresCharged??[]){
        needs('beamTargets',required);
        if(spec.beamTargets.indexOf(named.beamTargets.get(required))>=
           spec.beamTargets.indexOf(t))
          fail('invalid receiver charging order '+t.id);
      }
      if(t.chargeTicks!==undefined&&
         (!Number.isInteger(t.chargeTicks)||t.chargeTicks<1))
        fail('invalid receiver charge time '+t.id);
    }
    for(const gate of spec.beamGates??[]){
      needs('beamTargets',gate.target);
      const [x,y]=gate.at,[width,height]=gate.size;
      if(!(width>0&&height>0&&x*16-width/2>=0&&
           x*16+width/2<=spec.width*16&&y>=0&&
           y*16+height<=spec.height*16))
        fail('invalid optical gate geometry '+gate.id);
    }
    for(const p of spec.phasePlatforms){
      needs('beamTargets',p.target);
      if(!['lit','shadow'].includes(p.rule)||
         !Number.isInteger(p.previewTicks)||p.previewTicks<=0||
         !Number.isInteger(p.buildDelayTicks??0)||(p.buildDelayTicks??0)<0)
        fail('invalid phase platform');
    }
    if(spec.id==='mirror-palace'){
      if(!Array.isArray(spec.controlStations)||spec.controlStations.length!==6)
        fail('the Palace needs six separate visible optical stations');
      const names=new Set();
      for(const station of spec.controlStations){
        if(names.has(station.id))fail('duplicate station id');
        names.add(station.id);
        const mechanism=(station.kind==='mirror'?spec.mirrors:spec.shutters)
          .find(control=>control.id===station.control);
        if(!['mirror','shutter'].includes(station.kind)||!station.color||
           !Array.isArray(station.at)||station.at.length!==2||
           station.at.some((n,i)=>!Number.isFinite(n)||n<0||
             n>=(i===0?spec.width:spec.height))||!mechanism)
          fail('invalid optical station '+station.id);
        // A device is its own control; separate remote dials make the
        // causality opaque. Curtains are grabbed on their lower rail.
        if(station.at.some((n,i)=>n!==mechanism.controlAt[i])||
           (station.kind==='mirror'&&
             station.at.some((n,i)=>n!==mechanism.at[i]))||
           (station.kind==='shutter'&&
             (station.at[0]!==mechanism.to[0]||
              Math.abs(station.at[1]-mechanism.to[1])>1)))
          fail('remote optical control '+station.id);
      }
      for(const c of [...spec.mirrors,...spec.shutters])
        if(!spec.controlStations.some(s=>s.control===c.id))
          fail('optical control has no station: '+c.id);
      for(const platform of spec.phasePlatforms)
        needs('beamTargets',platform.target);
    }
    if(spec.circuitSwitches){
      if(spec.circuitSwitches.length!==3)
        fail('the redesigned Palace needs three room relays');
      if(new Set(spec.circuitSwitches.map(s=>s.id)).size!==3)
        fail('repeated Palace circuit relay');
      for(const relay of spec.circuitSwitches){
        needs('beamTargets',relay.target);
        if(!['blue','pink','gold'].includes(relay.color)||!relay.at||
          relay.at.some((n,i)=>!Number.isFinite(n)||n<0||
            n>=(i===0?spec.width:spec.height)))
          fail('invalid relay position or color');
        for(const id of relay.platforms)
          if(!spec.phasePlatforms.some(p=>p.id===id&&p.target===relay.target))
            fail('relay platform does not match light target: '+id);
        if(!spec.beamGates.some(g=>g.id===relay.gate&&g.target===relay.target))
          fail('relay gate does not match light target: '+relay.gate);
      }
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
