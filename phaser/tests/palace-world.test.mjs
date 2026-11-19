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
  const touched=new Set(),visitedExit=new Set();
  const relic=level.objects.find(item=>item.kind==='springKey');
  const exit=level.objects.find(item=>item.kind==='exit');
  const center=item=>[(item.x+.5)*16,(item.y+.5)*16-12];
  const [rx,ry]=center(relic),[ex,ey]=center(exit);
  let light=false,finished=false;
  for(let tick=0;tick<2900;tick++){
    const actions=players.map(player=>{
      if(operateMirrors&&player.id===0){
        const relay=palace.circuitSwitches.find(relay=>!touched.has(relay.id)&&
          Math.hypot(player.x-relay.at[0]*16,
            player.y-relay.at[1]*16)<38);
        if(relay){
          // The world receives the same named orb hit as the live Phaser
          // projectile collision, then advances ordinary player movement.
          palaceWorld.orbHits.push(relay.id);
          touched.add(relay.id);
        }
      }
      const jumpForRelic=!light&&player.x>rx-90&&
        player.x<rx-50&&player.grounded;
      // The final terrace is flat; do not repeatedly hop past its
      // important grounded Light and exit.
      const jump=player.x<200*16&&(tick%18===0||jumpForRelic);
      return {...controls,right:true,jump,jumpPressed:jump};
    });
    step(actions);
    if(players.some(player=>Math.abs(player.x-rx)<19&&
      Math.abs(player.y-ry)<26))light=true;
    for(const player of players)
      if(Math.abs(player.x-ex)<28&&Math.abs(player.y-ey)<26)
        visitedExit.add(player.id);
    // Co-op explorers need to traverse the real exit, not arrive on the
    // identical simulation tick. The production game only needs one to
    // enter after the shared Light is collected.
    if(light&&visitedExit.size===players.length){
      finished=true;
      return {players,palaceWorld,tick,light,finished,
        activated:[...touched],visitedExit:[...visitedExit]};
    }
  }
  return {players,palaceWorld,tick:2900,light,finished,
    activated:[...touched],visitedExit:[...visitedExit]};
}

test('compiled Palace doorways are human-scale and rooted in their rock bank',()=>{
  for(const gate of palace.beamGates){
    const x=gate.at[0]*16,top=gate.at[1]*16;
    const visible=groundAt(x)-top;
    assert.ok(visible>=64&&visible<=192,
      gate.id+' is a misplaced sky-height gate, not a doorway');
    assert.ok(top+gate.size[1]>=groundAt(x),
      gate.id+' does not seal its physical bank');
  }
});

test('closed colored doors resist ordinary jumps and swimming-form movement',()=>{
  for(const gate of palace.beamGates){
    for(const form of [null,'tideling']){
      for(const period of [37,55,73]){
        const x=(gate.at[0]-2.5)*16;
        const player=explorer(0,x,groundAt(x));
        player.form=form;
        const {step,palaceWorld}=simulation([player]);
        let farthest=player.x;
        for(let tick=0;tick<650;tick++){
          const jump=tick%period<24;
          step([{right:true,jump,jumpPressed:tick%period===0}]);
          farthest=Math.max(farthest,player.x);
        }
        assert.equal(palaceWorld.state.gates[gate.id],false);
        assert.ok(farthest<gate.at[0]*16,
          'Palace gate bypass '+gate.id+' '+(form??'ordinary')+
          ' period '+period+' x='+(farthest/16).toFixed(2));
      }
    }
  }
});

test('Palace gates cannot be hopped from the real upper approach shelves',()=>{
  const approach=[{gate:'atrium-light-gate',x:73.5,y:40},
    {gate:'gallery-light-gate',x:134,y:39},
    {gate:'observatory-light-gate',x:192,y:35}];
  for(const {gate:gateId,x,y} of approach){
    const gate=palace.beamGates.find(g=>g.id===gateId);
    for(const period of [31,43,61]){
      const player=explorer(0,x*16,y*16);
      const {step,palaceWorld}=simulation([player]);
      let farthest=player.x;
      for(let tick=0;tick<650;tick++){
        const jump=tick%period<24;
        step([{right:true,jump,jumpPressed:tick%period===0}]);
        farthest=Math.max(farthest,player.x);
      }
      assert.equal(palaceWorld.state.gates[gateId],false);
      assert.ok(farthest<gate.at[0]*16,
        gateId+' jumped from ledge with cycle '+period+
        ' at '+(farthest/16).toFixed(2));
    }
  }
});

test('the flapping Palace creature is earned after the required optical doors',()=>{
  const moth=palace.creatures.find(c=>c[0]==='glimmermoth');
  assert.ok(moth[1]>Math.max(...palace.beamGates.map(g=>g.at[0])),
    'Players cannot obtain flight before traversing all three relay-controlled doors');
});

test('closed optical gates prevent bypassing every unsolved puzzle',()=>{
  const route=runPalaceRoute(1,false);
  assert.equal(route.finished,false);
  assert.equal(route.light,false);
  assert.ok(route.players[0].x<75*16,
    'The first glass door is a physical collision barrier');
  assert.ok(Object.values(route.palaceWorld.state.gates).every(open=>!open));
});

test('three single-hit room relays open the real path to the Light and exit',()=>{
  const result=runPalaceRoute(1,true);
  assert.ok(result.finished,'The solo explorer must physically reach the exit');
  assert.ok(result.light,'The floating Palace Light must be touched');
  assert.ok(Object.values(result.palaceWorld.state.gates).every(Boolean));
  assert.deepEqual(result.activated,
    ['blue-relay','pink-relay','gold-relay']);
  assert.ok(result.tick<2000);
  assert.equal(runPalaceRoute(1,true).tick,result.tick,
    'Replaying the same 60 Hz input sequence produces the exact arrival tick');
});

test('two active explorers can both physically reach the Palace exit',()=>{
  const result=runPalaceRoute(2,true);
  assert.equal(result.finished,true,JSON.stringify({
    players:result.players.map(p=>({x:p.x,y:p.y,platform:p.onPlatform})),
    gates:result.palaceWorld.state.gates,activated:result.activated,
    light:result.light,visitedExit:result.visitedExit,tick:result.tick
  }));
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
  palaceWorld.orbHits.push('gold-relay');
  step([controls]);
  assert.equal(palaceWorld.state.shutters['eclipse-shutter'],'open');
  for(let tick=0;tick<620&&
    !palaceWorld.state.gates['observatory-light-gate'];tick++)step([controls]);
  assert.equal(palaceWorld.state.gates['observatory-light-gate'],true,
    'A physically clear prism beam must open the observatory door');
});


test('a room orb relay permanently illuminates its matching bridge',()=>{
  const x=36*16,player=explorer(0,x,groundAt(x));
  const {palaceWorld,step}=simulation([player]);
  palaceWorld.orbHits.push('blue-relay','blue-relay');
  step([controls]);
  assert.equal(palaceWorld.state.mirrors['atrium-mirror'],-45);
  assert.deepEqual(palaceWorld.orbHits,[]);
  for(let tick=0;tick<25;tick++)step([controls]);
  assert.equal(palaceWorld.decks.find(d=>d.id==='atrium-crystal').enabled,true);
  palaceWorld.orbHits.push('blue-relay');
  step([controls]);
  assert.equal(palaceWorld.state.mirrors['atrium-mirror'],-45);
  assert.equal(palaceWorld.decks.find(d=>d.id==='atrium-crystal').enabled,true);
});

test('orb-activated Eclipse shutter participates in the physical beam gate',()=>{
  const x=180*16,player=explorer(0,x,groundAt(x));
  const {palaceWorld,step}=simulation([player]);
  palaceWorld.state=setMirrorDetent(palace,palaceWorld.state,'observatory-prism',-45);
  for(let tick=0;tick<65;tick++)step([controls]);
  assert.equal(palaceWorld.state.gates['observatory-light-gate'],false);
  palaceWorld.orbHits.push('gold-relay');
  for(let tick=0;tick<150;tick++)step([controls]);
  assert.equal(palaceWorld.state.shutters['eclipse-shutter'],'open');
  assert.equal(palaceWorld.state.gates['observatory-light-gate'],true);
});


test('the three visible orb relays are reachable from their walkways',()=>{
  assert.equal(palace.circuitSwitches.length,3);
  for(const control of palace.circuitSwitches){
    const x=control.at[0]*16,y=control.at[1]*16;
    const launchY=groundAt(x)-17;
    assert.ok(Math.abs(launchY-y)<=34,
      control.id+' must be reachable from the playable walkway with an orb');
  }
});
