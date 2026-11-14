import test from 'node:test';
import assert from 'node:assert/strict';
import {simulationTicks,queueInputEdges,withoutInputEdges} from '../src/fixed-clock.js';
import {stepPlayerMotion} from '../src/player-motion.js';

const world={
  width:2500,height:900,tile:16,groundAt:()=>500,inWater:()=>false,
  waterBodies:[],thermalVolumes:[],platformSegments:[]
};
function run(fps){
  const player={id:0,x:100,y:500,vx:0,vy:0,face:1,grounded:true,
    coyote:5,jumpBuffer:0,jumps:0,flaps:0,flapWait:0,
    powers:0,hover:0,breach:0,bloomWindow:0,bloomBoosts:0,
    form:'springaroo'};
  let pending=0,queued={},ticks=0,jumps=0;
  for(let i=0;i<fps*2;i++){
    const actions=queueInputEdges(queued,{
      left:false,right:true,down:false,jump:i<fps/2,
      jumpPressed:i===0
    });
    const count=simulationTicks(pending,1000/fps);
    pending=count.remaining;
    if(!count.ticks){queued=actions;continue;}
    queued={};
    for(let n=0;n<count.ticks;n++){
      const input=n===0?actions:withoutInputEdges(actions);
      const next=stepPlayerMotion(player,input,1,world);
      if(input.jumpPressed)jumps++;
      assert.ok(Number.isFinite(player.x)&&Number.isFinite(player.y));
    }
    ticks+=count.ticks;
  }
  return {ticks,jumps,x:player.x,y:player.y,grounded:player.grounded};
}

test('real player movement is equivalent under 30/60/120Hz render schedules',()=>{
  const expected=run(60);
  assert.equal(expected.ticks,120);
  assert.equal(expected.jumps,1);
  for(const fps of [30,120]){
    const actual=run(fps);
    assert.equal(actual.ticks,120);
    assert.equal(actual.jumps,1,'Jump must be triggered once per key press');
    assert.ok(Math.abs(actual.x-expected.x)<1e-8,{fps,actual,expected});
    assert.ok(Math.abs(actual.y-expected.y)<1e-8,{fps,actual,expected});
    assert.equal(actual.grounded,expected.grounded);
  }
});

test('a second jump after creature impact gives one stronger bounce',()=>{
  const player={id:0,x:100,y:440,vx:0,vy:-4.4,face:1,grounded:false,
    coyote:0,jumpBuffer:0,jumps:0,flaps:0,flapWait:0,powers:0,
    hover:0,breach:0,bloomWindow:0,bloomBoosts:0,
    creatureBounceWindow:14,creatureBounceBoosts:0,form:null};
  const boosted=stepPlayerMotion(player,{jump:true,jumpPressed:true},1,world);
  assert.ok(boosted.events.includes('creatureBounceBoost'));
  assert.ok(player.vy< -7,'More lift than the automatic -4.4 stomp hop');
  assert.equal(player.creatureBounceWindow,0);
  assert.equal(player.creatureBounceBoosts,1);
  stepPlayerMotion(player,{jump:true,jumpPressed:false},1,world);
  assert.equal(player.creatureBounceBoosts,1,'Held jump does not retrigger');

  player.creatureBounceWindow=2;player.jumps=0;player.vy=-1;
  stepPlayerMotion(player,{jump:false},2,world);
  const late=stepPlayerMotion(player,{jump:true,jumpPressed:true},1,world);
  assert.ok(!late.events.includes('creatureBounceBoost'));
  assert.equal(player.creatureBounceBoosts,1);
});
