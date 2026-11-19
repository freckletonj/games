// Three readable, single-action circuits. The geometry and gate feedback
// use the actual fixed-tick Palace state; no painted clue drives physics.
const TILE=16;
const COLORS={blue:0x6adfff,pink:0xff97d3,gold:0xffdf84};
const hex=c=>'#'+c.toString(16).padStart(6,'0');

export function createPalaceScene(scene,spec){
  const graphics=scene.add.graphics().setDepth(20);
  const labels={};
  for(const relay of spec.circuitSwitches){
    const [x,y]=relay.at.map(n=>n*TILE),color=COLORS[relay.color];
    const title=scene.add.text(x-130,y-138,
      relay.room+'  ·  SHOOT THE '+relay.color.toUpperCase()+' LAMP',{
      fontFamily:'system-ui',fontSize:'15px',fontStyle:'bold',
      color:hex(color),backgroundColor:'#102638e8',
      padding:{x:8,y:6}
    }).setDepth(45);
    const status=scene.add.text(x,y-49,'ORB TARGET',{
      fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',
      color:'#ffffff',backgroundColor:'#102638ea',
      padding:{x:6,y:4}
    }).setOrigin(.5,1).setDepth(46);
    const platform=spec.phasePlatforms.find(p=>p.id===relay.platforms[0]);
    const bridge=scene.add.text(platform.home[0]*TILE,
      platform.home[1]*TILE-42,'BRIDGE OFF',{
      fontFamily:'system-ui',fontSize:'14px',fontStyle:'bold',
      color:hex(color),backgroundColor:'#102638ea',
      padding:{x:7,y:5}
    }).setOrigin(.5,1).setDepth(45);
    labels[relay.id]={title,status,bridge};
  }
  return {graphics,labels,groundAt:x=>scene.groundAt(x)};
}

export function drawPalaceScene(art,spec,world){
  const g=art.graphics,state=world.state;
  g.clear();
  for(const relay of spec.circuitSwitches){
    const [x,y]=relay.at.map(n=>n*TILE),color=COLORS[relay.color];
    const platform=spec.phasePlatforms.find(p=>p.id===relay.platforms[0]);
    const [px,py]=platform.home.map(n=>n*TILE);
    const lit=Boolean(state.light?.lit.includes(relay.target));
    const gate=state.gates[relay.gate];
    const labels=art.labels[relay.id];
    // Draw only the nearby, actionable relay-to-bridge circuit. The
    // underlying optical solver remains authoritative but its high-altitude
    // mirror geometry no longer clutters the view.
    g.lineStyle(5,color,lit?.96:.5);
    g.lineBetween(x,y,px,py);
    const door=spec.beamGates.find(gate=>gate.id===relay.gate);
    const doorX=door.at[0]*TILE,doorTop=door.at[1]*TILE;
    const doorwayHeight=Math.max(0,
      Math.min(door.size[1],art.groundAt(doorX)-doorTop));
    g.lineBetween(px,py,doorX,doorTop+doorwayHeight/2);
    // Large circular orb target, clearly distinct from scenery and mirrors.
    g.fillStyle(0x143046,1).fillCircle(x,y,29);
    g.lineStyle(5,color,1).strokeCircle(x,y,29);
    g.fillStyle(color,lit?1:.7).fillCircle(x,y,16);
    g.lineStyle(3,0xffffff,.85);
    g.strokeCircle(x,y,12);
    g.fillStyle(color,lit?1:.2).fillCircle(px,py,12);
    g.lineStyle(4,color,1).strokeCircle(px,py,16);
    // All platform surfaces use one rule: illuminated => SOLID.
    for(const id of relay.platforms){
      const p=spec.phasePlatforms.find(p=>p.id===id);
      const status=state.platforms[id];
      const [bx,by]=p.home.map(n=>n*TILE);
      const [width,height]=p.size;
      g.fillStyle(color,status.solid?.65:.10)
        .fillRect(bx-width/2,by,width,height);
      g.lineStyle(status.solid?4:2,color,status.solid?1:.4)
        .strokeRect(bx-width/2,by,width,height);
    }
    if(!gate){
      // The collision extends below the terrain, but the visible light
      // curtain is only the opening above the compiled physical rock.
      g.fillStyle(0xc74f68,.18).fillRect(
        doorX-door.size[0]/2,doorTop,door.size[0],doorwayHeight);
      g.lineStyle(4,0xff8d99,.9).strokeRect(
        doorX-door.size[0]/2,doorTop,door.size[0],doorwayHeight);
    }
    labels.status.setText(lit?'LAMP ON ✓':'HIT WITH ORB');
    labels.bridge.setText(gate?'BRIDGE ON · DOOR OPEN':
      lit?'LIGHT CHARGING…':'BRIDGE OFF · DOOR CLOSED');
  }
}
