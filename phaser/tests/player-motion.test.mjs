import test from 'node:test';
import assert from 'node:assert/strict';
import {stepPlayerMotion} from '../src/player-motion.js';
import {triggerBloom,BLOOM_BOOST} from '../src/springboard.js';

const world={
  width:2200,height:900,tile:16,
  groundAt:()=>500,
  inWater:()=>false,
  waterBodies:[],
  thermalVolumes:[],
  platformSegments:[]
};
const controls={left:false,right:false,down:false,jump:false,jumpPressed:false};
const explorer=(form=null)=>({
  id:0,x:150,y:500,vx:0,vy:0,face:1,grounded:true,
  coyote:5,jumpBuffer:0,jumps:0,flaps:0,flapWait:0,
  powers:0,hover:0,breach:0,bloomWindow:0,bloomBoosts:0,form
});

test('ordinary jump and Springaroo double-jump preserve the original velocities',()=>{
  const p=explorer('springaroo');
  let result=stepPlayerMotion(p,{...controls,jump:true,jumpPressed:true},1,world);
  assert.equal(p.jumps,1);
  assert.ok(p.vy<0&&!p.grounded);
  assert.equal(result.action,'jump');
  result=stepPlayerMotion(p,controls,1,world);
  result=stepPlayerMotion(p,{...controls,jump:true,jumpPressed:true},1,world);
  assert.equal(p.jumps,2);
  assert.deepEqual(result.events,['doubleJump']);
  assert.ok(p.vy<-5);
});

test('a delayed springboard press still produces the high-arc boost',()=>{
  const p=explorer();
  triggerBloom(p);
  p.bloomWindow=8;
  const result=stepPlayerMotion(p,{...controls,jump:true,jumpPressed:true},1,world);
  assert.deepEqual(result.events,['bloomBoost']);
  assert.equal(p.bloomBoosts,1);
  assert.ok(p.vy>BLOOM_BOOST&&p.vy<BLOOM_BOOST+1);
});

test('Tidefox controls preserve swimming, breaching and upward shore collision',()=>{
  const p=explorer('tideling');
  p.x=125;p.y=458;p.grounded=false;p.coyote=0;
  const basin={start:5,end:14,surface:27};
  const shore={
    ...world,
    waterBodies:[basin],
    inWater:(x,y)=>x>=basin.start*16&&x<=basin.end*16&&y>=basin.surface*16,
    groundAt:x=>x<145?500:500-(x-145)*3.5
  };
  let result=stepPlayerMotion(p,{...controls,jump:true,jumpPressed:true},1,shore);
  assert.ok(result.events.includes('breach'));
  assert.ok(p.vy<-4);
  p.y=493;p.vy=0;
  for(let i=0;i<20;i++)stepPlayerMotion(p,{...controls,right:true},1,shore);
  assert.ok(p.y<=shore.groundAt(p.x)+3,'Never enter uphill shore terrain');
});

test('Moonwing wingbeats, cooldown and thermal recharge remain independent of visuals',()=>{
  const p=explorer('skyling');
  p.y=320;p.grounded=false;p.coyote=0;
  let result=stepPlayerMotion(p,{...controls,jump:true,jumpPressed:true},1,world);
  assert.ok(result.events.includes('flap'));
  assert.equal(p.flaps,1);
  result=stepPlayerMotion(p,{...controls,jump:true,jumpPressed:true},1,world);
  assert.equal(p.flaps,1,'Wingbeats are gated by cooldown');
  p.flaps=3;
  stepPlayerMotion(p,controls,1,{
    ...world,thermalVolumes:[{x:0,y:0,width:60,height:50}]
  });
  assert.equal(p.flaps,0,'Thermal resets wingbeat budget');
});

test('Landing emits visual cues but motion function has no Phaser dependency',()=>{
  const p=explorer();
  p.y=494;p.vy=5.5;p.grounded=false;p.coyote=0;
  const result=stepPlayerMotion(p,controls,1,world);
  assert.equal(p.grounded,true);
  assert.equal(p.y,500);
  assert.ok(result.events.includes('land'));
  assert.ok(result.events.includes('hardLand'));
});
