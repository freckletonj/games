import test from 'node:test';
import assert from 'node:assert/strict';
import {paintScene} from '../src/painted-scene.js';

function render(art,width=338,height=80,imageWidths=[]){
  let index=0;
  const scene={
    chapter:{id:'test-chapter'},level:{width,height},
    add:{image(x,y,key){
      return {
        x,y,key,width:imageWidths[index++],setOrigin(origin){this.origin=origin;return this},
        setDisplaySize(w,h){this.size=[w,h];return this},
        setDepth(depth){this.depth=depth;return this},
        setScrollFactor(factor){this.scrollFactor=factor;return this}
      };
    }}
  };
  return paintScene(scene,art);
}

test('a whole-scene painting is registered at one world pixel per display unit',()=>{
  const layers=render({scene:['image']});
  assert.deepEqual(layers.map(({key,x,y,origin,size,scrollFactor})=>
    ({key,x,y,origin,size,scrollFactor})),[{
    key:'scene-test-chapter-scene-0',x:0,y:0,origin:0,size:[5408,1280],scrollFactor:1
  }]);
});

test('registered background, water and solid layers share geometry and draw in depth order',()=>{
  const layers=render({solid:'image',water:'image',background:'image',
    backgroundScrollFactor:.3},220,128);
  assert.deepEqual(layers.map(layer=>layer.key),[
    'scene-test-chapter-background','scene-test-chapter-water','scene-test-chapter-solid'
  ]);
  assert.deepEqual(layers.map(layer=>layer.depth),[-32,-29,-28]);
  assert.deepEqual(layers.map(layer=>layer.scrollFactor),[.3,1,1]);
  assert.deepEqual(layers.map(layer=>layer.size),Array(3).fill([3520,2048]));
});

test('wide compositions use contiguous native-size texture strips',()=>{
  const layers=render({scene:['left','middle','right']},338,80,[2048,2048,1312]);
  assert.deepEqual(layers.map(layer=>[layer.x,layer.y,layer.width,layer.scrollFactor]),[
    [0,0,2048,1],[2048,0,2048,1],[4096,0,1312,1]
  ]);
  assert.ok(layers.every(layer=>layer.size===undefined));
});
