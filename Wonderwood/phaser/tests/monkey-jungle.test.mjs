import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {compileChapter} from '../src/campaign.js';
import {createMonkeys,monkeyFrame,stepMonkeys} from '../src/monkey-motion.js';
import {stepPlayerMotion} from '../src/player-motion.js';
import {createRopes,stepRopes} from '../src/rope-swing.js';
import {surfaceGroundAt} from '../src/surface-geometry.js';

const scope={};
scope.window=scope;
vm.createContext(scope);
vm.runInContext(readFileSync(new URL('../../src/platform/world-compiler.js',import.meta.url),'utf8'),scope);
const level=compileChapter({id:'monkey-jungle',biome:'meadow',key:'springKey',
  goals:[{kind:'springKey'}]},scope.WW.worldCompiler);
const groundAt=x=>surfaceGroundAt(level,x);
const explorer=x=>({id:0,x,y:groundAt(x),vx:0,vy:0,face:1,grounded:true,
  coyote:5,flapWait:0,powers:0,hover:0,breach:0,bloomWindow:0,jumps:0,flaps:0});

test('all three crossings are playable from a standing start at different rope phases',()=>{
  const banks=[[357,560],[760,976],[1192,1408]];
  for(const [index,spec] of level.ropes.entries()){
    const [start,finish]=banks[index];
    for(const phase of [0,55,132,225]){
      const p=explorer(start);
      const ropes=createRopes([spec]),rope=ropes[0];
      for(let i=0;i<phase;i++)stepRopes(ropes,[],groundAt,1);
      const world={width:level.width*16,height:level.height*16,tile:16,
        groundAt,inWater:()=>false,waterBodies:[],thermalVolumes:[],
        platformSegments:level.platformSegments,ropes};
      const tick=actions=>{
        stepRopes(ropes,[p],groundAt,1);
        return stepPlayerMotion(p,{left:false,right:false,up:false,down:false,
          jump:false,jumpPressed:false,...actions},1,world);
      };
      for(let i=0;!p.rope&&i<180;i++)tick({up:true});
      assert.equal(p.rope,rope,spec.id+' must swing within reach');

      const gripOnGrab=p.ropeGrip;
      const climb=index===2;
      let pumped=false;
      for(let i=0;p.rope&&i<200;i++){
        const pump=!pumped&&rope.omega>0&&Math.abs(rope.angle)<.25;
        const release=rope.omega>0&&rope.angle>(climb?.49:.33)&&
          (!climb||p.ropeGrip<=104);
        const result=tick({right:true,up:climb&&p.ropeGrip>101,
          rightPressed:pump,jump:release,jumpPressed:release});
        pumped||=result.events.includes('ropePump');
      }
      assert.ok(pumped,spec.id+' should respond to a timed directional press');
      assert.equal(p.rope,null,spec.id+' should release on Jump');
      if(climb)assert.ok(gripOnGrab-p.ropeGrip>45);

      for(let i=0;i<65&&!(p.grounded&&p.x>=finish);i++)tick({right:true,jump:true});
      assert.ok(p.grounded&&p.x>=finish,spec.id+' should reach its far bank');
      assert.ok(p.y<=groundAt(p.x)+1,spec.id+' must respect the far bank collision');
    }
  }
});

test('a monkey runs toward a moving explorer, crouches, jumps, and perches on their head',()=>{
  const p=explorer(190);
  const monkeys=createMonkeys(level.monkeys.slice(0,1),16,groundAt);
  const [monkey]=monkeys,seen=new Set();
  for(let i=0;i<160&&monkey.perchedOn===null;i++){
    p.vx=i<55?.65:0;p.x+=p.vx;
    stepMonkeys(monkeys,[p],[{}],groundAt,level.recallBelow,1);
    seen.add(monkey.state);
  }
  assert.deepEqual([...seen],['run','crouch','leap','perch']);
  assert.equal(monkey.perchedOn,p.id);
  assert.equal(monkey.x,p.x);
  assert.equal(monkey.y,p.y-34);
  assert.equal(monkeyFrame(monkey),7);
  stepMonkeys(monkeys,[p],[{jumpPressed:true}],groundAt,level.recallBelow,1);
  assert.equal(monkey.perchedOn,null);
  assert.equal(monkey.state,'leap');
  assert.ok(monkey.wait>60);
});
