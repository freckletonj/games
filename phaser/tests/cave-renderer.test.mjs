import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCave} from '../src/cave-layout.js';
import {caveArtManifest} from '../src/cave-art-guide.js';
import {
  paintCave,paintCaveForeground,paintCaveGeometryOverlay
} from '../src/cave-renderer.js';

function canvas(){
  const ctx={
    save(){},restore(){},translate(){},setTransform(){},drawImage(){},
    beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},
    stroke(){},fill(){},fillRect(){},quadraticCurveTo(){},
    createLinearGradient(){return {addColorStop(){}}},
    createRadialGradient(){return {addColorStop(){}}}
  };
  return {width:0,height:0,getContext:()=>ctx};
}

function visual(x=0,y=0){
  return {
    x,y,visible:true,
    setOrigin(){return this},
    setDepth(depth){this.depth=depth;return this},
    setScrollFactor(factor){this.scrollFactor=factor;return this},
    setDisplaySize(width,height){
      this.displayWidth=width;this.displayHeight=height;return this;
    },
    setVisible(value){this.visible=value;return this}
  };
}

function graphics(){
  return {
    ...visual(),
    fillStyle(){},fillRoundedRect(){},lineStyle(){},lineBetween(){},
    beginPath(){},moveTo(){},lineTo(){},strokePath(){},fillTriangle(){}
  };
}

function makeScene(painted=[]){
  const level=compileCave();
  const textureData=new Map([
    ['cave-painted-rock',{width:1280,height:720}],
    ['cave-painted-ambient',{width:1280,height:720}]
  ]);
  for(const plane of painted)for(const chunk of caveArtManifest(level).chunks)
    textureData.set('cave-tile-'+chunk.id+'-'+plane,{
      width:(chunk.to-chunk.from)*32,height:level.height*32
    });
  const images=[];
  const scene={
    level,generatedTextures:[],parallaxLayers:[],images,
    textures:{
      exists:key=>textureData.has(key),
      get:key=>({
        getSourceImage:()=>textureData.get(key)
      }),
      addCanvas(key,bitmap){textureData.set(key,bitmap)}
    },
    add:{
      image(x,y,key){
        const result=visual(x,y);
        result.textureKey=key;images.push(result);return result;
      },
      graphics,
      ellipse(x,y){return visual(x,y)}
    },
    tweens:{add(){}}
  };
  return scene;
}

function assertSeams(scene){
  const chunks=scene.cavePaintedChunks;
  assert.equal(chunks.length,4);
  assert.equal(chunks[0].x,0);
  assert.equal(chunks.at(-1).x+chunks.at(-1).width,scene.level.width*16);
  for(let i=1;i<chunks.length;i++){
    assert.equal(chunks[i-1].x+chunks[i-1].width,
      chunks[i].x+chunks[i].overlapPixels);
    assert.equal(chunks[i].overlapPixels,64);
  }
}

test('fallback cave paints overlap without gaps and parallax does not tile',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>canvas()};
  try{
    const scene=makeScene();
    paintCave(scene);
    paintCaveForeground(scene);
    paintCaveGeometryOverlay(scene);
    assertSeams(scene);
    assert.deepEqual(scene.cavePaintedChunks.map(c=>c.source),
      ['fallback','fallback','fallback','fallback']);
    assert.equal(scene.parallaxLayers.length,2);
    assert.deepEqual(scene.parallaxLayers.map(p=>p.speed),[.16,.34]);
    assert.equal(scene.parallaxLayers[0].visual.scrollFactor,.16);
    assert.equal(scene.parallaxLayers[0].visual.displayWidth,2560);
    assert.equal(scene.parallaxLayers[1].visual.scrollFactor,.34);
    assert.equal(scene.caveGeometryOverlay.visible,false);
  }finally{
    globalThis.document=previous;
  }
});

test('optional 2x painted rock, parallax and foreground use exact chunk positions',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>canvas()};
  try{
    const scene=makeScene([
      'physical-rock','distant-arches','mist-and-crystals',
      'foreground-occlusion'
    ]);
    paintCave(scene);
    paintCaveForeground(scene);
    assertSeams(scene);
    assert.ok(scene.cavePaintedChunks.every(c=>c.source==='chunk'));
    assert.equal(scene.parallaxLayers.length,2);
    assert.equal(scene.parallaxLayers[0].visuals.length,4);
    assert.equal(scene.parallaxLayers[1].visuals.length,4);
    assert.equal(scene.parallaxLayers[0].visuals[1].x,44*16);
    assert.equal(scene.parallaxLayers[1].visuals[3].x,132*16);
    assert.equal(scene.images.filter(i=>i.depth===35).length,4);
  }finally{
    globalThis.document=previous;
  }
});
