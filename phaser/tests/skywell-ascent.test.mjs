import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {compileCave,skywellLayout,vaultLayout,caveContainsWater} from '../src/cave-layout.js';
import {caveArtManifest,caveMaskSvg} from '../src/cave-art-guide.js';
import {caveGuidePng} from '../scripts/cave-png.mjs';
import {stepPlayerMotion} from '../src/player-motion.js';

test('the new climbing chapter compiles as one reachable, physics-led world',()=>{
  const level=compileCave(skywellLayout);
  assert.equal(level.width*16,3520);
  assert.equal(level.height*16,2048);
  assert.equal(level.climbWalls.length,10);
  assert.equal(level.platformSegments.length,26);
  assert.equal(level.waterBodies.length,3);
  const moth=level.objects.find(o=>o.kind==='glimmermoth');
  assert.ok(moth);
  assert.ok(Math.abs((moth.y+.5)*16-level.cave.groundAt((moth.x+.5)*16))<25,
    'starting required transformation must be reachable from the floor');
  assert.ok(level.objects.some(o=>o.kind==='diveKey'));
  assert.ok(level.objects.some(o=>o.kind==='exit'));
  assert.deepEqual(level.goalRoute.map(p=>p.kind),[
    'start',...Array(10).fill('wallJump'),'objective','exit'
  ]);
  assert.ok(level.platformSegments.every(p=>
    p.y*16<level.cave.groundAt((p.x+p.length/2)*16)));
  assert.ok(level.climbWalls.every(w=>
    w.top*16<level.cave.groundAt(w.x*16)));
});

test('guides and full-size illustration agree on material and collision markers',()=>{
  const level=compileCave(skywellLayout);
  const guide=caveMaskSvg(level);
  const manifest=caveArtManifest(level);
  assert.ok(guide.includes('viewBox="0 0 3520 2048"'));
  assert.ok(guide.includes('<g fill="#2388af">'));
  assert.ok(guide.includes('<g fill="#ff9d63">'));
  for(const dynamic of ['diveKey','glimmermoth','checkpoint','starShard']){
    assert.ok(!guide.includes(dynamic),'guide must exclude '+dynamic);
  }
  assert.deepEqual(manifest.world,{width:3520,height:2048});
  assert.equal(manifest.paintingStatus,'legacy-physics-masked-draft');
  assert.equal(manifest.dynamicExcluded,true);
  assert.match(manifest.imageGeneration.resolution,/maximum/);
});

test('the guide raster fills rock, swim volumes, and climb walls with real material colors',()=>{
  const level=compileCave(skywellLayout);
  const from=24,bytes=caveGuidePng(level,{from,to:31});
  const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
  assert.deepEqual([w,h],[112,2048]);
  let off=8,compressed;
  while(off<bytes.length){
    const n=bytes.readUInt32BE(off);
    if(bytes.toString('ascii',off+4,off+8)==='IDAT')
      compressed=bytes.subarray(off+8,off+8+n);
    off+=12+n;
  }
  const pixels=inflateSync(compressed);
  const at=(x,y)=>Array.from(pixels.subarray(
    y*(w*4+1)+1+x*4,y*(w*4+1)+5+x*4));
  assert.deepEqual(at(0,100),[128,92,119,255]);
  assert.deepEqual(at(0,1200),[24,45,64,255]);
  assert.deepEqual(at(0,1650),[35,136,175,255]);
  assert.deepEqual(at((28-from)*16,1600),[255,157,99,255]);
});

test('a wall blocks walking through it but enables a second jump to climb',()=>{
  const level=compileCave(skywellLayout),wall=level.climbWalls[0];
  const makePlayer=()=>({id:0,x:wall.x*16-14,y:wall.top*16+68,
    vx:2.3,vy:0,face:1,grounded:false,coyote:0,jumpBuffer:0,
    jumps:1,flaps:0,flapWait:0,powers:0,hover:0,breach:0,
    bloomWindow:0,creatureBounceWindow:0,form:null});
  const world={width:3520,height:2048,tile:16,
    groundAt:level.cave.groundAt,ceilingAt:level.cave.ceilingAt,
    inWater:()=>false,waterBodies:level.waterBodies,
    thermalVolumes:[],platformSegments:level.platformSegments,
    climbWalls:level.climbWalls};
  const p=makePlayer();
  const move={left:false,right:true,down:false,jump:false,jumpPressed:false};
  stepPlayerMotion(p,move,1,world);
  assert.ok(p.x<=wall.x*16-12,'wall cannot be walked through');
  const jump=stepPlayerMotion(p,{...move,jump:true,jumpPressed:true},1,world);
  assert.ok(jump.events.includes('wallJump'));
  assert.equal(p.wallJumps,1);
  assert.ok(p.vy<0,'wall jump launches upward');
  assert.ok(p.vx<0,'wall jump rebounds away from obstacle');
  const repeat=stepPlayerMotion(p,{...move,jumpPressed:true},1,world);
  assert.ok(!repeat.events.includes('wallJump'),'jump has a cooldown');
  assert.throws(()=>compileCave({...skywellLayout,
    walls:[{x:55,top:120,bottom:125}]}),/Invalid climb wall/);
});

test('wall spring is physically high enough for the demanding middle ramps',()=>{
  const level=compileCave(skywellLayout);
  // Exact fixed-tick ascent for held jump: first frame applies +.34
  // gravity, then the next 29 upwards ticks. A released button shortens it.
  let vy=-10.4,rise=0,peak=0;
  while(vy<0){
    vy+=.34;rise-=vy;peak=Math.max(peak,rise);
  }
  for(const x of [28,44,60,77,93,112]){
    const wall=level.climbWalls.find(w=>w.x===x);
    assert.ok(level.cave.groundAt(x*16)-wall.top*16<peak,
      'authored wall at '+x+' must clear from the lower floor');
  }
  for(const x of [132,152,171,190]){
    const wall=level.climbWalls.find(w=>w.x===x);
    const candidates=level.platformSegments.filter(p=>
      p.x<=x&&p.x+p.length>=x-2&&
      p.y>=wall.top&&p.y<wall.bottom);
    assert.ok(candidates.length>0,'tall wall needs a reachable intermediate ledge: '+x);
    assert.ok(candidates.some(p=>(p.y-wall.top)*16<peak),
      'wall jump should clear from the intermediate perch at '+x);
  }
});

test('scripted player inputs actually carry explorers across all ten rock faces',()=>{
  const level=compileCave(skywellLayout);
  const world={width:level.width*16,height:level.height*16,tile:16,
    groundAt:level.cave.groundAt,ceilingAt:level.cave.ceilingAt,
    inWater:()=>false,waterBodies:level.waterBodies,
    thermalVolumes:[],platformSegments:level.platformSegments,
    climbWalls:level.climbWalls};
  const approachPerch=new Map([[132,65],[152,58],[171,55],[190,54]]);
  for(const wall of level.climbWalls){
    // Early walls are climbed from the floor; later pillars have authored
    // intermediate perches. No forced teleport is used after initialization.
    const x=wall.x*16-14;
    const y=approachPerch.has(wall.x)?
      approachPerch.get(wall.x)*16:level.cave.groundAt(x);
    const player={id:0,x,y,vx:0,vy:0,face:1,grounded:true,coyote:5,
      jumpBuffer:0,jumps:0,flaps:0,flapWait:0,powers:0,hover:0,breach:0,
      bloomWindow:0,creatureBounceWindow:0,form:null};
    let wallJumped=false,crossed=false;
    for(let frame=0;frame<100;frame++){
      const {events}=stepPlayerMotion(player,{
        left:false,right:true,down:false,
        jump:true,jumpPressed:frame===0||frame===4
      },1,world);
      if(events.includes('wallJump'))wallJumped=true;
      if(player.x>wall.x*16+12){crossed=true;break;}
    }
    assert.ok(wallJumped,'wall '+wall.x+' requires a real wall-jump input');
    assert.ok(crossed,'wall '+wall.x+' must be crossable, not just visually climbable');
  }
});

test('water and climbable rock never claim the same pixel',()=>{
  const level=compileCave(skywellLayout);
  const from=128,bytes=caveGuidePng(level,{from,to:136});
  const width=bytes.readUInt32BE(16),row=width*4+1;
  let offset=8,packed;
  while(offset<bytes.length){
    const n=bytes.readUInt32BE(offset);
    if(bytes.toString('ascii',offset+4,offset+8)==='IDAT')
      packed=bytes.subarray(offset+8,offset+8+n);
    offset+=n+12;
  }
  const pixels=inflateSync(packed);
  const at=(x,y)=>Array.from(pixels.subarray(
    y*row+1+x*4,y*row+5+x*4));
  const wallX=132*16;
  assert.equal(caveContainsWater(level,wallX,1120),false);
  assert.deepEqual(at(wallX-from*16,1120),[255,157,99,255]);
  assert.equal(caveContainsWater(level,wallX+15,1120),true);
  assert.deepEqual(at(wallX+15-from*16,1120),[35,136,175,255]);
});

test('the high lantern can be picked up from a real platform',()=>{
  const level=compileCave(skywellLayout);
  const goal=level.objects.find(o=>o.kind==='diveKey');
  const support=level.platformSegments.find(p=>
    p.x<=goal.x&&goal.x<=p.x+p.length&&
    Math.abs(p.y*16-((goal.y+.5)*16-12))<26);
  assert.ok(support,'lantern must be reachable while standing on a high ledge');
});

test('original and vaulted caves both permit the entire real-input goal route',()=>{
  for(const layout of [skywellLayout,vaultLayout]){
  const level=compileCave(layout);
  const world={width:level.width*16,height:level.height*16,tile:16,
    groundAt:level.cave.groundAt,ceilingAt:level.cave.ceilingAt,
    inWater:(x,y)=>caveContainsWater(level,x,y),
    waterBodies:level.waterBodies,thermalVolumes:[],
    platformSegments:level.platformSegments,climbWalls:level.climbWalls,
    rockPolygons:level.rockPolygons};
  const player={id:0,x:7.5*16,y:world.groundAt(7.5*16),vx:0,vy:0,
    face:1,grounded:true,coyote:5,jumpBuffer:0,jumps:0,
    flaps:0,flapWait:0,powers:0,hover:0,breach:0,
    bloomWindow:0,creatureBounceWindow:0,form:'glimmermoth'};
  const lantern=level.objects.find(o=>o.kind==='diveKey');
  const exit=level.objects.find(o=>o.kind==='exit');
  const lanternX=(lantern.x+.5)*16,lanternY=(lantern.y+.5)*16;
  const exitX=(exit.x+.5)*16;
  let currentWall=0,phase='approach',firstJump=-100;
  let lanternFound=false,exitReached=false,wallJumps=0;
  for(let frame=0;frame<2400;frame++){
    // These are keyboard-style jump press, hold and release inputs.
    // No position edits, time skips, or setting the grounded flag.
    const wall=level.climbWalls[currentWall];
    let jump=false,jumpPressed=false;
    if(wall){
      const distance=wall.x*16-player.x;
      if(phase==='approach'&&distance<=28&&distance>=9&&
         player.y>wall.top*16+3&&player.grounded){
        jump=true;jumpPressed=true;phase='prepare';firstJump=frame;
      }else if(phase==='prepare'){
        jump=frame-firstJump!==6;
        if(frame-firstJump===7){
          jumpPressed=true;phase='cross';
        }
      }else if(phase==='cross'){
        jump=true;
        if(player.x>wall.x*16+25){
          currentWall++;phase='approach';jump=false;
        }
      }
    }
    const state=stepPlayerMotion(player,{left:false,right:true,
      down:false,jump,jumpPressed},1,world);
    if(state.events.includes('wallJump'))wallJumps++;
    if(!lanternFound&&Math.abs(player.x-lanternX)<19&&
       Math.abs(player.y-(lanternY-12))<26)
      lanternFound=true;
    if(lanternFound&&Math.abs(player.x-exitX)<19&&
       Math.abs(player.y-world.groundAt(exitX))<40){
      exitReached=true;break;
    }
  }
  assert.equal(currentWall,10,'continuous traversal must pass every wall');
  assert.equal(wallJumps,10,'each wall needs its own deliberate second jump');
  assert.equal(lanternFound,true,'actual collision proximity must reach lantern');
  assert.equal(exitReached,true,'player must reach the actual exit after lantern');
  }
});
