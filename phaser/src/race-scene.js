import {CRASH_TICKS} from './race-rules.js';
// Temporary geometry-first course guides; hazards and ledges are drawn from
// exactly the same world-space data that collision uses.
const TILE=16;
const HAZARD_NAMES={
 'root-trainer':'LOG · JUMP','bridge-gap':'GAP · JUMP',
 'boulder-run':'BOULDER','branch-swing':'BRANCH',
 'crossing-cart':'CART','high-arch':'HIGH ARCH',
 'low-tunnel':'LOW TUNNEL','cloud-shutter':'SHUTTER',
 'rotating-fan':'FAN','falling-crystal':'CRYSTAL',
 'crossing-flyer':'FLYER',
 'first-hanging-rock':'HANGING ROCK · DIVE',
 'falling-boulder-one':'FALLING BOULDER',
 'thunder-gate':'STORM WALL · FLY LOW',
 'falling-boulder-two':'FALLING BOULDER',
 'low-rock-shelf':'CLOUD ROCK · CLIMB',
 'last-hanging-rock':'ROCK OVERHANG'
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
  const dangerLabels=[];
  if(spec.flightVoid){
    for(let x=spec.flightVoid.from+12;x<spec.flightVoid.to;x+=33){
      dangerLabels.push(scene.add.text(x*TILE,
        spec.flightVoid.fallY*TILE-20,'↓ STORM CLOUDS = RESTART',{
          fontFamily:'system-ui',fontSize:'13px',fontStyle:'bold',
          color:'#ffe6c9',backgroundColor:'#683544dc',
          padding:{x:7,y:4}
        }).setOrigin(.5,1).setDepth(37));
      dangerLabels.push(scene.add.text(x*TILE,
        spec.flightVoid.ceilingY*TILE+35,
        '↑ THUNDERHEADS = RESTART',{
          fontFamily:'system-ui',fontSize:'13px',fontStyle:'bold',
          color:'#f0e6ff',backgroundColor:'#3e345cda',
          padding:{x:7,y:4}
        }).setOrigin(.5,0).setDepth(37));
    }
    for(const label of dangerLabels)label.setVisible(false);
  }
  return {graphics,signs,notice,dangerLabels};
}

export function drawRaceScene(art,spec,world,players){
  const g=art.graphics;
  g.clear();
  const voidArea=spec.flightVoid;
  const phase=world.state.phase==='crash'?world.state.crash.fromPhase:world.state.phase;
  if(voidArea&&(phase==='flightScroll'||phase==='waitingForPegasi')){
    const left=voidArea.from*TILE,width=(voidArea.to-voidArea.from)*TILE;
    const ceiling=voidArea.ceilingY*TILE,clouds=voidArea.fallY*TILE;
    // World-space cloud banks: the visible edges ARE the fail thresholds.
    g.fillStyle(0x35294b,.42).fillRect(left,0,width,ceiling);
    g.fillStyle(0x4d2e54,.40)
      .fillRect(left,clouds,width,spec.height*TILE-clouds);
    g.lineStyle(5,0xffa16a,.95);
    for(let x=left;x<left+width;x+=42){
      g.lineBetween(x,clouds,x+25,clouds);
      g.lineBetween(x,ceiling,x+25,ceiling);
    }
    for(let x=left;x<left+width;x+=90){
      const wave=7*Math.sin(world.state.tick*.025+x*.04);
      g.fillStyle(0xe19c9b,.26).fillCircle(x,clouds+18+wave,42);
      g.fillStyle(0xb67f9a,.38).fillCircle(x+38,clouds+39-wave,55);
      g.fillStyle(0xa1a0d5,.30).fillCircle(x,ceiling-20-wave,39);
      g.fillStyle(0xd5b6e8,.33).fillCircle(x+36,ceiling-34+wave,47);
    }
  }
  const flightPhase=phase==='flightScroll'||phase==='waitingForPegasi';
  for(const label of art.dangerLabels)label.setVisible(flightPhase);
  const groundPhase=phase==='groundScroll';
  // Static route geometry does not vanish at the Pegasus checkpoint.
  g.fillStyle(0x8de8f3,.30).lineStyle(3,0xa2f3ff,.95);
  for(const [x,y,length] of spec.ledges){
    if(x>174)continue;
    g.fillRect(x*TILE,y*TILE,length*TILE,15);
    g.strokeRect(x*TILE,y*TILE,length*TILE,15);
  }
  for(const hazard of [...world.retiredHazards,...world.hazards]){
    const [w,h]=hazard.size;
    if(['falling-boulder','storm-shelf','storm-gate'].includes(hazard.kind)){
      g.fillStyle(hazard.kind==='falling-boulder'?0x9a6d65:0x524c68,.97);
      g.fillRoundedRect(hazard.x-w/2,hazard.y-h/2,w,h,8);
      g.lineStyle(4,0xffb88b,.96)
        .strokeRoundedRect(hazard.x-w/2,hazard.y-h/2,w,h,8);
      g.lineStyle(2,0xd3bbcc,.68);
      g.lineBetween(hazard.x-w*.25,hazard.y-h*.12,
        hazard.x+w*.05,hazard.y+h*.13);
      g.lineBetween(hazard.x+w*.05,hazard.y+h*.13,
        hazard.x+w*.25,hazard.y-h*.04);
    }else{
      g.fillStyle(0xd95764,.27).fillRect(hazard.x-w/2,hazard.y-h/2,w,h);
      g.lineStyle(3,0xffa18a,.95)
        .strokeRect(hazard.x-w/2,hazard.y-h/2,w,h);
    }
    const warnX=hazard.x-Math.min(130,hazard.warningDistance*.5);
    const warnY=hazard.y-h/2-14;
    g.fillStyle(0x472d31,.86).fillRoundedRect(warnX-8,warnY-23,24,24,6);
    g.lineStyle(2,0xffcf91,.95).strokeRoundedRect(warnX-8,warnY-23,24,24,6);
    g.lineStyle(3,0xffd591).lineBetween(warnX+4,warnY-17,warnX+4,warnY-9);
    g.fillStyle(0xffd591).fillCircle(warnX+4,warnY-4,2);
  }
  if(voidArea&&(phase==='flightScroll'||phase==='waitingForPegasi')){
    g.lineStyle(3,0xffb890,.95);
    for(let x=voidArea.from*TILE+50;x<voidArea.to*TILE;x+=390){
      g.lineBetween(x,voidArea.fallY*TILE-42,x,voidArea.fallY*TILE-11);
      g.lineBetween(x-9,voidArea.fallY*TILE-23,x,voidArea.fallY*TILE-11);
      g.lineBetween(x+9,voidArea.fallY*TILE-23,x,voidArea.fallY*TILE-11);
    }
  }
  art.signs.forEach((sign,index)=>{
    const choice=spec.routeChoices[index];
    sign.setVisible(groundPhase&&world.state.anchor/TILE<
      choice.to+15&&world.state.anchor/TILE>choice.from-28);
  });
  if(world.state.phase==='crash'){
    const impact=world.state.crash;
    const passed=CRASH_TICKS-impact.remaining;
    const hazard=world.hazards.find(h=>h.id===impact.hit);
    if(hazard){
      const radius=18+Math.min(passed,25)*1.6;
      g.lineStyle(5,0xffe3a6,Math.max(.08,1-passed/40))
        .strokeCircle(hazard.x,hazard.y,radius);
      g.lineStyle(3,0xff736d,.92)
        .strokeRect(hazard.x-hazard.size[0]/2-5,
          hazard.y-hazard.size[1]/2-5,
          hazard.size[0]+10,hazard.size[1]+10);
    }
    art.notice.setVisible(false);
  }else if(groundPhase||phase==='flightScroll'){
    const rider=players.find(p=>!p.assist&&p.mount);
    const next=world.hazards.filter(h=>rider&&h.x>rider.mount.x)
      .sort((a,b)=>a.x-b.x)[0];
    const distance=next&&rider?next.x-rider.mount.x:Infinity;
    art.notice.setVisible(Boolean(next)&&distance<next.warningDistance)
      .setPosition(next?.x??0,(next?.y??0)-(next?.size?.[1]??0)/2-36)
      .setText(next?HAZARD_NAMES[next.id]??next.kind:'');
  }else art.notice.setVisible(false);
}
