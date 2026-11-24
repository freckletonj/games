import test from 'node:test';
import assert from 'node:assert/strict';
import {driftBubble,partyFraming,stragglerReady} from '../src/coop.js';

const lead={x:800,y:495};
const frame=partner=>partyFraming(lead,partner,960,540,2,38);

test('co-op framing keeps the default zoom nearby and pulls back on either axis',()=>{
  assert.equal(frame({x:750,y:510}).zoom,2);
  const horizontal=frame({x:385,y:500});
  const vertical=frame({x:760,y:295});
  assert.ok(horizontal.zoom<2&&!horizontal.beyond);
  assert.ok(vertical.zoom<2&&!vertical.beyond);
  assert.equal(horizontal.x,(800+385)/2);
  assert.equal(vertical.y,(495+295)/2-38);
  const separated=frame({x:100,y:495});
  assert.ok(separated.beyond);
  assert.equal(separated.zoom,1.48);
  assert.deepEqual(frame(null),{x:800,y:457,zoom:2,beyond:false});
});

test('briefly crossing the camera limit does not put player two in a bubble',()=>{
  const partner={bubbleDelay:0};
  for(let tick=0;tick<17;tick++)assert.equal(stragglerReady(partner,true),false);
  assert.equal(stragglerReady(partner,false),false);
  for(let tick=0;tick<17;tick++)assert.equal(stragglerReady(partner,true),false);
  assert.equal(stragglerReady(partner,true),true);
});

test('the rescue bubble eases toward a moving lead and keeps bobbing nearby',()=>{
  const player={x:100,y:490,bubble:{vx:0,vy:0}};
  const target={x:600,y:450};
  driftBubble(player,target,0);
  assert.ok(player.x>100&&player.x<102);
  for(let tick=1;tick<240;tick++){
    const {x,y}=player;
    target.x+=2.3;
    driftBubble(player,target,tick/60);
    assert.ok(Math.hypot(player.x-x,player.y-y)<=6.001);
  }
  assert.ok(Math.abs(target.x-player.x)<60);
  const arc=[];
  for(let tick=240;tick<480;tick++){
    driftBubble(player,target,tick/60);
    if(tick>=360)arc.push(player.y);
  }
  assert.ok(arc.every(y=>Math.abs(target.y-y)<8));
  assert.ok(Math.max(...arc)-Math.min(...arc)>3);
});
