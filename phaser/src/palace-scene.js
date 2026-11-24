// Unpainted optical instruments: the actual 60 Hz beam path and physical
// receivers are the puzzle language. No floating solution instructions.
const TILE=16;
const COLORS={blue:0x6adfff,pink:0xff97d3,gold:0xffdf84};
const toPoint=at=>at.map(n=>n*TILE);
const sourceColor=id=>id==='atrium-sun'?COLORS.blue:
  id==='gallery-lantern'?COLORS.pink:COLORS.gold;

// Thin receiver-to-bridge links, deliberately unlike a live laser ray.
function receiverLink(g,from,to,color){
  const length=Math.hypot(to[0]-from[0],to[1]-from[1]);
  g.fillStyle(color,.43);
  for(let distance=8;distance<length-8;distance+=13){
    const t=distance/length;
    g.fillCircle(from[0]+(to[0]-from[0])*t,
      from[1]+(to[1]-from[1])*t,1.5);
  }
}

export function createPalaceScene(scene,spec){
  const graphics=scene.add.graphics().setDepth(20);
  const prompt=scene.add.text(0,0,'↑',{
    fontFamily:'system-ui',fontSize:'17px',fontStyle:'bold',
    color:'#ffffff',backgroundColor:'#173345cc',padding:{x:7,y:2}
  }).setOrigin(.5,1).setDepth(45).setVisible(false);
  return {graphics,prompt,groundAt:x=>scene.groundAt(x)};
}

export function drawPalaceScene(art,spec,world,players=[]){
  const g=art.graphics,state=world.state;
  g.clear();
  const lit=state.light?.lit??[];
  const segments=state.light?.segments??[];
  const targetColor=id=>sourceColor(spec.beamTargets.find(t=>t.id===id).source);

  // Show destinations even before solving: crystal decks remain ghosted,
  // and receiver-to-bridge links brighten as the receiver stores energy.
  for(const target of spec.beamTargets){
    const platforms=spec.phasePlatforms.filter(p=>p.target===target.id);
    const [tx,ty]=toPoint(target.at);
    const first=platforms[0];
    if(first){
      const color=targetColor(target.id);
      const [px,py]=toPoint(first.home);
      receiverLink(g,[tx,ty],[px,py],color);
      if(state.charged[target.id]){
        g.fillStyle(color,.92).fillCircle(px,py,4);
        g.fillStyle(color,.8).fillCircle(tx,ty,5);
      }
    }
  }

  // A dotted energy conduit makes the gold prism's two-stage requirement
  // legible without floating instructions. It only glows after the low
  // receiver has been primed, and cannot be mistaken for a laser segment.
  for(const target of spec.beamTargets){
    for(const prerequisite of target.requiresCharged??[]){
      const source=spec.beamTargets.find(t=>t.id===prerequisite);
      receiverLink(g,toPoint(source.at),toPoint(target.at),
        state.charged[prerequisite]?COLORS.gold:0x637c90);
    }
  }

  // Actual collision-aware ray trace. When wrong, the illuminated endpoint
  // visibly stops at the obstructing rock, mirror, shutter or eclipse disc.
  for(const segment of segments){
    const color=sourceColor(segment.source);
    g.lineStyle(12,color,.13).lineBetween(...segment.from,...segment.to);
    g.lineStyle(4,color,.98).lineBetween(...segment.from,...segment.to);
    g.fillStyle(color,1).fillCircle(...segment.to,4);
  }
  for(const mirror of spec.mirrors){
    const [x,y]=toPoint(mirror.at);
    const angle=state.mirrors[mirror.id]*Math.PI/180;
    const length=15;
    g.fillStyle(0x142c3d,.9).fillCircle(x,y,19);
    g.lineStyle(2,0xf1efde,.62).strokeCircle(x,y,19);
    g.lineStyle(5,0xf6f3e8,1).lineBetween(
      x-Math.cos(angle)*length,y-Math.sin(angle)*length,
      x+Math.cos(angle)*length,y+Math.sin(angle)*length);
    g.fillStyle(0xffffff,1).fillCircle(x,y,3);
  }
  for(const shutter of spec.shutters){
    const closed=state.shutters[shutter.id]==='closed';
    const [ax,ay]=toPoint(shutter.from);
    const [bx,by]=toPoint(shutter.to);
    g.lineStyle(6,closed?0xffa16e:0x7ff6c6,closed?1:.7);
    if(closed)g.lineBetween(ax,ay,bx,by);
    else{
      // The raised curtain stays visibly attached to its upper rail.
      g.lineBetween(ax,ay,ax+22,ay-17);
      g.lineStyle(2,0x7ff6c6,.7).strokeCircle(ax,ay,9);
    }
    // The control grip belongs to this same curtain at the reachable foot.
    const [hx,hy]=toPoint(shutter.controlAt);
    g.fillStyle(0x172c39,1).fillCircle(hx,hy,10);
    g.lineStyle(3,closed?0xffa16e:0x7ff6c6,1).strokeCircle(hx,hy,10);
    g.lineStyle(3,0xffffff,.9).lineBetween(hx-4,hy,hx+4,hy);
  }
  for(const occluder of spec.occluders){
    const phase=2*Math.PI*((state.tick+occluder.phaseTicks)%
      occluder.periodTicks)/occluder.periodTicks;
    const [cx,cy]=toPoint(occluder.orbit);
    const x=cx+occluder.orbitRadius*TILE*Math.cos(phase);
    const y=cy+occluder.orbitRadius*TILE*Math.sin(phase);
    g.fillStyle(0x28394b,.92).fillCircle(x,y,occluder.radius*TILE);
    g.lineStyle(2,0xb3b8cb,.85).strokeCircle(x,y,occluder.radius*TILE);
  }
  for(const source of spec.lightSources){
    const [x,y]=toPoint(source.at);
    const color=sourceColor(source.id);
    g.fillStyle(0x18384b,.98).fillCircle(x,y,13);
    g.lineStyle(3,color,.92).strokeCircle(x,y,12);
    g.lineStyle(3,0xffffff,.95).lineBetween(x-5,y,x+8,y);
    g.fillStyle(color,1).fillTriangle(x+13,y,x+5,y-5,x+5,y+5);
  }
  for(const target of spec.beamTargets){
    const [x,y]=toPoint(target.at);
    const stored=Boolean(state.charged[target.id]),on=lit.includes(target.id);
    const color=targetColor(target.id);
    const count=state.chargeTicks[target.id]??0,needed=target.chargeTicks??1;
    const progress=target.store===false?Number(on):stored?1:count/needed;
    g.fillStyle(stored||on?color:0x203746,.95).fillCircle(x,y,12);
    g.lineStyle(3,color,stored||on?1:.5).strokeCircle(x,y,17);
    // A moving radial capacitor gauge replaces all status instructions.
    g.lineStyle(5,color,.9).beginPath();
    g.arc(x,y,23,-Math.PI/2,-Math.PI/2+Math.PI*2*progress,false);
    g.strokePath();
    if(stored){
      g.fillStyle(0xffffff,.94).fillCircle(x,y,5);
      g.lineStyle(2,0xffffff,.55).strokeCircle(x,y,29);
    }
  }
  for(const platform of spec.phasePlatforms){
    const [x,y]=toPoint(platform.home);
    const [width,height]=platform.size;
    const solid=state.platforms[platform.id].solid;
    const forming=state.platforms[platform.id].pending!==null;
    const color=targetColor(platform.target);
    g.fillStyle(color,solid?.8:forming?.32:.15)
      .fillRect(x-width/2,y,width,height);
    g.lineStyle(solid?4:2,color,solid?1:forming?.8:.62)
      .strokeRect(x-width/2,y,width,height);
    if(solid)for(let px=x-width/2+10;px<x+width/2;px+=28)
      g.lineStyle(2,0xffffff,.55).lineBetween(px,y,px+9,y);
  }
  for(const gate of spec.beamGates){
    if(state.gates[gate.id])continue;
    const [x,y]=toPoint(gate.at);
    const visible=Math.max(0,Math.min(gate.size[1],art.groundAt(x)-y));
    const color=targetColor(gate.target);
    g.fillStyle(color,.13).fillRect(x-gate.size[0]/2,y,gate.size[0],visible);
    g.lineStyle(4,color,.88).strokeRect(
      x-gate.size[0]/2,y,gate.size[0],visible);
  }
  // One tiny input cue on the actual optic a human can touch. No proxy
  // controls, floating switches or circuit wires obscure the traced laser.
  const nearby=spec.controlStations.map(station=>({station,
    distance:Math.min(...players.filter(p=>!p.assist&&!p.sleep).map(p=>
      Math.hypot(p.x-station.at[0]*TILE,p.y-24-station.at[1]*TILE)))}))
    .filter(item=>item.distance<40).sort((a,b)=>a.distance-b.distance)[0];
  art.prompt.setVisible(Boolean(nearby));
  if(nearby)art.prompt.setPosition(
    nearby.station.at[0]*TILE,nearby.station.at[1]*TILE-30);
}
