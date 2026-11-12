import {caveArtManifest} from './cave-art-guide.js';

// The painted sources cover the entire authored world. Cropping them per chunk
// must not change world coordinates or introduce a tile-repeat seam.
export function caveArtworkCrop(chunk,level,imageWidth,imageHeight){
  const x=imageWidth*chunk.from/level.width;
  const width=imageWidth*(chunk.to-chunk.from)/level.width;
  return {x,y:0,width,height:imageHeight};
}

export function paintCave(scene){
  const level=scene.level,layout=level.cave.layout;
  const manifest=caveArtManifest(level,{chunkCells:48,overlapCells:0});
  scene.cavePaintedChunks=[];
  const rockImage=scene.textures.get('cave-painted-rock').getSourceImage();
  const ambientImage=scene.textures.get('cave-painted-ambient').getSourceImage();
  // Two true camera-independent parallax planes; use the same authored
  // optical depths advertised in the art manifest. All physical rock/water
  // remains at scroll factor 1 and never moves relative to collision.
  for(const [id,speed] of [['distant-arches',.16],['mist-and-crystals',.34]]){
    const canvas=document.createElement('canvas');
    canvas.width=1024;canvas.height=level.height*16;
    const ctx=canvas.getContext('2d');
    if(id==='distant-arches'){
      const ink=ctx.createLinearGradient(0,0,0,canvas.height);
      ink.addColorStop(0,'#0e1c30');
      ink.addColorStop(.53,'#1b4157');
      ink.addColorStop(1,'#112d3e');
      ctx.fillStyle=ink;ctx.fillRect(0,0,1024,canvas.height);
      for(let x=70;x<1100;x+=235){
        ctx.strokeStyle='#60a8ae3d';ctx.lineWidth=28;
        ctx.beginPath();ctx.ellipse(x,520,95,224,-.14,Math.PI,Math.PI*2);ctx.stroke();
        ctx.strokeStyle='#0b263b9c';ctx.lineWidth=15;
        ctx.beginPath();ctx.ellipse(x+55,600,53,175,.16,Math.PI,Math.PI*2);ctx.stroke();
      }
    }else{
      for(let x=65;x<1100;x+=155){
        const y=380+74*Math.sin(x*.012);
        const light=ctx.createRadialGradient(x,y,9,x,y,235);
        light.addColorStop(0,'#90f9e04d');
        light.addColorStop(.42,'#64d9d522');
        light.addColorStop(1,'#64d9d500');
        ctx.fillStyle=light;ctx.fillRect(x-240,y-240,480,480);
      }
    }
    if(id==='distant-arches'){
      ctx.save();
      ctx.globalAlpha=.38;
      ctx.filter='blur(6px)';
      ctx.drawImage(ambientImage,0,0,canvas.width,canvas.height);
      ctx.restore();
    }
    const key='cave-plane-'+id;
    scene.textures.addCanvas(key,canvas);
    scene.generatedTextures.push(key);
    const visual=scene.add.tileSprite(480,level.height*8,960,level.height*16,key)
      .setScrollFactor(0).setDepth(id==='distant-arches'?-92:-72);
    scene.parallaxLayers.push({speed,visual});
  }
  for(const chunk of manifest.chunks){
    const canvas=document.createElement('canvas');
    canvas.width=chunk.pixelBounds.width;canvas.height=level.height*16;
    const ctx=canvas.getContext('2d');
    ctx.translate(-chunk.pixelBounds.x,0);
    const left=chunk.from*16,right=chunk.to*16,height=level.height*16;
    const contour=(samples,top)=>{
      ctx.beginPath();
      ctx.moveTo(left,top?0:height);
      for(let x=chunk.from;x<=chunk.to;x++){
        const v=samples[x]*16;
        ctx.lineTo(x*16,v);
      }
      ctx.lineTo(right,top?0:height);
      ctx.closePath();
    };
    // Only exact authoring masks receive painted terrain. Traversable air
    // stays transparent so a separate distant plane remains visible.
    const crop=caveArtworkCrop(chunk,level,rockImage.width,rockImage.height);
    function drawPaintedSource(){
      ctx.drawImage(rockImage,crop.x,crop.y,crop.width,crop.height,
        left,0,right-left,height);
    }
    for(const top of [true,false]){
      contour(top?level.ceiling:level.surface,top);
      ctx.save();ctx.clip();
      drawPaintedSource();
      ctx.restore();
    }
    // Thin geometry-accurate edges, visible if the painting wanders a pixel.
    ctx.strokeStyle='#a3d6cb6a';ctx.lineWidth=1.4;
    for(const samples of [level.ceiling,level.surface]){
      ctx.beginPath();
      for(let x=chunk.from;x<=chunk.to;x++){
        const y=samples[x]*16;
        x===chunk.from?ctx.moveTo(x*16,y):ctx.lineTo(x*16,y);
      }
      ctx.stroke();
    }
    // Translucent submerged water still uses the physical floor as its lower boundary.
    for(const pool of level.waterBodies){
      if(pool.end<chunk.from||pool.start>chunk.to)continue;
      const a=Math.max(chunk.from,pool.start),b=Math.min(chunk.to,pool.end);
      ctx.beginPath();ctx.moveTo(a*16,pool.surface*16);
      ctx.lineTo(b*16,pool.surface*16);
      for(let x=b;x>=a;x--)ctx.lineTo(x*16,level.surface[x]*16);
      ctx.closePath();
      ctx.save();ctx.clip();drawPaintedSource();ctx.restore();
      ctx.fillStyle='#1b9fb53b';ctx.fill();
      ctx.strokeStyle='#d9fff0ba';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(a*16,pool.surface*16);
      ctx.lineTo(b*16,pool.surface*16);ctx.stroke();
      for(let x=Math.floor(a/7)*7;x<b;x+=7){
        const y=pool.surface*16+25+18*Math.sin(x*.4);
        ctx.strokeStyle='#adf9ec55';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(x*16,y);
        ctx.quadraticCurveTo(x*16+22,y-6,x*16+39,y+2);ctx.stroke();
      }
    }
    const key='cave-physical-'+chunk.id;
    scene.textures.addCanvas(key,canvas);
    scene.generatedTextures.push(key);
    const visual=scene.add.image(left,0,key).setOrigin(0).setDepth(-29);
    scene.cavePaintedChunks.push({x:left,width:canvas.width,visual});
  }
  // These visible shelves are *exactly* the platformSegments colliders.
  const shelves=scene.add.graphics().setDepth(-20);
  for(const ledge of level.platformSegments){
    const x=ledge.x*16,y=ledge.y*16,w=ledge.length*16;
    shelves.fillStyle(0x688c88,.95);
    shelves.fillRoundedRect(x,y,w,9,3);
    shelves.lineStyle(2,0xc8efd4,.9);
    shelves.lineBetween(x+2,y,x+w-2,y);
  }
  // Small dynamic highlights sit above the static generated paintings.
  for(let i=0;i<29;i++){
    const x=66+i*81,y=level.ceiling[Math.min(level.width,Math.floor(x/16))]*16+26+i%5*21;
    const glimmer=scene.add.ellipse(x,y,18+i%3*9,3+i%4,0x9af5e1,.08+i%3*.035)
      .setDepth(-18);
    scene.tweens.add({targets:glimmer,alpha:{from:.06,to:.32},
      duration:1100+i%6*175,yoyo:true,repeat:-1});
  }
}

export function paintCaveForeground(scene){
  // Tiny hints of near-camera rock; no painted false platforms.
  const g=scene.add.graphics().setDepth(35);
  for(let i=0;i<12;i++){
    const x=96+i*210,y=scene.level.ceiling[Math.min(scene.level.width,Math.floor(x/16))]*16;
    const length=8+(i%4)*6;
    g.fillStyle(0x191d37,.45);
    g.fillTriangle(x-8,y,x+9,y,x+1,y+length);
  }
}

export function paintCaveGeometryOverlay(scene){
  const g=scene.add.graphics().setDepth(100).setVisible(false);
  const level=scene.level;
  // The same subpixel contours drive collision and the generated-art masks.
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
