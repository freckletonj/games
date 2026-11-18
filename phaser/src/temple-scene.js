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
  // The candidate chapter intentionally has no registered painting.
  // Build its physical ground and shelving directly from authored geometry.
  const graybox=approved?null:scene.add.graphics().setDepth(-31);
  if(graybox){
    graybox.fillStyle(0x435c65);
    for(let x=0;x<spec.width*TILE;x+=8){
      const ground=scene.groundAt(x+4);
      graybox.fillRect(x,ground,8,scene.worldH-ground);
    }
    graybox.lineStyle(4,0xd6bc86);
    for(const [x,y,length] of spec.ledges)
      graybox.lineBetween(x*TILE,y*TILE,(x+length)*TILE,y*TILE);
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
  for(const gate of spec.gates)
    objects[gate.id]=makeVisual(gate.id,gate.at[0]*TILE,gate.at[1]*TILE,
      ...gate.size,-18,0x986865);
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

  const structures=scene.add.graphics().setDepth(-17);
  for(const wall of spec.obstacles??[]){
    structures.fillStyle(0x6e7d83,1);
    structures.fillRect(wall.left*TILE,wall.top*TILE,
      (wall.right-wall.left)*TILE,(wall.bottom-wall.top)*TILE);
  }
  for(const plate of spec.pressurePlates){
    structures.fillStyle(0xeac47e,1);
    structures.fillRect(plate.at[0]*TILE-plate.radius,plate.at[1]*TILE-5,
      plate.radius*2,5);
  }
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
    guide,labels:{wheelLabel,bridgeLabel,controlLabels},structures,graybox,
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
  for(const valve of spec.valves){
    const mode=world.state.modes[valve.controller];
    const angle={drain:-.5,hold:0,fill:.5}[mode];
    art.objects[valve.id].setRotation(angle);
  }
  for(const release of spec.releases)
    art.objects[release.id].setRotation(world.state.released?.65:-.65);
  for(const gate of spec.gates)
    art.objects[gate.id].setVisible(!world.state.gates[gate.id]);
  art.objects[spec.waterwheel.id].setRotation(world.state.wheelAngle);
  // The wheel turns an actual gate/bridge but is not itself a blocking
  // collider. Open spokes and a mechanism label distinguish it from a wall.
  const wheel=spec.waterwheel,wx=wheel.at[0]*TILE,wy=wheel.at[1]*TILE;
  const active=world.state.wheelActive;
  art.guide.clear();
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
  art.labels.wheelLabel.setText(active?
    'WHEEL LATCHED · CROSS ON RAFT':
    world.state.released?'WHEEL CHARGING · WATCH THE FLOOD':
      'WHEEL OFF · FILL THEN RELEASE');
  art.labels.bridgeLabel.setText(active?'BRIDGE ON':'BRIDGE OFF');
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
      art.debug.strokeRect(gate.at[0]*TILE-gate.size[0]/2,
        gate.at[1]*TILE,...gate.size);
    }
  }
}
