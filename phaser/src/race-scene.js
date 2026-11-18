// Temporary geometry-first course guides; hazards and ledges are drawn from
// exactly the same world-space data that collision uses.
const TILE=16;
const HAZARD_NAMES={
 'root-trainer':'LOG · JUMP','bridge-gap':'GAP · JUMP',
 'boulder-run':'BOULDER','branch-swing':'BRANCH',
 'crossing-cart':'CART','high-arch':'HIGH ARCH',
 'low-tunnel':'LOW TUNNEL','cloud-shutter':'SHUTTER',
 'rotating-fan':'FAN','falling-crystal':'CRYSTAL',
 'crossing-flyer':'FLYER'
};

export function createRaceScene(scene,spec){
  const graphics=scene.add.graphics().setDepth(20);
  const signs=spec.routeChoices.map(choice=>{
    const x=choice.from*TILE;
    const ground=scene.groundAt(x);
    const message='UPPER  ↑  JUMP ON PLATFORMS\n'+
      'LOWER  →  RIDE THE TRAIL';
    return scene.add.text(x,ground-168,message,{
      fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',
      color:'#e7fbff',backgroundColor:'#13354ee3',
      padding:{x:8,y:7},lineSpacing:4
    }).setDepth(48);
  });
  const notice=scene.add.text(0,0,'',{
    fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',
    color:'#fff5d4',backgroundColor:'#522e30dd',padding:{x:6,y:4}
  }).setDepth(49).setOrigin(.5,1);
  return {graphics,signs,notice};
}

export function drawRaceScene(art,spec,world,players){
  const g=art.graphics;
  g.clear();
  const groundPhase=world.state.phase==='groundScroll';
  if(groundPhase||world.state.phase==='waitingForUnicorns'){
    // Clearly mark the alternate high path even when V debugging is off.
    g.fillStyle(0x8de8f3,.30).lineStyle(3,0xa2f3ff,.95);
    for(const [x,y,length] of spec.ledges){
      if(x>174)continue;
      g.fillRect(x*TILE,y*TILE,length*TILE,15);
      g.strokeRect(x*TILE,y*TILE,length*TILE,15);
    }
  }
  for(const hazard of world.hazards){
    const [w,h]=hazard.size;
    g.fillStyle(0xd95764,.27).fillRect(hazard.x-w/2,hazard.y-h/2,w,h);
    g.lineStyle(3,0xffa18a,.95).strokeRect(hazard.x-w/2,hazard.y-h/2,w,h);
    const warnX=hazard.x-Math.min(130,hazard.warningDistance*.5);
    const warnY=hazard.y-h/2-14;
    g.fillStyle(0x472d31,.86).fillRoundedRect(warnX-8,warnY-23,24,24,6);
    g.lineStyle(2,0xffcf91,.95).strokeRoundedRect(warnX-8,warnY-23,24,24,6);
    g.lineStyle(3,0xffd591).lineBetween(warnX+4,warnY-17,warnX+4,warnY-9);
    g.fillStyle(0xffd591).fillCircle(warnX+4,warnY-4,2);
  }
  art.signs.forEach((sign,index)=>{
    const choice=spec.routeChoices[index];
    sign.setVisible(groundPhase&&world.state.anchor/TILE<
      choice.to+15&&world.state.anchor/TILE>choice.from-28);
  });
  if(groundPhase||world.state.phase==='flightScroll'){
    const rider=players.find(p=>!p.assist&&p.mount);
    const next=world.hazards.filter(h=>rider&&h.x>rider.mount.x)
      .sort((a,b)=>a.x-b.x)[0];
    const distance=next&&rider?next.x-rider.mount.x:Infinity;
    art.notice.setVisible(Boolean(next)&&distance<next.warningDistance)
      .setPosition(next?.x??0,(next?.y??0)-(next?.size?.[1]??0)/2-36)
      .setText(next?HAZARD_NAMES[next.id]??next.kind:'');
  }else art.notice.setVisible(false);
}
