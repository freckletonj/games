// Mirror Palace graybox. All path, receiver and platform colors come from
// the deterministic optics solver; nothing painted changes collision.
const TILE=16;
const COLORS={blue:0x6adfff,pink:0xff97d3,gold:0xffdf84};
const hex=color=>'#'+color.toString(16).padStart(6,'0');
const sourceColor=id=>id==='atrium-sun'?COLORS.blue:
  id==='gallery-lantern'?COLORS.pink:COLORS.gold;

export function createPalaceScene(scene,spec){
  const graphics=scene.add.graphics().setDepth(20);
  const labels={};
  for(const station of spec.controlStations){
    const [x,y]=station.at.map(n=>n*TILE),color=COLORS[station.color];
    const label=scene.add.text(x,y-(station.labelOffsetY??44),'',{
      fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',
      color:hex(color),backgroundColor:'#14293dee',padding:{x:6,y:4}
    }).setOrigin(.5,1).setDepth(45);
    labels[station.id]=label;
  }
  const status={};
  for(const target of spec.beamTargets){
    const [x,y]=target.at.map(n=>n*TILE);
    const color=sourceColor(target.source);
    status[target.id]=scene.add.text(x,y-31,'RECEIVER DARK',{
      fontFamily:'system-ui',fontSize:'11px',fontStyle:'bold',
      color:hex(color),backgroundColor:'#14293ddd',padding:{x:5,y:4}
    }).setOrigin(.5,1).setDepth(45);
  }
  return {graphics,labels,status,groundAt:x=>scene.groundAt(x)};
}

export function drawPalaceScene(art,spec,world){
  const g=art.graphics,state=world.state;
  g.clear();
  const lit=state.light?.lit??[];
  const segments=state.light?.segments??[];
  // Show the actual bounced beam, not a fabricated station-to-bridge line.
  for(const segment of segments){
    g.lineStyle(4,sourceColor(segment.source),.88);
    g.lineBetween(...segment.from,...segment.to);
    g.fillStyle(sourceColor(segment.source),.92);
    g.fillCircle(...segment.to,3);
  }
  for(const mirror of spec.mirrors){
    const x=mirror.at[0]*TILE,y=mirror.at[1]*TILE;
    const angle=state.mirrors[mirror.id]*Math.PI/180;
    const length=15;
    g.lineStyle(5,0xe2d9ca,1);
    g.lineBetween(x-Math.cos(angle)*length,y-Math.sin(angle)*length,
      x+Math.cos(angle)*length,y+Math.sin(angle)*length);
    g.lineStyle(1,0x263d4d,1).strokeCircle(x,y,17);
  }
  for(const shutter of spec.shutters){
    const closed=state.shutters[shutter.id]==='closed';
    const [ax,ay]=shutter.from.map(n=>n*TILE);
    const [bx,by]=shutter.to.map(n=>n*TILE);
    g.lineStyle(5,closed?0xf1a96e:0x749a88,closed?1:.38);
    if(closed)g.lineBetween(ax,ay,bx,by);
    else g.strokeCircle(ax,ay,8);
  }
  for(const occluder of spec.occluders){
    const tick=state.tick;
    const phase=2*Math.PI*((tick+occluder.phaseTicks)%occluder.periodTicks)/
      occluder.periodTicks;
    const [cx,cy]=occluder.orbit.map(n=>n*TILE);
    const x=cx+occluder.orbitRadius*TILE*Math.cos(phase);
    const y=cy+occluder.orbitRadius*TILE*Math.sin(phase);
    g.fillStyle(0x28394b,.9).fillCircle(x,y,occluder.radius*TILE);
    g.lineStyle(2,0xb3b8cb,.75).strokeCircle(x,y,occluder.radius*TILE);
  }
  for(const source of spec.lightSources){
    const [x,y]=source.at.map(n=>n*TILE);
    g.fillStyle(sourceColor(source.id),.9).fillCircle(x,y,10);
    g.lineStyle(2,0xffffff,.8).strokeCircle(x,y,11);
  }
  for(const target of spec.beamTargets){
    const [x,y]=target.at.map(n=>n*TILE);
    const on=lit.includes(target.id),stored=Boolean(state.charged[target.id]);
    const color=sourceColor(target.source);
    const total=spec.phasePlatforms.filter(p=>p.target===target.id).length;
    const solid=spec.phasePlatforms.filter(p=>p.target===target.id&&
      state.platforms[p.id].solid).length;
    const charge=state.chargeTicks[target.id]??0;
    const required=target.chargeTicks??1;
    g.fillStyle(on||stored?color:0x233c4c,on?1:stored?.65:.95)
      .fillCircle(x,y,12);
    g.lineStyle(4,color,on||stored?1:.55).strokeCircle(x,y,16);
    art.status[target.id].setText(stored?
      solid===total?'LIGHT STORED ✓ · CROSS':
        'CRYSTALS FORMING '+solid+'/'+total:
      required>1&&charge>0?
        'CAPACITOR '+Math.round(100*charge/required)+'%'+
          (on?' · CHARGING':' · SHADOW'):
      on?'RECEIVER LIT':'RECEIVER DARK');
  }
  for(const station of spec.controlStations){
    const [x,y]=station.at.map(n=>n*TILE),color=COLORS[station.color];
    const mechanism=(station.kind==='mirror'?spec.mirrors:spec.shutters)
      .find(item=>item.id===station.control);
    const options=station.kind==='mirror'?mechanism.angles:mechanism.states;
    const current=station.kind==='mirror'?
      state.mirrors[station.control]:state.shutters[station.control];
    const next=options[(options.indexOf(current)+1)%options.length];
    const format=value=>station.kind==='mirror'?value+'°':value.toUpperCase();
    g.fillStyle(0x162f40,1).fillCircle(x,y-15,16);
    g.lineStyle(4,color,1).strokeCircle(x,y-15,16);
    g.lineStyle(2,0xffffff,.9).lineBetween(x-7,y-15,x+7,y-15);
    art.labels[station.id].setText(
      '↑ / ORB · '+(station.label??station.control.toUpperCase())+
      ' · '+format(current)+' → '+format(next));
  }
  for(const platform of spec.phasePlatforms){
    const [x,y]=platform.home.map(n=>n*TILE);
    const [width,height]=platform.size;
    const solid=state.platforms[platform.id].solid;
    const forming=state.platforms[platform.id].pending!==null;
    const color=platform.target==='atrium-target'?COLORS.blue:
      platform.target==='gallery-target'?COLORS.pink:COLORS.gold;
    g.fillStyle(color,solid?.8:forming?.27:.06)
      .fillRect(x-width/2,y,width,height);
    g.lineStyle(solid?4:2,color,solid?1:forming?.7:.35)
      .strokeRect(x-width/2,y,width,height);
    // Tick marks distinguish a solid bridge from a purely projected one.
    if(solid)for(let px=x-width/2+10;px<x+width/2;px+=28)
      g.lineStyle(2,0xffffff,.55).lineBetween(px,y,px+9,y);
  }
  for(const gate of spec.beamGates){
    if(state.gates[gate.id])continue;
    const [x,y]=gate.at.map(n=>n*TILE);
    const visible=Math.max(0,Math.min(gate.size[1],art.groundAt(x)-y));
    g.fillStyle(0xc74f68,.18)
      .fillRect(x-gate.size[0]/2,y,gate.size[0],visible);
    g.lineStyle(4,0xff8d99,.92)
      .strokeRect(x-gate.size[0]/2,y,gate.size[0],visible);
  }
}
