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
          setDepth(depth){this.depth=depth;return this}
        };
        images.push(sprite);return sprite;
      },
      graphics(){
        const g={
          setDepth(){return this},setVisible(value){this.visible=value;return this},
          fillStyle(){return this},fillRect(){return this},
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
