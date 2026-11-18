import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import palace from '../levels/mirror-palace.json' with {type:'json'};
import {stepPlayerMotion} from '../src/player-motion.js';
import {surfaceGroundAt} from '../src/surface-geometry.js';
import {createPalaceWorld,stepPalaceWorld,restorePalaceWorld} from '../src/palace-world.js';
import {tracePalaceBeams,setMirrorDetent} from '../src/palace-rules.js';
import {deckTopAt} from '../src/moving-platforms.js';

const scope={};scope.window=scope;vm.createContext(scope);
vm.runInContext(readFileSync(new URL('../../src/platform/world-compiler.js',
  import.meta.url),'utf8'),scope);
const level=scope.WW.worldCompiler.compile(palace);
const groundAt=x=>surfaceGroundAt(level,x);
const explorer=(id,x,y)=>({id,x,y,vx:0,vy:0,face:1,grounded:true,coyote:5,
  jumpBuffer:0,jumps:0,flaps:0,flapWait:0,powers:0,hover:0,
  breach:0,bloomWindow:0,form:null});
const controls={left:false,right:false,upPressed:false,jump:false,jumpPressed:false};

function simulation(players){
  const palaceWorld=createPalaceWorld(palace);
  const world={width:level.width*16,height:level.height*16,tile:16,
    groundAt,inWater:()=>false,waterBodies:[],thermalVolumes:[],
    platformSegments:level.platformSegments,movingPlatforms:palaceWorld.decks};
  function step(actions){
    stepPalaceWorld(palace,palaceWorld,players,actions);
    for(const player of players)stepPlayerMotion(player,
      {...controls,...actions[player.id]},1,world);
  }
  return {palaceWorld,world,step};
}

test('normal Up input locks the atrium mirror to a lit bridge after telegraph',()=>{
  const x=36*16,player=explorer(0,x,groundAt(x));
  const {palaceWorld,step}=simulation([player]);
  const bridge=palaceWorld.decks.find(d=>d.id==='atrium-crystal');
  assert.equal(bridge.enabled,false);
  assert.equal(deckTopAt(bridge,bridge.position[0]),null);
  step([{upPressed:true}]);
  assert.equal(palaceWorld.state.mirrors['atrium-mirror'],-45);
  assert.ok(tracePalaceBeams(palace,palaceWorld.state).lit.includes('atrium-target'));
  assert.equal(bridge.enabled,false,'The painted outline must preview first');
  for(let tick=0;tick<24;tick++)step([controls]);
  assert.equal(bridge.enabled,true);
  assert.equal(deckTopAt(bridge,bridge.position[0]),bridge.position[1]);
  player.x=bridge.position[0];player.y=bridge.position[1]-6;
  player.vy=6;player.grounded=false;player.coyote=0;
  step([controls]);
  assert.equal(player.onPlatform,bridge.id);
  assert.equal(player.y,bridge.position[1]);
});

test('a bridge preserves its rider during a phase-off transition',()=>{
  const x=36*16,player=explorer(0,x,groundAt(x));
  const {palaceWorld,step}=simulation([player]);
  step([{upPressed:true}]);
  for(let i=0;i<30;i++)step([controls]);
  const deck=palaceWorld.decks.find(d=>d.id==='atrium-crystal');
  assert.equal(deck.enabled,true);
  player.x=deck.position[0];player.y=deck.position[1];
  player.onPlatform=deck.id;player.grounded=true;
  palaceWorld.state=setMirrorDetent(palace,palaceWorld.state,
    'atrium-mirror',45);
  for(let tick=0;tick<90;tick++)step([controls]);
  assert.equal(deck.enabled,true,'Occupied platform cannot vanish');
  player.x=36*16;player.y=groundAt(player.x);
  player.onPlatform=null;player.grounded=true;
  step([controls]);
  assert.equal(deck.enabled,false);
});

test('a solid platform never materializes inside an occupied body',()=>{
  const x=36*16,player=explorer(0,x,groundAt(x));
  const {palaceWorld,step}=simulation([player]);
  const deck=palaceWorld.decks.find(d=>d.id==='atrium-crystal');
  player.x=deck.position[0];player.y=deck.position[1]+8;
  player.grounded=false;player.vy=0;player.coyote=0;
  palaceWorld.state=setMirrorDetent(palace,palaceWorld.state,
    'atrium-mirror',-45);
  // Keep the body in the geometric intersection while checking the
  // solver; actual movement would normally let a falling explorer leave.
  for(let i=0;i<60;i++)stepPalaceWorld(palace,palaceWorld,[player],[controls]);
  assert.equal(deck.enabled,false);
  player.x=36*16;player.y=groundAt(player.x);player.vy=0;player.grounded=true;
  step([controls]);
  assert.equal(deck.enabled,true);
});

test('two explorers operating a shared mirror at the same tick move one detent',()=>{
  const x=36*16;
  const players=[explorer(0,x,groundAt(x)),
    explorer(1,x+10,groundAt(x+10))];
  const {palaceWorld,step}=simulation(players);
  step([{upPressed:true},{upPressed:true}]);
  assert.equal(palaceWorld.state.mirrors['atrium-mirror'],-45);
  assert.equal(palaceWorld.state.platforms['atrium-crystal'].solid,false);
});

test('checkpoint reset restores finite mirror states and platform collision',()=>{
  const x=36*16,player=explorer(0,x,groundAt(x));
  const {palaceWorld,step}=simulation([player]);
  const checkpoint=palaceWorld.state;
  step([{upPressed:true}]);
  for(let i=0;i<40;i++)step([controls]);
  assert.equal(palaceWorld.decks.find(d=>d.id==='atrium-crystal').enabled,true);
  restorePalaceWorld(palaceWorld,checkpoint);
  assert.equal(palaceWorld.state.tick,0);
  assert.equal(palaceWorld.state.mirrors['atrium-mirror'],45);
  assert.equal(palaceWorld.decks.find(d=>d.id==='atrium-crystal').enabled,false);
  step([{upPressed:true}]);
  assert.equal(palaceWorld.state.mirrors['atrium-mirror'],-45);
});
