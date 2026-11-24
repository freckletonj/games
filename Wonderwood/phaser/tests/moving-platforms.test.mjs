import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import orchard from '../levels/clockwork-orchard.json' with {type:'json'};
import {compileChapter} from '../src/campaign.js';
import {movingLanding,platformPosition,stepPlatforms} from '../src/moving-platforms.js';
import {stepPlayerMotion} from '../src/player-motion.js';
import {surfaceGroundAt} from '../src/surface-geometry.js';

function near(actual,expected){
  assert.ok(Math.abs(actual-expected)<.001,`${actual} differs from ${expected}`);
}

test('the three authored motions return to their exact home pose each cycle',()=>{
  const [lift,ferry,wheel]=orchard.movingPlatforms;
  near(platformPosition(lift,4)[1],352);
  near(platformPosition(ferry,4)[0],808);
  const apex=platformPosition(wheel,2.5);
  near(apex[0],1070);
  near(apex[1],190);
  for(const deck of orchard.movingPlatforms)
    platformPosition(deck,deck.motion.seconds).forEach((value,index)=>near(value,deck.home[index]));
});

test('one-way decks catch crossed tops in the moving frame and let upward jumps through',()=>{
  const deck={id:'lift',size:[96,24],previous:[100,100],position:[102,98]};
  assert.equal(movingLanding([deck],null,100,99,102,99),deck);
  assert.equal(movingLanding([deck],null,102,101,102,97),null);
  assert.equal(movingLanding([deck],null,148,96,148,99),deck);
  assert.equal(movingLanding([deck],null,153,96,153,99),null);
  assert.equal(movingLanding([deck],'lift',100,98,102,98),deck);
});

const scope={};scope.window=scope;vm.createContext(scope);
vm.runInContext(readFileSync(new URL('../../src/platform/world-compiler.js',import.meta.url),'utf8'),scope);
const level=compileChapter({id:orchard.id},scope.WW.worldCompiler);

const orchardWorld={width:level.width*16,height:level.height*16,tile:16,
  groundAt:x=>surfaceGroundAt(level,x),inWater:()=>false,
  thermalVolumes:[],platformSegments:level.platformSegments};
const explorer=(x,y)=>({x,y,vx:0,vy:0,face:1,grounded:true,coyote:5,
  jumpBuffer:0,jumps:0,flaps:0,flapWait:0,powers:0,hover:0,breach:0,bloomWindow:0});

test('the ferry landing lip preserves full walking speed over the pier wall',()=>{
  const pierTop=55*16;
  const shelfY=22*16;
  for(const [start,right] of [[pierTop-12,true],[pierTop+1,false]]){
    const player=explorer(start,shelfY);
    player.vx=right?2.3:-2.3;
    stepPlayerMotion(player,{right,left:!right,jump:false,jumpPressed:false},1,orchardWorld);
    near(player.x-start,right?2.3:-2.3);
    near(player.y,shelfY);
    assert.equal(player.grounded,true);
  }

  const player=explorer(52*16-4,shelfY);
  player.vx=-2.3;
  stepPlayerMotion(player,{right:false,left:true,jump:false,jumpPressed:false},1,orchardWorld);
  assert.equal(player.grounded,false);
  assert.ok(player.y>shelfY);
});

test('Clockwork Orchard can reach its light as an explorer using all three rides',()=>{
  const decks=level.movingPlatforms.map(spec=>({...spec,position:spec.home,previous:spec.home}));
  const world={...orchardWorld,movingPlatforms:decks};
  const p=explorer(72,world.groundAt(72));
  let frame=0;
  const ridden=new Set();
  function tick(right=false,jump=false,jumpPressed=false){
    stepPlatforms(decks,++frame/60);
    stepPlayerMotion(p,{right,left:false,jump,jumpPressed},1,world);
    if(p.onPlatform)ridden.add(p.onPlatform);
  }
  function go(until,{right=false,jump=false,seconds=14}={}){
    for(let i=0;i<seconds*60;i++){
      if(until())return;
      tick(right,jump,jump&&i===0);
    }
    assert.fail(`Route stuck at tick ${frame}, x=${p.x.toFixed(2)}, y=${p.y.toFixed(2)}, deck=${p.onPlatform}`);
  }
  go(()=>p.x>=202,{right:true});
  go(()=>decks[0].position[1]>=496);
  go(()=>p.onPlatform==='copper-lift',{right:true,jump:true});
  go(()=>decks[0].position[1]<=367);
  go(()=>p.x>=342,{right:true,jump:true});
  go(()=>p.grounded);
  go(()=>p.x>=400,{right:true,jump:true});
  go(()=>p.grounded);
  go(()=>p.x>=500,{right:true,jump:true});
  go(()=>p.grounded);
  go(()=>decks[1].position[0]<=606);
  go(()=>p.onPlatform==='garden-ferry',{right:true,jump:true});
  go(()=>decks[1].position[0]>=790);
  go(()=>p.x>=862,{right:true,jump:true});
  go(()=>p.grounded);
  go(()=>p.x>=931,{right:true});
  go(()=>decks[2].position[0]<=1000&&decks[2].position[1]>=317);
  go(()=>p.onPlatform==='wheel-gondola',{right:true,jump:true});
  go(()=>decks[2].position[0]>=1101&&decks[2].position[1]<=207);
  go(()=>p.x>=1240,{right:true,jump:true});
  go(()=>p.grounded);
  const relic=level.objects.find(o=>o.kind==='springKey');
  go(()=>Math.abs(p.x-(relic.x+.5)*16)<19,{right:true});
  assert.ok(Math.abs((relic.y+.5)*16-12-p.y)<26);
  const exit=level.objects.find(o=>o.kind==='exit');
  go(()=>Math.abs(p.x-(exit.x+.5)*16)<19,{right:true});
  assert.ok(Math.abs(world.groundAt((exit.x+.5)*16)-12-p.y)<26);
  assert.deepEqual([...ridden],['copper-lift','garden-ferry','wheel-gondola']);
});
