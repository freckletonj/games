import Phaser from 'phaser';

// Purely visual world composition. Collision comes from the semantic
// world compiler and remains independent of every painted texture.
const TILE=16;
const SOIL={meadow:0x456b65,coast:0x426b7f,summit:0x545879};
const EDGE={meadow:0x9bd695,coast:0x9ce2ce,summit:0xe1c5ed};
const FLORA={berryBush:0,nectarFruit:1,stardropFruit:2,mushrooms:3,flowers:4,
  reeds:5,stones:6,moonStone:7,shells:6};
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
    ctx.fillStyle=ctx.createPattern(swatch,'repeat');
    ctx.fillRect(0,top,scene.worldW,scene.worldH-top);
    const tint={meadow:'#385e4d',coast:'#567a84',summit:'#5c547c'}[scene.level.biome];
    ctx.globalAlpha=.24;ctx.fillStyle=tint;
    ctx.fillRect(0,top,scene.worldW,scene.worldH-top);
    // Push repeated paint into the deep ground. Keep the painted top edge
    // luminous, while darkening the far underground to avoid wallpaper seams.
    ctx.globalAlpha=1;
    const depth=ctx.createLinearGradient(0,top,0,top+340);
    depth.addColorStop(0,'rgba(15,31,40,0)');
    depth.addColorStop(.38,'rgba(18,32,41,0.08)');
    depth.addColorStop(1,'rgba(13,28,38,0.50)');
    ctx.fillStyle=depth;ctx.fillRect(0,top,scene.worldW,scene.worldH-top);
    const key='painted-soil-'+scene.chapter.id;
    if(scene.textures.exists(key))scene.textures.remove(key);
    scene.textures.addCanvas(key,paint);
    scene.add.image(0,top,key).setOrigin(0).setDepth(-29).setAlpha(.85);
    const rim=scene.add.graphics().setDepth(-28);
    rim.lineStyle(3,EDGE[scene.level.biome],.92);
    rim.strokePoints(contour);
    rim.lineStyle(1,0xfaf6c8,.45);
    rim.strokePoints(contour.map(point=>({x:point.x,y:point.y-2})));
  }

export function paintTerrain(scene){
    const level=scene.level,biome=level.biome;
    const graphics=scene.add.graphics().setDepth(-30);
    const contour=level.surface.map((height,x)=>({x:x*TILE,y:height*TILE}));
    graphics.fillStyle(SOIL[biome]);
    graphics.fillPoints([{x:0,y:scene.worldH},...contour,{x:scene.worldW,y:scene.worldH}],true);
    graphics.lineStyle(7,0x233d45,.32);
    graphics.strokePoints(contour);
    graphics.lineStyle(3,EDGE[biome],.96);
    graphics.strokePoints(contour);
    graphics.lineStyle(1,0xfaf2c4,.52);
    graphics.strokePoints(contour.map(p=>({x:p.x,y:p.y-3})));
    paintSoil(scene,contour);
    // Broken strata and clusters add scale without showing repeated square tiles.
    graphics.lineStyle(1,0xe5e1c7,.12);
    for(let x=12;x<scene.worldW;x+=79){
      const y=scene.groundAt(x)+18+(x%7)*2;
      graphics.lineBetween(x,y,x+28,y+3);
      graphics.lineBetween(x+8,y+12,x+38,y+16);
    }
    for(const platform of level.platformSegments.filter(p=>p.kind==='platform')){
      const x=platform.x*TILE,y=platform.y*TILE,w=platform.length*TILE;
      graphics.fillStyle(0x354c62,.96);
      graphics.fillRoundedRect(x,y,w,9,4);
      graphics.lineStyle(3,EDGE[biome],.92);
      graphics.lineBetween(x+2,y,x+w-2,y);
      graphics.lineStyle(1,0xffffff,.25);
      graphics.lineBetween(x+3,y+4,x+w-3,y+4);
      // A natural, repeating platform edge from the same illustrated kit,
      // independent of the platform's rectangular collision surface.
      scene.add.tileSprite(x,y-4,w,27,'forest-platform').setOrigin(0,0)
        .setTileScale(.42,.42).setTint(
          biome==='coast'?0xb9f4e3:biome==='summit'?0xd1c3eb:0xffffff
        ).setDepth(-18);
    }
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
    const tint={meadow:0xffffff,coast:0xb0ecdf,summit:0xc0b8e7}[l.biome];
    // Reuse one compatible, illustrated forest set for distant and midground
    // silhouettes. Change spacing, scale, and hue, never aspect ratio.
    for(let i=0,cell=16;cell<l.width;cell+=34+(i%4)*9,i++){
      const x=cell*TILE+((i*13)%23)*TILE/3;
      if(l.waterBodies.some(pool=>cell>=pool.start&&cell<=pool.end))continue;
      scene.add.image(x,scene.groundAt(x)+15,'forest-trees',i%4)
        .setOrigin(.5,1).setScale(.16+(i%3)*.0175)
        .setAlpha(.37).setTint(tint).setDepth(-42);
    }
    for(const [i,vista] of (l.vistas||[]).entries()){
      const x=vista.x*TILE,y=scene.groundAt(x);
      const tree=scene.add.image(x,y+18,'forest-trees',(i+2)%4)
        .setOrigin(.5,1).setScale(vista.span>25?.265:.215)
        .setAlpha(.82).setTint(tint).setDepth(-38);
      if(l.biome==='meadow')scene.tweens.add({
        targets:tree,rotation:{from:-.012,to:.013},
        duration:3800+i*431,ease:'Sine.easeInOut',yoyo:true,repeat:-1
      });
      if(vista.role==='reveal'||vista.role==='reward')
        scene.add.image(x,y,'landmarks',l.biome==='summit'?3:0)
          .setOrigin(.5,1).setScale(.36).setAlpha(.88).setDepth(-18);
    }
    for(const [i,mark] of (l.landmarks||[]).entries()){
      const x=mark.x*TILE;
      scene.add.image(x,scene.groundAt(x)+3,'landmarks',LANDMARKS[mark.type]??0)
        .setOrigin(.5,1).setScale(.27+(i%3)*.04).setDepth(-17).setAlpha(.94);
    }
    const sprite=scene.textures.get('forest-misc');
    if(!sprite.has('mushrooms'))sprite.add('mushrooms',0,784,0,240,378);
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
      const x=decoration.x*TILE,y=scene.groundAt(x);
      const frame=FLORA[decoration.asset]??4;
      const plant=scene.add.image(x,y+2,'flora',frame).setOrigin(.5,1)
        .setScale(.12*(decoration.scale||1)).setAlpha(.94).setDepth(-16);
      if(l.biome==='meadow'&&i%2===0)scene.tweens.add({
        targets:plant,rotation:{from:-.03,to:.035},duration:1700+i*105,
        ease:'Sine.easeInOut',yoyo:true,repeat:-1
      });
      if(i%6===2 && !l.waterBodies.some(pool=>x>=pool.start*TILE&&x<=pool.end*TILE)){
        scene.add.image(x+27,y+3,'forest-misc','mushrooms').setOrigin(.5,1)
          .setScale(.085).setTint(tint).setAlpha(.62).setDepth(-17);
      }
    }
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

