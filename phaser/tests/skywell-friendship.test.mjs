import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCave,skywellLayout} from '../src/cave-layout.js';
import {chooseCreatureLure} from '../src/gameplay-rules.js';
import {stepCreatureMotion} from '../src/creature-motion.js';
import {feedTrust} from '../src/creatures.js';
import {advanceTreatFlight} from '../src/treat-motion.js';
import {orbStep,orbHitsAnimal} from '../src/physics.js';

test('Skywell Glimmermoth can be fed twice and captured from the real spawn',()=>{
  const level=compileCave(skywellLayout);
  const spawn=level.objects.find(o=>o.kind==='p1');
  const mothSpec=level.objects.find(o=>o.kind==='glimmermoth');
  const player={x:(spawn.x+.5)*16,
    y:level.cave.groundAt((spawn.x+.5)*16)};
  const animal={kind:'glimmermoth',x:(mothSpec.x+.5)*16,
    y:(mothSpec.y+.5)*16,homeX:(mothSpec.x+.5)*16,
    homeY:(mothSpec.y+.5)*16,flying:true,trust:0,distraction:0,
    stun:0,bubble:0,bubbleRise:0,attack:0,windup:0,dash:0,
    knockVX:0,face:1};
  let elapsed=0;
  for(let n=0;n<2;n++){
    const lure={x:player.x+96,
      y:level.cave.groundAt(player.x+96),food:'star',
      startX:player.x+9,startY:player.y-21,
      landed:false,age:0,face:1};
    let fed=false;
    for(let tick=0;tick<220;tick++){
      if(!lure.landed)advanceTreatFlight(lure);
      const picked=chooseCreatureLure(animal,[lure],level.cave.groundAt);
      stepCreatureMotion(animal,picked,1,elapsed++*1000/60,
        {width:level.width*16,groundAt:level.cave.groundAt});
      if(picked&&Math.abs(animal.x-lure.x)<12&&
         Math.abs(animal.y-lure.y)<25){
        animal.trust=feedTrust(animal.trust,'star','star');
        if(animal.trust===100)animal.distraction=12;
        fed=true;
        break;
      }
    }
    assert.ok(fed,'the star treat must be physically reachable by the moth');
  }
  assert.equal(animal.trust,100);
  assert.ok(animal.distraction>0);
  const orb={x:player.x+7,y:player.y-17,vx:2.15,
    vy:-1,bounces:0,life:150};
  let caught=false;
  for(let tick=0;tick<150;tick++){
    const previousX=orb.x,previousY=orb.y;
    Object.assign(orb,orbStep(orb,
      level.cave.groundAt(orb.x+orb.vx)));
    if(orbHitsAnimal(previousX,previousY,orb.x,orb.y,
       animal.x,animal.y)){
      caught=true;
      break;
    }
  }
  assert.ok(caught,'the actual capture orb must reach the befriended moth');
});
