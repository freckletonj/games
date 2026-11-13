import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCave,skywellLayout} from '../src/cave-layout.js';
import {paintCave,paintCaveGeometryOverlay} from '../src/cave-renderer.js';

function makeScene(){
  const images=[],graphics=[];
  const scene={
    level:compileCave(),images,graphics,
    add:{
      image(x,y,key){
        const sprite={
          x,y,key,setOrigin(){return this},
          setDisplaySize(w,h){this.displayWidth=w;this.displayHeight=h;return this},
          setDepth(depth){this.depth=depth;return this},
          setScrollFactor(value){this.scrollFactor=value;return this}
        };
        images.push(sprite);return sprite;
      },
      graphics(){
        const g={
          setDepth(){return this},setVisible(value){this.visible=value;return this},
          fillStyle(){return this},fillRect(){return this},
          fillPoints(){return this},
          lineStyle(){},beginPath(){},moveTo(){},lineTo(){},
          strokePath(){},lineBetween(){}
        };
        graphics.push(g);return g;
      }
    }
  };
  return scene;
}

test('the cave renderer uses exactly one un-tiled full-level texture',()=>{
  const scene=makeScene();
  paintCave(scene);
  paintCaveGeometryOverlay(scene);
  assert.equal(scene.images.length,1);
  assert.equal(scene.images[0].key,'cave-painted-rock');
  assert.equal(scene.images[0].x,0);
  assert.equal(scene.images[0].y,0);
  assert.deepEqual([
    scene.images[0].displayWidth,scene.images[0].displayHeight
  ],[3200,1792]);
  assert.equal(Object.hasOwn(scene,'cavePaintedChunks'),false);
  assert.equal(scene.caveGeometryOverlay.visible,false);
  assert.equal(scene.graphics.length,1);
});

test('Skywell uses exactly one level-sized, geometry-linked illustration',()=>{
  const scene=makeScene();
  scene.level=compileCave(skywellLayout);
  paintCave(scene);
  paintCaveGeometryOverlay(scene);
  assert.equal(scene.images.length,1);
  assert.equal(scene.images[0].key,'skywell-painted-rock');
  assert.deepEqual([scene.images[0].displayWidth,
    scene.images[0].displayHeight],[3520,2048]);
  assert.equal(scene.caveGeometryOverlay.visible,false);
});

test('approved painted solids are one world-locked alpha plane, not vector objects',()=>{
  const scene=makeScene();
  scene.level=compileCave(skywellLayout);
  scene.approvedCaveArt={
    'skywell-ascent':{solid:'data:image/png;base64,painted',
      water:'data:image/png;base64,water',
      background:'data:image/png;base64,distant',
      backgroundScrollFactor:.3}
  };
  paintCave(scene);
  assert.deepEqual(scene.images.map(i=>i.key),[
    'cave-skywell-ascent-background',
    'cave-skywell-ascent-water',
    'cave-skywell-ascent-solid'
  ]);
  assert.deepEqual(scene.images.map(i=>i.depth),[-32,-29,-28]);
  assert.equal(scene.images[0].scrollFactor,.3);
  assert.equal(scene.images[1].scrollFactor,undefined);
  assert.equal(scene.images[2].scrollFactor,undefined);
  assert.deepEqual(scene.images.map(i=>[i.displayWidth,i.displayHeight]),
    Array(3).fill([3520,2048]));
  assert.equal(scene.cavePainting,scene.images[2]);
  assert.equal(scene.cavePaintedLayers.length,3);
  assert.equal(scene.graphics.length,0,
    'no visible runtime rock/ledge vector objects are created');
});

test('chosen global composition stays locked to the geometry, no ghost terrain parallax',()=>{
  const scene=makeScene();
  scene.level=compileCave(skywellLayout);
  scene.approvedCaveArt={'skywell-ascent':{
    background:'data:image/webp;base64,air',
    water:'data:image/webp;base64,water',
    solid:'data:image/webp;base64,solid',
    backgroundScrollFactor:1
  }};
  paintCave(scene);
  assert.equal(scene.images.length,3);
  assert.deepEqual(scene.images.map(i=>i.key),[
    'cave-skywell-ascent-background',
    'cave-skywell-ascent-water',
    'cave-skywell-ascent-solid'
  ]);
  assert.equal(scene.images[0].scrollFactor,1);
  assert.equal(scene.images[1].scrollFactor,undefined);
  assert.equal(scene.images[2].scrollFactor,undefined);
  assert.deepEqual(scene.images.map(i=>[i.displayWidth,i.displayHeight]),
    [[3520,2048],[3520,2048],[3520,2048]]);
});
