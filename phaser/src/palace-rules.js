// Mirror Palace candidate: purely geometric, bounded, fixed-tick optics.
// World-space positions are derived from authored 16px cells, never painting.
const toPoint=at=>[at[0]*16,at[1]*16];
const radians=degrees=>degrees*Math.PI/180;

export function createPalaceState(spec){
  return {tick:0,
    mirrors:Object.fromEntries(spec.mirrors.map(m=>[m.id,m.initial])),
    shutters:Object.fromEntries(spec.shutters.map(s=>[s.id,s.initial])),
    charged:{},
    chargeTicks:Object.fromEntries(spec.beamTargets.map(target=>[target.id,0])),
    gates:Object.fromEntries((spec.beamGates??[]).map(g=>[g.id,false])), 
    platforms:Object.fromEntries(spec.phasePlatforms.map(p=>[p.id,{
      solid:p.rule==='shadow',pending:null,remaining:0
    }]))};
}
export function setMirrorDetent(spec,state,id,angle){
  const mirror=spec.mirrors.find(m=>m.id===id);
  if(!mirror||!mirror.angles.includes(angle))throw Error('Invalid mirror detent');
  return {...state,mirrors:{...state.mirrors,[id]:angle}};
}
export function setPalaceShutter(spec,state,id,position){
  const shutter=spec.shutters.find(s=>s.id===id);
  if(!shutter||!shutter.states.includes(position))throw Error('Invalid shutter state');
  return {...state,shutters:{...state.shutters,[id]:position}};
}

export function occluderPosition(occluder,tick){
  const phase=2*Math.PI*((tick+occluder.phaseTicks)%occluder.periodTicks)/
    occluder.periodTicks;
  const [x,y]=toPoint(occluder.orbit);
  return [x+occluder.orbitRadius*16*Math.cos(phase),
    y+occluder.orbitRadius*16*Math.sin(phase)];
}

function circleHit(origin,direction,point,radius){
  const dx=point[0]-origin[0],dy=point[1]-origin[1];
  const along=dx*direction[0]+dy*direction[1];
  const across=Math.abs(dx*direction[1]-dy*direction[0]);
  if(along<=.001||across>radius)return null;
  return along-Math.sqrt(radius*radius-across*across);
}

function shutterHit(origin,direction,shutter){
  const [start,end]=[shutter.from,shutter.to].map(toPoint);
  const [dx,dy]=direction;
  const sx=end[0]-start[0],sy=end[1]-start[1];
  const divisor=dx*sy-dy*sx;
  if(Math.abs(divisor)<1e-9)return null;
  const vx=start[0]-origin[0],vy=start[1]-origin[1];
  const distance=(vx*sy-vy*sx)/divisor;
  const fraction=(vx*dy-vy*dx)/divisor;
  return distance>.001&&fraction>=0&&fraction<=1?distance:null;
}

// Small, fixed world-space steps consult the very same compiled material
// predicate as collision and art masks. No painted highlight can transmit a
// ray through a wall; the result depends only on geometry and tick state.
function rockDistance(origin,direction,range,solidAt){
  if(!solidAt)return null;
  for(let along=4;along<=range;along+=4){
    if(!solidAt(origin[0]+direction[0]*along,
      origin[1]+direction[1]*along))continue;
    let clear=along-4,blocked=along;
    for(let i=0;i<10;i++){
      const middle=(clear+blocked)/2;
      if(solidAt(origin[0]+direction[0]*middle,
        origin[1]+direction[1]*middle))blocked=middle;
      else clear=middle;
    }
    return blocked;
  }
  return null;
}

export function tracePalaceBeams(spec,state,{solidAt=null}={}){
  const segments=[],lit=new Set();
  const maxBounces=spec.opticalRules.maxBounces;
  for(const source of spec.lightSources.filter(s=>s.enabled)){
    let origin=toPoint(source.at);
    let angle=radians(source.direction);
    let previous=null;
    for(let bounce=0;bounce<=maxBounces;bounce++){
      const direction=[Math.cos(angle),Math.sin(angle)];
      const hits=[];
      const rock=rockDistance(origin,direction,source.range*16,solidAt);
      if(rock!==null)hits.push({kind:'rock',id:null,distance:rock});
      const test=(kind,id,distance)=>{if(distance!==null&&distance>0)
        hits.push({kind,id,distance});};
      for(const mirror of spec.mirrors){
        if(mirror.id===previous)continue;
        test('mirror',mirror.id,circleHit(origin,direction,toPoint(mirror.at),7));
      }
      for(const target of spec.beamTargets.filter(t=>t.source===source.id))
        test('target',target.id,circleHit(origin,direction,toPoint(target.at),
          target.radius*16));
      for(const shutter of spec.shutters.filter(s=>state.shutters[s.id]==='closed'))
        test('shutter',shutter.id,shutterHit(origin,direction,shutter));
      for(const occluder of spec.occluders)
        test('occluder',occluder.id,circleHit(origin,direction,
          occluderPosition(occluder,state.tick),occluder.radius*16));
      const nearest=hits.filter(hit=>hit.distance<=source.range*16)
        .sort((a,b)=>a.distance-b.distance)[0];
      const distance=nearest?.distance??source.range*16;
      const end=[origin[0]+direction[0]*distance,
        origin[1]+direction[1]*distance];
      segments.push({source:source.id,from:origin,to:end,hit:nearest?.id??null});
      if(!nearest)break;
      if(nearest.kind==='target'){
        lit.add(nearest.id);
        origin=[end[0]+direction[0]*0.02,end[1]+direction[1]*0.02];
        previous=null;
        continue;
      }
      if(nearest.kind!=='mirror')break;
      angle=2*radians(state.mirrors[nearest.id])-angle;
      origin=[end[0]+Math.cos(angle)*0.02,end[1]+Math.sin(angle)*0.02];
      previous=nearest.id;
    }
  }
  return {segments,lit:[...lit].sort()};
}

export function stepPalace(spec,state,{occupiedPlatformIds=[],solidAt=null}={}){
  // Order: deterministic occluders and detents -> ray hits -> phase
  // telegraph -> solid collision flags -> scene drawing.
  const next={...state,tick:state.tick+1};
  const light=tracePalaceBeams(spec,next,{solidAt});
  const occupied=new Set(occupiedPlatformIds);
  // Receivers store light once genuinely solved. The early rooms latch on
  // the first correct ray, avoiding disappearing paths when someone explores
  // a dial later. The eclipse capacitor instead accumulates clean exposure
  // across shadow windows, so the moving occluder matters without an
  // arbitrary precision-timing penalty or loss of earned progress.
  const charged={...state.charged};
  const chargeTicks={...state.chargeTicks};
  for(const target of spec.beamTargets){
    if(charged[target.id]||!light.lit.includes(target.id)||
       !(target.requiresCharged??[]).every(id=>charged[id]))continue;
    chargeTicks[target.id]=Math.min(target.chargeTicks??1,
      (chargeTicks[target.id]??0)+1);
    if(chargeTicks[target.id]>=(target.chargeTicks??1))
      charged[target.id]=true;
  }
  const platforms={};
  for(const platform of spec.phasePlatforms){
    const current=state.platforms[platform.id];
    const illuminated=platform.latch?Boolean(charged[platform.target]):
      light.lit.includes(platform.target);
    const desired=platform.rule==='lit'?illuminated:!illuminated;
    if(desired===current.solid)
      platforms[platform.id]={solid:desired,pending:null,remaining:0};
    else if(current.pending!==desired)
      platforms[platform.id]={solid:current.solid,pending:desired,
        remaining:platform.previewTicks+(desired?(platform.buildDelayTicks??0):0)};
    else if(current.remaining>1)
      platforms[platform.id]={...current,remaining:current.remaining-1};
    else if(occupied.has(platform.id))
      platforms[platform.id]={...current,remaining:1};
    else
      platforms[platform.id]={solid:desired,pending:null,remaining:0};
  }
  const gates=Object.fromEntries((spec.beamGates??[]).map(g=>
    [g.id,Boolean(state.gates[g.id]||charged[g.target])]));
  return {...next,charged,chargeTicks,platforms,gates,light};
}
