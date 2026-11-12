import Phaser from 'phaser';
import './bootstrap.js';
import designs from '../../src/games/animal-adventure/designs.json';
import {characters,mounts,backgrounds,sheets,silhouettes,forestKit,terrainAtlas} from './assets.js';
import {MOUNTS,LOCATIONS,seatFor} from './mounts.js';
import {bindings,readActions} from './input.js';
import {landingY,safeHorizontalX,orbStep,orbHitsAnimal} from './physics.js';
import {triggerBloom,tryBloomBoost} from './springboard.js';
import {poseFor,gesture} from './animation.js';
import {feedTrust,tickDistraction,RESPAWN_SECONDS,DISTRACTION_SECONDS} from './creatures.js';
import {meadowDesign} from './meadow-design.js';

const TILE=16;
const VIEW_W=480;
const VIEW_H=270;
const SKY={meadow:0xa4d9c2,coast:0xa8dbe0,summit:0x98a4ce};
const SOIL={meadow:0x456b65,coast:0x426b7f,summit:0x545879};
const EDGE={meadow:0x9bd695,coast:0x9ce2ce,summit:0xe1c5ed};
const FORMS={springaroo:'Double jump',tideling:'Swim and dive',skyling:'Four wingbeats',
  mossback:'Honey',prismtail:'Bubbles',glimmermoth:'Hover',cloudwhisp:'Gust',emberkit:'Spark'};
const FRUITS=['berry','nectar','star'];
const FAVORITES={springaroo:'berry',tideling:'nectar',skyling:'star',mossback:'berry',
  prismtail:'berry',glimmermoth:'star',cloudwhisp:'nectar',emberkit:'berry'};
const FLORA={berryBush:0,nectarFruit:1,stardropFruit:2,mushrooms:3,flowers:4,
  reeds:5,stones:6,moonStone:7,shells:6};
const LANDMARKS={tree:0,crystal:1,reef:2,observatory:3,island:4,pond:5,lantern:6,shells:7};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

class Wonderwood extends Phaser.Scene {
  constructor(){super('Wonderwood');}

  preload(){
    for(const [name,{url,manifest}] of Object.entries(characters)){
      this.load.spritesheet('actor-'+name,url,{
        frameWidth:manifest.frameWidth,frameHeight:manifest.frameHeight
      });
    }
    for(const [name,{url,manifest}] of Object.entries(mounts)){
      this.load.spritesheet('mount-'+name,url,{
        frameWidth:manifest.frameWidth,frameHeight:manifest.frameHeight
      });
    }
    for(const [name,url] of Object.entries(backgrounds))this.load.image('back-'+name,url);
    this.load.image('painted-terrain',terrainAtlas);
    this.load.spritesheet('forest-trees',forestKit.forestTrees,{frameWidth:512,frameHeight:512});
    this.load.image('forest-misc',forestKit.forestMisc);
    this.load.image('forest-platform',forestKit.forestPlatform);
    for(const [name,url] of Object.entries(sheets))
      this.load.spritesheet(name,url,{frameWidth:180,frameHeight:270});
    for(const [name,url] of Object.entries(silhouettes))this.load.image('kenney-'+name,url);
  }

  create(){
    this.keyboard=bindings.map(layout=>Object.fromEntries(Object.entries(layout)
      .map(([action,codes])=>[action,codes.map(code=>this.input.keyboard.addKey(code))])));
    this.lastInput=[{},{}];
    this.choice=0;
    this.twoPlayers=false;
    this.paused=false;
    this.stage=-1;
    this.input.keyboard.on('keydown-TWO',()=>this.toggleSecondPlayer());
    this.makeBerryTexture();
    // Revive has the same binding as the legacy game. H returns to the menu.
    this.input.keyboard.on('keydown-H',()=>{if(this.stage>=0)this.showMenu();});
    this.showMenu();
    // The smoke test reads state but never mutates gameplay state directly.
    window.__wonderwoodPhaser={
      engine:'Phaser 4',
      snapshot:()=>({stage:this.stage,choice:this.choice,chapter:this.chapter?.id||null,
        mounts:this.mounts?.map(m=>({kind:m.kind,x:m.x,y:m.y,vx:m.vx,vy:m.vy,
          trust:m.trust,rider:m.rider,grounded:m.grounded,flaps:m.flaps,
          action:m.action,frame:m.visual?.frame?.name}))||[],
        animalCount:this.animals?.length||0,
        platformCount:this.level?.platformSegments?.length||0,
        players:this.players?.map(p=>({x:p.x,y:p.y,face:p.face,vx:p.vx,vy:p.vy,
          action:p.action,frame:p.visual?.frame?.name,grounded:p.grounded,
          jumps:p.jumps,flaps:p.flaps,food:FRUITS[p.food],form:p.form,
          caught:p.caught,health:p.health,sleep:p.sleep,
          checkpoint:p.checkpoint,bubble:p.bubble,mount:p.mount?.kind||null,
          bloomWindow:p.bloomWindow||0,bloomBoosts:p.bloomBoosts||0,
          recalls:p.recalls||0}))||[],
        animals:this.animals?.map(a=>({kind:a.kind,x:a.x,y:a.y,action:a.action,
          frame:a.visual?.frame?.name,trust:a.trust,
          distracted:a.distraction,respawn:a.respawn,
          captured:a.captured,windup:a.windup,dash:a.dash}))||[],
        lures:this.lures?.map(f=>({x:f.x,food:f.food,landed:f.landed}))||[],
        orbs:this.orbs?.length||0,
        orbStates:this.orbs?.map(o=>({x:o.x,y:o.y,bounces:o.bounces}))||[],
        paused:this.paused,
        foods:this.shared?.foods?{...this.shared.foods}:null,
        picnics:this.shared?.picnics||0,
        relic:this.shared?.relic||false,shards:this.shared?.shards||0})
    };
  }

  pad(index){return this.input.gamepad?.getPad(index)||null;}

  clearScene(){
    this.cameras.main.stopFollow();
    this.tweens.killAll();
    this.children.removeAll(true);
    this.cameras.main.setZoom(2);
    this.cameras.main.setScroll(0,0);
    this.cameras.main.setBounds(0,0,VIEW_W,VIEW_H);
    document.getElementById('ww-ui').hidden=true;
    this.players=[];
    this.animals=[];
    this.mounts=[];
    this.items=[];
    this.orbs=[];
    this.lures=[];
    this.setpieces=[];
    this.lastInput=[{},{}];
    this.paused=false;
  }

  addBackground(biome){
    this.cameras.main.setBackgroundColor(SKY[biome]);
    // Scroll-factor-zero objects are screen-space in Phaser 4. The game camera
    // is zoomed to 2x, but backgrounds must fill the full 960x540 viewport.
    const back=this.add.image(480,270,'back-'+biome)
      .setScrollFactor(0).setDepth(-100);
    const fit=Math.max(960/back.width,540/back.height);
    back.setScale(fit);
    const cloudKinds=['kenney-cloud','kenney-cloudAlt'];
    for(let n=0;n<7;n++){
      const x=55+n*145+(n%2)*15;
      this.add.image(x,50+(n%3)*42,cloudKinds[n%2])
        .setScale(.72+(n%3)*.14).setAlpha(.2).setScrollFactor(0).setDepth(-90);
    }
    if(biome==='summit')
      this.add.image(820,75,'kenney-moon').setScale(.8).setAlpha(.45)
        .setScrollFactor(0).setDepth(-89);
  }

  makeBerryTexture(){
    // Reuse a real painted purple berry bunch, not the entire berry-bush
    // illustration. The alpha mask isolates a fruit from the source atlas.
    const source=this.textures.get('flora').getSourceImage();
    const canvas=document.createElement('canvas');
    canvas.width=52;canvas.height=55;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,76,143,43,45,4,4,43,45);
    const image=ctx.getImageData(0,0,52,55),pixels=image.data;
    for(let y=0;y<55;y++)for(let x=0;x<52;x++){
      const radius=Math.hypot((x-25.5)/(y<24?19.5:17.5),
        (y-25)/24);
      const feather=Math.max(0,Math.min(1,(1-radius)/.13));
      pixels[(y*52+x)*4+3]*=feather;
    }
    ctx.putImageData(image,0,0);
    this.textures.addCanvas('painted-berry',canvas);
  }

    showMenu(){
    this.clearScene();
    this.stage=-1;
    this.chapter=null;
    this.addBackground('meadow');
    // Menu geometry uses world-space coordinates and the 2x camera zoom.
    this.add.rectangle(240,135,400,218,0x16243c,.78).setDepth(0);
    this.add.rectangle(240,43,310,1,0xe9d9a6,.72);
    this.add.text(240,67,'WONDERWOOD',{fontFamily:'Georgia, serif',fontSize:'34px',
      color:'#fff5d6',fontStyle:'bold'}).setOrigin(.5).setDepth(2);
    this.add.text(240,98,'a little world worth exploring',{fontFamily:'Georgia, serif',
      fontSize:'12px',color:'#bfe4d7'}).setOrigin(.5);
    this.menuWorld=this.add.text(240,137,'',{fontFamily:'Georgia, serif',fontSize:'20px',
      color:'#fff0bc'}).setOrigin(.5);
    this.menuHint=this.add.text(240,167,'',{fontFamily:'Arial',fontSize:'10px',
      color:'#d7e6e1',align:'center'}).setOrigin(.5);
    this.add.text(240,210,'A / D or stick   ·   SPACE / A to begin\n2 toggles co-op   ·   controllers supported',
      {fontFamily:'Arial',fontSize:'10px',color:'#c9d6d9',align:'center'})
      .setOrigin(.5);
    this.updateMenuText();
  }

  updateMenuText(){
    const chapter=WW.chapters[this.choice];
    this.menuWorld.setText('‹  '+chapter.name+'  ›');
    this.menuHint.setText(chapter.tagline+'\n'+(this.twoPlayers?'Two explorers':'Solo explorer'));
  }

  toggleSecondPlayer(){
    this.twoPlayers=!this.twoPlayers;
    if(this.stage<0)this.updateMenuText();
    else if(this.twoPlayers && this.players.length===1)this.makePlayer(1);
    else if(!this.twoPlayers && this.players.length===2){
      const leaving=this.players.pop();
      if(leaving.mount)this.dismount(leaving);
      leaving.visual.destroy();
    }
    if(this.stage>=0)this.flash(this.twoPlayers?'Co-op enabled':'Solo play');
  }

  startStage(index){
    this.clearScene();
    this.choice=index;
    this.stage=index;
    this.chapter=WW.chapters[index];
    const original=designs[this.chapter.id];
    const spec=this.chapter.id==='first-forest'?meadowDesign(original):original;
    this.level=WW.worldCompiler.compile(spec,this.chapter);
    this.worldW=this.level.width*TILE;
    this.worldH=this.level.height*TILE;
    this.shared={relic:false,shards:0,collected:new Set(),checkpoint:null,
      picnics:0,foods:{berry:14,nectar:6,star:6}};
    this.addBackground(this.level.biome);
    this.paintTerrain();
    this.paintScenery();
    this.addMeadowAtmosphere();
    this.spawnObjects();
    this.spawnMounts();
    this.makePlayer(0);
    if(this.twoPlayers)this.makePlayer(1);
    this.cameras.main.setBounds(0,0,this.worldW,this.worldH);
    this.cameras.main.startFollow(this.players[0].visual,true,.085,.12);
    this.cameras.main.setFollowOffset(0,12);
    this.makeHud();
    this.flash(this.chapter.id==='first-forest'?
      'The lost light shines beyond the canopy':
      this.chapter.name+'  ·  '+this.chapter.intro,
      this.chapter.id==='first-forest'?2100:4200);
  }

  groundAt(x){
    const position=clamp(x/TILE,0,this.level.width);
    const cell=Math.min(Math.floor(position),this.level.width-1);
    const t=position-cell;
    return (this.level.surface[cell]*(1-t)+this.level.surface[cell+1]*t)*TILE;
  }

  inWater(x,y){
    return this.level.waterBodies.some(b=>x>=b.start*TILE&&x<=b.end*TILE&&
      y>=b.surface*TILE&&y<=this.groundAt(x)+3);
  }

  paintSoil(contour){
    // Bake the original hand-painted swatch into a continuous slope-clipped
    // world texture. One Phaser image is cheaper and more coherent than
    // thousands of repeated rectangles or independently stretched tiles.
    const source=this.textures.get('painted-terrain').getSourceImage();
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
    const top=Math.max(0,Math.floor(Math.min(...this.level.surface)*TILE)-5);
    const paint=document.createElement('canvas');
    paint.width=this.worldW;paint.height=this.worldH-top;
    const ctx=paint.getContext('2d');
    ctx.translate(0,-top);
    ctx.beginPath();
    ctx.moveTo(0,this.worldH);
    for(const point of contour)ctx.lineTo(point.x,point.y);
    ctx.lineTo(this.worldW,this.worldH);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle=ctx.createPattern(swatch,'repeat');
    ctx.fillRect(0,top,this.worldW,this.worldH-top);
    const tint={meadow:'#385e4d',coast:'#567a84',summit:'#5c547c'}[this.level.biome];
    ctx.globalAlpha=.24;ctx.fillStyle=tint;
    ctx.fillRect(0,top,this.worldW,this.worldH-top);
    // Push repeated paint into the deep ground. Keep the painted top edge
    // luminous, while darkening the far underground to avoid wallpaper seams.
    ctx.globalAlpha=1;
    const depth=ctx.createLinearGradient(0,top,0,top+340);
    depth.addColorStop(0,'rgba(15,31,40,0)');
    depth.addColorStop(.38,'rgba(18,32,41,0.08)');
    depth.addColorStop(1,'rgba(13,28,38,0.50)');
    ctx.fillStyle=depth;ctx.fillRect(0,top,this.worldW,this.worldH-top);
    const key='painted-soil-'+this.chapter.id;
    if(this.textures.exists(key))this.textures.remove(key);
    this.textures.addCanvas(key,paint);
    this.add.image(0,top,key).setOrigin(0).setDepth(-29).setAlpha(.85);
    const rim=this.add.graphics().setDepth(-28);
    rim.lineStyle(3,EDGE[this.level.biome],.92);
    rim.strokePoints(contour);
    rim.lineStyle(1,0xfaf6c8,.45);
    rim.strokePoints(contour.map(point=>({x:point.x,y:point.y-2})));
  }

  paintTerrain(){
    const level=this.level,biome=level.biome;
    const graphics=this.add.graphics().setDepth(-30);
    const contour=level.surface.map((height,x)=>({x:x*TILE,y:height*TILE}));
    graphics.fillStyle(SOIL[biome]);
    graphics.fillPoints([{x:0,y:this.worldH},...contour,{x:this.worldW,y:this.worldH}],true);
    graphics.lineStyle(7,0x233d45,.32);
    graphics.strokePoints(contour);
    graphics.lineStyle(3,EDGE[biome],.96);
    graphics.strokePoints(contour);
    graphics.lineStyle(1,0xfaf2c4,.52);
    graphics.strokePoints(contour.map(p=>({x:p.x,y:p.y-3})));
    this.paintSoil(contour);
    // Broken strata and clusters add scale without showing repeated square tiles.
    graphics.lineStyle(1,0xe5e1c7,.12);
    for(let x=12;x<this.worldW;x+=79){
      const y=this.groundAt(x)+18+(x%7)*2;
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
      this.add.tileSprite(x,y-4,w,27,'forest-platform').setOrigin(0,0)
        .setTileScale(.42,.42).setTint(
          biome==='coast'?0xb9f4e3:biome==='summit'?0xd1c3eb:0xffffff
        ).setDepth(-18);
    }
    const water=this.add.graphics().setDepth(-23);
    for(const pool of level.waterBodies){
      const top=pool.surface*TILE;
      const contour=[{x:pool.start*TILE,y:top},{x:pool.end*TILE,y:top}];
      for(let x=pool.end;x>=pool.start;x--)
        contour.push({x:x*TILE,y:this.groundAt(x*TILE)});
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
        const glint=this.add.ellipse(left,top+1,19+(i%3)*7,2,
          0xcafff6,.43).setDepth(-21);
        this.tweens.add({targets:glint,x:left+9,alpha:{from:.19,to:.62},
          scaleX:{from:.7,to:1.18},duration:1700+i*290,
          ease:'Sine.easeInOut',yoyo:true,repeat:-1});
      }
    }
    const winds=this.add.graphics().setDepth(-21);
    for(const column of level.thermalVolumes){
      const x=column.x*TILE,y=column.y*TILE,w=column.width*TILE,h=column.height*TILE;
      winds.fillStyle(0xdbfafa,.09);
      winds.fillRoundedRect(x,y,w,h,24);
      winds.lineStyle(1,0xcffafa,.29);
      for(let offset=12;offset<w;offset+=20)
        winds.lineBetween(x+offset,y+h-8,x+offset+8,y+10);
    }
  }

  paintScenery(){
    const l=this.level;
    const tint={meadow:0xffffff,coast:0xb0ecdf,summit:0xc0b8e7}[l.biome];
    // Reuse one compatible, illustrated forest set for distant and midground
    // silhouettes. Change spacing, scale, and hue, never aspect ratio.
    for(let i=0,cell=16;cell<l.width;cell+=34+(i%4)*9,i++){
      const x=cell*TILE+((i*13)%23)*TILE/3;
      if(l.waterBodies.some(pool=>cell>=pool.start&&cell<=pool.end))continue;
      this.add.image(x,this.groundAt(x)+15,'forest-trees',i%4)
        .setOrigin(.5,1).setScale(.16+(i%3)*.0175)
        .setAlpha(.37).setTint(tint).setDepth(-42);
    }
    for(const [i,vista] of (l.vistas||[]).entries()){
      const x=vista.x*TILE,y=this.groundAt(x);
      const tree=this.add.image(x,y+18,'forest-trees',(i+2)%4)
        .setOrigin(.5,1).setScale(vista.span>25?.265:.215)
        .setAlpha(.82).setTint(tint).setDepth(-38);
      if(l.biome==='meadow')this.tweens.add({
        targets:tree,rotation:{from:-.012,to:.013},
        duration:3800+i*431,ease:'Sine.easeInOut',yoyo:true,repeat:-1
      });
      if(vista.role==='reveal'||vista.role==='reward')
        this.add.image(x,y,'landmarks',l.biome==='summit'?3:0)
          .setOrigin(.5,1).setScale(.36).setAlpha(.88).setDepth(-18);
    }
    for(const [i,mark] of (l.landmarks||[]).entries()){
      const x=mark.x*TILE;
      this.add.image(x,this.groundAt(x)+3,'landmarks',LANDMARKS[mark.type]??0)
        .setOrigin(.5,1).setScale(.27+(i%3)*.04).setDepth(-17).setAlpha(.94);
    }
    const sprite=this.textures.get('forest-misc');
    if(!sprite.has('mushrooms'))sprite.add('mushrooms',0,784,0,240,378);
    if(this.chapter.id==='first-forest'){
      // The trail is in *semantic goalRoute coordinates*, so guidance always
      // leads toward a real platform and doesn't imply invisible colliders.
      for(const [i,[cell,height]] of (l.goalRoute||[]).entries()){
        const x=cell*TILE+8,y=height*TILE-11;
        const light=this.add.circle(x,y,i===2?3.2:2.2,
          0xffedbd,.68).setDepth(3);
        this.tweens.add({targets:light,alpha:{from:.18,to:.84},
          y:y-4,scale:{from:.75,to:1.2},
          ease:'Sine.easeInOut',duration:1000+i*230,
          yoyo:true,repeat:-1});
      }
    }
    for(const [i,decoration] of (l.dressing||[]).entries()){
      const x=decoration.x*TILE,y=this.groundAt(x);
      const frame=FLORA[decoration.asset]??4;
      const plant=this.add.image(x,y+2,'flora',frame).setOrigin(.5,1)
        .setScale(.12*(decoration.scale||1)).setAlpha(.94).setDepth(-16);
      if(l.biome==='meadow'&&i%2===0)this.tweens.add({
        targets:plant,rotation:{from:-.03,to:.035},duration:1700+i*105,
        ease:'Sine.easeInOut',yoyo:true,repeat:-1
      });
      if(i%6===2 && !l.waterBodies.some(pool=>x>=pool.start*TILE&&x<=pool.end*TILE)){
        this.add.image(x+27,y+3,'forest-misc','mushrooms').setOrigin(.5,1)
          .setScale(.085).setTint(tint).setAlpha(.62).setDepth(-17);
      }
    }
  }

  addMeadowAtmosphere(){
    if(this.chapter.id!=='first-forest')return;
    // Little animated fireflies add depth to both the opening tutorial and
    // the reward grove, but never obscure ledges or collision geometry.
    for(let i=0;i<26;i++){
      const cell=12+i*5.1;
      if(cell>=this.level.width-3)break;
      const x=cell*TILE+Math.sin(i*2.91)*11;
      const y=this.groundAt(x)-19-(i%4)*11;
      const firefly=this.add.circle(x,y,i%5===0?2:1.2,
        i%3===0?0xfff1a9:0xc8f7dc,.62).setDepth(-12);
      firefly.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({targets:firefly,y:y-6-(i%3)*3,
        alpha:{from:.19,to:.79},scale:{from:.6,to:1.25},
        ease:'Sine.easeInOut',duration:1300+i%7*220,yoyo:true,repeat:-1,
        delay:i*59});
    }
  }

  actor(name,x,y){
    const {manifest}=characters[name];
    const shadow=this.add.ellipse(x,y+2,25,6,0x102d31,.28).setDepth(9);
    const visual=this.add.sprite(x,y,'actor-'+name,0)
      .setOrigin(manifest.origin.x/manifest.frameWidth,
        manifest.origin.y/manifest.frameHeight)
      .setScale(manifest.worldScale).setDepth(20);
    visual.shadow=shadow;
    visual.on('destroy',()=>shadow.destroy());
    return visual;
  }

  animate(entity,name,action,delta){
    const manifest=characters[name].manifest;
    if(entity.textureName!==name){
      entity.textureName=name;
      entity.visual.setTexture('actor-'+name);
      entity.visual.setOrigin(manifest.origin.x/manifest.frameWidth,
        manifest.origin.y/manifest.frameHeight);
      entity.action='';
    }
    const visibleAction=entity.gestureTime>0?entity.gesture:action;
    if(entity.action!==visibleAction){
      entity.action=visibleAction;
      entity.animationTime=0;
    }else entity.animationTime+=delta;
    const pose=poseFor(manifest,visibleAction,entity.animationTime,
      entity.vx??(entity.face||1),entity.homeX??entity.id??0);
    const face=entity.face||1;
    entity.visual.setFrame(pose.frame);
    entity.visual.setPosition(entity.x+pose.dx*face,entity.y+pose.dy);
    entity.visual.setFlipX(face<0);
    entity.visual.setScale(manifest.worldScale*pose.sx,
      manifest.worldScale*pose.sy);
    entity.visual.setRotation(face*pose.rotation);
    if(entity.visual.shadow){
      const ground=this.groundAt(entity.x);
      const elevation=Math.max(0,ground-entity.y);
      const weight=Math.max(.33,1-elevation/155);
      entity.visual.shadow.setPosition(entity.x,ground+3)
        .setScale(weight).setAlpha(.28*weight);
    }
    entity.gestureTime=Math.max(0,(entity.gestureTime||0)-delta);
  }

  spawnObjects(){
    const relicKind=this.chapter.key;
    for(const object of this.level.objects){
      // Put the first friendly Springaroo within teaching range of spawn.
      // Later creatures retain the semantic layout's intended placements.
      const x=(object.x+.5)*TILE;
      if(FORMS[object.kind]){
        const flying=['skyling','glimmermoth','cloudwhisp'].includes(object.kind);
        const y=flying?(object.y+.5)*TILE:this.groundAt(x);
        const isFirst=this.chapter.id==='first-forest'&&
        object.kind==='springaroo'&&object.x===10;
      const halo=isFirst?this.add.ellipse(x,y-17,53,36,0xfff4bd,.08)
        .setStrokeStyle(1.2,0xe5ffca,.57).setDepth(10):null;
      if(halo)this.tweens.add({targets:halo,alpha:{from:.14,to:.58},
        scale:{from:.82,to:1.08},duration:1300,yoyo:true,repeat:-1});
      this.animals.push({kind:object.kind,x,y,homeX:x,homeY:y,
          face:1,trust:0,distraction:0,respawn:0,bubble:0,
          stun:0,attack:0,windup:0,dash:0,attackFace:1,
          captured:false,flying,action:'',animationTime:0,halo,
          visual:this.actor(object.kind,x,y).setDepth(12),
          warning:this.add.graphics().setDepth(24)});
      } else if(['starShard','snack','checkpoint','exit',relicKind].includes(object.kind)){
        const rooted=['snack','checkpoint','exit'].includes(object.kind);
        const y=rooted?this.groundAt(x):(object.y+.5)*TILE;
        const frame=object.kind==='starShard'?6:object.kind==='snack'?5:
          object.kind==='checkpoint'?2:object.kind==='exit'?0:7;
        const important=object.kind===relicKind||object.kind==='exit'||
          object.kind==='checkpoint';
        const halo=important?this.add.ellipse(x,y-19,
          object.kind===relicKind?36:28,object.kind===relicKind?42:33,
          object.kind===relicKind?0xfff6cb:0xbaf4de,.11)
          .setStrokeStyle(1.1,object.kind===relicKind?0xffefbc:0xc9f8e4,.45)
          .setDepth(8):null;
        if(halo)this.tweens.add({targets:halo,alpha:{from:.17,to:.48},
          scale:{from:.91,to:1.11},duration:1200+(object.x%5)*120,
          ease:'Sine.easeInOut',yoyo:true,repeat:-1});
        const icon=this.add.image(x,y,'props',frame).setOrigin(.5,1)
          .setScale(object.kind===relicKind?.19:.16).setDepth(10);
        this.items.push({kind:object.kind,x,y,visual:icon,halo,used:false});
      }
    }
    for(const part of this.level.setpieces||[]){
      const x=part.x*TILE,y=(part.y||0)*TILE;
      const base=part.kind==='bounceBloom'?this.groundAt(x):y;
      const frame=part.kind==='bounceBloom'?3:part.kind==='windRing'?4:2;
      const art=this.add.image(x,base,'effects',frame).setOrigin(.5,1)
        .setScale(.12).setAlpha(.82).setDepth(4);
      this.setpieces.push({kind:part.kind,x,y:base,time:0,visual:art});
    }
  }

  spawnMounts(){
    for(const [kind,cell,ledgeHeight] of LOCATIONS[this.chapter.id]||[]){
      const {manifest}=mounts[kind];
      const x=(cell+.5)*TILE;
      const y=ledgeHeight!==undefined?ledgeHeight*TILE:this.groundAt(x);
      const visual=this.add.sprite(x,y,'mount-'+kind,0)
        .setOrigin(manifest.origin.x/manifest.frameWidth,
          manifest.origin.y/manifest.frameHeight)
        .setScale(manifest.worldScale).setDepth(24);
      const shadow=this.add.ellipse(x,y+2,48,8,0x18383c,.22).setDepth(8);
      const aura=this.add.ellipse(x,y-23,67,49,0xfff4cc,.10)
        .setStrokeStyle(1.2,0xf2dfb6,.34).setDepth(10);
      this.tweens.add({targets:aura,alpha:{from:.10,to:.33},
        scale:{from:.94,to:1.08},duration:1700+(cell%5)*180,
        ease:'Sine.easeInOut',yoyo:true,repeat:-1});
      this.mounts.push({kind,x,y,homeX:x,homeY:y,perched:ledgeHeight!==undefined,
        vx:0,vy:0,face:1,grounded:true,trust:0,rider:null,chew:0,
        flapWait:0,flaps:0,action:'',animationTime:0,
        visual,shadow,aura});
    }
  }

  animateMount(m,action,delta){
    const manifest=mounts[m.kind].manifest;
    if(m.action!==action){m.action=action;m.animationTime=0;}
    else m.animationTime+=delta;
    const pose=poseFor(manifest,action,m.animationTime,m.vx,m.homeX);
    // Painted extended-wing frame and a folded-wing transition create
    // distinguishable flapping without stretching the entire horse flat.
    const frame=m.kind==='pegasus'&&action==='flap'?
      (Math.floor(m.animationTime*8)%2===0?6:5):pose.frame;
    m.visual.setFrame(frame);
    m.visual.setPosition(m.x,m.y+pose.dy);
    m.visual.setFlipX(m.face<0);
    m.visual.setScale(manifest.worldScale*pose.sx,manifest.worldScale*pose.sy);
    m.visual.setRotation(m.face*pose.rotation);
    const support=m.perched?m.homeY:this.supportAt(m.x,m.y);
    m.shadow.setPosition(m.x,support+3);
    const elevation=Math.max(0,support-m.y);
    m.shadow.setScale(Math.max(.38,1-elevation/190));
    m.aura.setPosition(m.x,m.y-24);
    m.aura.setStrokeStyle(1.2,m.trust>=100?0xc1ffce:0xf2dfb6,
      m.trust>=100?.78:.34);
  }

  board(p,m){
    if(m.trust<100||m.rider!==null||p.mount)return false;
    p.form=null;p.bubble=false;
    m.rider=p.id;p.mount=m;m.perched=false;
    p.visual.shadow?.setVisible(false);
    p.invincible=.45;
    this.flash('Riding '+m.kind+'! Jump to '+(m.kind==='pegasus'?
      'flap; Down to descend':'leap')+' · T / Y to dismount',2200);
    this.sparkle(m.x,m.y-35,0xfff6cb);
    return true;
  }

  dismount(p){
    const m=p.mount;
    if(!m)return;
    m.rider=null;p.mount=null;
    p.x=clamp(m.x+m.face*28,10,this.worldW-10);
    p.y=m.y-24;
    p.vx=m.vx*.7;p.vy=m.vy;
    p.grounded=false;p.invincible=Math.max(p.invincible,.65);
    p.visual.shadow?.setVisible(true);
    this.flash('Back on your own feet',900);
  }

  moveMountedPlayer(p,actions,step){
    const m=p.mount,settings=MOUNTS[m.kind];
    const direction=Number(actions.right)-Number(actions.left);
    if(direction)m.face=direction;
    m.vx+=(direction*settings.speed-m.vx)*Math.min(1,(m.grounded?.19:.12)*step);
    m.flapWait=Math.max(0,m.flapWait-step);
    if(actions.jumpPressed){
      if(m.grounded){
        m.vy=settings.jump;m.grounded=false;m.flaps=1;m.flapWait=8;
        this.sparkle(m.x,m.y-35,0xffecce);
      }else if(settings.kind==='flight'&&m.flapWait===0){
        m.vy=Math.min(m.vy,-5.4);m.flapWait=8;m.flaps++;
        this.sparkle(m.x,m.y-39,0xd9efff);
      }
    }
    m.vy+=(settings.kind==='flight'?.28:.43)*step;
    if(settings.kind==='flight'&&actions.down&&!m.grounded)
      m.vy+=.35*step;
    m.vy=clamp(m.vy,-9,7.5);
    const nextX=clamp(m.x+m.vx*step,12,this.worldW-12);
    const safeX=safeHorizontalX(m.x,nextX,m.y,x=>this.groundAt(x));
    if(Math.abs(safeX-nextX)>.2)m.vx=0;
    m.x=safeX;
    const prior=m.y;
    m.y=clamp(m.y+m.vy*step,15,this.worldH-10);
    const landing=landingY(prior,m.y,m.vy,m.grounded,
      m.x,this.groundAt(m.x),this.level.platformSegments,TILE);
    if(landing!==null){
      m.y=landing;m.vy=0;m.grounded=true;m.flaps=0;
    }else m.grounded=false;
    const action=m.grounded?(Math.abs(m.vx)>.4?'run':'idle'):
      m.kind==='pegasus'&&m.vy<0?'flap':m.vy<0?'jump':'glide';
    this.animateMount(m,action,step/60);
    const seat=seatFor(m.kind,m.grounded?(Math.abs(m.vx)>.4?'run':'idle'):'jump');
    p.x=m.x+seat.x*(m.face<0?-1:1);
    p.y=m.y+seat.y;
    p.vx=m.vx;p.vy=m.vy;p.face=m.face;p.grounded=m.grounded;
    this.animate(p,'hero',m.grounded?(Math.abs(m.vx)>.5?'run':'idle'):'jump',step/60);
    if(p.id===1&&this.players[0]&&
       (Math.abs(p.x-this.players[0].x)>210||Math.abs(p.y-this.players[0].y)>145)){
      this.dismount(p);
      p.bubble=true;
    }
  }

  updateMounts(step,time){
    for(const m of this.mounts){
      if(m.rider!==null)continue;
      m.chew=Math.max(0,m.chew-step/60);
      const food=this.lures.find(f=>f.landed&&Math.abs(f.x-m.x)<155&&
        Math.abs(f.y-m.y)<48);
      if(food&&m.trust<100){
        const walk=clamp(food.x-m.x,-.63*step,.63*step);
        if(!m.perched){
          m.x=safeHorizontalX(m.x,clamp(m.x+walk,10,this.worldW-10),
            m.y,x=>this.groundAt(x));
          m.y=this.groundAt(m.x);
        }else if(Math.abs(food.x-m.x)>12){
          m.x=clamp(m.x+walk,m.homeX-24,m.homeX+24);
        }
        if(Math.abs(food.x-m.x)<18){
          m.trust=feedTrust(m.trust,MOUNTS[m.kind].favorite,food.food);
          m.chew=.45;
          food.visual.destroy();
          this.lures.splice(this.lures.indexOf(food),1);
          this.sparkle(m.x,m.y-32,0xf8e9ba);
          this.flash(m.trust===100?
            m.kind+' trusts you! Press T / Y nearby to ride':
            m.kind+' enjoyed the treat',1750);
        }
      }
      // Leave unmounted Pegasus on its authored shelf, not the ground far
      // below it. Dismounted rides land under normal physics next frame.
      if(!m.perched&&m.vy!==0){
        const prior=m.y;m.vy=Math.min(7.5,m.vy+.4*step);
        m.y+=m.vy*step;
        const floor=landingY(prior,m.y,m.vy,false,m.x,
          this.groundAt(m.x),this.level.platformSegments,TILE);
        if(floor!==null){m.y=floor;m.vy=0;m.grounded=true;}
      }
      const action=m.chew>0?'eat':m.trust>=100?'happy':food?'run':'idle';
      this.animateMount(m,action,step/60);
    }
  }

  makePlayer(id){
    const spawn=this.level.objects.find(o=>o.kind==='p1');
    const x=(spawn.x+.5)*TILE+(id?14:0), y=this.groundAt(x);
    const visual=this.actor('hero',x,y).setDepth(30+id);
    if(id===1)visual.setTint(0xcacaff);
    const player={id,x,y,vx:0,vy:0,face:1,grounded:true,coyote:5,
      jumpBuffer:0,jumps:0,flaps:0,flapWait:0,health:3,sleep:false,invincible:0,
      form:null,caught:null,food:0,powers:0,hover:0,breach:0,bubble:false,
      mount:null,
      bloomWindow:0,bloomBoosts:0,recalls:0,
      checkpoint:{x,y},action:'',animationTime:0,visual};
    this.players.push(player);
    return player;
  }

  makeHud(){
    // DOM UI is independent of Phaser's zoomed scrolling world camera.
    const ui=document.getElementById('ww-ui');
    ui.hidden=false;
    const status=document.getElementById('ww-status');
    const notice=document.getElementById('ww-notice');
    const help=document.getElementById('ww-help');
    const pause=document.getElementById('ww-pause');
    pause.hidden=true;
    this.hud={setText:value=>{status.textContent=value;}};
    this.notice={setText:value=>{notice.textContent=value;}};
    this.help={setText:value=>{help.textContent=value;}};
    this.pausedOverlay={setVisible:visible=>{pause.hidden=!visible;}};
    this.pauseMessage={setVisible:visible=>{pause.hidden=!visible;}};
    this.noticeUntil=0;
  }

  flash(message,duration=1800){
    if(!this.notice)return;
    this.notice.setText(message);
    this.noticeUntil=this.time.now+duration;
  }

  sparkle(x,y,color=0xffedb3){
    for(let i=0;i<7;i++){
      const dot=this.add.circle(x,y-12,1.5+Math.random()*1.6,color,.9).setDepth(40);
      const angle=i*Math.PI*2/7;
      this.tweens.add({targets:dot,x:x+Math.cos(angle)*(12+Math.random()*16),
        y:y-12+Math.sin(angle)*(10+Math.random()*14),alpha:0,scale:0,
        duration:400+Math.random()*250,onComplete:()=>dot.destroy()});
    }
  }

  supportAt(x,feetY){
    const surface=this.groundAt(x);
    const ledge=this.level.platformSegments
      .filter(platform=>platform.kind==='platform'&&
        x>=platform.x*TILE&&x<=(platform.x+platform.length)*TILE)
      .map(platform=>platform.y*TILE)
      .filter(y=>y<=surface&&Math.abs(y-feetY)<50)
      .sort((a,b)=>Math.abs(a-feetY)-Math.abs(b-feetY))[0];
    return ledge??surface;
  }

  throwFood(p){
    const food=FRUITS[p.food];
    if(this.shared.foods[food]===0){
      this.flash('Find a picnic basket to refill '+food+' treats',1400);
      return;
    }
    this.shared.foods[food]--;
    // A long, visible throw that still respects real supporting geometry.
    const x=clamp(p.x+p.face*96+p.vx*5,16,this.worldW-16);
    const y=this.supportAt(x,p.y);
    gesture(p,'feed',.27);
    const texture=food==='berry'?'painted-berry':'flora';
    const sprite=food==='berry'?
      this.add.image(p.x,p.y-18,texture).setDisplaySize(19,20):
      this.add.image(p.x,p.y-18,texture,p.food).setScale(.071);
    sprite.setOrigin(.5,1).setDepth(18);
    const lure={x,y,food,visual:sprite,landed:false,life:24*60};
    this.lures.push(lure);
    const startX=p.x+p.face*9,startY=p.y-21;
    const progress={t:0};
    this.tweens.add({targets:progress,t:1,duration:570,
      ease:'Linear',onUpdate:()=>{
        const t=progress.t;
        sprite.setPosition(startX+(x-startX)*t,
          startY+(y-startY)*t-50*Math.sin(Math.PI*t));
        sprite.setRotation(p.face*5*t);
      },onComplete:()=>{
        sprite.setPosition(x,y).setRotation(0);
        lure.landed=true;
      }});
    this.flash('A '+food+' treat is on its way',800);
  }

  powerEffect(kind,x,y,face=1){
    const colors={springaroo:0xf8b5cf,tideling:0x8cdeee,skyling:0xe6c9ff,
      mossback:0xf5c56a,prismtail:0x9aeef5,glimmermoth:0xe8bbff,
      cloudwhisp:0xb2e8ed,emberkit:0xffca9d};
    const color=colors[kind]||0xffffff;
    if(kind==='prismtail'){
      const ring=this.add.ellipse(x,y-18,33,38,0xa6f8ff,.08)
        .setStrokeStyle(2,0xd2fcff,.83).setDepth(37);
      this.tweens.add({targets:ring,y:y-35,scale:1.17,alpha:0,
        duration:1150,onComplete:()=>ring.destroy()});
    }
    for(let i=0;i<7;i++){
      const dot=this.add.circle(x,y-12,(i%3+1)*.8,color,.8).setDepth(39);
      const angle=(i/7)*Math.PI*2;
      const dx=kind==='cloudwhisp'||kind==='skyling'?
        (14+i*4)*face:Math.cos(angle)*(9+i*2);
      const dy=kind==='mossback'?Math.abs(Math.sin(angle))*(10+i):
        Math.sin(angle)*(9+i*1.3);
      this.tweens.add({targets:dot,x:x+dx,y:y-12+dy,
        alpha:0,scale:0,duration:430+i*42,onComplete:()=>dot.destroy()});
    }
  }

  castPower(p){
    if(!p.form||p.powers>0)return;
    p.powers=.8;
    gesture(p,'alert',.28);
    if(p.form==='glimmermoth'){
      p.hover=.85;this.powerEffect(p.form,p.x,p.y,p.face);
      return;
    }
    if(p.form==='springaroo'||p.form==='tideling'){
      this.powerEffect(p.form,p.x+p.face*19,p.y,p.face);
      return;
    }
    const target=this.animals.filter(a=>!a.captured&&a.stun<=0&&
      (a.x-p.x)*p.face>-15&&Math.abs(a.x-p.x)<95&&Math.abs(a.y-p.y)<46)
      .sort((a,b)=>distance(a,p)-distance(b,p))[0];
    if(!target){
      this.powerEffect(p.form,p.x+p.face*30,p.y-10,p.face);
      return;
    }
    target.stun=p.form==='mossback'?3.7:p.form==='prismtail'?2.5:1.8;
    if(p.form==='prismtail')target.bubble=2.5;
    if(p.form==='cloudwhisp'||p.form==='skyling')
      target.x=clamp(target.x+p.face*26,10,this.worldW-10);
    if(p.form==='emberkit')target.stun=1.4;
    this.powerEffect(p.form,target.x,target.y,p.face);
    gesture(target,'stunned',.4);
  }

  throwOrb(p){
    gesture(p,'capture',.38);
    const x=p.x+p.face*7,y=p.y-17;
    const visual=this.add.circle(x,y,5,0xd5faff,.38)
      .setStrokeStyle(1.5,0xffffff,.86).setDepth(32);
    // A *fixed*, slow, predictably bouncing trajectory. No target-aware
    // adjustments, homing, or hidden capture assistance.
    this.orbs.push({x,y,vx:p.face*3,vy:-.7,
      visual,life:150,bounces:0,owner:p});
  }

  updateAnimals(step,time){
    for(const animal of this.animals){
      if(animal.captured){
        animal.respawn-=step/60;
        if(animal.respawn<=0){
          animal.captured=false;animal.trust=0;animal.distraction=0;
          animal.respawn=0;animal.stun=0;animal.bubble=0;
          animal.windup=0;animal.dash=0;
          animal.x=animal.homeX;animal.y=animal.homeY;
          animal.visual.setVisible(true);
          animal.visual.shadow?.setVisible(true);
          if(animal.halo)animal.halo.setVisible(true);
        }else continue;
      }
      animal.stun=Math.max(0,animal.stun-step/60);
      animal.bubble=Math.max(0,animal.bubble-step/60);
      const trust=tickDistraction(animal.trust,animal.distraction,step/60);
      animal.trust=trust.trust;animal.distraction=trust.seconds;
      animal.attack=Math.max(0,animal.attack-step/60);
      const friendly=animal.distraction>0;
      if(friendly||animal.stun>0){
        animal.windup=0;animal.dash=0;
      }
      const lure=this.lures.find(f=>f.landed&&Math.abs(f.x-animal.x)<155);
      let target=lure?.x ?? (animal.homeX+Math.sin(time*.00055+animal.homeX)*32);
      const diff=target-animal.x;
      // At full trust, pause in place for the player's capture attempt.
      // Without this a friendly animal immediately wandered out of orb range.
      const speed=animal.stun || animal.bubble>0 || friendly || animal.windup>0 ? 0 :
        lure ? .55 : animal.kind==='prismtail' ? .76 : .36;
      animal.x+=clamp(diff,-speed*step,speed*step);
      if(animal.dash>0){
        animal.x=clamp(animal.x+animal.attackFace*2.6*step,10,this.worldW-10);
        animal.dash=Math.max(0,animal.dash-step/60);
      }
      if(Math.abs(diff)>2)animal.face=Math.sign(diff);
      if(animal.flying){
        const rest=animal.homeY+Math.sin(time*.0014+animal.homeX)*7;
        const wanted=lure?Math.min(rest+40,lure.y-15):rest;
        animal.y+=(wanted-animal.y)*.035*step;
      }else animal.y=this.groundAt(animal.x)-(animal.bubble>0?22:0);
      if(lure&&Math.abs(animal.x-lure.x)<12&&Math.abs(animal.y-lure.y)<25){
        animal.trust=feedTrust(animal.trust,FAVORITES[animal.kind],lure.food);
        if(animal.trust===100)animal.distraction=DISTRACTION_SECONDS;
        lure.visual.destroy();
        this.lures.splice(this.lures.indexOf(lure),1);
        this.sparkle(animal.x,animal.y,0xffd4ee);
        gesture(animal,animal.trust>=100?'happy':'eat',.5);
        this.flash(animal.trust>=100?
          animal.kind+' is friendly — throw a capture orb!':
          animal.kind+' enjoyed the treat',1300);
      }
      const action=animal.stun||animal.bubble>0?'stunned':animal.windup>0?'alert':animal.dash>0?'dash':
        lure?'run':animal.flying?'flap':Math.abs(diff)>6?'run':
        animal.distraction>0?'happy':'idle';
      this.animate(animal,animal.kind,action,step/60);
      animal.visual.setTint(friendly?0xc7ffda:0xffffff);
      // Threats explicitly warn before a short, directional dash.
      // Merely touching a calm animal never causes damage.
      const hostile=animal.kind==='emberkit'||animal.kind==='prismtail';
      const close=this.players.find(p=>!p.sleep&&!p.bubble&&
        Math.abs(p.x-animal.x)<52&&Math.abs(p.y-animal.y)<28);
      if(hostile&&!friendly&&animal.stun===0){
        if(animal.windup>0){
          animal.windup=Math.max(0,animal.windup-step/60);
          if(animal.windup===0){animal.dash=.22;animal.attack=1.25;}
        }else if(animal.attack===0&&animal.dash===0&&close&&!lure){
          animal.windup=.55;
          animal.attackFace=close.x>=animal.x?1:-1;
        }
      }
      if(animal.halo)animal.halo.setPosition(animal.x,animal.y-17);
      animal.warning.clear();
      if(animal.windup>0){
        const end=animal.x+animal.attackFace*51;
        const left=Math.min(animal.x,end);
        animal.warning.fillStyle(0xffb77b,.10+.08*Math.sin(time*.02)**2);
        animal.warning.fillRoundedRect(left,animal.y-15,51,18,5);
        animal.warning.lineStyle(2,0xffc785,.58);
        animal.warning.lineBetween(animal.x,animal.y-7,end,animal.y-7);
        animal.warning.fillStyle(0xffe3b6,.8);
        animal.warning.fillTriangle(end+animal.attackFace*7,animal.y-7,
          end-animal.attackFace*3,animal.y-12,
          end-animal.attackFace*3,animal.y-2);
      }
      for(const p of this.players){
        if(p.sleep||p.bubble||Math.abs(p.x-animal.x)>19||
          Math.abs(p.y-animal.y)>24)continue;
        if(p.vy>1&&p.y<animal.y-6){
          animal.stun=2.1;animal.windup=0;animal.dash=0;
          gesture(animal,'hurt',.32);
          p.vy=-4.4;this.sparkle(animal.x,animal.y);
        }else if(animal.dash>0&&p.invincible<=0){
          p.health--;p.invincible=1.5;p.vx=animal.x<p.x?3:-3;
          gesture(p,'hurt',.36);
          p.vy=-3.3;animal.dash=0;animal.attack=1.25;
          this.flash('Look for the warning, then jump over!',1200);
          if(p.health<=0){
            p.health=0;p.sleep=true;p.vx=0;p.vy=0;
            this.flash('Resting! Press R / LB to revive at camp',2400);
          }
        }
      }
    }
    for(const lure of [...this.lures]){
      // Food lifetime and creature approach both use simulation frames.
      // Wall-clock expiry was shorter than traversal on low-FPS browsers.
      lure.life-=step;
      if(lure.life<=0){
        lure.visual.destroy();this.lures.splice(this.lures.indexOf(lure),1);
      }
    }
    for(const orb of [...this.orbs]){
      const fromX=orb.x,fromY=orb.y,oldBounces=orb.bounces;
      const next=orbStep(orb,this.groundAt(orb.x+orb.vx*step),step);
      Object.assign(orb,next);
      orb.visual.setPosition(orb.x,orb.y)
        .setScale(.93+.08*Math.cos(this.time.now*.006));
      if(orb.bounces>oldBounces)
        this.sparkle(orb.x,orb.y+5,0xc5f5ff);
      const animal=this.animals.find(a=>!a.captured&&a.distraction>0&&
        orbHitsAnimal(fromX,fromY,orb.x,orb.y,a.x,a.y));
      if(animal){
        animal.captured=true;animal.respawn=RESPAWN_SECONDS;
        animal.visual.setVisible(false);
        animal.visual.shadow?.setVisible(false);
        animal.warning.clear();
        if(animal.halo)animal.halo.setVisible(false);
        orb.owner.caught=animal.kind;
        orb.owner.form=null;
        this.sparkle(animal.x,animal.y,0xe1ffb5);
        this.flash('Befriended '+animal.kind+'! Press T / Y to transform',3000);
        orb.life=0;
      }
      if(orb.life<=0||orb.bounces>3||
        orb.x<0||orb.x>this.worldW){
        orb.visual.destroy();this.orbs.splice(this.orbs.indexOf(orb),1);
      }
    }
  }

  recall(p){
    p.x=p.checkpoint.x;p.y=p.checkpoint.y;p.vx=0;p.vy=0;
    if(p.mount)this.dismount(p);
    p.recalls++;p.bloomWindow=0;
    p.grounded=true;p.bubble=false;p.sleep=false;
    p.invincible=1.5;p.health=3;
    p.visual.setPosition(p.x,p.y);
    this.flash('Back at the last safe camp',1300);
  }

  movePlayer(p,actions,step){
    if(p.sleep){
      if(actions.revivePressed||actions.recallPressed)this.recall(p);
      else this.animate(p,p.form||'hero','sleep',step/60);
      return;
    }
    if(actions.revivePressed){
      for(const partner of this.players){
        if(partner!==p&&partner.sleep&&distance(partner,p)<48)
          this.recall(partner);
      }
    }
    if(p.bubble){
      const lead=this.players[0];
      const action=actions.jumpPressed||actions.foodPressed||actions.capturePressed||
        actions.transformPressed||actions.leftPressed||actions.rightPressed;
      if(action){p.bubble=false;p.x=lead.x-22;p.y=lead.y-12;p.vx=0;p.vy=0;}
      else {
        p.x=lead.x-25;p.y=lead.y-28;
        p.visual.setPosition(p.x,p.y).setAlpha(.35);
        return;
      }
    }
    p.visual.setAlpha(p.invincible>0&&Math.floor(this.time.now/100)%2===0?.53:1);
    if(actions.nextPressed)p.food=(p.food+1)%FRUITS.length;
    if(actions.recallPressed)this.recall(p);
    const nearbyMount=this.mounts.find(m=>m.trust>=100&&m.rider===null&&
      Math.abs(m.x-p.x)<58&&Math.abs(m.y-p.y)<62);
    if(actions.transformPressed&&p.mount){
      this.dismount(p);
    }else if(actions.transformPressed&&nearbyMount){
      this.board(p,nearbyMount);
    }else if(actions.transformPressed&&p.caught){
      p.form=p.form?null:p.caught;
      p.flaps=0;p.jumps=0;
      gesture(p,'transform',.54);
      this.sparkle(p.x,p.y-12,0xe9ffcd);
      this.flash(p.form?FORMsName(p.form)+' form':'Explorer form',1300);
    }
    if(actions.foodPressed&&!p.mount)
      p.form?this.castPower(p):this.throwFood(p);
    if(actions.capturePressed&&!p.form&&!p.mount)this.throwOrb(p);
    p.invincible=Math.max(0,p.invincible-step/60);
    if(p.mount){
      this.moveMountedPlayer(p,actions,step);
      return;
    }
    p.powers=Math.max(0,p.powers-step/60);
    p.flapWait=Math.max(0,p.flapWait-step);
    p.hover=Math.max(0,p.hover-step/60);
    p.breach=Math.max(0,p.breach-step/60);
    p.bloomWindow=Math.max(0,p.bloomWindow-step);
    p.coyote=p.grounded?5:Math.max(0,p.coyote-step);
    p.jumpBuffer=actions.jumpPressed?6:Math.max(0,p.jumpBuffer-step);
    const inWater=this.inWater(p.x,p.y-8);
    const swimmer=p.form==='tideling'&&inWater;
    const direction=Number(actions.right)-Number(actions.left);
    if(direction)p.face=direction;
    const desired=direction*(swimmer?2.15:p.form==='springaroo'?2.65:2.3);
    const traction=p.grounded ? .22 : .14;
    p.vx+=(desired-p.vx)*Math.min(1,traction*step);
    if(swimmer){
      p.vy+=((actions.jump?-.23:actions.down?.24:.046)-p.vy*.035)*step;
      p.vy=clamp(p.vy,-2.3,2.6);
      const basin=this.level.waterBodies.find(b=>
        p.x>=b.start*TILE&&p.x<=b.end*TILE);
      if(actions.jumpPressed&&basin&&p.breach===0&&
        p.y-basin.surface*TILE<30){
        p.vy=-5.1;p.breach=.48;
        this.powerEffect('tideling',p.x,p.y,p.face);
      }
    }else{
      if(tryBloomBoost(p,actions.jumpPressed)){
        gesture(p,'jump',.22);
        this.sparkle(p.x,p.y,0xffc6e8);
        this.flash('Perfect spring! Extra-high jump',1050);
      }else if(p.jumpBuffer>0&&p.coyote>0){
        p.vy=-5.4;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.jumps=1;
      }else if(actions.jumpPressed&&p.form==='springaroo'&&p.jumps===1){
        p.vy=-6.6;p.jumps=2;p.jumpBuffer=0;
        gesture(p,'jump',.18);this.sparkle(p.x,p.y);
      }else if(actions.jumpPressed&&p.form==='skyling'&&p.flaps<4&&p.flapWait<=0){
        p.vy=-5.65;p.flaps++;p.flapWait=8;p.jumpBuffer=0;
        gesture(p,'flap',.22);
        this.sparkle(p.x,p.y,0xd3f6ff);
      }
      if(!actions.jump&&p.vy<-2.3&&p.form!=='skyling')p.vy+=.28*step;
      const hover=p.form==='glimmermoth'&&p.hover>0&&p.vy>0;
      p.vy+=(p.vy>=0 ? (hover ? .12 : .52) : .34)*step;
      if(this.inWater(p.x,p.y-6))p.vy=Math.min(p.vy,1.4);
    }
    const updraft=this.level.thermalVolumes.some(c=>
      p.x>=c.x*TILE&&p.x<=(c.x+c.width)*TILE&&
      p.y>c.y*TILE&&p.y<(c.y+c.height)*TILE);
    if(updraft){
      p.vy-=.48*step;
      if(p.form==='skyling')p.flaps=0;
    }
    p.vy=clamp(p.vy,-8,7.5);
    const nextX=clamp(p.x+p.vx*step,10,this.worldW-10);
    const safeX=safeHorizontalX(p.x,nextX,p.y,
      x=>this.groundAt(x),swimmer);
    if(Math.abs(safeX-nextX)>.2)p.vx=0;
    p.x=safeX;
    const priorY=p.y,wasGrounded=p.grounded,impactSpeed=p.vy;
    p.y+=p.vy*step;
    const landing=landingY(priorY,p.y,p.vy,p.grounded,
      p.x,this.groundAt(p.x),this.level.platformSegments,TILE);
    if(landing!==null){
      p.y=landing;p.vy=0;p.grounded=true;p.jumps=0;p.flaps=0;p.coyote=5;
      if(!wasGrounded&&impactSpeed>1.3){
        gesture(p,'land',.15);
        if(impactSpeed>3.8)this.sparkle(p.x,p.y,0xe4f4c9);
      }
    }else p.grounded=false;
    // Safety against upward-facing underwater banks: a wall cannot
    // convert a horizontal swim into a fall through the heightfield.
    const ground=this.groundAt(p.x);
    if(p.y>ground+3){
      p.y=ground;p.vy=Math.min(p.vy,0);p.grounded=true;
    }
    if(p.y>this.worldH-10)this.recall(p);
    const action=swimmer?'swim':p.grounded?(Math.abs(p.vx)>.3?'run':'idle'):
      p.form==='skyling'?'glide':p.vy<0?'jump':'fall';
    this.animate(p,p.form||'hero',action,step/60);
    if(p.id===1&&this.players[0]&&
      (Math.abs(p.x-this.players[0].x)>210||Math.abs(p.y-this.players[0].y)>145))
      p.bubble=true;
  }

  touchWorld(p,step){
    if(p.bubble||p.sleep)return;
    for(const item of this.items){
      if(item.used||Math.abs(item.x-p.x)>19||Math.abs(item.y-12-p.y)>26)continue;
      if(item.kind==='starShard'){
        item.used=true;item.visual.destroy();this.shared.shards++;
        this.sparkle(item.x,item.y);this.flash('A hidden Stardrop!',900);
      }else if(item.kind==='snack'){
        item.used=true;item.respawn=11;
        this.shared.picnics++;
        item.visual.setVisible(false);
        for(const food of FRUITS)
          this.shared.foods[food]+=food==='berry'?4:2;
        this.sparkle(item.x,item.y,0xffd2ad);
        this.flash('Picnic basket! Treats restocked',1250);
      }else if(item.kind==='checkpoint'){
        item.used=true;
        this.shared.checkpoint={x:item.x,y:item.y};
        for(const explorer of this.players){
          explorer.checkpoint={...this.shared.checkpoint};
          explorer.health=3;
        }
        this.sparkle(item.x,item.y,0xb7f4c8);
        this.flash('Campfire reached! Hearts restored',1350);
        item.visual.setFrame(3);
        if(item.halo)item.halo.setStrokeStyle(1.4,0x9de9bb,.68);
      }else if(item.kind===this.chapter.key){
        const required=this.chapter.goals[0].form;
        if(p.form===required){
          item.used=true;item.visual.destroy();item.halo?.destroy();
          this.shared.relic=true;
          this.sparkle(item.x,item.y,0xfffac1);
          this.flash('You recovered the '+this.chapter.goals[0].name+'! Find the gate.',3400);
        }else if(this.time.now>this.noticeUntil)
          this.flash('The light needs '+FORMsName(required),1200);
      }else if(item.kind==='exit'&&this.shared.relic){
        this.flash('Chapter complete! The next light awakens.',1600);
        const next=this.stage+1;
        if(next<WW.chapters.length)this.startStage(next);
        else this.showMenu();
        return true;
      }
    }
    for(const piece of this.setpieces){
      piece.time=Math.max(0,piece.time-step/60);
      if(Math.abs(piece.x-p.x)>13||Math.abs(piece.y-p.y)>23)continue;
      if(piece.kind==='bounceBloom'&&piece.time===0&&p.vy>=0){
        triggerBloom(p,p.jumpBuffer>0);
        piece.time=1.1;
        this.sparkle(piece.x,piece.y,0xffc7e1);
        this.tweens.add({targets:piece.visual,
          scaleX:{from:.14,to:.21},scaleY:{from:.09,to:.17},
          duration:130,yoyo:true,repeat:1,
          onComplete:()=>piece.visual.setScale(.12)});
        this.flash(p.bloomWindow>0?
          'Spring bloom! Tap jump again for a super bounce!':
          'Perfectly timed springboard boost!',1350);
      }else if(piece.kind==='windRing')p.vy=Math.min(p.vy,-4.1);
      else if(piece.kind==='bubbleVent'&&this.inWater(p.x,p.y))p.vy-=.22*step;
    }
  }

  update(_time,delta){
    const time=this.time.now,step=clamp(delta/16.6667,.25,2);
    const actions=[0,1].map(i=>readActions(this.keyboard[i],this.pad(i),this.lastInput[i]));
    this.lastInput=actions;
    if(this.stage<0){
      if(actions[0].leftPressed||actions[1].leftPressed){
        this.choice=(this.choice+WW.chapters.length-1)%WW.chapters.length;
        this.updateMenuText();
      }else if(actions[0].rightPressed||actions[1].rightPressed){
        this.choice=(this.choice+1)%WW.chapters.length;this.updateMenuText();
      }
      if(actions.some(a=>a.jumpPressed||a.foodPressed)){
        this.startStage(this.choice);
        // Preserve the start button's held state across the scene transition.
        // A held A/Space must not become a *new* jump on the first game frame.
        this.lastInput=actions;
      }
      return;
    }
    if(actions.some(a=>a.pausePressed)){
      this.paused=!this.paused;
      this.pausedOverlay.setVisible(this.paused);
      this.pauseMessage.setVisible(this.paused);
    }
    if(this.paused)return;
    if(this.pad(1)&&this.players.length===1){
      this.twoPlayers=true;this.makePlayer(1);
    }
    for(const item of this.items){
      if(item.kind==='snack'&&item.used){
        item.respawn-=step/60;
        if(item.respawn<=0){
          item.used=false;item.visual.setVisible(true);
        }
      }
    }
    for(const p of [...this.players])this.movePlayer(p,actions[p.id],step);
    this.updateMounts(step,time);
    this.updateAnimals(step,time);
    for(const p of [...this.players]){
      if(this.touchWorld(p,step))return;
    }
    if(this.stage<0)return;
    const lead=this.players[0];
    this.hud.setText('♥ '+lead.health+'    ✦ '+this.shared.shards+
      '    '+(this.shared.relic?'LIGHT RESTORED':'FIND THE LIGHT')+
      (lead.mount?'    '+(lead.mount.kind==='pegasus'?'PEGASUS':'UNICORN'):
       lead.form?'    '+FORMsName(lead.form):'')+
      (this.twoPlayers?'    P2 ♥ '+this.players[1]?.health:''));
    const first=this.animals.find(a=>a.kind==='springaroo'&&!a.captured);
    const teaching=this.chapter.id==='first-forest'&&first;
    this.help.setText(lead.mount?
      (lead.mount.kind==='pegasus'?
        'Pegasus · Tap Jump for wingbeats · Down descends · T / Y dismount':
        'Unicorn · Gallop with stick · Jump to leap · T / Y dismount'):
      this.mounts.some(m=>m.trust>=100&&m.rider===null&&
        Math.abs(m.x-lead.x)<100)?
        'Friendly mount nearby · T / Y to ride':
      lead.form==='springaroo'?
      'Tap jump twice to leap higher':
      lead.caught?'T / Y · transform into '+FORMsName(lead.caught):
      teaching&&first.distraction>0?'G / X · catch your new friend':
      teaching?'F / B · offer two berries to the glowing Springaroo':
      lead.sleep?'R / LB · revive at camp':'');
    if(time>this.noticeUntil)this.notice.setText('');
  }
}

function FORMsName(name){
  return {springaroo:'Springaroo',tideling:'Tidefox',skyling:'Moonwing',
    mossback:'Mossback',prismtail:'Prismtail',glimmermoth:'Glimmermoth',
    cloudwhisp:'Cloudwhisp',emberkit:'Emberkit'}[name]||name;
}

new Phaser.Game({
  type:Phaser.AUTO,
  parent:'game',
  width:960,
  height:540,
  backgroundColor:'#101b31',
  render:{pixelArt:false,antialias:true},
  input:{gamepad:true},
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  scene:[Wonderwood]
});
