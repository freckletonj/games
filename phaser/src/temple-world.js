import {createTempleState,setTempleValve,stepTemple,
  buoyantPosition,templeCurrentAt} from './temple-rules.js';

const TILE=16;
const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));

export function createTempleWorld(spec){
  const state=createTempleState(spec);
  const crates=spec.buoyantObjects.filter(object=>object.kind==='crate')
    .map(object=>({...object,x:object.home[0]*TILE,
      y:buoyantPosition(spec,state,object.id).y}));
  const decks=spec.buoyantObjects.filter(object=>object.kind==='raft')
    .map(object=>{
      const position=buoyantPosition(spec,state,object.id);
      return {...object,kind:'raft',position:[position.x,position.y],
        previous:[position.x,position.y]};
    });
  const waterBodies=spec.waterVolumes.map(volume=>({
    id:volume.id,start:volume.from,end:volume.to,
    surface:state.surfaces[volume.id]
  }));
  return {state,crates,decks,waterBodies};
}

// Checkpoints preserve the tide phase, valve modes and pushed crate X.
// Restore in place: the scene and player collision systems retain references
// to the exact water bodies and deck objects.
export function snapshotTempleWorld(world){
  return {state:world.state,cratePositions:world.crates.map(c=>[c.x,c.y])};
}

export function restoreTempleWorld(spec,world,snapshot){
  world.state=snapshot.state;
  world.crates.forEach((crate,index)=>{
    [crate.x,crate.y]=snapshot.cratePositions[index];
  });
  for(const volume of world.waterBodies)
    volume.surface=world.state.surfaces[volume.id];
  for(const deck of world.decks){
    const {x,y}=buoyantPosition(spec,world.state,deck.id);
    deck.position=[x,y];
    deck.previous=[x,y];
  }
  return world;
}

export function templeInWater(world,groundAt,x,y){
  return world.waterBodies.some(volume=>x>=volume.start*TILE&&
    x<volume.end*TILE&&y>=volume.surface*TILE&&y<groundAt(x));
}

export function templeGateBlock(spec,world,fromX,toX,feet){
  for(const gate of spec.gates){
    if(world.state.gates[gate.id])continue;
    const [cellX,cellY]=gate.at;
    const left=cellX*TILE-gate.size[0]/2-10;
    const right=cellX*TILE+gate.size[0]/2+10;
    const top=cellY*TILE,bottom=top+gate.size[1];
    if(feet<=top||feet-27>=bottom)continue;
    if(fromX<=left&&toX>left)toX=left;
    if(fromX>=right&&toX<right)toX=right;
  }
  return toX;
}

// A moving crate is solid at its authored top/body silhouette. A player
// leaning against it is held at the physical edge while the separate
// fixed-tick crate push advances it; it cannot be walked through.
export function templeBlockHorizontal(spec,world,fromX,toX,feet){
  toX=templeGateBlock(spec,world,fromX,toX,feet);
  for(const crate of world.crates){
    if(feet<=crate.y||feet-27>=crate.y+crate.size[1])continue;
    const left=crate.x-crate.size[0]/2-10;
    const right=crate.x+crate.size[0]/2+10;
    if(fromX<=left&&toX>left)toX=left;
    if(fromX>=right&&toX<right)toX=right;
  }
  return toX;
}

export function stepTempleWorld(spec,world,players,actions){
  let state=world.state;
  // Up / D-pad Up turns a nearby valve one detent. No simultaneous
  // input is required: the chosen mode persists until changed.
  for(const player of players){
    if(player.assist||player.sleep||player.bubble||player.clouded||
       player.mount||!actions[player.id]?.upPressed)continue;
    for(const valve of spec.valves){
      const [cx,cy]=valve.at;
      if(Math.hypot(player.x-cx*TILE,player.y-cy*TILE)>valve.reach)continue;
      const current=state.modes[valve.controller];
      const next=valve.modes[(valve.modes.indexOf(current)+1)%valve.modes.length];
      state=setTempleValve(spec,state,valve.id,next);
      break;
    }
  }
  // The water advances once per simulation tick; the decks' previous
  // positions remain available to production rider-carry collision.
  state=stepTemple(spec,state,{cratePositions:Object.fromEntries(
    world.crates.map(crate=>[crate.id,{x:crate.x,y:crate.y}]))});
  for(const volume of world.waterBodies)volume.surface=state.surfaces[volume.id];
  for(const deck of world.decks){
    deck.previous=deck.position;
    const {x,y}=buoyantPosition(spec,state,deck.id);
    deck.position=[x,y];
  }
  for(const crate of world.crates){
    crate.y=buoyantPosition(spec,state,crate.id).y;
    const volume=spec.waterVolumes.find(v=>v.id===crate.volume);
    for(const player of players){
      const move=Number(actions[player.id]?.right)-Number(actions[player.id]?.left);
      if(!move||player.assist||player.sleep||player.bubble||player.clouded||
         player.mount||Math.abs(player.y-crate.y)>32)continue;
      const edge=crate.x-move*(crate.size[0]/2+12);
      if(Math.abs(player.x-edge)>22)continue;
      crate.x=clamp(crate.x+move*1.8,
        volume.from*TILE+crate.size[0]/2,
        volume.to*TILE-crate.size[0]/2);
    }
  }
  world.state=state;
  return world;
}

export function templeCurrent(world,spec,x,y){
  return templeCurrentAt(spec,world.state,x,y);
}
