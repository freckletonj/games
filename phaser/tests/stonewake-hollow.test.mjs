import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {compileChapter} from '../src/campaign.js';
import {surfaceGroundAt} from '../src/surface-geometry.js';
import {stepPlayerMotion} from '../src/player-motion.js';
import {feedTrust,DISTRACTION_SECONDS} from '../src/creatures.js';
import {chooseCreatureLure} from '../src/gameplay-rules.js';
import {stepCreatureMotion} from '../src/creature-motion.js';
import {orbStep,orbHitsAnimal} from '../src/physics.js';
import {launchPower,stepPower} from '../src/power-projectiles.js';
import {createPuzzleObjects,pushBoulder,blockPuzzleX,gustBoulder,punchWall,
  stepPuzzleObjects} from '../src/puzzle-objects.js';

const scope={};
scope.window=scope;
vm.createContext(scope);
vm.runInContext(readFileSync(new URL('../../src/platform/world-compiler.js',import.meta.url),'utf8'),scope);
const level=compileChapter({id:'stonewake-hollow'},scope.WW.worldCompiler);
const groundAt=x=>surfaceGroundAt(level,x);

function simulation(x,form=null){
  const objects=createPuzzleObjects(level.puzzleObjects),decks=[];
  const world={width:level.width*16,height:level.height*16,tile:16,
    groundAt,inWater:()=>false,thermalVolumes:[],platformSegments:level.platformSegments,
    movingPlatforms:decks,rockPolygons:level.rockPolygons,
    blockHorizontal:(from,to,feet)=>blockPuzzleX(objects,from,to,feet)};
  const p={x,y:groundAt(x),vx:0,vy:0,face:1,form,grounded:true,coyote:5,
    jumpBuffer:0,jumps:0,flaps:0,flapWait:0,powers:0,hover:0,breach:0,bloomWindow:0};
  function tick(actions={}){
    stepPuzzleObjects(objects,decks);
    pushBoulder(objects,p,actions);
    stepPlayerMotion(p,{left:false,right:false,jump:false,jumpPressed:false,...actions},1,world);
  }
  function walk(until,limit=220){
    for(let i=0;i<limit&&!until();i++)tick({right:true});
    assert.ok(until(),`Route stuck at x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}, on=${p.onPlatform}`);
  }
  function jump(right,until,{flap=false,limit=135}={}){
    for(let i=0;i<limit&&(i===0||!until());i++){
      const jumpPressed=i===0||flap&&!p.grounded&&p.flaps<4&&p.vy>=0;
      tick({right:typeof right==='function'?right():right,jump:true,jumpPressed});
    }
    assert.ok(until(),`Jump ended at x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}, on=${p.onPlatform}, flaps=${p.flaps}`);
  }
  return {objects,decks,p,tick,walk,jump,world};
}

test('the first split needs Gravelback and its boulder becomes a real foothold',()=>{
  const {objects,p,walk,jump}=simulation(180);
  walk(()=>p.x>=208);
  for(let i=0;i<65;i++)stepPuzzleObjects(objects,[]);
  assert.equal(objects[0].x,255);
  assert.equal(objects[0].state,'ready');
  p.form='gravelback';
  walk(()=>p.x>=347&&objects[0].state==='settled');
  jump(true,()=>p.onPlatform==='grove-boulder');
  walk(()=>p.x>=440);
  jump(true,()=>p.x>=484&&p.grounded);
});

test('four flaps cannot clear the ravine from the perch without a landing',()=>{
  const {p,tick}=simulation(741,'skyling');
  p.y=464;p.grounded=true;
  let furthest=0,flaps=0;
  for(let i=0;i<175&&p.y<level.recallBelow;i++){
    tick({right:true,jump:true,jumpPressed:i===0||p.vy>=0});
    furthest=Math.max(furthest,p.x);
    flaps=Math.max(flaps,p.flaps);
  }
  assert.equal(flaps,4);
  assert.ok(furthest<1190,`Unexpected bypass to x=${furthest}`);
});

test('Moonwing can reach the shelf with flaps, gust the boulder and cross in two flights',()=>{
  const {objects,p,tick,walk,jump}=simulation(638,'skyling');
  jump(false,()=>!p.grounded&&p.y<=477,{flap:true});
  const shot=launchPower(p.form,p.x,p.y,1,0);
  assert.equal(gustBoulder(objects,{...shot,kind:'cloudwhisp',x:705},650),null);
  for(let i=0;i<30&&objects[1].state==='ready';i++){
    const {fromX}=stepPower(shot,1,groundAt,level.width*16);
    gustBoulder(objects,shot,fromX);
  }
  assert.equal(objects[1].state,'dropping');
  for(let i=0;i<75;i++)tick();
  assert.equal(objects[1].state,'settled');
  jump(false,()=>p.grounded&&p.y===464,{flap:true});
  walk(()=>p.x>=740);
  jump(()=>p.x<993,()=>p.onPlatform==='perched-boulder',{flap:true});
  assert.equal(p.flaps,0);
  walk(()=>p.x>=1023);
  jump(true,()=>p.x>=1200&&p.grounded,{flap:true});
});

test('the cave roof meets the seal and only Flintfist opens the corridor',()=>{
  const {objects,p,tick,walk,jump}=simulation(1550);
  walk(()=>p.x>=1605);
  assert.equal(punchWall(objects,p),null);
  jump(true,()=>p.grounded);
  for(let i=0;i<30;i++)tick({right:true});
  assert.ok(p.x<=1606);
  p.form='flintfist';
  assert.equal(punchWall(objects,p)?.id,'cave-seal');
  walk(()=>p.x>=1970);
  assert.equal(objects[2].state,'broken');
});

test('each authored encounter can be reached with normal treats and a friendship orb',()=>{
  for(const [kind,throwFrom,favorite] of [
    ['gravelback',72,'berry'],['skyling',490,'star'],['flintfist',1298,'berry']
  ]){
    const object=level.objects.find(object=>object.kind===kind);
    const x=(object.x+.5)*16,flying=kind==='skyling';
    const y=flying?(object.y+.5)*16:groundAt(x);
    const animal={kind,x,y,homeX:x,homeY:y,flying,stun:0,bubble:0,
      trust:0,distraction:0,attack:0,dash:0,windup:0};
    const lure={x:throwFrom+96,y:groundAt(throwFrom+96),food:favorite,landed:true};
    for(let i=0;i<2;i++){
      assert.equal(chooseCreatureLure(animal,[lure],groundAt),lure);
      let tick=0;
      while(tick<240&&(Math.abs(animal.x-lure.x)>=12||Math.abs(animal.y-lure.y)>=25))
        stepCreatureMotion(animal,lure,1,++tick*1000/60,{groundAt,width:level.width*16});
      assert.ok(tick<240,kind+' could not reach the treat');
      animal.trust=feedTrust(animal.trust,favorite,lure.food);
    }
    assert.equal(animal.trust,100);
    animal.distraction=DISTRACTION_SECONDS;
    let orb={x:throwFrom+7,y:groundAt(throwFrom)-17,vx:2.15,vy:-1,life:150};
    let caught=false;
    while(orb.life>0&&!caught){
      const next=orbStep(orb,groundAt(orb.x+orb.vx),1);
      caught=orbHitsAnimal(orb.x,orb.y,next.x,next.y,animal.x,animal.y);
      orb=next;
    }
    assert.ok(caught,kind+' was out of friendship-orb range');
  }
});
