import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import palace from '../levels/mirror-palace.json' with {type:'json'};
import {stepPlayerMotion} from '../src/player-motion.js';
import {surfaceGroundAt,surfaceMaterialColumn} from '../src/surface-geometry.js';
import {createPalaceWorld,stepPalaceWorld,restorePalaceWorld,
  palaceBlockHorizontal} from '../src/palace-world.js';
import {tracePalaceBeams,setMirrorDetent,
  createPalaceState} from '../src/palace-rules.js';
import {deckTopAt} from '../src/moving-platforms.js';

const scope={};scope.window=scope;vm.createContext(scope);
vm.runInContext(readFileSync(new URL('../../src/platform/world-compiler.js',
  import.meta.url),'utf8'),scope);
const level=scope.WW.worldCompiler.compile(palace);
level.materialColumn=x=>surfaceMaterialColumn(level,x);
const groundAt=x=>surfaceGroundAt(level,x);
const explorer=(id,x,y)=>({id,x,y,vx:0,vy:0,face:1,grounded:true,coyote:5,
  jumpBuffer:0,jumps:0,flaps:0,flapWait:0,powers:0,hover:0,
  breach:0,bloomWindow:0,form:null});
const controls={left:false,right:false,upPressed:false,jump:false,jumpPressed:false};

function simulation(players){
  const palaceWorld=createPalaceWorld(palace);
  const world={width:level.width*16,height:level.height*16,tile:16,
    groundAt,inWater:()=>false,waterBodies:[],thermalVolumes:[],
    platformSegments:level.platformSegments,movingPlatforms:palaceWorld.decks,
    blockHorizontal:(from,to,feet)=>palaceBlockHorizontal(
      palace,palaceWorld,from,to,feet)};
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

test('rock from the compiled material classifier blocks a beam before its target',()=>{
  const initial=createPalaceState(palace);
  const turned=setMirrorDetent(palace,initial,'atrium-mirror',-45);
  const unobstructed=tracePalaceBeams(palace,turned);
  assert.ok(unobstructed.lit.includes('atrium-target'));
  const physical=createPalaceWorld(palace,level);
  assert.equal(physical.solidAt(4*16,50*16),true);
  assert.equal(physical.solidAt(4*16,25*16),false);
  assert.ok(tracePalaceBeams(palace,turned,{solidAt:physical.solidAt})
    .lit.includes('atrium-target'));
  const artificialRock=(x,y)=>physical.solidAt(x,y)||
    (x>=31*16&&x<=32*16&&y>25*16&&y<33*16);
  const blocked=tracePalaceBeams(palace,turned,{solidAt:artificialRock});
  assert.ok(!blocked.lit.includes('atrium-target'));
  const segment=blocked.segments.find(segment=>segment.source==='atrium-sun');
  assert.equal(segment.hit,null);
  assert.ok(Math.abs(segment.to[0]-31*16)<.01);
});

function runPalaceRoute(humans,operateMirrors){
  const players=Array.from({length:humans},(_,id)=>
    explorer(id,72+30*id,groundAt(72+30*id)));
  const {palaceWorld,step}=simulation(players);
  // Use the same player movement, phase collision and optical rock mask as
  // the scene, without painting, gamepad or animation dependencies.
  palaceWorld.solidAt=(x,y)=>{
    const material=level.materialColumn(x)(y);
    return material==='rock'||material==='shelf';
  };
  const touched=new Set(),activations=new Map();
  const relic=level.objects.find(item=>item.kind==='springKey');
  const exit=level.objects.find(item=>item.kind==='exit');
  const center=item=>[(item.x+.5)*16,(item.y+.5)*16-12];
  const [rx,ry]=center(relic),[ex,ey]=center(exit);
  let light=false,finished=false;
  for(let tick=0;tick<2900;tick++){
    const actions=players.map(player=>{
      let upPressed=false;
      if(operateMirrors&&player.id===0){
        const candidates=[...palace.mirrors,
          palace.shutters.find(shutter=>shutter.id==='eclipse-shutter')];
        const closest=candidates.map(control=>({
          control,distance:Math.hypot(
            player.x-control.controlAt[0]*16,
            player.y-control.controlAt[1]*16)
        })).filter(item=>item.distance<30)
          .sort((a,b)=>a.distance-b.distance)[0];
        if(closest){
          const id=closest.control.id,required=id==='observatory-prism'?2:1;
          const count=activations.get(id)??0;
          if(count<required&&tick%3===0){
            activations.set(id,count+1);
            upPressed=true;
            touched.add(id);
          }
        }
      }
      const jumpForRelic=!light&&player.x>rx-90&&
        player.x<rx-50&&player.grounded;
      const jump=tick%18===0||jumpForRelic;
      return {...controls,right:true,upPressed,jump,jumpPressed:jump};
    });
    step(actions);
    if(players.some(player=>Math.abs(player.x-rx)<19&&
      Math.abs(player.y-ry)<26))light=true;
    if(light&&players.every(player=>
      Math.abs(player.x-ex)<28&&Math.abs(player.y-ey)<26)){
      finished=true;
      return {players,palaceWorld,tick,light,finished,activated:[...touched]};
    }
  }
  return {players,palaceWorld,tick:2900,light,finished,activated:[...touched]};
}

test('closed optical gates prevent bypassing every unsolved puzzle',()=>{
  const route=runPalaceRoute(1,false);
  assert.equal(route.finished,false);
  assert.equal(route.light,false);
  assert.ok(route.players[0].x<72*16,
    'The first glass door is a physical collision barrier');
  assert.ok(Object.values(route.palaceWorld.state.gates).every(open=>!open));
});

test('normal input solves all three beams and physically reaches light and exit',()=>{
  const result=runPalaceRoute(1,true);
  assert.ok(result.finished,'The solo explorer must physically reach the exit');
  assert.ok(result.light,'The floating Palace Light must be touched');
  assert.ok(Object.values(result.palaceWorld.state.gates).every(Boolean));
  assert.deepEqual(result.activated,
    ['atrium-mirror','gallery-mirror-a','gallery-mirror-b',
      'observatory-prism','eclipse-shutter']);
  assert.ok(result.tick<2000);
  assert.equal(runPalaceRoute(1,true).tick,result.tick,
    'Replaying the same 60 Hz input sequence produces the exact arrival tick');
});

test('two active explorers can both physically reach the Palace exit',()=>{
  const result=runPalaceRoute(2,true);
  assert.equal(result.finished,true);
  assert.equal(result.light,true);
  assert.equal(result.players.length,2);
  assert.ok(Object.values(result.palaceWorld.state.gates).every(Boolean));
});

test('the closed Eclipse shutter prevents prism-gate bypass until used',()=>{
  const x=180*16,player=explorer(0,x,groundAt(x));
  const {palaceWorld,step}=simulation([player]);
  palaceWorld.state=setMirrorDetent(palace,palaceWorld.state,
    'observatory-prism',-45);
  for(let tick=0;tick<620;tick++)step([controls]);
  assert.equal(palaceWorld.state.gates['observatory-light-gate'],false,
    'An eclipse opening must not ignore the authored blocking shutter');
  step([{upPressed:true}]);
  assert.equal(palaceWorld.state.shutters['eclipse-shutter'],'open');
  for(let tick=0;tick<620&&
    !palaceWorld.state.gates['observatory-light-gate'];tick++)step([controls]);
  assert.equal(palaceWorld.state.gates['observatory-light-gate'],true,
    'A physically clear prism beam must open the observatory door');
});
