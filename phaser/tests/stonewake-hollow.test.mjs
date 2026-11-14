import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {compileChapter} from '../src/campaign.js';
import {surfaceGroundAt} from '../src/surface-geometry.js';
import {stepPlayerMotion} from '../src/player-motion.js';
import {feedTrust} from '../src/creatures.js';
import {chooseCreatureLure} from '../src/gameplay-rules.js';
import {stepCreatureMotion} from '../src/creature-motion.js';
import {orbStep,orbHitsAnimal} from '../src/physics.js';
import {createPuzzleObjects,pushPuzzleObject,blockPuzzleX,puzzleTop,punchWall,
  stepPuzzleObjects} from '../src/puzzle-objects.js';
import {poseFor} from '../src/animation.js';
import poses from '../assets/generated/stonewake-hollow/poses/rock-poses.json' with {type:'json'};

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
  function tick(inputs={}){
    const actions={left:false,right:false,jump:false,jumpPressed:false,...inputs};
    stepPuzzleObjects(objects,decks);
    const contact=pushPuzzleObject(objects,p,actions);
    world.pushSpeed=contact?(contact.kind==='push-boulder'?Math.max(.24,contact.speed):0):null;
    return stepPlayerMotion(p,actions,1,world);
  }
  function until(condition,actions,limit=400){
    for(let i=0;i<limit&&!condition();i++)tick(actions(i));
    assert.ok(condition(),`Route stuck at x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}, on=${p.onPlatform}`);
  }
  function walk(condition,limit){
    until(condition,()=>({right:true}),limit);
  }
  function jump(condition,aim,{flap=false,limit=140}={}){
    until(condition,i=>({right:p.x<aim,jump:true,
      jumpPressed:i===0||flap&&!p.grounded&&p.flaps<4&&p.vy>=0}),limit);
  }
  return {objects,decks,p,tick,walk,jump};
}

function befriend(player,kind,food){
  const object=level.objects.find(object=>object.kind===kind);
  const {perch:segment}=object;
  const perch=segment?{left:segment.x*16,right:(segment.x+segment.length)*16,y:segment.y*16}:null;
  const x=(object.x+.5)*16,flying=kind==='skyling';
  const y=perch?.y??(flying?(object.y+.5)*16:groundAt(x));
  const floor=x=>perch?.y??groundAt(x);
  const animal={kind,x,y,homeX:x,homeY:y,flying,perch,stun:0,bubble:0,
    trust:0,distraction:0,attack:0,dash:0,windup:0};
  const aim=player.x+96;
  const lureX=perch?Math.min(aim,perch.right-15):aim;
  const lure={x:lureX,y:floor(lureX),food,landed:true};
  if(perch)assert.equal(chooseCreatureLure(animal,[{...lure,y:groundAt(lureX)}],floor),null);
  for(let i=0;i<2;i++){
    assert.equal(chooseCreatureLure(animal,[lure],floor),lure);
    let tick=0;
    while(tick<240&&(Math.abs(animal.x-lure.x)>=12||Math.abs(animal.y-lure.y)>=25))
      stepCreatureMotion(animal,lure,1,++tick*1000/60,{groundAt:floor,width:level.width*16});
    assert.ok(tick<240,kind+' could not reach the treat');
    animal.trust=feedTrust(animal.trust,food,lure.food);
  }
  assert.equal(animal.trust,100);
  let orb={x:player.x+7,y:player.y-17,vx:2.15,vy:-1,life:150};
  while(orb.life>0){
    const next=orbStep(orb,floor(orb.x+orb.vx),1);
    if(orbHitsAnimal(orb.x,orb.y,next.x,next.y,animal.x,animal.y))return kind;
    orb=next;
  }
  assert.fail(kind+' was out of friendship-orb range');
}

test('idle puzzle objects stay at their exact authored transforms',()=>{
  const {objects,tick}=simulation(72);
  const initial=objects.map(({x,bottom,angle})=>[x,bottom,angle]);
  for(let i=0;i<180;i++){
    tick();
    assert.deepEqual(objects.map(({x,bottom,angle})=>[x,bottom,angle]),initial);
  }
});

test('the first boulder requires Gravelback and moves slowly with friction',()=>{
  const {objects,p,walk,tick,jump}=simulation(180);
  const [boulder]=objects;
  walk(()=>p.x>=208);
  for(let i=0;i<65;i++)tick({right:true});
  assert.equal(boulder.x,255);
  p.form='gravelback';
  for(let i=0;i<18;i++)tick({right:true});
  const released=boulder.x;
  assert.ok(released>255&&released<263);
  assert.ok(boulder.speed>0&&boulder.speed<=.46);
  for(let i=0;i<25;i++)tick();
  assert.ok(boulder.x>released&&boulder.x-released<2);
  assert.equal(boulder.speed,0);
  walk(()=>p.x>=347&&boulder.state==='settled');
  jump(()=>p.onPlatform==='grove-boulder',450);
  walk(()=>p.x>=438);
  jump(()=>p.x>=484&&p.grounded,510);
});

test('a base push wobbles the log, and a non-Flintfist high push cannot tip it',()=>{
  for(const [form,feet] of [['gravelback',544],['flintfist',544],['gravelback',448],['skyling',448]]){
    const {objects,decks,p,tick}=simulation(741,form);
    p.y=feet;
    const log=objects[1];
    let wobble=0;
    for(let i=0;i<130;i++){
      tick({right:true});
      wobble=Math.max(wobble,log.angle);
    }
    assert.ok(p.x>=741&&p.x<=742);
    assert.equal(log.state,'ready');
    assert.equal(decks.length,0);
    assert.equal(wobble>0,form!=='skyling');
    for(let i=0;i<30;i++)tick();
    assert.equal(log.angle,0);
  }
});

test('a normal jump cannot reach the perch and Moonwing cannot fly over the log',()=>{
  const onShelf=p=>p.grounded&&p.y===448;
  const explorer=simulation(629);
  let reached=false;
  for(let i=0;i<100;i++){
    explorer.tick({jump:true,jumpPressed:i===0});
    reached||=onShelf(explorer.p);
  }
  assert.equal(reached,false);
  const wing=simulation(741,'skyling');
  wing.p.y=448;
  let highest=448,furthest=741;
  for(let i=0;i<160;i++){
    const {p}=wing;
    wing.tick({right:true,jump:true,jumpPressed:i===0||!p.grounded&&p.vy>=0});
    highest=Math.min(highest,p.y);
    furthest=Math.max(furthest,p.x);
  }
  assert.ok(highest<420);
  assert.ok(furthest<=742);
});

test('the authored route uses three friends, turns the log into a bridge and punches the seal with Flintfist',()=>{
  const {objects,p,tick,walk,jump}=simulation(72);
  p.form=befriend(p,'gravelback','berry');
  walk(()=>p.x>=347&&objects[0].state==='settled');
  jump(()=>p.onPlatform==='grove-boulder',445);
  walk(()=>p.x>=438);
  jump(()=>p.x>=484&&p.grounded,500);
  p.form=null;
  walk(()=>p.x>=490);
  p.form=befriend(p,'skyling','star');
  walk(()=>p.x>=629);
  jump(()=>p.grounded&&p.y===448,p.x,{flap:true});
  p.form=null;
  p.form=befriend(p,'flintfist','berry');
  walk(()=>objects[1].state==='tipping');
  for(let i=0;i<53;i++){
    tick({right:true});
    if(objects[1].state==='tipping')assert.ok(p.x<=742&&p.y===448);
  }
  assert.equal(objects[1].state,'settled');
  walk(()=>p.onPlatform==='bridge-log');
  walk(()=>p.x>=1208&&p.grounded);
  walk(()=>p.x>=1605);
  assert.equal(punchWall(objects,{...p,form:'gravelback'}),null);
  const wall=objects[2];
  for(const [band,height] of [87,44,0].entries()){
    assert.equal(punchWall(objects,{...p,x:p.x-70}),null);
    assert.equal(punchWall(objects,{...p,face:-1}),null);
    assert.deepEqual(punchWall(objects,p),{wall,band});
    assert.equal(puzzleTop(wall),wall.bottom-height);
    assert.equal(wall.state,height?'ready':'broken');
    if(height){
      for(let i=0;i<15;i++)tick({right:true});
      assert.ok(p.x<=1606);
      let highest=p.y;
      for(let i=0;i<60;i++){
        tick({right:true,jump:true,jumpPressed:i===0});
        highest=Math.min(highest,p.y);
        assert.ok(p.x<=1606,'Jump bypassed the damaged seal');
      }
      assert.ok(highest<wall.bottom&&p.grounded);
    }
  }
  assert.equal(punchWall(objects,p),null);
  const exit=level.objects.find(o=>o.kind==='exit');
  walk(()=>Math.abs(p.x-(exit.x+.5)*16)<19);
});

test('painted push and punch clips follow their declared frame sequences',()=>{
  const manifest={animations:poses.animations};
  assert.deepEqual([0,.15,.3,.45].map(t=>poseFor(manifest,'push',t).frame),[6,7,8,9]);
  assert.deepEqual([0,.09,.18,.27,.8].map(t=>poseFor(manifest,'punch',t).frame),[12,13,14,15,15]);
});
