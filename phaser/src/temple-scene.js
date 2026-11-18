// Runtime water and independent painted mechanism cutouts for the Temple.
// The mask follows the exact dynamic volume height and compiled ground, not
// any waterline inferred from a static background painting.
const TILE=16;

export function templeWaterColumns(world,groundAt,pitch=8){
  const strips=[];
  for(const basin of world.waterBodies){
    const top=basin.surface*TILE;
    for(let x=basin.start*TILE;x<basin.end*TILE;x+=pitch){
      const width=Math.min(pitch,basin.end*TILE-x);
      const bottom=groundAt(x+width/2);
      if(bottom>top)strips.push({x,y:top,width,height:bottom-top});
    }
  }
  return strips;
}

export function createTempleScene(scene,spec,world,approved){
  const ids=[...world.decks,...world.crates,...spec.valves,
    ...spec.gates,spec.waterwheel].map(item=>item.id);
  const missing=ids.filter(id=>!approved?.platforms?.[id]);
  if(missing.length)throw Error('Sunken Temple lacks approved alpha art: '+
    missing.join(', '));
  const texture=id=>'deck-'+scene.chapter.id+'-'+id;
  const objects={};
  for(const deck of world.decks){
    deck.visual=scene.add.image(...deck.position,texture(deck.id))
      .setOrigin(.5,0).setDisplaySize(...deck.size).setDepth(-19);
  }
  for(const crate of world.crates)
    crate.visual=scene.add.image(crate.x,crate.y,texture(crate.id))
      .setOrigin(.5,0).setDisplaySize(...crate.size).setDepth(-18);
  for(const valve of spec.valves){
    objects[valve.id]=scene.add.image(valve.at[0]*TILE,valve.at[1]*TILE,
      texture(valve.id)).setDisplaySize(36,36).setDepth(-17);
  }
  for(const gate of spec.gates){
    objects[gate.id]=scene.add.image(gate.at[0]*TILE,gate.at[1]*TILE,
      texture(gate.id)).setOrigin(.5,0).setDisplaySize(...gate.size).setDepth(-18);
  }
  const wheel=spec.waterwheel;
  objects[wheel.id]=scene.add.image(wheel.at[0]*TILE,wheel.at[1]*TILE,
    texture(wheel.id)).setDisplaySize(wheel.radius*2,wheel.radius*2)
    .setDepth(-17);
  return {water:scene.add.graphics().setDepth(-29),
    debug:scene.add.graphics().setDepth(102),objects};
}

export function drawTempleScene(art,spec,world,groundAt,showOverlay=false){
  const strips=templeWaterColumns(world,groundAt);
  art.water.clear().fillStyle(0x2a9ab4,.54);
  for(const strip of strips)
    art.water.fillRect(strip.x,strip.y,strip.width,strip.height);
  art.water.lineStyle(2,0x8ad6d8,.8);
  for(const basin of world.waterBodies)
    art.water.lineBetween(basin.start*TILE,basin.surface*TILE,
      basin.end*TILE,basin.surface*TILE);
  for(const deck of world.decks)
    deck.visual?.setPosition(...deck.position).setVisible(deck.enabled!==false);
  for(const crate of world.crates)
    crate.visual?.setPosition(crate.x,crate.y);
  for(const valve of spec.valves){
    const angle={drain:-.5,hold:0,fill:.5}[world.state.modes[valve.controller]];
    art.objects[valve.id].setRotation(angle);
  }
  for(const gate of spec.gates)
    art.objects[gate.id].setVisible(!world.state.gates[gate.id]);
  art.objects[spec.waterwheel.id].setRotation(world.state.wheelAngle);
  art.debug.clear();
  if(showOverlay){
    art.debug.fillStyle(0x20c0ec,.36);
    for(const strip of strips)
      art.debug.fillRect(strip.x,strip.y,strip.width,strip.height);
    art.debug.lineStyle(2,0x5bf5e8,.95);
    for(const basin of world.waterBodies)
      art.debug.lineBetween(basin.start*TILE,basin.surface*TILE,
        basin.end*TILE,basin.surface*TILE);
    art.debug.lineStyle(2,0xffd28d,.96);
    for(const deck of world.decks){
      if(deck.enabled===false)continue;
      art.debug.lineBetween(deck.position[0]-deck.size[0]/2,
        deck.position[1],deck.position[0]+deck.size[0]/2,
        deck.position[1]);
    }
    for(const crate of world.crates)
      art.debug.strokeRect(crate.x-crate.size[0]/2,crate.y,...crate.size);
    for(const gate of spec.gates){
      if(world.state.gates[gate.id])continue;
      art.debug.strokeRect(gate.at[0]*TILE-gate.size[0]/2,
        gate.at[1]*TILE,...gate.size);
    }
  }
}
