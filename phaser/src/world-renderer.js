import Phaser from 'phaser';

// Purely visual world composition. Collision comes from the semantic
// world compiler and remains independent of every painted texture.
const TILE=16;
const SOIL={meadow:0x456b65,coast:0x426b7f,summit:0x545879};
const EDGE={meadow:0xa5cbaa,coast:0xa1d2c9,summit:0xc8bcdd};
// Only quiet plants, reeds and ground stones belong in the non-interactive
// dressing layer. Fruit, crystals and other prominent props are reserved for
// actual pickups, creatures and authored landmarks.
const DRESSING={flowers:4,reeds:5,stones:6,shells:6};
const LANDMARKS={tree:0,crystal:1,reef:2,observatory:3,island:4,pond:5,lantern:6,shells:7};

export function paintSoil(scene,contour){
    // Bake the original hand-painted swatch into a continuous slope-clipped
    // world texture. One Phaser image is cheaper and more coherent than
    // thousands of repeated rectangles or independently stretched tiles.
    const source=scene.textures.get('painted-terrain').getSourceImage();
    const cw=source.width/4,ch=source.height/2;
    const swatch=document.createElement('canvas');
    swatch.width=64;swatch.height=64;
    const brush=swatch.getContext('2d',{willReadFrequently:true});
    brush.drawImage(source,cw*(1+.17),ch*.40,cw*.76,ch*.54,0,0,64,64);
    const data=brush.getImageData(0,0,64,64);
    const pixels=data.data;
    const snapshot=new Uint8ClampedArray(pixels);
    // Feather opposite borders to make the paint wrap seamlessly.
    for(let y=0;y<64;y++)for(let i=0;i<12;i++){
      const a=(y*64+i)*4,b=(y*64+63-i)*4;
      const weight=.5-.5*Math.cos(Math.PI*i/12);
      for(let channel=0;channel<4;channel++){
        const average=(snapshot[a+channel]+snapshot[b+channel])/2;
        pixels[a+channel]=average*(1-weight)+snapshot[a+channel]*weight;
        pixels[b+channel]=average*(1-weight)+snapshot[b+channel]*weight;
      }
    }
    snapshot.set(pixels);
    for(let x=0;x<64;x++)for(let i=0;i<12;i++){
      const a=(i*64+x)*4,b=((63-i)*64+x)*4;
      const weight=.5-.5*Math.cos(Math.PI*i/12);
      for(let channel=0;channel<4;channel++){
        const average=(snapshot[a+channel]+snapshot[b+channel])/2;
        pixels[a+channel]=average*(1-weight)+snapshot[a+channel]*weight;
        pixels[b+channel]=average*(1-weight)+snapshot[b+channel]*weight;
      }
    }
    brush.putImageData(data,0,0);
    const top=Math.max(0,Math.floor(Math.min(...scene.level.surface)*TILE)-5);
    const paint=document.createElement('canvas');
    paint.width=scene.worldW;paint.height=scene.worldH-top;
    const ctx=paint.getContext('2d');
    ctx.translate(0,-top);
    ctx.beginPath();
    ctx.moveTo(0,scene.worldH);
    for(const point of contour)ctx.lineTo(point.x,point.y);
    ctx.lineTo(scene.worldW,scene.worldH);
    ctx.closePath();
    ctx.clip();
    // The former full-strength 64px stone repeat looked like wallpaper,
    // especially on long slopes. A broad color wash establishes the soil
    // first; a faint sample retains the original painted material language.
    const tones={
      meadow:['#56776c','#304f51','#1c303a','#9dc6a0'],
      coast:['#588b90','#345e6e','#203c51','#a7d9cb'],
      summit:['#727995','#464d70','#282f4b','#c5bbdb']
    }[scene.level.biome];
    const wash=ctx.createLinearGradient(0,top,0,top+520);
    wash.addColorStop(0,tones[0]);
    wash.addColorStop(.26,tones[1]);
    wash.addColorStop(1,tones[2]);
    ctx.fillStyle=wash;ctx.fillRect(0,top,scene.worldW,scene.worldH-top);
    // Keep the original painted grain as subtle material, not a tiled motif
    // competing with actors and background art.
    ctx.globalAlpha=.065;
    ctx.fillStyle=ctx.createPattern(swatch,'repeat');
    ctx.fillRect(0,top,scene.worldW,scene.worldH-top);
    ctx.globalAlpha=1;

    // Long, irregular strata and soft earth pockets are world-scale marks
    // rather than dozens of identical tile-sized rock faces.
    for(let i=0,x=23;x<scene.worldW+60;i++,x+=154+(i%4)*31){
      const y=scene.groundAt(x)+34+(i%4)*28;
      const scale=1+.19*Math.sin(i*2.7);
      ctx.fillStyle=tones[i%5===0?3:1];
      ctx.globalAlpha=i%5===0?.048:.075;
      ctx.beginPath();
      ctx.ellipse(x,y,58*scale,12+(i%4)*4,-.13+
        Math.sin(i*2.12)*.21,0,Math.PI*2);
      ctx.fill();
      ctx.globalAlpha=.09;
      ctx.strokeStyle=tones[3];
      ctx.lineWidth=1.3+(i%3)*.45;
      ctx.beginPath();
      ctx.moveTo(x-18,y+9);
      ctx.quadraticCurveTo(x+11,y+4,x+38,y+11);
      ctx.stroke();
    }
    ctx.globalAlpha=1;
    // A narrow, irregular topsoil band visually connects the dirt to the
    // grassy painted world. It is clipped by the same collision contour.
    ctx.beginPath();
    for(const [i,p] of contour.entries())
      i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);
    for(let i=contour.length-1;i>=0;i--){
      const p=contour[i];
      ctx.lineTo(p.x,p.y+16+4*Math.sin(p.x/43));
    }
    ctx.closePath();
    ctx.globalAlpha=.17;ctx.fillStyle=tones[3];ctx.fill();
    ctx.globalAlpha=1;
    // Short muted root/strata strokes follow the same continuous heightfield.
    for(let x=26,i=0;x<scene.worldW;x+=34+(i++%4)*6){
      const y=scene.groundAt(x)+6;
      ctx.strokeStyle=tones[3];
      ctx.lineWidth=1;
      ctx.globalAlpha=.095;
      ctx.beginPath();
      ctx.moveTo(x,y);
      ctx.quadraticCurveTo(x-4,y+9,x+7,y+15);
      ctx.stroke();
    }
    ctx.globalAlpha=1;
    const key='painted-soil-'+scene.chapter.id;
    if(scene.textures.exists(key))scene.textures.remove(key);
    scene.textures.addCanvas(key,paint);
    scene.add.image(0,top,key).setOrigin(0).setDepth(-29).setAlpha(.96);
    const rim=scene.add.graphics().setDepth(-28);
    rim.lineStyle(2,0x1e4650,.26);
    rim.strokePoints(contour.map(point=>({x:point.x,y:point.y+2})));
    rim.lineStyle(1.5,EDGE[scene.level.biome],.61);
    rim.strokePoints(contour);
    rim.lineStyle(1,0xfaf6dc,.10);
    rim.strokePoints(contour.map(point=>({x:point.x,y:point.y-1})));
  }


// Each one-way ledge gets a subtle, painted silhouette. The horizontal top
// always matches the semantic collider; only the underside is irregular.
// No unrelated props or giant repeated jungle tiles masquerade as geometry.
function paintLedge(scene,platform,index,biome){
  const w=platform.length*TILE,x=platform.x*TILE,y=platform.y*TILE;
  const palette={
    meadow:['#90b29b','#648f79','#35565a','#d0d9b6','#456960'],
    coast:['#abd1c5','#679b99','#355f71','#d3f0e3','#4b8186'],
    summit:['#c6bdd5','#8386a8','#454e73','#f0e6df','#646d93']
  }[biome];
  const canvas=document.createElement('canvas');
  canvas.width=Math.ceil((w+16)*2);
  canvas.height=76;
  const ctx=canvas.getContext('2d');
  ctx.scale(2,2);
  const left=6,right=w+10,top=7;
  const bottom=at=>23+2.9*Math.sin(at*.043+index*2.3)+
    1.6*Math.sin(at*.127-index*.71);
  ctx.beginPath();
  ctx.moveTo(left+2,top);
  ctx.lineTo(right-2,top);
  ctx.quadraticCurveTo(right+2,top+1,right,top+5);
  for(let at=right;at>=left;at-=4)
    ctx.lineTo(at,bottom(at));
  ctx.quadraticCurveTo(left-2,top+9,left,top+4);
  ctx.closePath();
  ctx.save();
  ctx.shadowColor='#142b38';
  ctx.shadowBlur=7;
  ctx.shadowOffsetY=4;
  const wash=ctx.createLinearGradient(0,top,0,34);
  wash.addColorStop(0,palette[0]);
  wash.addColorStop(.29,palette[1]);
  wash.addColorStop(1,palette[2]);
  ctx.fillStyle=wash;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.clip();
  // Staggered flecks and shallow geological marks, never regular tile stamps.
  for(let i=0,at=left+9;at<right-3;i++,at+=15+(i%3)*5){
    const py=top+8+(i%3)*4;
    ctx.beginPath();
    ctx.ellipse(at,py,5+(i%4)*2,1.2+(i%2),-.13,0,Math.PI*2);
    ctx.fillStyle=palette[i%4===0?3:4];
    ctx.globalAlpha=i%4===0?.18:.14;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(at-4,py+5);
    ctx.quadraticCurveTo(at+2,py+3,at+8,py+6);
    ctx.strokeStyle=palette[3];
    ctx.lineWidth=.65;
    ctx.globalAlpha=.18;
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha=1;
  // A single thin landing highlight stays aligned with the real y collider.
  ctx.beginPath();
  ctx.moveTo(left+2,top+.45);
  ctx.lineTo(right-2,top+.45);
  ctx.lineWidth=1.7;
  ctx.strokeStyle=palette[3];
  ctx.globalAlpha=.75;
  ctx.stroke();
  ctx.globalAlpha=1;
  const key='ledge-paint-'+scene.chapter.id+'-'+index;
  if(scene.textures.exists(key))scene.textures.remove(key);
  scene.textures.addCanvas(key,canvas);
  scene.add.image(x-8,y-7,key).setOrigin(0).setDepth(-18);
}

export function paintTerrain(scene){
    const level=scene.level,biome=level.biome;
    const graphics=scene.add.graphics().setDepth(-30);
    const contour=level.surface.map((height,x)=>({x:x*TILE,y:height*TILE}));
    graphics.fillStyle(SOIL[biome]);
    graphics.fillPoints([{x:0,y:scene.worldH},...contour,{x:scene.worldW,y:scene.worldH}],true);
    graphics.lineStyle(3,0x233d45,.21);
    graphics.strokePoints(contour);
    graphics.lineStyle(2,EDGE[biome],.56);
    graphics.strokePoints(contour);
    graphics.lineStyle(1,0xfaf2c4,.13);
    graphics.strokePoints(contour.map(p=>({x:p.x,y:p.y-3})));
    paintSoil(scene,contour);
    // Broken strata and clusters add scale without showing repeated square tiles.
    graphics.lineStyle(1,0xe5e1c7,.065);
    for(let x=12;x<scene.worldW;x+=131){
      const y=scene.groundAt(x)+18+(x%7)*2;
      graphics.lineBetween(x,y,x+28,y+3);
      graphics.lineBetween(x+8,y+12,x+38,y+16);
    }
    // All ledges share an illustrative material language, including their
    // end-caps. Their collision comes exclusively from the compiler.
    for(const [index,platform] of level.platformSegments
      .filter(p=>p.kind==='platform').entries())
      paintLedge(scene,platform,index,biome);
    const water=scene.add.graphics().setDepth(-23);
    for(const pool of level.waterBodies){
      const top=pool.surface*TILE;
      const contour=[{x:pool.start*TILE,y:top},{x:pool.end*TILE,y:top}];
      for(let x=pool.end;x>=pool.start;x--)
        contour.push({x:x*TILE,y:scene.groundAt(x*TILE)});
      water.fillStyle(0x3faaca,.43);
      water.fillPoints(contour,true);
      water.lineStyle(2,0xc4f6ef,.83);
      water.lineBetween(pool.start*TILE,top,pool.end*TILE,top);
      water.lineStyle(1,0xd8fff5,.22);
      for(let x=pool.start*TILE+18;x<pool.end*TILE-10;x+=39)
        water.lineBetween(x,top+16,x+16,top+15);
      // Small moving, translucent highlights communicate that these are
      // real water surfaces rather than painted strips or floating walls.
      for(let i=0;i<Math.min(5,Math.floor((pool.end-pool.start)/5));i++){
        const left=pool.start*TILE+12+i*45;
        if(left>=pool.end*TILE-12)break;
        const glint=scene.add.ellipse(left,top+1,19+(i%3)*7,2,
          0xcafff6,.43).setDepth(-21);
        scene.tweens.add({targets:glint,x:left+9,alpha:{from:.19,to:.62},
          scaleX:{from:.7,to:1.18},duration:1700+i*290,
          ease:'Sine.easeInOut',yoyo:true,repeat:-1});
      }
    }
    const winds=scene.add.graphics().setDepth(-21);
    for(const column of level.thermalVolumes){
      const x=column.x*TILE,y=column.y*TILE,w=column.width*TILE,h=column.height*TILE;
      winds.fillStyle(0xdbfafa,.09);
      winds.fillRoundedRect(x,y,w,h,24);
      winds.lineStyle(1,0xcffafa,.29);
      for(let offset=12;offset<w;offset+=20)
        winds.lineBetween(x+offset,y+h-8,x+offset+8,y+10);
    }
  }

export function paintScenery(scene){
    const l=scene.level;
    // Natural shapes must read as atmosphere, not as collectible objects.
    // Keep silhouettes behind terrain and creatures, and color-grade them
    // toward the biome; prominent interactive objects are rendered separately.
    const distantTint={meadow:0xa7cab8,coast:0xa0d4cf,summit:0xb3b4d8}[l.biome];
    for(let i=0,cell=20;cell<l.width;cell+=48+(i%3)*17,i++){
      const x=(cell+((i*13)%17)/3)*TILE;
      if(l.waterBodies.some(pool=>cell>=pool.start&&cell<=pool.end))continue;
      if(l.biome==='meadow')continue; // The painted backdrop already has trees.
      const coast=l.biome==='coast';
      scene.add.image(x,scene.groundAt(x)+12,'landmarks',
        coast?(i%2?2:5):(i%3?1:4))
        .setOrigin(.5,1).setScale(.17+(i%3)*.025)
        .setAlpha(.22).setTint(distantTint).setDepth(-43);
    }
    for(const [i,vista] of (l.vistas||[]).entries()){
      const x=vista.x*TILE,y=scene.groundAt(x);
      if(l.biome==='meadow')continue;
      const coast=l.biome==='coast';
      scene.add.image(x,y+12,'landmarks',
        coast?[2,1,5][i%3]:[1,4,3][i%3])
        .setOrigin(.5,1).setScale(vista.span>25?.36:.29)
        .setAlpha(.37).setTint(distantTint).setDepth(-39);
    }
    for(const [i,mark] of (l.landmarks||[]).entries()){
      // Large bright prop illustrations next to enemies used to masquerade
      // as hidden loot. Treat these landmarks as quiet midground silhouettes.
      if(l.objects.some(object=>Math.abs(object.x-mark.x)<4))continue;
      const x=mark.x*TILE;
      scene.add.image(x,scene.groundAt(x)+10,'landmarks',LANDMARKS[mark.type]??0)
        .setOrigin(.5,1).setScale(.23+(i%3)*.035).setDepth(-35)
        .setAlpha(.45).setTint(distantTint);
    }
    if(scene.chapter.id==='first-forest'){
      // The trail is in *semantic goalRoute coordinates*, so guidance always
      // leads toward a real platform and doesn't imply invisible colliders.
      for(const [i,[cell,height]] of (l.goalRoute||[]).entries()){
        const x=cell*TILE+8,y=height*TILE-11;
        const light=scene.add.circle(x,y,i===2?3.2:2.2,
          0xffedbd,.68).setDepth(3);
        scene.tweens.add({targets:light,alpha:{from:.18,to:.84},
          y:y-4,scale:{from:.75,to:1.2},
          ease:'Sine.easeInOut',duration:1000+i*230,
          yoyo:true,repeat:-1});
      }
    }
    for(const [i,decoration] of (l.dressing||[]).entries()){
      // A berry bush, glowing fruit, mushroom or moon stone looks like a
      // collectible/creature at gameplay scale. Replace it with ordinary
      // small flora; only real interactables use saturated prop illustrations.
      if(l.objects.some(object=>Math.abs(object.x-decoration.x)<4))continue;
      const x=decoration.x*TILE,y=scene.groundAt(x);
      if(l.waterBodies.some(pool=>x>pool.start*TILE&&x<pool.end*TILE))continue;
      const defaultFrame=l.biome==='meadow'?(i%2?4:5):
        l.biome==='coast'?5:6;
      const frame=DRESSING[decoration.asset]??defaultFrame;
      const plant=scene.add.image(x,y+5,'flora',frame).setOrigin(.5,1)
        .setScale(.067*Math.min(decoration.scale||1,1.25))
        .setAlpha(.55).setTint(distantTint).setDepth(-34);
      if(l.biome==='meadow'&&i%2===0)scene.tweens.add({
        targets:plant,rotation:{from:-.018,to:.021},duration:2200+i*105,
        ease:'Sine.easeInOut',yoyo:true,repeat:-1
      });
    }
  }


/**
 * Two translucent, screen-space mist paintings move at different fractions
 * of camera travel. They sit *behind* all game geometry, so they add depth
 * without becoming fake platforms or confusing interactive silhouettes.
 */
export function addParallaxAtmosphere(scene){
  const biome=scene.level.biome;
  const pigment={
    meadow:[191,229,203],coast:[174,221,218],summit:[198,198,230]
  }[biome];
  const canvas=document.createElement('canvas');
  canvas.width=1024;
  canvas.height=224;
  const ctx=canvas.getContext('2d');
  // Offset overlapping transparent washes; avoid hard-edged rectangles.
  for(let i=0;i<7;i++){
    const x=90+i*150,y=111+20*Math.sin(i*1.83);
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(1.65+(i%3)*.23,.40+(i%2)*.08);
    const glow=ctx.createRadialGradient(0,0,8,0,0,102);
    const rgb=pigment.join(',');
    glow.addColorStop(0,'rgba('+rgb+',.38)');
    glow.addColorStop(.55,'rgba('+rgb+',.17)');
    glow.addColorStop(1,'rgba('+rgb+',0)');
    ctx.fillStyle=glow;
    ctx.fillRect(-108,-108,216,216);
    ctx.restore();
  }
  const key='painted-atmosphere-'+biome;
  if(scene.textures.exists(key))scene.textures.remove(key);
  scene.textures.addCanvas(key,canvas);
  const layers=[
    {y:174,alpha:.20,speed:.065},
    {y:258,alpha:.13,speed:.17}
  ];
  scene.parallaxLayers=layers.map(({y,alpha,speed})=>({
    speed,
    visual:scene.add.tileSprite(480,y,960,224,key)
      .setScrollFactor(0).setAlpha(alpha).setDepth(-95+speed*10)
  }));
}

export function moveParallaxAtmosphere(scene){
  const scrollX=scene.cameras.main.scrollX;
  for(const {visual,speed} of scene.parallaxLayers||[])
    visual.tilePositionX=scrollX*speed;
}

export function addMeadowAtmosphere(scene){
    if(scene.chapter.id!=='first-forest')return;
    // Little animated fireflies add depth to both the opening tutorial and
    // the reward grove, but never obscure ledges or collision geometry.
    for(let i=0;i<26;i++){
      const cell=12+i*5.1;
      if(cell>=scene.level.width-3)break;
      const x=cell*TILE+Math.sin(i*2.91)*11;
      const y=scene.groundAt(x)-19-(i%4)*11;
      const firefly=scene.add.circle(x,y,i%5===0?2:1.2,
        i%3===0?0xfff1a9:0xc8f7dc,.62).setDepth(-12);
      firefly.setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({targets:firefly,y:y-6-(i%3)*3,
        alpha:{from:.19,to:.79},scale:{from:.6,to:1.25},
        ease:'Sine.easeInOut',duration:1300+i%7*220,yoyo:true,repeat:-1,
        delay:i*59});
    }
  }

