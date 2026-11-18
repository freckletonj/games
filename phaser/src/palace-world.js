import {createPalaceState,setMirrorDetent,setPalaceShutter,
  stepPalace} from './palace-rules.js';

const TILE=16;

export function createPalaceWorld(spec,level=null){
  const state=createPalaceState(spec);
  const decks=spec.phasePlatforms.map(platform=>{
    const position=platform.home.map(cell=>cell*TILE);
    return {...platform,kind:'phase',position,previous:position,
      enabled:state.platforms[platform.id].solid};
  });
  const solidAt=level?(x,y)=>{
    const material=level.materialColumn(x)(y);
    return material==='rock'||material==='wall'||material==='shelf';
  }:null;
  return {state,decks,solidAt,orbHits:[]};
}

export function stepPalaceWorld(spec,world,players,actions){
  let state=world.state;
  const operated=new Set();
  const controls=[...spec.mirrors.map(m=>({...m,kind:'mirror'})),
    ...spec.shutters.map(s=>({...s,kind:'shutter'}))];
  // Projectile contact and Up use the same finite detents. Hits are
  // consumed once, so an orb cannot turn a switch repeatedly.
  const activate=control=>{
    operated.add(control.id);
    if(control.kind==='mirror'){
      const detents=control.angles;
      const current=state.mirrors[control.id];
      state=setMirrorDetent(spec,state,control.id,
        detents[(detents.indexOf(current)+1)%detents.length]);
    }else{
      const positions=control.states;
      const current=state.shutters[control.id];
      state=setPalaceShutter(spec,state,control.id,
        positions[(positions.indexOf(current)+1)%positions.length]);
    }
  };
  for(const id of world.orbHits.splice(0)){
    const control=controls.find(item=>item.id===id);
    if(control&&!operated.has(id))activate(control);
  }
  // Keep Up as an accessibility alternative to throwing an orb.
  for(const player of players){
    if(player.assist||player.sleep||player.bubble||player.clouded||
       !actions[player.id]?.upPressed)continue;
    const candidate=controls.map(control=>({
      ...control,distance:Math.hypot(
        player.x-control.controlAt[0]*TILE,
        player.y-control.controlAt[1]*TILE)}))
      .filter(control=>control.distance<=control.reach&&
        !operated.has(control.id))
      .sort((a,b)=>a.distance-b.distance)[0];
    if(candidate)activate(candidate);
  }
  const occupied=spec.phasePlatforms.filter(platform=>{
    const [x,y]=platform.home.map(n=>n*TILE);
    return players.some(player=>!player.assist&&!player.sleep&&
      !player.bubble&&!player.clouded&&
      (player.onPlatform===platform.id||
        Math.abs(player.x-x)<=platform.size[0]/2+9&&
        player.y>y&&player.y-27<y+platform.size[1]));
  }).map(platform=>platform.id);
  state=stepPalace(spec,state,{occupiedPlatformIds:occupied,
    solidAt:world.solidAt});
  world.state=state;
  for(const deck of world.decks)
    deck.enabled=state.platforms[deck.id].solid;
  return world;
}

// Crystal doors have the same 16 px authored collision coordinate system
// as the terrain. A target must actually receive an unobstructed beam before
// the corresponding door can be crossed.
export function palaceBlockHorizontal(spec,world,fromX,toX,feet){
  for(const gate of spec.beamGates??[]){
    if(world.state.gates[gate.id])continue;
    const [cx,cy]=gate.at;
    const [width,height]=gate.size;
    const left=cx*TILE-width/2-10,right=cx*TILE+width/2+10;
    const top=cy*TILE,bottom=top+height;
    if(feet<=top||feet-27>=bottom)continue;
    if(fromX<=left&&toX>left)toX=left;
    if(fromX>=right&&toX<right)toX=right;
  }
  return toX;
}

export function restorePalaceWorld(world,state){
  world.state=state;
  for(const deck of world.decks)deck.enabled=state.platforms[deck.id].solid;
  return world;
}
