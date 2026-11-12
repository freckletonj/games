import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCave,caveLayout,caveContainsWater,caveCeilingHit} from '../src/cave-layout.js';
import {caveArtManifest,caveMaskSvg} from '../src/cave-art-guide.js';
import {stepPlayerMotion} from '../src/player-motion.js';

test('single-world cave guide and gameplay share smooth splines',()=>{
  const level=compileCave();
  const image=caveArtManifest(level);
  const svg=caveMaskSvg(level);
  assert.equal(level.width*16,3200);
  assert.equal(level.height*16,1792);
  assert.deepEqual(image.world,{width:3200,height:1792});
  assert.equal(image.dynamicExcluded,true);
  assert.equal(image.painting,'phaser/assets/generated/luminous-grotto-single.png');
  assert.ok(svg.includes('viewBox="0 0 3200 1792"'));
  assert.ok(!svg.includes('tideling'));
  assert.ok(!svg.includes('starShard'));
  assert.ok(!svg.includes('p1'));
  const left=level.cave.groundAt(500);
  const right=level.cave.groundAt(524);
  assert.ok(Math.abs(left-right)<60,'smooth floor should not have sharp steps');
  assert.equal(level.cave.ceilingAt(0),220);
  assert.equal(level.cave.groundAt(0),1210);
});

test('water follows the actual rock floor through both lagoons',()=>{
  const level=compileCave();
  assert.equal(caveContainsWater(level,900,1100),true);
  assert.equal(caveContainsWater(level,900,990),false);
  assert.equal(caveContainsWater(level,1490,1100),false);
  assert.equal(caveContainsWater(level,2100,1100),true);
  assert.equal(caveContainsWater(level,2100,1450),false);
  assert.equal(caveCeilingHit(level,400,30),true);
  assert.equal(caveCeilingHit(level,400,450),false);
});

test('invalid clearance, water and ledges are rejected',()=>{
  assert.throws(()=>compileCave({...caveLayout,
    ceiling:[[0,77],[200,77]]}),/clearance/);
  assert.throws(()=>compileCave({...caveLayout,
    pools:[{id:'bad',from:10,to:12,surface:100}]}),/water chamber/);
  assert.throws(()=>compileCave({...caveLayout,
    shelves:[{x:50,y:100,length:5}]}),/Shelf intersects/);
});

test('production movement still collides with the spline cave roof',()=>{
  const level=compileCave(),x=16*9;
  const roof=level.cave.ceilingAt(x);
  const player={id:0,x,y:roof+29,vx:0,vy:-7,face:1,
    grounded:false,coyote:0,jumpBuffer:0,jumps:1,flaps:0,flapWait:0,
    powers:0,hover:0,breach:0,bloomWindow:0,creatureBounceWindow:0,
    form:null};
  const actions={left:false,right:false,down:false,
    jump:true,jumpPressed:false};
  const world={width:3200,height:1792,tile:16,
    groundAt:level.cave.groundAt,ceilingAt:level.cave.ceilingAt,
    inWater:()=>false,waterBodies:level.waterBodies,
    thermalVolumes:[],platformSegments:level.platformSegments};
  stepPlayerMotion(player,actions,1,world);
  assert.equal(player.y,roof+27);
  assert.equal(player.vy,0);
});
