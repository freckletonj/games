import {caveArtManifest} from './cave-art-guide.js';

// A chunk image may be a full-world fallback or a high-resolution painting
// generated for precisely its guide bounds. Neither changes the colliders.
export function caveArtworkCrop(chunk,level,imageWidth,imageHeight){
  return {
    x:imageWidth*chunk.from/level.width,y:0,
    width:imageWidth*(chunk.to-chunk.from)/level.width,height:imageHeight
  };
}

function chunkTextureKey(chunk,plane){
  return 'cave-tile-'+chunk.id+'-'+plane;
}

function sourceFor(scene,chunk,plane,fallback){
  const key=chunkTextureKey(chunk,plane);
  if(scene.textures.exists(key))
    return {image:scene.textures.get(key).getSourceImage(),individual:true};
  return {image:scene.textures.get(fallback).getSourceImage(),individual:false};
}

function drawSource(ctx,source,chunk,level){
  const left=chunk.from*16,width=(chunk.to-chunk.from)*16,height=level.height*16;
  if(source.individual){
    ctx.drawImage(source.image,0,0,source.image.width,source.image.height,
      left,0,width,height);
  }else{
    const crop=caveArtworkCrop(chunk,level,source.image.width,source.image.height);
    ctx.drawImage(source.image,crop.x,crop.y,crop.width,crop.height,
      left,0,width,height);
  }
}

function makeCanvas(chunk,level){
  const canvas=document.createElement('canvas');
  canvas.width=(chunk.to-chunk.from)*16;
  canvas.height=level.height*16;
  return canvas;
}

function featherEntry(ctx,canvas,chunk){
  if(chunk.from===0||!chunk.overlapPixels)return;
  // The prior chunk is opaque under the incoming chunk. Fade only the
  // incoming painting, giving a true crossfade with no see-through seam.
  const width=Math.min(chunk.overlapPixels,canvas.width);
  ctx.save();
  ctx.globalCompositeOperation='destination-in';
  const alpha=ctx.createLinearGradient(0,0,width,0);
  alpha.addColorStop(0,'rgba(0,0,0,0)');
  alpha.addColorStop(1,'rgba(0,0,0,1)');
  ctx.fillStyle=alpha;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.restore();
}

function registerCanvas(scene,canvas,key){
  scene.textures.addCanvas(key,canvas);
  scene.generatedTextures.push(key);
  return key;
}

function hasPaintedPlane(scene,manifest,plane){
  return manifest.chunks.every(chunk=>
    scene.textures.exists(chunkTextureKey(chunk,plane)));
}

function addParallaxPlanes(scene,manifest){
  const level=scene.level;
  for(const [plane,speed,depth] of [
    ['distant-arches',.16,-92],['mist-and-crystals',.34,-72]
  ]){
    const visuals=[];
    if(hasPaintedPlane(scene,manifest,plane)){
      for(const chunk of manifest.chunks){
        const canvas=makeCanvas(chunk,level),ctx=canvas.getContext('2d');
        ctx.translate(-chunk.from*16,0);
        drawSource(ctx,sourceFor(scene,chunk,plane,'cave-painted-ambient'),
          chunk,level);
        ctx.setTransform(1,0,0,1,0,0);
        featherEntry(ctx,canvas,chunk);
        const key=registerCanvas(scene,canvas,'cave-plane-'+plane+'-'+chunk.id);
        visuals.push(scene.add.image(chunk.from*16,0,key).setOrigin(0)
          .setDepth(depth).setScrollFactor(speed));
      }
    }else if(plane==='distant-arches'){
      // A unique, world-sized image, never a repeating tileSprite.
      visuals.push(scene.add.image(0,0,'cave-painted-ambient')
        .setOrigin(0).setDisplaySize(level.width*16,level.height*16)
        .setDepth(depth).setScrollFactor(speed));
    }else{
      const canvas=document.createElement('canvas');
      canvas.width=level.width*16;canvas.height=level.height*16;
      const ctx=canvas.getContext('2d');
      for(let x=55;x<canvas.width;x+=153){
        const y=380+74*Math.sin(x*.012);
        const glow=ctx.createRadialGradient(x,y,8,x,y,215);
        glow.addColorStop(0,'#b9fff071');
        glow.addColorStop(.42,'#66e9e52b');
        glow.addColorStop(1,'#66e9e500');
        ctx.fillStyle=glow;ctx.fillRect(x-220,y-220,440,440);
      }
      const key=registerCanvas(scene,canvas,'cave-plane-mist-fallback');
      visuals.push(scene.add.image(0,0,key).setOrigin(0)
        .setDepth(depth).setScrollFactor(speed));
    }
    scene.parallaxLayers.push({speed,visual:visuals[0],visuals});
  }
}

function clipContour(ctx,samples,chunk,top,height){
  const left=chunk.from*16,right=chunk.to*16;
  ctx.beginPath();
  ctx.moveTo(left,top?0:height);
  for(let x=chunk.from;x<=chunk.to;x++)
    ctx.lineTo(x*16,samples[x]*16);
  ctx.lineTo(right,top?0:height);
  ctx.closePath();
}

export function paintCave(scene){
  const level=scene.level;
  const manifest=caveArtManifest(level);
  scene.cavePaintedChunks=[];
  addParallaxPlanes(scene,manifest);

  for(const chunk of manifest.chunks){
    const canvas=makeCanvas(chunk,level),ctx=canvas.getContext('2d');
    const left=chunk.from*16,right=chunk.to*16,height=level.height*16;
    const source=sourceFor(scene,chunk,'physical-rock','cave-painted-rock');
    ctx.translate(-left,0);
    for(const [samples,top] of [[level.ceiling,true],[level.surface,false]]){
      clipContour(ctx,samples,chunk,top,height);
      ctx.save();ctx.clip();drawSource(ctx,source,chunk,level);ctx.restore();
    }
    for(const pool of level.waterBodies){
      if(pool.end<=chunk.from||pool.start>=chunk.to)continue;
      const a=Math.max(chunk.from,pool.start),b=Math.min(chunk.to,pool.end);
      ctx.beginPath();ctx.moveTo(a*16,pool.surface*16);
      ctx.lineTo(b*16,pool.surface*16);
      for(let x=b;x>=a;x--)ctx.lineTo(x*16,level.surface[x]*16);
      ctx.closePath();
      ctx.save();ctx.clip();drawSource(ctx,source,chunk,level);ctx.restore();
      ctx.fillStyle='#1b9fb53b';ctx.fill();
      ctx.strokeStyle='#d9fff0ba';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(a*16,pool.surface*16);
      ctx.lineTo(b*16,pool.surface*16);ctx.stroke();
    }
    // Geometry-accurate edges remain stable at every texture resolution.
    ctx.strokeStyle='#a3d6cb6a';ctx.lineWidth=1.4;
    for(const samples of [level.ceiling,level.surface]){
      ctx.beginPath();
      for(let x=chunk.from;x<=chunk.to;x++){
        const y=samples[x]*16;
        if(x===chunk.from)ctx.moveTo(x*16,y);
        else ctx.lineTo(x*16,y);
      }
      ctx.stroke();
    }
    ctx.setTransform(1,0,0,1,0,0);
    featherEntry(ctx,canvas,chunk);
    const key=registerCanvas(scene,canvas,'cave-physical-'+chunk.id);
    const visual=scene.add.image(left,0,key).setOrigin(0).setDepth(-29);
    scene.cavePaintedChunks.push({
      x:left,width:canvas.width,from:chunk.from,to:chunk.to,
      overlapPixels:chunk.from?chunk.overlapPixels:0,
      source:source.individual?'chunk':'fallback',visual
    });
  }

  const shelves=scene.add.graphics().setDepth(-20);
  for(const ledge of level.platformSegments){
    const x=ledge.x*16,y=ledge.y*16,w=ledge.length*16;
    shelves.fillStyle(0x688c88,.95);
    shelves.fillRoundedRect(x,y,w,9,3);
    shelves.lineStyle(2,0xc8efd4,.9);
    shelves.lineBetween(x+2,y,x+w-2,y);
  }
  for(let i=0;i<29;i++){
    const x=66+i*81,y=level.ceiling[Math.min(level.width,Math.floor(x/16))]*16+26+i%5*21;
    const glimmer=scene.add.ellipse(x,y,18+i%3*9,3+i%4,0x9af5e1,.08+i%3*.035)
      .setDepth(-18);
    scene.tweens.add({targets:glimmer,alpha:{from:.06,to:.32},
      duration:1100+i%6*175,yoyo:true,repeat:-1});
  }
}

export function paintCaveForeground(scene){
  const level=scene.level,manifest=caveArtManifest(level);
  if(hasPaintedPlane(scene,manifest,'foreground-occlusion')){
    for(const chunk of manifest.chunks){
      const canvas=makeCanvas(chunk,level),ctx=canvas.getContext('2d');
      ctx.translate(-chunk.from*16,0);
      clipContour(ctx,level.ceiling,chunk,true,level.height*16);
      ctx.save();ctx.clip();
      drawSource(ctx,sourceFor(scene,chunk,'foreground-occlusion',
        'cave-painted-rock'),chunk,level);
      ctx.restore();
      ctx.setTransform(1,0,0,1,0,0);
      featherEntry(ctx,canvas,chunk);
      const key=registerCanvas(scene,canvas,'cave-foreground-'+chunk.id);
      scene.add.image(chunk.from*16,0,key).setOrigin(0).setDepth(35);
    }
    return;
  }
  const g=scene.add.graphics().setDepth(35);
  for(let i=0;i<12;i++){
    const x=96+i*210,y=level.ceiling[Math.min(level.width,Math.floor(x/16))]*16;
    const length=8+(i%4)*6;
    g.fillStyle(0x191d37,.45);
    g.fillTriangle(x-8,y,x+9,y,x+1,y+length);
  }
}

export function paintCaveGeometryOverlay(scene){
  const g=scene.add.graphics().setDepth(100).setVisible(false);
  const level=scene.level;
  g.lineStyle(1.5,0xffe4a0,.95);
  for(const samples of [level.ceiling,level.surface]){
    g.beginPath();
    for(let x=0;x<=level.width;x++){
      const xx=x*16,y=samples[x]*16;
      if(x===0)g.moveTo(xx,y);
      else g.lineTo(xx,y);
    }
    g.strokePath();
  }
  for(const pool of level.waterBodies){
    g.lineStyle(1.5,0x5bf5e8,.95);
    g.lineBetween(pool.start*16,pool.surface*16,pool.end*16,pool.surface*16);
  }
  g.lineStyle(2,0xffd28d,1);
  for(const s of level.platformSegments)
    g.lineBetween(s.x*16,s.y*16,(s.x+s.length)*16,s.y*16);
  scene.caveGeometryOverlay=g;
}
