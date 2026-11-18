// Experimental Mirror Palace: all guides follow authoritative beam and platform state.
const TILE=16;
const groups=[
 {name:'ATRIUM',color:0x70e9ff,controls:['atrium-mirror'],target:'atrium-target'},
 {name:'GALLERY',color:0xffb6e3,controls:['gallery-mirror-a','gallery-mirror-b','gallery-shutter'],target:'gallery-target'},
 {name:'ECLIPSE',color:0xffe49a,controls:['observatory-prism','eclipse-shutter'],target:'observatory-target'}
];
const controlNames={
 'atrium-mirror':'A · ATRIUM MIRROR',
 'gallery-mirror-a':'B · GALLERY MIRROR 1',
 'gallery-mirror-b':'C · GALLERY MIRROR 2',
 'gallery-shutter':'D · GALLERY SHUTTER',
 'observatory-prism':'E · ECLIPSE PRISM',
 'eclipse-shutter':'F · ECLIPSE SHUTTER'
};
const platformNames={
 'atrium-crystal':'ATRIUM BRIDGE',
 'gallery-crystal':'GALLERY BRIDGE',
 'gallery-darkstone':'SHADOW LANDING',
 'eclipse-stair-low':'LIT STAIR',
 'eclipse-stair-high':'SHADOW STAIR'
};
const groupFor=id=>groups.find(g=>g.controls.includes(id)||g.target===id);
const hex=color=>'#'+color.toString(16).padStart(6,'0');

export function createPalaceScene(scene,spec){
 const graphics=scene.add.graphics().setDepth(93);
 const labels={};
 for(const control of [...spec.mirrors,...spec.shutters]){
  const [x,y]=control.controlAt.map(n=>n*TILE);
  labels[control.id]=scene.add.text(x,y-36,controlNames[control.id],{
   fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',
   color:hex(groupFor(control.id).color),
   backgroundColor:'#102638e8',padding:{x:4,y:3}
  }).setOrigin(.5,1).setDepth(95);
 }
 for(const platform of spec.phasePlatforms){
  const [x,y]=platform.home.map(n=>n*TILE);
  const group=groups.find(g=>g.target===platform.target);
  labels[platform.id]=scene.add.text(x,y-15,'',{
   fontFamily:'system-ui',fontSize:'11px',fontStyle:'bold',
   color:hex(group.color),backgroundColor:'#0d2538e8',
   padding:{x:5,y:3}
  }).setOrigin(.5,1).setDepth(95);
 }
 return {graphics,labels};
}

export function drawPalaceScene(art,spec,world){
 const g=art.graphics,state=world.state;
 g.clear();
 for(const control of [...spec.mirrors,...spec.shutters]){
  const color=groupFor(control.id).color;
  const [x,y]=control.controlAt.map(n=>n*TILE);
  const anchor=control.at??control.from.map((v,i)=>(v+control.to[i])/2);
  const [ax,ay]=anchor.map(n=>n*TILE);
  g.lineStyle(2,color,.55).lineBetween(x,y,ax,ay);
  g.fillStyle(0x10283c,.94).fillCircle(x,y,21);
  g.lineStyle(3,color,.96).strokeCircle(x,y,21);
  g.lineStyle(1,0xffffff,.7).strokeCircle(x,y,13);
  g.lineStyle(2,color,.7).lineBetween(x-6,y,x+6,y);
  g.lineBetween(x,y-6,x,y+6);
 }
 for(const group of groups){
  const target=spec.beamTargets.find(t=>t.id===group.target);
  const [x,y]=target.at.map(n=>n*TILE);
  const lit=state.light?.lit.includes(group.target);
  g.fillStyle(group.color,lit?1:.22).fillCircle(x,y,10);
  g.lineStyle(3,group.color,1).strokeCircle(x,y,15);
 }
 for(const ray of state.light?.segments??[])
  g.lineStyle(4,0xfff2ac,.95).lineBetween(...ray.from,...ray.to);
 for(const platform of spec.phasePlatforms){
  const status=state.platforms[platform.id];
  const [x,y]=platform.home.map(n=>n*TILE);
  const [w,h]=platform.size;
  const color=groups.find(group=>group.target===platform.target).color;
  g.fillStyle(color,status.solid?.48:.1).fillRect(x-w/2,y,w,h);
  g.lineStyle(status.pending!==null?4:2,color,status.solid?1:.45)
   .strokeRect(x-w/2,y,w,h);
  art.labels[platform.id].setText(platformNames[platform.id]+' · '+
   (status.pending!==null?'CHANGING':status.solid?'SOLID':'GHOST'));
 }
 for(const gate of spec.beamGates??[]){
  if(state.gates[gate.id])continue;
  const [x,y]=gate.at.map(n=>n*TILE);
  g.fillStyle(0xff6c75,.12).fillRect(x-gate.size[0]/2,y,...gate.size);
  g.lineStyle(3,0xff838a,.9).strokeRect(x-gate.size[0]/2,y,...gate.size);
 }
}
