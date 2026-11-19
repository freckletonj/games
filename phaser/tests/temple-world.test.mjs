import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import temple from '../levels/sunken-temple.json' with {type:'json'};
import {stepPlayerMotion} from '../src/player-motion.js';
import {surfaceGroundAt} from '../src/surface-geometry.js';
import {createTempleWorld,stepTempleWorld,templeInWater,templeBasinAt,
  templeBlockHorizontal,templeCurrent,snapshotTempleWorld,
  restoreTempleWorld} from '../src/temple-world.js';
import {setTempleValve,releaseTempleWheel} from '../src/temple-rules.js';
import {templeWaterColumns} from '../src/temple-scene.js';
import {templeShoreBounds,templeWaterMaskBounds} from '../src/temple-shoreline.js';

const scope={};scope.window=scope;vm.createContext(scope);
vm.runInContext(readFileSync(new URL('../../src/platform/world-compiler.js',
  import.meta.url),'utf8'),scope);
const level=scope.WW.worldCompiler.compile(temple);
const groundAt=x=>surfaceGroundAt(level,x);
const controls={left:false,right:false,up:false,down:false,jump:false,
  jumpPressed:false,upPressed:false};
const explorer=(x,y,id=0)=>({id,x,y,vx:0,vy:0,face:1,grounded:true,coyote:5,
  jumpBuffer:0,jumps:0,flaps:0,flapWait:0,powers:0,hover:0,breach:0,
  bloomWindow:0,form:null});

function simulation(player,templeWorld=createTempleWorld(temple)){
  const world={width:level.width*16,height:level.height*16,tile:16,
    groundAt,inWater:(x,y)=>templeInWater(templeWorld,groundAt,x,y),
    basinAt:x=>templeBasinAt(templeWorld,groundAt,x),
    currentAt:(x,y)=>templeCurrent(templeWorld,temple,x,y),
    waterBodies:templeWorld.waterBodies,thermalVolumes:[],
    platformSegments:level.platformSegments,
    movingPlatforms:[...templeWorld.decks,...templeWorld.crates],
    floorSegments:level.floorSegments,
    blockHorizontal:(from,to,feet)=>templeBlockHorizontal(
      temple,templeWorld,from,to,feet)};
  function step(actions={}){
    const input={...controls,...actions};
    stepTempleWorld(temple,templeWorld,[player],[input]);
    return stepPlayerMotion(player,input,1,world);
  }
  return {player,templeWorld,world,step};
}
function advance(step,ticks,actions=()=>({})){
  for(let i=0;i<ticks;i++)step(actions(i));
}

test('ordinary water-jump can board the low raft, which carries its rider to the high dock',()=>{
  const {player,templeWorld,step}=simulation(explorer(53*16,groundAt(53*16)));
  let boarded=false;
  const trace=[];
  for(let i=0;i<180;i++){
    const jump=i>10&&i%44>=12&&i%44<30;
    step({jump,jumpPressed:i>10&&i%44===12});
    if(i%12===0)trace.push([i,Math.round(player.y),player.onPlatform,
      player.floating,Math.round(templeWorld.decks[0].position[1])]);
    if(player.onPlatform==='courtyard-raft'){boarded=true;break;}
  }
  assert.ok(boarded,'Raft boarding trace '+JSON.stringify(trace));
  while(templeWorld.state.tick<420)step();
  assert.equal(templeWorld.state.surfaces.courtyard,42);
  assert.equal(player.onPlatform,'courtyard-raft');
  assert.ok(Math.abs(player.y-41*16)<.1);
  let jumpAt=-1,reached=false;
  for(let i=0;i<140;i++){
    if(jumpAt<0&&player.x>=55.5*16)jumpAt=i;
    const jump=jumpAt>=0&&i-jumpAt<22;
    step({right:true,jump,jumpPressed:i===jumpAt});
    if(player.x>=59*16&&player.y<=39*16+3){reached=true;break;}
  }
  assert.ok(reached,'Riding high and jumping from the raft must reach the right dock');
});

test('jump-spamming through the courtyard without its raft cannot reach the dock',()=>{
  const {player,templeWorld,step}=simulation(explorer(53*16,groundAt(53*16)));
  templeWorld.decks.find(d=>d.id==='courtyard-raft').enabled=false;
  let farthest=player.x;
  for(let i=0;i<950;i++){
    const jump=i%55<22;
    step({right:true,jump,jumpPressed:i%55===0});
    farthest=Math.max(farthest,player.x);
  }
  assert.ok(farthest<59*16,'No-raft route '+JSON.stringify({
    farthest,position:[player.x,player.y],ground:groundAt(player.x),
    surface:templeWorld.state.surfaces.courtyard}));
});

test('crate is blocked by the weir when low, clears it when floating, then latches the floor socket',()=>{
  const {player,templeWorld,step}=simulation(explorer(80*16-30,55*16+7));
  player.grounded=false;player.coyote=0;
  const crate=templeWorld.crates[0];
  advance(step,110,()=>({right:true}));
  assert.ok(crate.x<=87*16-crate.size[0]/2+.01);
  assert.equal(templeWorld.state.gates['sluice-gate'],false);
  templeWorld.state=setTempleValve(temple,templeWorld.state,'sluice-handle','fill');
  advance(step,270);
  assert.equal(templeWorld.state.surfaces.sluice,45);
  let crossed=false;
  for(let i=0;i<220;i++){
    step({right:true});
    if(crate.x>=93*16){crossed=true;break;}
  }
  assert.ok(crossed,'Player pushing must move a floating crate beyond the divider');
  assert.equal(templeWorld.state.gates['sluice-gate'],false,
    'A crate floating over a floor socket is not a solved puzzle');
  templeWorld.state=setTempleValve(temple,templeWorld.state,'sluice-drain','drain');
  advance(step,270);
  assert.equal(templeWorld.state.surfaces.sluice,55);
  assert.equal(templeWorld.state.plates['sluice-plate'],true);
  assert.equal(templeWorld.state.gates['sluice-gate'],true);
  templeWorld.state=setTempleValve(temple,templeWorld.state,'sluice-handle','fill');
  advance(step,270);
  assert.equal(templeWorld.state.gates['sluice-gate'],true,
    'A solved mechanical gate must not close after a valve reversal');
});

test('starting at the real valve, solo walking and filling moves the crate over the weir',()=>{
  const player=explorer(70*16,39*16),templeWorld=createTempleWorld(temple);
  const {step}=simulation(player,templeWorld),crate=templeWorld.crates[0];
  step({upPressed:true});
  assert.equal(templeWorld.state.modes['sluice-valve'],'fill');
  let pushed=false;
  for(let i=0;i<800;i++){
    step({right:true});
    if(crate.x>=93*16){pushed=true;break;}
  }
  assert.ok(pushed,'Solo valve-to-crate route: '+JSON.stringify({
    player:[player.x,player.y],crate:[crate.x,crate.y],
    surface:templeWorld.state.surfaces.sluice,tick:templeWorld.state.tick
  }));
  assert.equal(templeWorld.state.gates['sluice-gate'],false,
    'The gate should still require draining the crate onto its socket');
});

test('crate is a real standable platform and floats upward under the player',()=>{
  const templeWorld=createTempleWorld(temple),crate=templeWorld.crates[0];
  const player=explorer(crate.x,crate.y-66);
  player.grounded=false;player.coyote=0;
  const {step}=simulation(player,templeWorld);
  let landed=false;
  for(let i=0;i<70;i++){
    step();
    if(player.onPlatform===crate.id){landed=true;break;}
  }
  assert.ok(landed,
    'Falling onto a crate must physically land on its top, not pass through');
  assert.equal(player.y,crate.y);
  assert.ok(player.grounded);
  const initialY=player.y;
  templeWorld.state=setTempleValve(temple,templeWorld.state,'sluice-handle','fill');
  advance(step,75);
  assert.equal(player.onPlatform,crate.id);
  assert.ok(player.y<initialY-20,'The crate must lift a rider as the water fills');
  assert.equal(player.y,crate.y);
});

test('crate pushes only from braced side contact, never from a jump or from on top',()=>{
  const world=createTempleWorld(temple),crate=world.crates[0];
  const player=explorer(crate.x-crate.size[0]/2-12,crate.y+20);
  const first=crate.x;
  for(let tick=0;tick<16;tick++){
    player.y=crate.y+20;
    player.grounded=false;player.floating=false;
    stepTempleWorld(temple,world,[player],[{left:false,right:true,jump:true}]);
  }
  assert.equal(crate.x,first,'An airborne explorer may not remotely push the crate');
  player.grounded=true;
  stepTempleWorld(temple,world,[player],[{left:false,right:true}]);
  assert.ok(crate.x>first,'Bracing against its side should push the crate');
  player.x=crate.x;player.y=crate.y;
  player.onPlatform=crate.id;
  const held=crate.x;
  stepTempleWorld(temple,world,[player],[{left:false,right:true}]);
  assert.equal(crate.x,held,'Standing on a crate should not make it slide');
});

test('the gate collision disappears after the physical crate socket latches',()=>{
  const world=createTempleWorld(temple);
  const left=106*16-45,right=106*16+45,feet=42*16;
  assert.ok(templeBlockHorizontal(temple,world,left,right,feet)<106*16);
  const crate=world.crates[0];
  crate.x=93*16;
  crate.position=[crate.x,crate.y];
  stepTempleWorld(temple,world,[],[]);
  assert.equal(world.state.plates['sluice-plate'],true);
  assert.equal(world.state.gates['sluice-gate'],true);
  assert.equal(templeBlockHorizontal(temple,world,left,right,feet),right,
    'The greenlit exit must no longer be blocked by an invisible gate');
});

test('the low weir has a Tidefox-only diving tunnel, not a normal swimming bypass',()=>{
  const ordinary=simulation(explorer(86*16,groundAt(86*16)));
  advance(ordinary.step,100,()=>({right:true,down:true}));
  assert.ok(ordinary.player.x<87*16,
    'An untransformed explorer floats above the narrow underpass');
  const fox=explorer(86*16,groundAt(86*16));
  fox.form='tideling';fox.grounded=false;fox.coyote=0;
  const diver=simulation(fox);
  advance(diver.step,100,()=>({right:true,down:true}));
  assert.ok(fox.x>89*16,
    'Tidefox can descend through the two-tile floor tunnel');
  assert.equal(diver.templeWorld.state.gates['sluice-gate'],false,
    'The diving shortcut must not silently solve the crate puzzle');
});

test('solo valve inputs independently select fill, hold and drain',()=>{
  const {templeWorld,step}=simulation(explorer(70*16,39*16));
  step({upPressed:true});
  assert.equal(templeWorld.state.modes['sluice-valve'],'fill');
  const upper=simulation(explorer(102*16,42*16),templeWorld);
  upper.step({upPressed:true});
  assert.equal(templeWorld.state.modes['sluice-valve'],'hold');
  upper.step();
  upper.step({upPressed:true});
  assert.equal(templeWorld.state.modes['sluice-valve'],'drain');
});

test('sluice raft is boardable from water and can deliver the explorer to its upper control',()=>{
  const {player,templeWorld,step}=simulation(explorer(100*16,55*16+11));
  player.grounded=false;
  templeWorld.state=setTempleValve(temple,templeWorld.state,'sluice-handle','fill');
  advance(step,270);
  assert.equal(templeWorld.state.surfaces.sluice,45);
  let boarded=false;
  for(let i=0;i<160;i++){
    const jump=i%48>=8&&i%48<32;
    step({jump,jumpPressed:i%48===8});
    if(player.onPlatform==='sluice-raft'){boarded=true;break;}
  }
  assert.ok(boarded,'The sluice raft must be reachable from the water with held Jump');
  let ledge=false;
  for(let i=0;i<95;i++){
    step({right:true,jump:i<25,jumpPressed:i===0});
    if(player.x>=101*16&&player.y<=42*16+2&&player.grounded){
      ledge=true;break;
    }
  }
  assert.ok(ledge,'Riding the raft must make the drain-control balcony reachable');
  step({upPressed:true});
  assert.equal(templeWorld.state.modes['sluice-valve'],'hold');
});

test('head raft can be boarded and delivers the player to the cascade release ledge',()=>{
  const {player,templeWorld,step}=simulation(explorer(157*16,55*16+11));
  player.grounded=false;
  templeWorld.state=setTempleValve(temple,templeWorld.state,'cascade-handle','fill');
  advance(step,280);
  assert.equal(templeWorld.state.surfaces['wheel-head'],44);
  let boarded=false;
  for(let i=0;i<160;i++){
    const jump=i%48>=8&&i%48<32;
    step({jump,jumpPressed:i%48===8});
    if(player.onPlatform==='head-raft'){boarded=true;break;}
  }
  assert.ok(boarded,'The head raft must be reachable without simulated rider attachment');
  let ledge=false;
  for(let i=0;i<95;i++){
    step({right:true,jump:i<25,jumpPressed:i===0});
    if(player.x>=159*16&&player.y<=41*16+2&&player.grounded){
      ledge=true;break;
    }
  }
  assert.ok(ledge,'The release station should be a forgiving jump from the raft');
});

test('head wheel-release station cannot be reached from the water without the rising raft',()=>{
  const {player,templeWorld,step}=simulation(explorer(157*16,groundAt(157*16)));
  templeWorld.decks.find(d=>d.id==='head-raft').enabled=false;
  templeWorld.state=setTempleValve(temple,templeWorld.state,'cascade-handle','fill');
  let farthest=player.x;
  for(let i=0;i<1000;i++){
    const jump=i%55<25;
    step({right:true,jump,jumpPressed:i%55===0});
    farthest=Math.max(farthest,player.x);
  }
  assert.ok(farthest<164*16,
    'The head reservoir must require boarding the rising raft: '+
      JSON.stringify({farthest,y:player.y,surface:templeWorld.state.surfaces['wheel-head']}));
  assert.equal(templeWorld.state.released,false);
});

test('a closed sluice arch blocks walking and jumping above its upper ledge',()=>{
  const {player,templeWorld,step}=simulation(explorer(104*16,40*16));
  for(let i=0;i<210;i++){
    const jump=i%40===0;
    step({right:true,jump,jumpPressed:jump});
  }
  assert.equal(templeWorld.state.gates['sluice-gate'],false);
  assert.ok(player.x<=106*16-18,'Cannot jump over the entire stone doorway');
});

test('head reservoir alone cannot turn wheel; releasing water charges it and floods tail',()=>{
  const {templeWorld,step}=simulation(explorer(165*16,39*16));
  templeWorld.state=setTempleValve(temple,templeWorld.state,'cascade-handle','fill');
  advance(step,280);
  assert.equal(templeWorld.state.surfaces['wheel-head'],44);
  assert.equal(templeWorld.state.surfaces['wheel-tail'],55);
  assert.equal(templeWorld.state.gates['wheel-gate'],false);
  step({upPressed:true});
  assert.equal(templeWorld.state.released,true);
  advance(step,89);
  assert.equal(templeWorld.state.wheelActive,true);
  assert.equal(templeWorld.decks.find(d=>d.id==='wheel-bridge-a').enabled,true);
  assert.ok(templeWorld.state.surfaces['wheel-tail']<55);
  templeWorld.state=setTempleValve(temple,templeWorld.state,'cascade-handle','drain');
  advance(step,280);
  assert.equal(templeWorld.state.gates['wheel-gate'],true,
    'Once the mechanism catches, bridges remain safe');
  assert.equal(templeWorld.state.surfaces['wheel-tail'],42,
    'The latched wheel must finish filling the tail even if the head valve reverses');
});

function poweredTemple(){
  const world=createTempleWorld(temple),p=explorer(165*16,39*16);
  world.state=setTempleValve(temple,world.state,'cascade-handle','fill');
  advance(actions=>stepTempleWorld(temple,world,[p],[actions]),280);
  world.state=releaseTempleWheel(temple,world.state,'wheel-release');
  advance(actions=>stepTempleWorld(temple,world,[p],[actions]),350);
  assert.equal(world.state.wheelActive,true);
  assert.equal(world.state.surfaces['wheel-tail'],42);
  return world;
}

test('two intentional jumps bridge A → downstream raft → bridge B',()=>{
  const templeWorld=poweredTemple();
  const player=explorer(191*16,40*16);
  player.onPlatform='wheel-bridge-a';
  const {step}=simulation(player,templeWorld);
  let aboard=false,firstTrace=[];
  for(let i=0;i<120;i++){
    step({right:true,jump:i<25,jumpPressed:i===0});
    if(i%10===0)firstTrace.push([i,player.x,player.y,player.onPlatform,
      player.grounded,player.floating]);
    if(player.onPlatform==='tail-raft'){aboard=true;break;}
  }
  assert.ok(aboard,'Bridge A to raft '+JSON.stringify(firstTrace));
  for(let i=0;i<55&&player.x<199.85*16;i++)step({right:true});
  assert.equal(player.onPlatform,'tail-raft');
  let second=false;
  for(let i=0;i<130;i++){
    step({right:true,jump:i<25,jumpPressed:i===0});
    if(player.onPlatform==='wheel-bridge-b'){second=true;break;}
  }
  assert.ok(second,'The second jump must reach the final bridge');
  advance(step,150,()=>({right:true}));
  assert.ok(player.x>213*16,'The opened wheel gate must permit exit traversal');
});

test('without the middle raft, bridge A cannot be jumped directly to bridge B',()=>{
  const templeWorld=poweredTemple();
  templeWorld.decks.find(d=>d.id==='tail-raft').enabled=false;
  const player=explorer(191*16,40*16);
  player.onPlatform='wheel-bridge-a';
  const {step}=simulation(player,templeWorld);
  for(let i=0;i<450;i++){
    const jump=i%55<25;
    step({right:true,jump,jumpPressed:i%55===0});
  }
  assert.ok(player.x<203*16,'No-raft final '+JSON.stringify({
    x:player.x,y:player.y,platform:player.onPlatform,
    ground:groundAt(player.x),water:templeWorld.state.surfaces['wheel-tail']}));
});

test('two explorers share one valve detent and one physical crate push per tick',()=>{
  const world=createTempleWorld(temple);
  const valve=temple.valves[0],x=valve.at[0]*16,y=valve.at[1]*16;
  const players=[explorer(x,y),explorer(x+8,y,1)];
  stepTempleWorld(temple,world,players,[
    {upPressed:true},{upPressed:true}
  ]);
  assert.equal(world.state.modes['sluice-valve'],'fill');
  for(let i=0;i<270;i++)
    stepTempleWorld(temple,world,players,[{},{}]);
  const crate=world.crates[0],before=crate.x;
  players[0].x=crate.x-crate.size[0]/2-12;
  players[1].x=players[0].x;
  players[0].y=crate.y+11;
  players[1].y=crate.y+11;
  stepTempleWorld(temple,world,players,[
    {right:true,left:false},{right:true,left:false}
  ]);
  assert.ok(Math.abs(crate.x-before-1.8)<.001,
    'Two simultaneous players may not push the same crate twice');
});

test('filling Temple water has no unannounced horizontal current',()=>{
  const {player,templeWorld,step}=simulation(explorer(85*16,50*16));
  templeWorld.state=setTempleValve(temple,templeWorld.state,'sluice-handle','fill');
  advance(step,270);
  for(const form of [null,'tideling']){
    player.x=85*16;player.y=50*16;player.vx=0;player.vy=0;
    player.grounded=false;player.floating=false;player.coyote=0;player.form=form;
    const initial=player.x;
    advance(step,75);
    assert.ok(Math.abs(player.x-initial)<.1,
      'An idle '+(form??'ordinary')+' explorer must not drift on a filling tide');
  }
});

test('checkpoint rewind replays rider carry and water state exactly',()=>{
  const {player,templeWorld,step}=simulation(explorer(53*16,54*16));
  player.onPlatform='courtyard-raft';
  advance(step,140);
  const snapshot=snapshotTempleWorld(templeWorld),before={...player};
  const trace=()=>{
    const out=[];
    for(let i=0;i<160;i++){
      const jump=i===30;
      step({right:i>=70&&i<90,jump,jumpPressed:jump});
      if(i%20===0)out.push([player.x,player.y,player.onPlatform,
        templeWorld.state.surfaces.courtyard,templeWorld.decks[0].position[1]]);
    }
    return out;
  };
  const expected=trace();
  restoreTempleWorld(temple,templeWorld,snapshot);
  Object.assign(player,before);
  assert.deepEqual(trace(),expected);
});

test('runtime water masks are clipped to compiled physical ground at every level',()=>{
  const world=createTempleWorld(temple);
  const atStart=templeWaterColumns(world,groundAt);
  assert.ok(atStart.length>0);
  for(const strip of atStart){
    assert.ok(strip.height>0);
    assert.ok(Math.abs(strip.y+strip.height-
      groundAt(strip.x+strip.width/2))<.001);
  }
  world.state=setTempleValve(temple,world.state,'sluice-handle','fill');
  const person=explorer(10*16,groundAt(10*16));
  for(let tick=0;tick<420;tick++)
    stepTempleWorld(temple,world,[person],[controls]);
  const raised=templeWaterColumns(world,groundAt);
  const sluice=raised.filter(strip=>strip.x>=74*16&&strip.x<103*16);
  assert.ok(sluice.length>0);
  assert.ok(sluice.every(strip=>strip.y===45*16));
});

test('Temple water meets each sloping bank with no rectangular shoreline gap',()=>{
  const world=createTempleWorld(temple);
  const basin=world.waterBodies.find(b=>b.id==='courtyard');
  for(const height of [55,49,42]){
    basin.surface=height;
    const {left,right,y}=templeShoreBounds(basin,groundAt);
    assert.ok(left<basin.start*16,'Water must reach the left slope');
    assert.ok(right>basin.end*16,'Water must reach the right slope');
    assert.ok(Math.abs(groundAt(left)-y)<1);
    assert.ok(Math.abs(groundAt(right)-y)<1);
    assert.equal(templeInWater(world,groundAt,(basin.start+1)*16,y+10),true);
    assert.equal(templeInWater(world,groundAt,left-4,y+10),false);
    const strips=templeWaterColumns(world,groundAt,4);
    assert.ok(strips.some(strip=>strip.x<basin.start*16));
    assert.ok(strips.some(strip=>strip.x+strip.width>basin.end*16));
  }
});

test('sloping Temple shorelines are wet in both the rendered and physics model',()=>{
  const world=createTempleWorld(temple);
  const courtyard=world.waterBodies.find(b=>b.id==='courtyard');
  courtyard.surface=42;
  const {left,right,y}=templeShoreBounds(courtyard,groundAt);
  for(const x of [(left+courtyard.start*16)/2,
    (right+courtyard.end*16)/2]){
    const bottom=groundAt(x);
    assert.ok(bottom>y+10,'The bank has visible water depth');
    assert.equal(templeBasinAt(world,groundAt,x)?.id,'courtyard');
    assert.equal(templeInWater(world,groundAt,x,(y+bottom)/2),true);
  }
  const player=explorer((left+courtyard.start*16)/2,
    groundAt((left+courtyard.start*16)/2));
  const physics={width:level.width*16,height:level.height*16,tile:16,
    groundAt,waterBodies:world.waterBodies,thermalVolumes:[],
    platformSegments:level.platformSegments,movingPlatforms:[],
    inWater:(x,y)=>templeInWater(world,groundAt,x,y),
    basinAt:x=>templeBasinAt(world,groundAt,x)};
  stepPlayerMotion(player,controls,1,physics);
  assert.equal(player.floating,true,
    'Entering the wet bank must not remain ordinary dry-ground walking');
});


test('a fixed high-tide basin mask contains every possible waterline',()=>{
  for(const volume of temple.waterVolumes){
    const full=templeWaterMaskBounds(volume,groundAt);
    for(let surface=volume.maxSurface;surface<=volume.minSurface;surface+=.1){
      const bounds=templeShoreBounds({
        start:volume.from,end:volume.to,surface
      },groundAt);
      assert.ok(bounds.left>=full.left-.1,volume.id+' left bank escapes mask');
      assert.ok(bounds.right<=full.right+.1,volume.id+' right bank escapes mask');
      assert.ok(bounds.y>=full.y,volume.id+' water rises above its mask');
    }
  }
});

test('a water splash outside the flooded basins has no water surface',()=>{
  const world=createTempleWorld(temple);
  assert.equal(templeBasinAt(world,groundAt,12*16),null);
  assert.equal(templeBasinAt(world,groundAt,223*16),null);
  const courtyard=world.waterBodies.find(b=>b.id==='courtyard');
  courtyard.surface=46;
  const {left}=templeShoreBounds(courtyard,groundAt);
  assert.equal(templeBasinAt(world,groundAt,left+15)?.id,'courtyard');
});
