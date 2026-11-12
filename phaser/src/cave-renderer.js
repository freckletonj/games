import {caveArtManifest} from './cave-art-guide.js';

// Deterministic in-browser placeholder art, which can be replaced with
// image-model-painted chunk textures using the exact exported mask metadata.
export function paintCave(scene){
  const level=scene.level,layout=level.cave.layout;
  const manifest=caveArtManifest(level,{chunkCells:48,overlapCells:0});
  scene.cavePaintedChunks=[];
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
    // Distant arch strata are generated in continuous world coordinates:
    // no seam at any chunk boundary and no tiles or stretched bitmaps.
    const deep=ctx.createLinearGradient(0,0,0,height);
    deep.addColorStop(0,'#102034');
    deep.addColorStop(.52,'#183e57');
    deep.addColorStop(1,'#102c3d');
    ctx.fillStyle=deep;ctx.fillRect(left,0,right-left,height);
    for(let x=Math.floor(left/250)*250;x<right+250;x+=250){
      const y=255+45*Math.sin(x*.009);
      const glow=ctx.createRadialGradient(x,y,12,x,y,220);
      glow.addColorStop(0,'#387f89a0');
      glow.addColorStop(1,'#12314800');
      ctx.fillStyle=glow;ctx.fillRect(x-220,y-220,440,440);
      ctx.strokeStyle='#7ac8c436';ctx.lineWidth=13;
      ctx.beginPath();ctx.ellipse(x+85,y+120,72,160,-.12,Math.PI,Math.PI*2);
      ctx.stroke();
    }
    // Rock fills follow the exact roof and floor contour used by collision.
    for(const top of [true,false]){
      contour(top?level.ceiling:level.surface,top);
      const wash=ctx.createLinearGradient(0,top?0:540,0,top?310:height);
      wash.addColorStop(0,top?'#242c48':'#19354b');
      wash.addColorStop(1,top?'#64536a':'#53495f');
      ctx.fillStyle=wash;ctx.fill();
      ctx.save();ctx.clip();
      for(let x=Math.floor(left/38)*38;x<right+50;x+=38){
        const y0=top?0:500;
        const offset=13*Math.sin(x*.13)+9*Math.cos(x*.053);
        ctx.strokeStyle=x%3===0?'#e4b98f3d':'#88e9d52a';
        ctx.lineWidth=1+Math.abs(Math.sin(x))*1.7;
        ctx.beginPath();ctx.moveTo(x,y0+offset);
        ctx.bezierCurveTo(x+32,y0+85,x-28,y0+177,x+24,y0+340);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.strokeStyle='#8ce4ccab';ctx.lineWidth=2.3;
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
      ctx.closePath();ctx.fillStyle='#1b9fb58c';ctx.fill();
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
  // Lightweight per-world visual atmosphere. The exported distant-arches
  // and mist-and-crystals image assets can later replace these placeholders.
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
