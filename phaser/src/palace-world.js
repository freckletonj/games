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
  const controls=spec.controlStations;
  // Up and projectile hits operate one visible station at a time.
  // The beams do the work: no single relay may silently solve a whole room.
  const activate=station=>{
    if(operated.has(station.id))return;
    operated.add(station.id);
    const mechanism=(station.kind==='mirror'?spec.mirrors:spec.shutters)
      .find(item=>item.id===station.control);
    const values=station.kind==='mirror'?mechanism.angles:mechanism.states;
    const current=station.kind==='mirror'?
      state.mirrors[mechanism.id]:state.shutters[mechanism.id];
    const next=values[(values.indexOf(current)+1)%values.length];
    state=station.kind==='mirror'?
      setMirrorDetent(spec,state,mechanism.id,next):
      setPalaceShutter(spec,state,mechanism.id,next);
  };
  for(const id of new Set(world.orbHits.splice(0))){
    const station=controls.find(control=>control.id===id);
    if(station)activate(station);
  }
  for(const player of players){
    if(player.assist||player.sleep||player.bubble||player.clouded||
       !actions[player.id]?.upPressed)continue;
    const station=controls.map(control=>({...control,distance:
      Math.hypot(player.x-control.at[0]*TILE,
        player.y-control.at[1]*TILE)}))
      .filter(control=>control.distance<=48)
      .sort((a,b)=>a.distance-b.distance)[0];
    if(station)activate(station);
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
  // The upslopes are sheer stone faces: stepping a few pixels at a time
  // must not let ordinary movement climb through solid rock. A lit bridge
  // supplies the height needed to leap each authored crest.
  for(let index=1;index<spec.ridge.length;index++){
    const [ax,ay]=spec.ridge[index-1], [bx,by]=spec.ridge[index];
    if((ay-by)/(bx-ax)<2.5)continue;
    const edge=bx*TILE-10;
    if(feet>by*TILE+1&&fromX<=edge&&toX>edge)toX=edge;
  }
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
  world.orbHits.length=0;
  world.state=state;
  for(const deck of world.decks)deck.enabled=state.platforms[deck.id].solid;
  return world;
}
