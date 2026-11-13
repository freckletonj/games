import test from 'node:test';
import assert from 'node:assert/strict';
import {compileRockPolygons,bodyHitsRock,sweepRockBody} from '../src/cave-solids.js';
import {compileCave,skywellLayout,vaultLayout,caveContainsWater}
  from '../src/cave-layout.js';
import {stepPlayerMotion} from '../src/player-motion.js';

const testRock=compileRockPolygons([{
  id:'bridge',points:[[8,30],[18,30],[20,33],[20,40],[8,40]]
}],32,80);

test('authored rock polygons include vertical walls and overhang undersides',()=>{
  assert.equal(bodyHitsRock(testRock,9*16,36*16),true);
  assert.equal(bodyHitsRock(testRock,7*16,36*16),false);
  const horizontal=sweepRockBody(testRock,6*16,36*16,10*16,'x');
  assert.ok(horizontal.blocked);
  assert.ok(horizontal.value<8*16-10);
  const down=sweepRockBody(testRock,12*16,28*16,36*16,'y');
  assert.equal(down.blocked,true);
  assert.ok(down.value<=30*16);
  const up=sweepRockBody(testRock,12*16,45*16,36*16,'y');
  assert.equal(up.blocked,true);
  assert.ok(up.value>40*16);
});

test('polygon compiler rejects degenerate, crossing, and unbounded geometry',()=>{
  const base={id:'bad'};
  assert.throws(()=>compileRockPolygons([{
    ...base,points:[[3,3],[4,4],[5,5]]
  }],32,80),/Degenerate/);
  assert.throws(()=>compileRockPolygons([{
    ...base,points:[[1,1],[6,6],[1,6],[6,1]]
  }],32,80),/rock polygon/);
  assert.throws(()=>compileRockPolygons([{
    ...base,points:[[0,0],[40,4],[3,5]]
  }],32,80),/Invalid rock/);
});

test('Skywell vaulted candidate is physics-authored, not illustrative scenery',()=>{
  const old=compileCave(skywellLayout);
  const study=compileCave(vaultLayout);
  assert.equal(old.rockPolygons.length,0);
  assert.equal(study.rockPolygons.length,3);
  for(const [x,y] of [[55,34],[112,35],[124,35],[175,33]]){
    assert.equal(old.materialAt(x*16,y*16),'air');
    assert.equal(study.materialAt(x*16,y*16),'rock');
    assert.equal(study.grid[y][x],'ground');
  }
  assert.equal(study.materialAt(120*16,52*16),'air');
  assert.equal(study.materialAt(120*16,72*16),'water');
  assert.equal(caveContainsWater(study,120*16,72*16),true);
  // Painted-only rock is forbidden: the same solid surface catches players.
  const p={id:0,x:120*16,y:51*16,vx:0,vy:-9,face:1,
    grounded:false,coyote:0,jumpBuffer:0,jumps:1,flaps:0,flapWait:0,
    powers:0,hover:0,breach:0,bloomWindow:0,
    creatureBounceWindow:0,form:null};
  const world={width:study.width*16,height:study.height*16,tile:16,
    groundAt:study.cave.groundAt,ceilingAt:study.cave.ceilingAt,
    inWater:(x,y)=>caveContainsWater(study,x,y),
    waterBodies:study.waterBodies,thermalVolumes:[],
    platformSegments:study.platformSegments,
    climbWalls:study.climbWalls,rockPolygons:study.rockPolygons};
  for(let i=0;i<25;i++){
    stepPlayerMotion(p,{left:false,right:false,down:false,
      jump:true,jumpPressed:false},1,world);
    assert.equal(bodyHitsRock(study.rockPolygons,p.x,p.y),false,
      'the player body must never enter painted solid rock');
  }
});

test('Skyling reaches the high vaulted shelf while the ordinary player cannot',()=>{
  const level=compileCave(vaultLayout);
  const world={width:level.width*16,height:level.height*16,tile:16,
    groundAt:level.cave.groundAt,ceilingAt:level.cave.ceilingAt,
    inWater:(x,y)=>caveContainsWater(level,x,y),
    waterBodies:level.waterBodies,thermalVolumes:[],
    platformSegments:level.platformSegments,
    climbWalls:level.climbWalls,rockPolygons:level.rockPolygons};
  const attempts=form=>{
    const p={id:0,x:118*16,y:50*16,vx:0,vy:0,face:1,
      grounded:true,coyote:5,jumpBuffer:0,jumps:0,flaps:0,
      flapWait:0,powers:0,hover:0,breach:0,bloomWindow:0,
      creatureBounceWindow:0,form};
    let previousJump=false;
    for(let tick=0;tick<140;tick++){
      // Actual keyboard-style releases precede every subsequent W press.
      const jump=tick<=80&&![17,31,45,59].includes(tick);
      const jumpPressed=jump&&!previousJump;
      previousJump=jump;
      stepPlayerMotion(p,{left:false,right:true,down:false,
        jump,jumpPressed},1,world);
      if(p.x>=127*16&&p.x<=141*16&&p.y<=41*16+6)return true;
    }
    return false;
  };
  assert.equal(attempts(null),false,
    'the ordinary explorer cannot clear this optional upper shelf');
  assert.equal(attempts('skyling'),true,
    'the transformed Skyling can use earned flaps to reach it');
});
