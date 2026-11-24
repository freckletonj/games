// Runtime water and independent painted mechanism cutouts for the Temple.
import {templeShoreBounds,templeWaterMaskBounds} from './temple-shoreline.js';
// The mask follows the exact dynamic volume height and compiled ground, not
// any waterline inferred from a static background painting.
const TILE=16;

export function templeWaterColumns(world,groundAt,pitch=8){
  const strips=[];
  for(const basin of world.waterBodies){
    const {left,right,y}=templeShoreBounds(basin,groundAt);
    for(let x=left;x<right;x+=pitch){
      const width=Math.min(pitch,right-x);
      const bottom=groundAt(x+width/2);
      if(bottom>y)strips.push({x,y,width,height:bottom-y});
    }
  }
  return strips;
}

export function createTempleScene(scene,spec,world,approved){
  const texture=id=>'deck-'+scene.chapter.id+'-'+id;
  const makeVisual=(id,x,y,width,height,depth,color,originY=0)=>{
    if(approved?.platforms?.[id])
      return scene.add.image(x,y,texture(id)).setOrigin(.5,originY)
        .setDisplaySize(width,height).setDepth(depth);
    return scene.add.rectangle(x,y,width,height,color,.95)
      .setOrigin(.5,originY).setDepth(depth);
  };
  // The geometry-first graybox remains available when Temple art is absent.
  // Approved static rock and shelves are rendered by paintScene instead.
  const graybox=approved?null:scene.add.graphics().setDepth(-31);
  if(graybox){
    graybox.fillStyle(0x435c65);
    for(let x=0;x<spec.width*TILE;x+=8){
      const ground=scene.groundAt(x+4);
      graybox.fillRect(x,ground,8,scene.worldH-ground);
    }
    // The one-way shelves have visible thickness; thin guide lines looked
    // like arbitrary floating collision geometry in the graybox.
    graybox.fillStyle(0xbdad8b,1);
    graybox.lineStyle(2,0xe6d3a8,1);
    for(const [x,y,length] of spec.ledges){
      graybox.fillRect(x*TILE,y*TILE,length*TILE,14);
      graybox.lineBetween(x*TILE,y*TILE,(x+length)*TILE,y*TILE);
    }
  }
  const objects={};
  for(const deck of world.decks){
    deck.visual=makeVisual(deck.id,...deck.position,
      ...deck.size,-19,deck.kind==='raft'?0xd4a96e:0xc7b7a0);
  }
  for(const crate of world.crates)
    crate.visual=makeVisual(crate.id,crate.x,crate.y,
      ...crate.size,-18,0xc38b56);
  for(const valve of spec.valves){
    objects[valve.id]=makeVisual(valve.id,valve.at[0]*TILE,
      valve.at[1]*TILE,36,36,-17,0xeab864,.5);
  }
  for(const release of spec.releases)
    objects[release.id]=makeVisual(release.id,release.at[0]*TILE,
      release.at[1]*TILE,38,38,-17,0xe2b9a0,.5);
  for(const gate of spec.gates){
    // Gate physics extend through the solid rock, but only the open doorway
    // above the terrain should be painted. A 35-tile strip was misleading.
    const x=gate.at[0]*TILE,top=gate.at[1]*TILE;
    const opening=Math.max(0,Math.min(gate.size[1],scene.groundAt(x)-top));
    objects[gate.id]=makeVisual(gate.id,x,top,
      gate.size[0],opening,-18,0x9b9d92);
  }
  const wheel=spec.waterwheel;
  objects[wheel.id]=makeVisual(wheel.id,wheel.at[0]*TILE,
    wheel.at[1]*TILE,wheel.radius*2,wheel.radius*2,-17,0x8fbbb6,.5);
  const guide=scene.add.graphics().setDepth(-16);
  const wheelLabel=scene.add.text(
    wheel.at[0]*TILE+80,wheel.at[1]*TILE-wheel.radius-100,
    'WHEEL → BRIDGE',{
      fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',
      color:'#fff4c1',backgroundColor:'#153746d9',padding:{x:7,y:5}
    }).setOrigin(.5,1).setDepth(39);
  const bridge=spec.linkedPlatforms.at(-1);
  const bridgeLabel=scene.add.text(bridge.home[0]*TILE,
    bridge.home[1]*TILE-36,'BRIDGE OFF · ACTIVATE WATERWHEEL',{
      fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',
      color:'#ffe3a1',backgroundColor:'#293a4bdd',padding:{x:6,y:5}
    }).setOrigin(.5,1).setDepth(39);

  const tideLabel=scene.add.text(43*TILE,38*TILE-70,'',{
    fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',
    color:'#e6faff',backgroundColor:'#173541dd',padding:{x:7,y:5}
    }).setOrigin(.5,1).setDepth(39);
  const tailLabel=scene.add.text(197*TILE,38*TILE-95,'',{
    fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',
    color:'#fff0c2',backgroundColor:'#173541dd',padding:{x:7,y:5}
    }).setOrigin(.5,1).setDepth(39);
  const structures=scene.add.graphics().setDepth(-17);
  // Authored walls are already part of the compiler-masked painted solid.
  // The old flat gray fill is only for art-free testing, never over painting.
  if(!approved)for(const wall of spec.obstacles??[]){
    structures.fillStyle(0x6e7d83,1);
    structures.fillRect(wall.left*TILE,wall.top*TILE,
      (wall.right-wall.left)*TILE,(wall.bottom-wall.top)*TILE);
  }
  for(const plate of spec.pressurePlates){
    structures.fillStyle(0xeac47e,1);
    structures.fillRect(plate.at[0]*TILE-plate.radius,plate.at[1]*TILE-5,
      plate.radius*2,5);
  }
  const socketLabel=scene.add.text(
    spec.pressurePlates[0].at[0]*TILE,49*TILE,
    '↓  LOWER CRATE ON SOCKET',{
      fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',
      color:'#ffe6a1',backgroundColor:'#173541e8',padding:{x:7,y:5}
    }).setOrigin(.5,1).setDepth(39);
  const sluiceLabel=scene.add.text(
    spec.gates[0].at[0]*TILE,39*TILE-45,
    'SLUICE LOCKED · CRATE → SOCKET',{
      fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',
      color:'#fff0c2',backgroundColor:'#3c3033e8',padding:{x:7,y:5}
    }).setOrigin(.5,1).setDepth(39);
  const controlLabels=[
    ...spec.valves.map(valve=>scene.add.text(valve.at[0]*TILE,
      valve.at[1]*TILE-33,'↑  '+valve.id.replaceAll('-', ' '),{
        fontFamily:'system-ui',fontSize:'11px',color:'#fff3c4',
        backgroundColor:'#173541d9',padding:{x:5,y:3}
      }).setOrigin(.5,1).setDepth(38)),
    ...spec.releases.map(release=>scene.add.text(release.at[0]*TILE,
      release.at[1]*TILE-34,'↑  Release cascade',{
        fontFamily:'system-ui',fontSize:'11px',color:'#fff3c4',
        backgroundColor:'#173541d9',padding:{x:5,y:3}
      }).setOrigin(.5,1).setDepth(38))
  ];
  // Each basin has its own static terrain-shaped mask. The water itself is
  // a full-depth translucent rectangle whose top follows the live surface.
  // Neither the mask nor the rectangle depends on drawing new bank polygons
  // each simulation tick.
  const waterFills=spec.waterVolumes.map(volume=>{
    const {left,right,y}=templeWaterMaskBounds(volume,x=>scene.groundAt(x));
    const shape=scene.add.graphics().setVisible(false);
    shape.fillStyle(0xffffff).beginPath().moveTo(left,y).lineTo(right,y);
    for(let x=right;x>left;x-=4)
      shape.lineTo(x,Math.max(y,scene.groundAt(x)));
    shape.lineTo(left,y).closePath().fillPath();
    const water=scene.add.rectangle(left,volume.startSurface*TILE,
      right-left,scene.worldH-volume.startSurface*TILE,0x2a9ab4,.54)
      .setOrigin(0,0).setDepth(-29);
    water.setMask(shape.createGeometryMask());
    return {id:volume.id,water,left,right};
  });
  return {waterFills,waterline:scene.add.graphics().setDepth(-28),
    guide,labels:{wheelLabel,bridgeLabel,tideLabel,tailLabel,controlLabels,
      socketLabel,sluiceLabel},structures,graybox,
    debug:scene.add.graphics().setDepth(102),objects};
}

export function drawTempleScene(art,spec,world,groundAt,showOverlay=false){
  const strips=templeWaterColumns(world,groundAt);
  // Update only the surface of each independent water layer. Its fixed
  // shoreline mask clips the full-height fill to the actual basin walls.
  for(const fill of art.waterFills){
    const basin=world.waterBodies.find(b=>b.id===fill.id);
    const y=basin.surface*TILE;
    fill.water.setPosition(fill.left,y)
      .setSize(fill.right-fill.left,spec.height*TILE-y);
  }
  art.waterline.clear().lineStyle(2,0x8ad6d8,.8);
  for(const basin of world.waterBodies){
    const {left,right,y}=templeShoreBounds(basin,groundAt);
    art.waterline.lineBetween(left,y,right,y);
  }
  for(const deck of world.decks)
    deck.visual?.setPosition(...deck.position).setVisible(deck.enabled!==false);
  for(const crate of world.crates)
    crate.visual?.setPosition(crate.x,crate.y);
  for(const [index,valve] of spec.valves.entries()){
    const mode=world.state.modes[valve.controller];
    const next=valve.modes[(valve.modes.indexOf(mode)+1)%valve.modes.length];
    const angle={drain:-.5,hold:0,fill:.5}[mode];
    art.objects[valve.id].setRotation(angle);
    art.labels.controlLabels[index].setText(
      '↑ '+valve.id.replaceAll('-', ' ').toUpperCase()+
      ' · '+mode.toUpperCase()+' (next '+next.toUpperCase()+')');
  }
  for(const [index,release] of spec.releases.entries()){
    art.objects[release.id].setRotation(world.state.released?.65:-.65);
    art.labels.controlLabels[spec.valves.length+index].setText(
      world.state.released?'CASCADE RELEASED ✓':'↑ RELEASE CASCADE');
  }
  const tide=spec.waterControllers.find(c=>c.id==='courtyard-tide');
  const elapsed=Math.max(0,world.state.tick-(tide.startDelayTicks??0));
  const phase=elapsed%(2*(tide.halfPeriodTicks+(tide.holdTicks??0)));
  const tideStatus=world.state.tick<=(tide.startDelayTicks??0)?'LOW · BOARD RAFT':
    phase<tide.halfPeriodTicks?'RISING':
    phase<tide.halfPeriodTicks+(tide.holdTicks??0)?'HIGH · JUMP TO DOCK':
    phase<2*tide.halfPeriodTicks+(tide.holdTicks??0)?'FALLING':
      'LOW · BOARD RAFT';
  const courtyard=spec.waterVolumes.find(v=>v.id==='courtyard');
  const tideFraction=(courtyard.minSurface-world.state.surfaces.courtyard)/
    (courtyard.minSurface-courtyard.maxSurface);
  art.labels.tideLabel.setText(
    'TIDE '+tideStatus+' · '+Math.round(tideFraction*100)+'%');
  for(const gate of spec.gates)
    art.objects[gate.id].setVisible(!world.state.gates[gate.id]);
  const plateActive=world.state.plates[spec.pressurePlates[0].id];
  const crate=world.crates.find(c=>c.id===spec.pressurePlates[0].requires);
  const socketX=spec.pressurePlates[0].at[0]*TILE;
  art.labels.socketLabel.setText(plateActive?'SOCKET LATCHED ✓':
    Math.abs(crate.x-socketX)<=spec.pressurePlates[0].radius?
      'CRATE ALIGNED ✓ · NOW DRAIN':'SOCKET · PUSH CRATE HERE →');
  art.labels.sluiceLabel.setText(plateActive?
    world.state.surfaces.sluice<=45.1?'SLUICE OPEN ✓':
      'SLUICE OPEN ✓ · BASIN REFILLING':
    'SLUICE LOCKED · CRATE → SOCKET');
  art.objects[spec.waterwheel.id].setRotation(world.state.wheelAngle);
  // The wheel turns an actual gate/bridge but is not itself a blocking
  // collider. Open spokes and a mechanism label distinguish it from a wall.
  const wheel=spec.waterwheel,wx=wheel.at[0]*TILE,wy=wheel.at[1]*TILE;
  const active=world.state.wheelActive;
  art.guide.clear();
  const plate=spec.pressurePlates[0],gate=spec.gates[0];
  art.guide.lineStyle(3,plateActive?0xb4e5b1:0xe6bf81,.8)
    .lineBetween(plate.at[0]*TILE,plate.at[1]*TILE-5,
      gate.at[0]*TILE,39*TILE);
  art.guide.lineStyle(4,active?0xffda79:0xa5dae2,.9)
    .strokeCircle(wx,wy,wheel.radius);
  for(let index=0;index<8;index++){
    const angle=world.state.wheelAngle+index*Math.PI/4;
    art.guide.lineStyle(4,active?0xffda79:0xa5dae2,.75)
      .lineBetween(wx,wy,wx+Math.cos(angle)*wheel.radius,
        wy+Math.sin(angle)*wheel.radius);
  }
  art.guide.fillStyle(0x173e4a,.8).fillCircle(wx,wy,10);
  // Preview the exact final bridge without pretending it is collidable yet.
  if(!active){
    art.guide.lineStyle(2,0xffd18b,.6);
    for(const bridge of spec.linkedPlatforms){
      const bx=bridge.home[0]*TILE,by=bridge.home[1]*TILE;
      const [width]=bridge.size;
      for(let x=bx-width/2;x<bx+width/2;x+=18)
        art.guide.lineBetween(x,by,Math.min(x+10,bx+width/2),by);
    }
  }
  const head=spec.waterControllers.find(c=>c.id===wheel.upstream);
  const headReady=world.state.surfaces[head.volume]<=wheel.engageSurface;
  const lastBridge=world.decks.find(d=>d.id===spec.linkedPlatforms.at(-1).id);
  const tail=spec.waterVolumes.find(v=>v.id==='wheel-tail');
  const tailFraction=(tail.minSurface-world.state.surfaces[tail.id])/
    (tail.minSurface-tail.maxSurface);
  art.labels.wheelLabel.setText(active?'WHEEL LATCHED ✓':
    !world.state.released?'WHEEL OFF · FILL THEN RELEASE':
    !headReady?'RELEASE SET · FILL THE HEAD':
      'WHEEL CHARGING · '+Math.round(100*world.state.chargeTicks/wheel.chargeTicks)+'%');
  art.labels.bridgeLabel.setText(lastBridge.enabled?
    'BRIDGE B SOLID ✓':active?'BRIDGE A ON · B WAITING':'BRIDGES OFF');
  art.labels.tailLabel.setText(lastBridge.enabled?
    'TAIL RAFT HIGH ✓ · JUMP TO BRIDGE B':
    active?'TAIL RAFT RISING · '+Math.round(tailFraction*100)+'%':
      'TAIL RAFT LOW · POWER THE WHEEL');
  art.debug.clear();
  if(showOverlay){
    art.debug.fillStyle(0x20c0ec,.36);
    for(const strip of strips)
      art.debug.fillRect(strip.x,strip.y,strip.width,strip.height);
    art.debug.lineStyle(2,0x5bf5e8,.95);
    for(const basin of world.waterBodies){
      const {left,right,y}=templeShoreBounds(basin,groundAt);
      art.debug.lineBetween(left,y,right,y);
    }
    art.debug.lineStyle(2,0xffd28d,.96);
    for(const deck of world.decks){
      if(deck.enabled===false)continue;
      art.debug.lineBetween(deck.position[0]-deck.size[0]/2,
        deck.position[1],deck.position[0]+deck.size[0]/2,
        deck.position[1]);
    }
    for(const crate of world.crates)
      art.debug.strokeRect(crate.x-crate.size[0]/2,crate.y,...crate.size);
    art.debug.fillStyle(0x9772b7,.36).lineStyle(2,0xb9a6dc,.98);
    for(const wall of spec.obstacles??[]){
      const x=wall.left*TILE,y=wall.top*TILE;
      const width=(wall.right-wall.left)*TILE;
      const height=(wall.bottom-wall.top)*TILE;
      art.debug.fillRect(x,y,width,height);
      art.debug.strokeRect(x,y,width,height);
    }
    art.debug.lineStyle(2,0xeed18b,.98);
    for(const plate of spec.pressurePlates)
      art.debug.lineBetween(plate.at[0]*TILE-plate.radius,
        plate.at[1]*TILE,plate.at[0]*TILE+plate.radius,plate.at[1]*TILE);
    for(const gate of spec.gates){
      if(world.state.gates[gate.id])continue;
      const x=gate.at[0]*TILE,top=gate.at[1]*TILE;
      const opening=Math.max(0,Math.min(gate.size[1],groundAt(x)-top));
      art.debug.strokeRect(x-gate.size[0]/2,top,gate.size[0],opening);
    }
  }
}
