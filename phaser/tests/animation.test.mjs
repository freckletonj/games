import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIONS,poseFor,gesture} from '../src/animation.js';
import {readFileSync,readdirSync} from 'node:fs';

const base=new URL('../../src/assets/characters/',import.meta.url);
test('all painted characters support every standardized animation action',()=>{
  const names=readdirSync(base,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name);
  assert.ok(names.length>=9);
  for(const name of names){
    const manifest=JSON.parse(readFileSync(new URL(name+'/manifest.json',base)));
    assert.ok(manifest.worldScale>0, name);
    assert.ok(manifest.frameWidth>0&&manifest.frameHeight>0,name);
    assert.ok(manifest.origin.x>=0&&manifest.origin.y<=manifest.frameHeight,name);
    const image=readFileSync(new URL(name+'/'+manifest.image,base));
    const height=manifest.image.endsWith('.png')?image.readUInt32BE(20):
      1+image.readUIntLE(27,3);
    const count=height/manifest.frameHeight*manifest.columns;
    for(const action of ACTIONS){
      for(const t of [0,.1,.3,1.25]){
        const pose=poseFor(manifest,action,t,2,0.8);
        assert.ok(Number.isInteger(pose.frame) && pose.frame>=0 && pose.frame<count,
          name+' '+action+' '+t);
        assert.ok(pose.sx>.5&&pose.sx<1.5&&pose.sy>.5&&pose.sy<1.5,
          name+' '+action+' '+t);
        assert.ok(Number.isFinite(pose.rotation), name+' '+action);
      }
    }
  }
});
test('run bounces, jump stretches and land squashes with anchored feet',()=>{
  const manifest=JSON.parse(readFileSync(new URL('springaroo/manifest.json',base)));
  const idle=poseFor(manifest,'idle',.15,0);
  const run=poseFor(manifest,'run',.15,2.3);
  const jump=poseFor(manifest,'jump',.15,0);
  const land=poseFor(manifest,'land',0,0);
  assert.notEqual(run.sy,idle.sy);
  assert.ok(jump.sy>1&&jump.sx<1);
  assert.ok(land.sy<1&&land.sx>1);
});
test('action gestures do not mutate the canonical atlas',()=>{
  const entity={};
  gesture(entity,'capture',.42);
  assert.deepEqual(entity,{gesture:'capture',gestureTime:.42});
});

test('gait responds to speed and takeoff stretch relaxes in flight',()=>{
  const manifest=JSON.parse(readFileSync(new URL('springaroo/manifest.json',base)));
  const slow=poseFor(manifest,'run',.19,.7);
  const fast=poseFor(manifest,'run',.19,3);
  assert.notEqual(slow.dy,fast.dy);
  assert.notEqual(slow.rotation,fast.rotation);
  const launch=poseFor(manifest,'jump',0,0);
  const settle=poseFor(manifest,'jump',.35,0);
  assert.ok(launch.sy>settle.sy && launch.sx<settle.sx);
  const landing=poseFor(manifest,'land',.3,0);
  assert.ok(landing.sy>poseFor(manifest,'land',0,0).sy);
});

test('gliding and swimming use restrained painted-pose movement, not stretched sprites',()=>{
  const manifest=JSON.parse(readFileSync(new URL('glimmermoth/manifest.json',base)));
  const a=poseFor(manifest,'glide',.10,1);
  const b=poseFor(manifest,'glide',.24,1);
  assert.notEqual(a.dy,b.dy);
  for(const pose of [a,b,
    poseFor(manifest,'swim',.17,2),
    poseFor(manifest,'dash',.15,2),
    poseFor(manifest,'stunned',.15)]){
    assert.ok(pose.sx>.90&&pose.sx<1.11,pose);
    assert.ok(pose.sy>.90&&pose.sy<1.11,pose);
    assert.ok(Math.abs(pose.rotation)<.10,pose);
  }
});
