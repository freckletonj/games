// Runtime water and independent painted mechanism cutouts for the Temple.
import {templeShoreBounds} from './temple-shoreline.js';
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
  const guide=scene.add.graphics().setDepth(-16);
  const wheelLabel=scene.add.text(
    wheel.at[0]*TILE,wheel.at[1]*TILE-wheel.radius-24,
    'WATERWHEEL · FILL CASCADE VALVE',{
      fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',
      color:'#fff4c1',backgroundColor:'#153746d9',padding:{x:7,y:5}
    }).setOrigin(.5,1).setDepth(39);
  const bridge=spec.linkedPlatforms[0];
  const bridgeLabel=scene.add.text(bridge.home[0]*TILE,
    bridge.home[1]*TILE-36,'BRIDGE OFF · ACTIVATE WATERWHEEL',{
      fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',
      color:'#ffe3a1',backgroundColor:'#293a4bdd',padding:{x:6,y:5}
    }).setOrigin(.5,1).setDepth(39);
  return {water:scene.add.graphics().setDepth(-29),
    guide,labels:{wheelLabel,bridgeLabel},
    debug:scene.add.graphics().setDepth(102),objects};
}

export function drawTempleScene(art,spec,world,groundAt,showOverlay=false){
  const strips=templeWaterColumns(world,groundAt);
  art.water.clear().fillStyle(0x2a9ab4,.54);
  // Fill one continuous, terrain-shaped polygon per basin. Discrete
  // rectangles leave visible slivers at the bank even if physics is wet.
  for(const basin of world.waterBodies){
    const {left,right,y}=templeShoreBounds(basin,groundAt);
    art.water.beginPath().moveTo(left,y).lineTo(right,y);
    for(let x=right;x>left;x-=4)
      art.water.lineTo(x,Math.max(y,groundAt(x)));
    art.water.lineTo(left,y).closePath().fillPath();
  }
  art.water.lineStyle(2,0x8ad6d8,.8);
  for(const basin of world.waterBodies){
    const {left,right,y}=templeShoreBounds(basin,groundAt);
    art.water.lineBetween(left,y,right,y);
  }
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
    const bridge=spec.linkedPlatforms[0],bx=bridge.home[0]*TILE;
    const by=bridge.home[1]*TILE,[width]=bridge.size;
    art.guide.lineStyle(2,0xffd18b,.6);
    for(let x=bx-width/2;x<bx+width/2;x+=18)
      art.guide.lineBetween(x,by,Math.min(x+10,bx+width/2),by);
  }
  art.labels.wheelLabel.setText(active?
    'WATERWHEEL TURNING · BRIDGE POWERED':
    'WATERWHEEL · FILL CASCADE VALVE');
  art.labels.bridgeLabel.setText(active?
    'BRIDGE ON · WALK ACROSS':
    'BRIDGE OFF · ACTIVATE WATERWHEEL');
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
    for(const gate of spec.gates){
      if(world.state.gates[gate.id])continue;
      art.debug.strokeRect(gate.at[0]*TILE-gate.size[0]/2,
        gate.at[1]*TILE,...gate.size);
    }
  }
}
