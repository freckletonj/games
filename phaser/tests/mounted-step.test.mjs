import test from 'node:test';
import assert from 'node:assert/strict';
import {stepMountedMotion,stepWildMount,landsOnMount} from '../src/mounts.js';

const world={
  width:2000,height:960,tile:16,
  groundAt:()=>500,
  platformSegments:[]
};
const horse=kind=>({
  kind,x:200,y:500,vx:0,vy:0,face:1,grounded:true,
  flapWait:0,flaps:0
});
const idle={left:false,right:false,down:false,jumpPressed:false};

test('unicorn accelerates on ground and its jump remains single-launch',()=>{
  const m=horse('unicorn');
  let result;
  for(let i=0;i<25;i++)result=stepMountedMotion(m,{...idle,right:true},1,world);
  assert.equal(result.action,'run');
  assert.ok(m.vx>4&&m.x>260);
  result=stepMountedMotion(m,{...idle,jumpPressed:true},1,world);
  assert.equal(result.launch,'takeoff');
  assert.equal(m.grounded,false);
  assert.ok(m.vy<-7);
  result=stepMountedMotion(m,{...idle,jumpPressed:true},1,world);
  assert.equal(result.launch,null,'unicorn should not air-jump');
});

test('Pegasus takes off, wingbeats on cooldown and descends on Down',()=>{
  const m=horse('pegasus');
  let result=stepMountedMotion(m,{...idle,jumpPressed:true},1,world);
  assert.equal(result.launch,'takeoff');
  assert.equal(result.action,'flap');
  assert.equal(m.flaps,1);
  result=stepMountedMotion(m,{...idle,jumpPressed:true},1,world);
  assert.equal(result.launch,null);
  for(let i=0;i<7;i++)stepMountedMotion(m,idle,1,world);
  result=stepMountedMotion(m,{...idle,jumpPressed:true},1,world);
  assert.equal(result.launch,'wingbeat');
  assert.equal(m.flaps,2);
  const priorVy=m.vy;
  const descending=stepMountedMotion(m,{...idle,down:true},1,world);
  assert.ok(m.vy>priorVy,'Down should accelerate descent');
  assert.equal(descending.launch,null);
});

test('Unicorn and Pegasus do not accelerate along steep surface banks',()=>{
  const ramp={...world,groundAt:x=>500-1.35*(x-100)};
  for(const kind of ['unicorn','pegasus']){
    const m=horse(kind);
    m.x=100;m.y=500;
    let maxSurfaceSpeed=0;
    for(let tick=0;tick<100;tick++){
      const before={x:m.x,y:m.y};
      stepMountedMotion(m,{...idle,right:true},1,ramp);
      maxSurfaceSpeed=Math.max(maxSurfaceSpeed,Math.hypot(
        m.x-before.x,m.y-before.y));
    }
    const allowed=kind==='unicorn'?4.21:3.46;
    assert.ok(maxSurfaceSpeed<=allowed,
      kind+' downhill/uphill step spiked to '+maxSurfaceSpeed);
    assert.ok(m.x>200,kind+' must climb rather than stick');
    assert.ok(Math.abs(m.y-ramp.groundAt(m.x))<2,
      kind+' must remain aligned with the actual surface');
  }
});

test('mounted movement respects slope collision without scene objects',()=>{
  const m=horse('unicorn');
  m.x=124;m.y=485;
  const steep={
    ...world,groundAt:x=>x<130?500:500-(x-130)*7
  };
  const prevX=m.x;
  for(let i=0;i<12;i++)stepMountedMotion(m,{...idle,right:true},1,steep);
  assert.ok(m.x<140&&m.x>=prevX,'Cannot tunnel through an uphill wall');
});

test('unridden mounts patrol, graze, rear once per approach and act as springboards',()=>{
  for(const kind of ['unicorn','pegasus']){
    const m={...horse(kind),homeX:200,homeY:500,chew:0,rear:0,approached:false};
    const terrain={...world,inWater:()=>false};
    assert.equal(stepWildMount(m,null,null,1,0,terrain),'run');
    assert.ok(m.x>200&&m.face===1);
    assert.equal(stepWildMount(m,null,null,1,2800,terrain),'eat');
    const near={x:m.x-35};
    const x=m.x;
    assert.equal(stepWildMount(m,near,null,1,3000,terrain),'rear');
    assert.equal(m.face,-1);
    assert.equal(m.x,x);
    assert.equal(stepWildMount(m,near,null,40,3700,terrain),'idle');
    const player={x:m.x,y:475,vy:3,mount:null};
    assert.ok(landsOnMount(player,452,m));
    assert.ok(!landsOnMount(player,473,m));
    assert.ok(!landsOnMount({...player,mount:m},452,m));
  }
});

test('mounted gait faces its actual displacement during a reversal',()=>{
  const m=horse('unicorn');
  m.vx=4;
  const x=m.x;
  const result=stepMountedMotion(m,{...idle,left:true},1,world);
  assert.equal(result.action,'run');
  assert.ok(m.x>x&&m.face===1);
});
