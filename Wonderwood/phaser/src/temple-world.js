import {createTempleState,setTempleValve,stepTemple,
  buoyantPosition,templeCurrentAt,releaseTempleWheel} from './temple-rules.js';
import {templeShoreBounds} from './temple-shoreline.js';

const TILE=16;
const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));
const bridgeEnabled=(deck,state)=>state.wheelActive&&
  (!deck.readyWhenSurface||
    state.surfaces[deck.readyWhenSurface.volume]<=deck.readyWhenSurface.atMost);

export function createTempleWorld(spec){
  const state=createTempleState(spec);
  const crates=spec.buoyantObjects.filter(object=>object.kind==='crate')
    .map(object=>{
      const x=object.home[0]*TILE;
      const y=buoyantPosition(spec,state,object.id).y;
      return {...object,x,y,position:[x,y],previous:[x,y]};
    });
  const decks=spec.buoyantObjects.filter(object=>object.kind==='raft')
    .map(object=>{
      const position=buoyantPosition(spec,state,object.id);
      return {...object,kind:'raft',position:[position.x,position.y],
        previous:[position.x,position.y]};
    });
  for(const platform of spec.linkedPlatforms){
    const position=platform.home.map(cell=>cell*TILE);
    decks.push({...platform,kind:'puzzle-bridge',position,previous:position,
      enabled:false});
  }
  const waterBodies=spec.waterVolumes.map(volume=>({
    id:volume.id,start:volume.from,end:volume.to,
    surface:state.surfaces[volume.id]
  }));
  return {state,crates,decks,waterBodies};
}

// Checkpoints preserve latches, release, tide phase and pushed crate positions.
// Restore in place: the scene and player collision systems retain references
// to the exact water bodies and deck objects.
export function snapshotTempleWorld(world){
  return {state:world.state,cratePositions:world.crates.map(c=>[c.x,c.y])};
}

export function restoreTempleWorld(spec,world,snapshot){
  world.state=snapshot.state;
  world.crates.forEach((crate,index)=>{
    [crate.x,crate.y]=snapshot.cratePositions[index];
    crate.position=[crate.x,crate.y];
    crate.previous=crate.position;
  });
  for(const volume of world.waterBodies)
    volume.surface=world.state.surfaces[volume.id];
  for(const deck of world.decks){
    const position=deck.volume?
      buoyantPosition(spec,world.state,deck.id):
      {x:deck.home[0]*TILE,y:deck.home[1]*TILE};
    deck.position=[position.x,position.y];
    deck.previous=deck.position;
    if(deck.enabledWhen)deck.enabled=bridgeEnabled(deck,world.state);
  }
  return world;
}

// Use the same terrain-clipped wet extent for visuals, movement and buoyancy.
// The authored start/end cells mark the flat basin floor, not its wet banks.
export function templeBasinAt(world,groundAt,x){
  for(const basin of world.waterBodies){
    const {left,right}=templeShoreBounds(basin,groundAt);
    if(x>=left&&x<right)return basin;
  }
  return null;
}

export function templeInWater(world,groundAt,x,y){
  const basin=templeBasinAt(world,groundAt,x);
  return Boolean(basin&&y>=basin.surface*TILE&&y<groundAt(x));
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
  // A single-cell rock face cannot be climbed by walking in tiny steps
  // along its interpolated heightfield. Crossing requires the player's feet
  // to clear the actual crest, as they can from the elevated raft.
  // This is terrain collision, not a freestanding invisible puzzle pillar.
  for(let index=1;index<spec.ridge.length;index++){
    const [ax,ay]=spec.ridge[index-1], [bx,by]=spec.ridge[index];
    if(ay-by<8*(bx-ax))continue;
    const edge=bx*TILE-10;
    if(feet>by*TILE+1&&fromX<=edge&&toX>edge)toX=edge;
  }
  for(const wall of spec.obstacles??[]){
    const top=wall.top*TILE,bottom=wall.bottom*TILE;
    if(feet<=top||feet-27>=bottom)continue;
    const left=wall.left*TILE-10,right=wall.right*TILE+10;
    if(fromX<=left&&toX>left)toX=left;
    if(fromX>=right&&toX<right)toX=right;
  }
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
  const operated=new Set();
  // Up / D-pad Up turns a nearby valve one detent. No simultaneous
  // input is required: the chosen mode persists until changed.
  for(const player of players){
    if(player.assist||player.sleep||player.bubble||player.clouded||
       player.mount||!actions[player.id]?.upPressed)continue;
    for(const valve of spec.valves){
      if(operated.has(valve.id))continue;
      const [cx,cy]=valve.at;
      if(Math.hypot(player.x-cx*TILE,player.y-cy*TILE)>valve.reach)continue;
      const current=state.modes[valve.controller];
      const next=valve.modes[(valve.modes.indexOf(current)+1)%valve.modes.length];
      state=setTempleValve(spec,state,valve.id,next);
      operated.add(valve.id);
      break;
    }
  }
  for(const player of players){
    if(player.assist||player.sleep||player.bubble||player.clouded||
       player.mount||!actions[player.id]?.upPressed)continue;
    const release=spec.releases.find(control=>
      Math.hypot(player.x-control.at[0]*TILE,
        player.y-control.at[1]*TILE)<=control.reach);
    if(release)state=releaseTempleWheel(spec,state,release.id);
  }
  // The water advances once per simulation tick; the decks' previous
  // positions remain available to production rider-carry collision.
  state=stepTemple(spec,state,{cratePositions:Object.fromEntries(
    world.crates.map(crate=>[crate.id,{x:crate.x,y:crate.y}]))});
  for(const volume of world.waterBodies)volume.surface=state.surfaces[volume.id];
  for(const deck of world.decks){
    deck.previous=deck.position;
    if(deck.volume){
      const {x,y}=buoyantPosition(spec,state,deck.id);
      deck.position=[x,y];
    }
    if(deck.enabledWhen)deck.enabled=bridgeEnabled(deck,state);
  }
  for(const crate of world.crates){
    crate.previous=crate.position;
    crate.y=buoyantPosition(spec,state,crate.id).y;
    const volume=spec.waterVolumes.find(v=>v.id===crate.volume);
    for(const player of players){
      const move=Number(actions[player.id]?.right)-Number(actions[player.id]?.left);
      // Only an explorer braced against the crate's side can move it.
      // Standing on top, jumping past it, or falling alongside it
      // must never exert a horizontal push.
      if(!move||actions[player.id]?.jump||player.assist||player.sleep||
         player.bubble||player.clouded||player.mount||
         !(player.grounded||player.floating)||
         player.onPlatform===crate.id||
         player.y<crate.y+10||player.y>crate.y+crate.size[1]+8)continue;
      const edge=crate.x-move*(crate.size[0]/2+12);
      if(Math.abs(player.x-edge)>22)continue;
      const half=crate.size[0]/2;
      let target=clamp(crate.x+move*1.8,
        volume.from*TILE+half,volume.to*TILE-half);
      // The recessed socket has a lip that catches the crate's center.
      // Players shouldn't have to release Right on an exact simulation tick.
      const socket=spec.pressurePlates.find(plate=>plate.requires===crate.id);
      if(socket&&move>0&&crate.x<=socket.at[0]*TILE)
        target=Math.min(target,socket.at[0]*TILE);
      for(const wall of spec.obstacles??[]){
        if(crate.y+crate.size[1]<=wall.top*TILE||
           crate.y>=wall.bottom*TILE)continue;
        if(move>0&&crate.x+half<=wall.left*TILE)
          target=Math.min(target,wall.left*TILE-half);
        if(move<0&&crate.x-half>=wall.right*TILE)
          target=Math.max(target,wall.right*TILE+half);
      }
      crate.x=target;
      break; // One physical crate displacement per tick, even with two pushers.
    }
    crate.position=[crate.x,crate.y];
  }
  world.state=state;
  return world;
}

export function templeCurrent(world,spec,x,y){
  return templeCurrentAt(spec,world.state,x,y);
}
