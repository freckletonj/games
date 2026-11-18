import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import templeSpec from '../levels/sunken-temple.json' with {type:'json'};
import palaceSpec from '../levels/mirror-palace.json' with {type:'json'};
import raceSpec from '../levels/skybound-stampede.json' with {type:'json'};
import {validateFutureChapter} from '../src/future-chapter-validation.js';
import {createTempleState,setTempleValve,stepTemple,buoyantPosition,
  buoyantCarry,templeCurrentAt} from '../src/temple-rules.js';
import {createPalaceState,setMirrorDetent,setPalaceShutter,
  tracePalaceBeams,stepPalace,occluderPosition} from '../src/palace-rules.js';
import {raceReadiness,createRaceState,stepRace,raceHazardPose} from '../src/race-rules.js';

const scope={};
scope.window=scope;
vm.createContext(scope);
vm.runInContext(readFileSync(new URL('../../src/platform/world-compiler.js',
  import.meta.url),'utf8'),scope);
const specs=[templeSpec,palaceSpec,raceSpec];

test('all three unregistered layouts compile with the production geometry compiler',()=>{
  for(const spec of specs){
    assert.equal(validateFutureChapter(spec),true);
    const result=scope.WW.worldCompiler.analyze(spec);
    assert.deepEqual(Array.from(result.errors),[],spec.id);
    const compiled=scope.WW.worldCompiler.compile(spec);
    assert.equal(compiled.width,spec.width);
    assert.equal(compiled.sections.length,spec.sections.length);
    assert.ok(compiled.platformSegments.length>0);
    assert.equal(compiled.objects.find(object=>object.kind==='springKey').x,
      spec.relic[1]);
  }
});

test('water tide, valve reversals and raft carry are fixed-tick and repeatable',()=>{
  const run=()=>{
    let state=createTempleState(templeSpec);
    for(let tick=0;tick<420;tick++)state=stepTemple(templeSpec,state);
    assert.equal(state.surfaces.courtyard,42);
    const high=state;
    for(let tick=0;tick<420;tick++)state=stepTemple(templeSpec,state);
    assert.equal(state.surfaces.courtyard,55);
    state=setTempleValve(templeSpec,state,'sluice-handle','fill');
    for(let tick=0;tick<400;tick++)state=stepTemple(templeSpec,state);
    assert.equal(state.surfaces.sluice,45);
    assert.ok(buoyantCarry(templeSpec,createTempleState(templeSpec),state,
      'sluice-raft').y<0);
    assert.equal(buoyantPosition(templeSpec,state,'sluice-raft').y,43.5*16);
    assert.ok(templeCurrentAt(templeSpec,state,85*16,50*16)>0);
    state=setTempleValve(templeSpec,state,'sluice-handle','hold');
    state=stepTemple(templeSpec,state);
    assert.equal(state.surfaces.sluice,45);
    assert.equal(templeCurrentAt(templeSpec,state,85*16,50*16),0);
    state=setTempleValve(templeSpec,state,'sluice-handle','drain');
    for(let tick=0;tick<400;tick++)state=stepTemple(templeSpec,state);
    assert.equal(state.surfaces.sluice,55);
    return {state,high};
  };
  assert.deepEqual(run(),run());
});

test('pressure plate needs an actual crate contact; wheel triggers linked flood',()=>{
  let state=createTempleState(templeSpec);
  assert.equal(stepTemple(templeSpec,state).gates['sluice-gate'],false);
  state=setTempleValve(templeSpec,state,'sluice-handle','fill');
  state=setTempleValve(templeSpec,state,'cascade-handle','fill');
  for(let i=0;i<300;i++)state=stepTemple(templeSpec,state);
  assert.equal(state.wheelActive,false,'Filling alone cannot turn the wheel');
  assert.equal(state.surfaces['wheel-tail'],55);
  state={...state,released:true};
  for(let i=0;i<95;i++)state=stepTemple(templeSpec,state);
  assert.equal(state.wheelActive,true);
  assert.ok(state.surfaces['wheel-tail']<55);
  const crate=templeSpec.buoyantObjects.find(o=>o.id==='timber-crate');
  state=stepTemple(templeSpec,state,{cratePositions:{
    'timber-crate':{x:93*16,y:57*16-crate.size[1]}
  }});
  assert.equal(state.plates['sluice-plate'],true);
  assert.equal(state.gates['sluice-gate'],true);
  state=stepTemple(templeSpec,state);
  assert.equal(state.gates['sluice-gate'],true,'A solved gate must latch');
});

test('mirror detents generate finite, geometric beam paths and target hits',()=>{
  let state=createPalaceState(palaceSpec);
  assert.ok(!tracePalaceBeams(palaceSpec,state).lit.includes('atrium-target'));
  state=setMirrorDetent(palaceSpec,state,'atrium-mirror',-45);
  assert.ok(tracePalaceBeams(palaceSpec,state).lit.includes('atrium-target'));
  state=setMirrorDetent(palaceSpec,state,'gallery-mirror-a',-45);
  state=setMirrorDetent(palaceSpec,state,'gallery-mirror-b',-45);
  assert.ok(tracePalaceBeams(palaceSpec,state).lit.includes('gallery-target'));
  state=setPalaceShutter(palaceSpec,state,'gallery-shutter','closed');
  assert.ok(!tracePalaceBeams(palaceSpec,state).lit.includes('gallery-target'));
  const beams=tracePalaceBeams(palaceSpec,state).segments;
  assert.ok(beams.length<=palaceSpec.lightSources.length*
    (palaceSpec.opticalRules.maxBounces+1));
  assert.ok(beams.every(beam=>[...beam.from,...beam.to].every(Number.isFinite)));
  assert.deepEqual(occluderPosition(palaceSpec.occluders[0],0),
    occluderPosition(palaceSpec.occluders[0],600));
  assert.throws(()=>setMirrorDetent(palaceSpec,state,'atrium-mirror',17));
});

test('phase platforms telegraph changes and never change collision inside a rider',()=>{
  let state=createPalaceState(palaceSpec);
  state=setMirrorDetent(palaceSpec,state,'atrium-mirror',-45);
  state=stepPalace(palaceSpec,state);
  assert.equal(state.platforms['atrium-crystal'].solid,false);
  for(let i=0;i<80;i++)state=stepPalace(palaceSpec,state,
    {occupiedPlatformIds:['atrium-crystal']});
  assert.equal(state.platforms['atrium-crystal'].solid,false);
  state=stepPalace(palaceSpec,state);
  assert.equal(state.platforms['atrium-crystal'].solid,true);
  state=setMirrorDetent(palaceSpec,state,'atrium-mirror',45);
  for(let i=0;i<80;i++)state=stepPalace(palaceSpec,state,
    {occupiedPlatformIds:['atrium-crystal']});
  assert.equal(state.platforms['atrium-crystal'].solid,true);
  state=stepPalace(palaceSpec,state);
  assert.equal(state.platforms['atrium-crystal'].solid,false);
});

test('solo, co-op and cloud assist readiness gates require distinct correct mounts',()=>{
  const unicornA={kind:'unicorn'},unicornB={kind:'unicorn'},
    pegasusA={kind:'pegasus'};
  const one={id:0,mount:unicornA};
  const two={id:1,mount:null};
  assert.equal(raceReadiness([one],'unicorn').ready,true);
  assert.equal(raceReadiness([one,two],'unicorn').ready,false);
  assert.equal(raceReadiness([one,{...two,mount:unicornA}],'unicorn').ready,false);
  assert.equal(raceReadiness([one,{...two,mount:unicornB}],'unicorn').ready,true);
  assert.equal(raceReadiness([one,{...two,assist:true}],'unicorn').ready,true);
  assert.equal(raceReadiness([{...one,mount:pegasusA}],'unicorn').ready,false);
  assert.equal(raceReadiness([{...one,bubble:true}],'unicorn').ready,false);
});

test('race stops at sanctuary and requires every Pegasus for the second stage',()=>{
  const players=[{id:0,mount:{kind:'unicorn'}},{id:1,mount:{kind:'unicorn'}}];
  let state=createRaceState(raceSpec);
  state=stepRace(raceSpec,state,players);
  assert.equal(state.phase,'groundScroll');
  for(let i=0;i<1000&&state.phase==='groundScroll';i++)
    state=stepRace(raceSpec,state,players);
  assert.equal(state.phase,'sanctuaryStop');
  assert.equal(state.anchor,184*16);
  const stopTick=state.tick;
  state=stepRace(raceSpec,state,players);
  assert.equal(state.phase,'waitingForPegasi');
  assert.equal(state.anchor,184*16);
  assert.equal(state.tick,0);
  players[0].mount={kind:'pegasus'};
  for(let i=0;i<100;i++)state=stepRace(raceSpec,state,players);
  assert.equal(state.phase,'waitingForPegasi');
  assert.equal(state.anchor,184*16);
  players[1].mount={kind:'pegasus'};
  state=stepRace(raceSpec,state,players);
  assert.equal(state.phase,'flightScroll');
  const paused=stepRace(raceSpec,state,players,{paused:true});
  assert.equal(paused,state);
  for(let i=0;i<1000&&state.phase==='flightScroll';i++)
    state=stepRace(raceSpec,state,players);
  assert.equal(state.phase,'finished');
  assert.equal(state.anchor,344*16);
  assert.ok(stopTick>0);
});

test('hazards and race recovery replay exactly and reset both riders together',()=>{
  const hazard=raceSpec.hazards.find(h=>h.id==='crossing-cart');
  assert.deepEqual(raceHazardPose(hazard,17),
    raceHazardPose(hazard,17+hazard.motion.periodTicks));
  const players=[{id:0,mount:{kind:'unicorn'}}];
  function route(){
    let state=stepRace(raceSpec,createRaceState(raceSpec),players);
    for(let i=0;i<180;i++)state=stepRace(raceSpec,state,players);
    return state;
  }
  assert.deepEqual(route(),route());
  let state=route();
  state=stepRace(raceSpec,state,[...players,{id:1,mount:null}]);
  assert.equal(state.phase,'waitingForUnicorns');
  assert.equal(state.restarted,true);
  assert.equal(state.anchor,32*16);
  state=stepRace(raceSpec,route(),players,{failed:true});
  assert.equal(state.anchor,32*16);
  assert.equal(state.tick,0);
  assert.deepEqual(state,stepRace(raceSpec,route(),players,{recall:true}));
});
