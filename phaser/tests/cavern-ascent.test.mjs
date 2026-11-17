import test from 'node:test';
import assert from 'node:assert/strict';
import layout from '../levels/cavern-ascent.json' with {type:'json'};
import sealPlan from '../levels/stonewake-seal.json' with {type:'json'};
import {compileCave} from '../src/cave-layout.js';
import {caveArtManifest,caveMaskSvg} from '../src/cave-art-guide.js';
import {stepPlayerMotion} from '../src/player-motion.js';
import {machinePlatforms,stepMachines} from '../src/machines.js';
import {createPuzzleObjects,pushPuzzleObject,blockPuzzleX,punchWall,
  stepPuzzleObjects,cavernPuzzlesComplete} from '../src/puzzle-objects.js';

const level=compileCave(layout);

function simulate(x,y,form,objectSpecs=[],withMachines=false){
  const objects=createPuzzleObjects(objectSpecs.map(object=>
    object.kind==='breakable-wall'?
      {...object,size:sealPlan.size,fracture:sealPlan.bands}:object));
  const decks=withMachines?machinePlatforms(layout.machines):[];
  const player={x,y,vx:0,vy:0,face:1,form,grounded:true,coyote:5,
    jumpBuffer:0,jumps:0,flaps:0,flapWait:0,powers:0,hover:0,
    breach:0,bloomWindow:0};
  const world={width:level.width*16,height:level.height*16,tile:16,
    groundAt:level.cave.groundAt,ceilingAt:level.cave.ceilingAt,
    inWater:()=>false,waterBodies:[],thermalVolumes:level.thermalVolumes,
    platformSegments:level.platformSegments,rockPolygons:level.rockPolygons,
    movingPlatforms:decks,
    blockHorizontal:(from,to,feet)=>blockPuzzleX(objects,from,to,feet)};
  let tick=0;
  function step(actions={}){
    tick++;
    stepMachines(decks,tick);
    stepPuzzleObjects(objects,decks);
    const controls={left:false,right:false,jump:false,jumpPressed:false,...actions};
    const contact=pushPuzzleObject(objects,player,controls);
    world.pushSpeed=contact?(contact.kind==='push-boulder'?
      Math.max(.24,contact.speed):0):null;
    return stepPlayerMotion(player,controls,1,world);
  }
  return {player,objects,decks,step};
}

test('the tall cave compiles into one geometry-led art guide',()=>{
  assert.equal(level.width*16,1280);
  assert.equal(level.height*16,3200);
  assert.equal(level.platformSegments.length,25);
  assert.equal(level.rockPolygons.length,21);
  assert.equal(caveArtManifest(level).painting,
    'phaser/assets/generated/cavern-ascent/scene.webp');
  assert.equal(caveArtManifest(level).geometrySource,
    'phaser/levels/cavern-ascent.json');
  assert.ok(caveMaskSvg(level).includes('viewBox="0 0 1280 3200"'));
});

test('selected vertical steps are reachable by real flight inputs',()=>{
  for(const [x,y,target] of [
    [160,3040,2880],[520,2880,2720],[760,2560,2400],
    [840,2400,2240],[1232,2080,1920],[232,1760,1600],
    [270,1456,1264],[680,1120,960]
  ]){
    const {player,step}=simulate(x,y,'skyling');
    let reached=false;
    for(let frame=0;frame<200;frame++){
      const pressed=frame===0||!player.grounded&&player.flapWait===0&&
        player.flaps<4&&player.vy>=-1;
      step({jump:true,jumpPressed:pressed});
      if(player.grounded&&Math.abs(player.y-target)<1){
        reached=true;
        break;
      }
    }
    assert.ok(reached,'flight from '+y+' to '+target);
  }
});

test('Moonwing can round the overhangs and traverse the summit chimney',()=>{
  for(const [x,y,direction,moveTicks,delay,target,left,right] of [
    [448,2720,1,87,0,2560,548,644],
    [607,2240,1,42,0,2080,655,765],
    [650,2080,1,57,0,1984,775,890],
    [315,1264,1,66,20,1120,430,545],
    [655,960,1,42,0,800,635,825],
    [650,800,-1,54,0,592,388,527],
    [485,592,1,117,0,432,576,784],
    [768,432,1,66,0,272,912,1200]
  ]){
    const {player,step}=simulate(x,y,'skyling');
    let reached=false;
    for(let tick=0;tick<240;tick++){
      const pressed=tick===0||!player.grounded&&player.flapWait===0&&
        player.flaps<4&&player.vy>=-1;
      const move=tick>=delay&&tick<delay+moveTicks;
      step({jump:true,jumpPressed:pressed,left:move&&direction<0,right:move&&direction>0});
      if(player.grounded&&Math.abs(player.y-target)<1&&player.x>=left&&player.x<=right){
        reached=true;
        break;
      }
    }
    assert.ok(reached,'flight from '+y+' to '+target);
  }
});

test('Moonwing rounds the west overhang and turns back to the camp',()=>{
  const {player,step}=simulate(225,1600,'skyling');
  const tip=level.rockPolygons.find(rock=>rock.id==='west-switchback-overhang').right;
  let roundedTip=false;
  for(let tick=0;tick<140;tick++){
    const pressed=tick===0||!player.grounded&&player.flapWait===0&&
      player.flaps<4&&player.vy>=-1;
    step({jump:true,jumpPressed:pressed,right:tick<24,left:tick>=52&&tick<76});
    if(player.x>tip+10)roundedTip=true;
    if(roundedTip&&player.grounded&&player.y===1456&&player.x<tip)break;
  }
  assert.ok(roundedTip&&player.grounded&&player.y===1456&&player.x<tip);
});

test('the pushed boulder and fallen bridge support actual crossings',()=>{
  for(const [id,x,y,form,finish] of [
    ['first-boulder',220,2880,'gravelback',450],
    ['stone-bridge',905,1984,'flintfist',1210]
  ]){
    const spec=level.puzzleObjects.find(object=>object.id===id);
    const {player,objects,step}=simulate(x,y,form,[spec]);
    let crossed=false,rode=false;
    for(let frame=0;frame<1000;frame++){
      const state=objects[0].state;
      step({right:state!=='dropping'&&state!=='tipping'});
      rode||=player.onPlatform===id;
      if(objects[0].state==='settled'&&player.x>finish&&
        player.y===spec.platform[1]&&player.grounded){
        crossed=true;
        break;
      }
    }
    assert.ok(rode,id+' must support the player');
    assert.ok(crossed,id+' must allow a crossing');
  }
});

test('the stone span joins both banks with no jump or drop',()=>{
  const bridge=level.puzzleObjects.find(object=>object.id==='stone-bridge');
  const [near,far]=bridge.banks.map(id=>level.platformSegments.find(s=>s.id===id));
  const y=near.y*16;
  const {objects,decks}=simulate(905,1984,'flintfist',[bridge]);
  const prop=objects[0];
  prop.state='tipping';prop.startAngle=0;
  for(let tick=0;tick<53;tick++)stepPuzzleObjects(objects,decks);
  assert.equal(prop.angle,Math.PI/2);
  assert.equal(prop.bottom-bridge.size[0]/2,y);
  const {player,step,decks:routeDecks}=simulate(near.x*16+32,y,null);
  routeDecks.push(decks[0]);
  let onBridge=false;
  for(let tick=0;tick<250&&player.x<far.x*16+32;tick++){
    step({right:true});
    assert.equal(player.y,y);
    assert.ok(player.grounded);
    onBridge||=player.onPlatform===bridge.id;
  }
  assert.ok(onBridge);
  assert.ok(player.x>=far.x*16+32);
});

test('each seal blocks flight until Flintfist punches through it',()=>{
  for(const spec of layout.puzzleObjects.filter(object=>object.kind==='breakable-wall')){
    const {player,objects,step}=simulate(spec.home[0]-65,spec.home[1],
      'skyling',[spec]);
    let furthest=player.x;
    for(let frame=0;frame<230;frame++){
      const pressed=frame===0||!player.grounded&&player.flapWait===0&&
        player.flaps<4&&player.vy>=-1;
      step({right:true,jump:true,jumpPressed:pressed});
      furthest=Math.max(furthest,player.x);
    }
    assert.ok(furthest<spec.home[0]+sealPlan.size[0]/2,spec.id);
    Object.assign(player,{x:spec.home[0]-45,y:spec.home[1],vx:0,vy:0,
      face:1,grounded:true,form:'flintfist'});
    for(let hit=0;hit<sealPlan.bands.length;hit++)
      assert.ok(punchWall(objects,player));
    assert.equal(objects[0].state,'broken');
    for(let frame=0;frame<80;frame++)step({right:true});
    assert.ok(player.x>spec.home[0]+sealPlan.size[0],spec.id+' opens');
  }
});

test('the spinning boulders can be crossed with timed jumps',()=>{
  const {player,step}=simulate(850,1760,null,[],true);
  const ridden=new Set();
  for(let frame=0;frame<500;frame++){
    const jump=frame%24===0;
    step({left:true,jump,jumpPressed:jump});
    if(player.onPlatform)ridden.add(player.onPlatform);
    if(player.x<360&&player.y===1760&&player.grounded)break;
  }
  assert.ok(player.x<360&&player.y===1760&&player.grounded);
  for(const machine of layout.machines)assert.ok(ridden.has(machine.id),machine.id);
});

test('a missed boulder jump drops to a lower landing with a way back',()=>{
  const wheels=layout.machines;
  for(let i=1;i<wheels.length;i++){
    const x=(wheels[i-1].home[0]+wheels[i].home[0])/2;
    const {player,step}=simulate(x,1760,null,[],true);
    player.grounded=false;
    for(let tick=0;tick<140&&!player.grounded;tick++)step();
    assert.ok(player.grounded,'the gap between wheels '+i+' and '+(i+1));
    assert.ok(player.y>=1984,'a miss must fall at least 224 world units');
  }

  const recovery=layout.shelves.find(shelf=>shelf.id==='wheel-recovery-shelf');
  const {player,step}=simulate(496,1760,null,[],true);
  player.grounded=false;
  for(let tick=0;tick<140&&!player.grounded;tick++)step();
  assert.equal(player.y,recovery.y*layout.tile);
  for(let tick=0;tick<180;tick++){
    const jump=player.grounded&&player.y===recovery.y*layout.tile&&player.x>=570;
    step({right:true,jump:true,jumpPressed:jump});
    if(player.x>=665&&player.y===2080&&player.grounded)break;
  }
  assert.ok(player.x>=665&&player.y===2080&&player.grounded,
    'an explorer can jump back to the near bridge bank');
});

test('the standing bridge cannot be flown over from its pushing ledge',()=>{
  const spec=level.puzzleObjects.find(object=>object.id==='stone-bridge');
  const {player,objects,step}=simulate(905,1984,'skyling',[spec]);
  let furthest=player.x;
  for(let frame=0;frame<220;frame++){
    const pressed=frame===0||!player.grounded&&player.flapWait===0&&
      player.flaps<4&&player.vy>=-1;
    step({right:true,jump:true,jumpPressed:pressed});
    furthest=Math.max(furthest,player.x);
  }
  assert.equal(objects[0].state,'ready');
  assert.ok(furthest<spec.home[0], 'the bridge must block the flight path');
});

test('the summit light requires both seals and both rock crossings',()=>{
  const {objects}=simulate(220,2880,'gravelback',level.puzzleObjects);
  for(const object of objects){
    assert.ok(!cavernPuzzlesComplete(objects));
    object.state=object.kind==='breakable-wall'?'broken':'settled';
  }
  assert.ok(cavernPuzzlesComplete(objects));
});

test('the low roof keeps Moonwing from skipping the first boulder on its ledge',()=>{
  const {player,step}=simulate(250,2880,'skyling',[level.puzzleObjects[0]]);
  for(let tick=0;tick<160;tick++){
    const pressed=tick===0||!player.grounded&&player.flapWait===0&&
      player.flaps<4&&player.vy>=-1;
    step({right:true,jump:true,jumpPressed:pressed});
    assert.ok(player.x<296,'Moonwing should stay on the near side');
  }
});
