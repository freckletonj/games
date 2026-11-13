import Phaser from 'phaser';
import './bootstrap.js';
import designs from '../../src/games/animal-adventure/designs.json';
import {characters,mounts,backgrounds,sheets,silhouettes,terrainAtlas,paintedStates} from './assets.js';
import {EFFECT_FRAMES,paintedAction,powerFrame,setpieceFrame,enemyTellFrame,
  paintedFootOrigin} from './action-art.js';
import {MOUNTS,LOCATIONS,seatFor,stepMountedMotion} from './mounts.js';
import {bindings,readActions} from './input.js';
import {landingY,safeHorizontalX,orbStep,orbHitsAnimal} from './physics.js';
import {triggerBloom} from './springboard.js';
import {stepPlayerMotion} from './player-motion.js';
import {TICK_MS,simulationTicks,queueInputEdges,withoutInputEdges} from './fixed-clock.js';
import {poseFor,gesture} from './animation.js';
import {feedTrust,RESPAWN_SECONDS,DISTRACTION_SECONDS} from './creatures.js';
import {advanceTreatFlight} from './treat-motion.js';
import {chooseCreatureLure,HOVER_SECONDS,ventContains,
  applyVentLift} from './gameplay-rules.js';
import {launchPower,stepPower,powerHitsCreature,applyPowerHit,
  honeyPuddleCatches,HONEY_PUDDLE_TICKS} from './power-projectiles.js';
import {ATTACKS,tickCreatureRespawn,stepCreatureMotion,creatureAction,stepCreatureThreat,
  stompCreature} from './creature-motion.js';
import {meadowDesign} from './meadow-design.js';
import {grottoChapter} from './cave-chapter.js';
import {compileCave,caveContainsWater,skywellLayout} from './cave-layout.js';
import {skywellChapter} from './skywell-chapter.js';
import {paintCave,paintCaveGeometryOverlay} from './cave-renderer.js';
import caveRockUrl from '../assets/generated/luminous-grotto-single.png';
import skywellRockUrl from '../assets/generated/skywell-ascent.webp';
import {readProgress,playChapter,completeChapter,writeProgress,browserProgressStorage} from './progress.js';
import {addMeadowIllustration} from './meadow-art.js';
import {validateEncounters} from './encounters.js';
import {paintTerrain,paintScenery,addMeadowAtmosphere,
  addParallaxAtmosphere,moveParallaxAtmosphere} from './world-renderer.js';

const CHAPTERS=[...WW.chapters,grottoChapter,skywellChapter];
const TILE=16;
const VIEW_W=480;
const VIEW_H=270;
const SKY={meadow:0xa4d9c2,coast:0xa8dbe0,summit:0x98a4ce};
const FORMS={springaroo:'Double jump',tideling:'Swim and dive',skyling:'Four wingbeats',
  mossback:'Honey',prismtail:'Bubbles',glimmermoth:'Hover',cloudwhisp:'Gust',emberkit:'Spark'};
const FRUITS=['berry','nectar','star'];
const FAVORITES={springaroo:'berry',tideling:'nectar',skyling:'star',mossback:'berry',
  prismtail:'berry',glimmermoth:'star',cloudwhisp:'nectar',emberkit:'berry'};
const FORM_HINTS={
  springaroo:'Tap Jump twice to leap higher',
  tideling:'Hold Jump to swim · Down to dive',
  skyling:'Tap Jump to flap · F / B to cast a gust',
  mossback:'F / B to throw sticky honey',
  prismtail:'F / B to float creatures in bubbles',
  glimmermoth:'F / B for a long feather-hover',
  cloudwhisp:'F / B to blow creatures back',
  emberkit:'Run faster · F / B for a gentle spark'
};
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
    for(const [name,url] of Object.entries(sheets))
      this.load.spritesheet(name,url,{frameWidth:180,frameHeight:270});
    for(const [name,url] of Object.entries(silhouettes))this.load.image('kenney-'+name,url);
    this.load.image('painted-states',paintedStates);
    this.load.image('cave-painted-rock',caveRockUrl);
    // One full-resolution, geometry-constrained AI-painted bitmap.
    // Collision remains the independently compiled authored cave layout.
    this.load.image('skywell-painted-rock',skywellRockUrl);
  }

  create(){
    this.keyboard=bindings.map(layout=>Object.fromEntries(Object.entries(layout)
      .map(([action,codes])=>[action,codes.map(code=>this.input.keyboard.addKey(code))])));
    this.lastInput=[{},{}];
    this.progressStorage=browserProgressStorage();
    this.progress=readProgress(this.progressStorage,CHAPTERS.map(chapter=>chapter.id));
    this.choice=Math.max(0,CHAPTERS.findIndex(chapter=>
      chapter.id===this.progress.lastPlayed));
    this.twoPlayers=false;
    this.paused=false;
    // The title is native-resolution HTML, independent of the 2x world camera.
    this.menuEl=document.getElementById('ww-menu');
    this.menuWorld=document.getElementById('ww-menu-chapter');
    this.menuHint=document.getElementById('ww-menu-description');
    this.menuCounter=document.getElementById('ww-menu-counter');
    this.menuMode=document.getElementById('ww-menu-mode');
    document.getElementById('ww-menu-prev').addEventListener('click',()=>this.changeChapter(-1));
    document.getElementById('ww-menu-next').addEventListener('click',()=>this.changeChapter(1));
    document.getElementById('ww-menu-play').addEventListener('click',()=>this.startStage(this.choice));
    document.getElementById('ww-menu-coop').addEventListener('click',()=>this.toggleSecondPlayer());
    this.stage=-1;
    this.input.keyboard.on('keydown-TWO',()=>this.toggleSecondPlayer());
    this.makeBerryTexture();
    // Source illustration is a 3x3 sheet. Register real cropped frames
    // rather than enlarging a complete atlas into the character position.
    const statesTexture=this.textures.get('painted-states');
    this.stateFrameWidth=statesTexture.source[0].width/3;
    this.stateFrameHeight=statesTexture.source[0].height/3;
    for(let frame=0;frame<9;frame++)
      statesTexture.add(frame,0,(frame%3)*this.stateFrameWidth,
        Math.floor(frame/3)*this.stateFrameHeight,
        this.stateFrameWidth,this.stateFrameHeight);
    // Revive has the same binding as the legacy game. H returns to the menu.
    this.input.keyboard.on('keydown-H',()=>{if(this.stage>=0)this.showMenu();});
    this.input.keyboard.on('keydown-V',()=>{
      if(this.level?.cave&&this.caveGeometryOverlay)
        this.caveGeometryOverlay.setVisible(!this.caveGeometryOverlay.visible);
    });
    this.showMenu();
    document.getElementById('ww-startup').hidden=true;
    // The smoke test reads state but never mutates gameplay state directly.
    window.__wonderwoodPhaser={
      engine:'Phaser 4',
      snapshot:()=>({stage:this.stage,choice:this.choice,chapter:this.chapter?.id||null,
        mounts:this.mounts?.map(m=>({kind:m.kind,x:m.x,y:m.y,vx:m.vx,vy:m.vy,
          trust:m.trust,rider:m.rider,grounded:m.grounded,flaps:m.flaps,
          action:m.action,frame:m.visual?.frame?.name}))||[],
        animalCount:this.animals?.length||0,
        platformCount:this.level?.platformSegments?.length||0,
        climbWallCount:this.level?.climbWalls?.length||0,
        worldWidth:this.worldW||0,
        cameraZoom:this.cameras.main.zoom,
        paintedStateFrames:this.textures.get('painted-states').frameTotal-1,
        generatedTextureCount:this.generatedTextures?.length||0,
        caveArt:this.stage>=0&&this.level?.cave?{
          geometryOverlay:this.caveGeometryOverlay?.visible||false,
          rockLoaded:this.textures.exists(this.cavePainting.texture.key),
           textureKey:this.cavePainting.texture.key,
          imageCount:1,
          sourcePixels:{width:this.cavePainting.width,
            height:this.cavePainting.height},
          painting:{x:this.cavePainting.x,y:this.cavePainting.y,
            displayWidth:this.cavePainting.displayWidth,
            displayHeight:this.cavePainting.displayHeight}
        }:null,
        // Read-only alignment probes for actual painted platform geometry.
        soilTiles:this.soilTiles?.map(({x,width,height,visual})=>({
          x,width,height,displayX:visual.x,displayWidth:visual.displayWidth
        }))||[],
        ledgeBounds:this.ledgeVisuals?.map(({platform,visual})=>({
          x:platform.x*TILE,y:platform.y*TILE,width:platform.length*TILE,
          artX:visual.x,artY:visual.y,artWidth:visual.displayWidth,
          artScale:visual.scaleX
        }))||[],
        players:this.players?.map(p=>({x:p.x,y:p.y,face:p.face,vx:p.vx,vy:p.vy,
          action:p.action,frame:Number(p.visual?.frame?.name),
          texture:p.visual?.texture?.key,grounded:p.grounded,
          jumps:p.jumps,flaps:p.flaps,food:FRUITS[p.food],form:p.form,
          caught:p.caught,health:p.health,sleep:p.sleep,
          checkpoint:p.checkpoint,bubble:p.bubble,mount:p.mount?.kind||null,
          ground:this.groundAt(p.x),inWater:this.inWater(p.x,p.y-8),
          bloomWindow:p.bloomWindow||0,bloomBoosts:p.bloomBoosts||0,
          creatureBounceWindow:p.creatureBounceWindow||0,
          creatureBounceBoosts:p.creatureBounceBoosts||0,
          wallJumps:p.wallJumps||0,
          recalls:p.recalls||0}))||[],
        animals:this.animals?.map(a=>({kind:a.kind,x:a.x,y:a.y,action:a.action,
          frame:Number(a.visual?.frame?.name),
          texture:a.visual?.texture?.key,
          trust:a.trust,
          distracted:a.distraction,respawn:a.respawn,
          captured:a.captured,windup:a.windup,dash:a.dash,
          bubble:a.bubble,bubbleRise:a.bubbleRise||0,
          lureTarget:a.lureTarget??null,
          warningFrame:a.warningArt?.frame?.name??null,
          warningAlpha:a.warningArt?.alpha??null}))||[],
        lures:this.lures?.map(f=>({x:f.x,food:f.food,landed:f.landed,age:f.age}))||[],
        orbs:this.orbs?.length||0,
        powersInFlight:this.powerShots?.map(s=>({kind:s.kind,
          x:s.x,y:s.y,life:s.life,frame:s.visual?.frame?.name}))||[],
        honeyPuddles:this.honeyPuddles?.map(p=>({x:p.x,life:p.life}))||[],
        orbStates:this.orbs?.map(o=>({x:o.x,y:o.y,vx:o.vx,vy:o.vy,
          life:o.life,bounces:o.bounces,
          texture:o.visual?.texture?.key,
          frame:Number(o.visual?.frame?.name)}))||[],
        vents:this.setpieces?.filter(p=>p.kind==='bubbleVent')
          .map(p=>({x:p.x,y:p.y}))||[],
        paused:this.paused,
        simulationSeconds:Number((this.simulationTime/1000).toFixed(3)),
        parallaxLayers:this.parallaxLayers?.length||0,
        foods:this.shared?.foods?{...this.shared.foods}:null,
        picnics:this.shared?.picnics||0,
        relic:this.shared?.relic||false,shards:this.shared?.shards||0,
        progress:{...this.progress,completed:[...this.progress.completed],
          bestShards:{...this.progress.bestShards}}})
    };
  }

  pad(index){return this.input.gamepad?.getPad(index)||null;}

  clearScene(){
    this.cameras.main.stopFollow();
    this.tweens.resumeAll();
    this.tweens.killAll();
    this.children.removeAll(true);
    for(const key of this.generatedTextures||[])this.textures.remove(key);
    this.generatedTextures=[];
    this.soilTiles=[];
    this.ledgeVisuals=[];
    this.cameras.main.setZoom(2);
    this.cameras.main.setScroll(0,0);
    this.cameras.main.setBounds(0,0,VIEW_W,VIEW_H);
    document.getElementById('ww-ui').hidden=true;
    this.menuEl.hidden=true;
    this.players=[];
    this.animals=[];
    this.mounts=[];
    this.items=[];
    this.orbs=[];
    this.powerShots=[];
    this.honeyPuddles=[];
    this.lures=[];
    this.setpieces=[];
    this.parallaxLayers=[];
    this.caveGeometryOverlay=null;
    this.lastInput=[{},{}];
    this.pendingActions=[{},{}];
    this.pendingMs=0;
    this.simulationTime=0;
    this.paused=false;
  }

  addBackground(biome,cave=false){
    this.cameras.main.setBackgroundColor(SKY[biome]);
    // Scroll-factor-zero objects are screen-space in Phaser 4. The game camera
    // is zoomed to 2x, but backgrounds must fill the full 960x540 viewport.
    const back=this.add.image(480,270,'back-'+biome)
      .setScrollFactor(0).setDepth(-100);
    const fit=Math.max(960/back.width,540/back.height);
    back.setScale(fit);
    this.backdrop=back;
    if(!cave){
      const cloudKinds=['kenney-cloud','kenney-cloudAlt'];
      for(let n=0;n<7;n++){
        const x=55+n*145+(n%2)*15;
        this.add.image(x,50+(n%3)*42,cloudKinds[n%2])
          .setScale(.72+(n%3)*.14).setAlpha(.2).setScrollFactor(0).setDepth(-90);
      }
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
    this.menuEl.hidden=false;
    this.updateMenuText();
  }

  changeChapter(direction){
    this.choice=(this.choice+direction+CHAPTERS.length)%CHAPTERS.length;
    this.updateMenuText();
  }

  updateMenuText(){
    const chapter=CHAPTERS[this.choice];
    this.menuWorld.textContent=chapter.name;
    this.menuHint.textContent=chapter.tagline;
    // Chapter selection previews the actual painted biome, without a
    // separate low-resolution menu screenshot or new network assets.
    const biome=['luminous-grotto','skywell-ascent'].includes(chapter.id)?
      'coast':designs[chapter.id].biome;
    this.menuEl.dataset.biome=biome;
    this.backdrop.setTexture('back-'+biome);
    this.backdrop.setScale(Math.max(960/this.backdrop.width,540/this.backdrop.height));
    this.cameras.main.setBackgroundColor(SKY[biome]);
    this.menuCounter.textContent='CHAPTER '+String(this.choice+1).padStart(2,'0')+
      ' / '+String(CHAPTERS.length).padStart(2,'0')+
      (this.progress.completed.includes(chapter.id)?' · COMPLETED':'');
    this.menuMode.textContent=this.twoPlayers?'Two explorers · Local co-op':'One explorer · Solo play';
    document.getElementById('ww-menu-coop').textContent=
      this.twoPlayers?'Switch to solo':'Enable local co-op';
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
    this.chapter=CHAPTERS[index];
    this.progress=playChapter(this.progress,this.chapter.id);
    writeProgress(this.progressStorage,this.progress);
    if(this.chapter.id==='luminous-grotto')this.level=compileCave();
    else if(this.chapter.id==='skywell-ascent')this.level=compileCave(skywellLayout);
    else {
      const original=designs[this.chapter.id];
      const spec=this.chapter.id==='first-forest'?meadowDesign(original):original;
      if(this.chapter.id==='first-forest')validateEncounters(spec);
      this.level=WW.worldCompiler.compile(spec,this.chapter);
    }
    this.worldW=this.level.width*TILE;
    this.worldH=this.level.height*TILE;
    this.shared={relic:false,shards:0,collected:new Set(),checkpoint:null,
      picnics:0,foods:{berry:14,nectar:6,star:6}};
    if(this.level.cave){
      // One authored bitmap provides all the static cave scenery.
      this.cameras.main.setBackgroundColor(0x0b1c2c);
    }else{
      this.addBackground(this.level.biome);
      this.backdrop.setScale(Math.max(1050/this.backdrop.width,
        590/this.backdrop.height));
    }
    if(this.level.cave){
      paintCave(this);
      paintCaveGeometryOverlay(this);
    }else{
      addParallaxAtmosphere(this);
      addMeadowIllustration(this);
      paintTerrain(this);
      paintScenery(this);
      addMeadowAtmosphere(this);
    }
    this.spawnObjects();
    this.spawnMounts();
    this.makePlayer(0);
    if(this.twoPlayers)this.makePlayer(1);
    if(this.level.cave)this.cameras.main.setZoom(
      this.chapter.id==='skywell-ascent'?1.4:1.25);
    this.cameras.main.setBounds(0,0,this.worldW,this.worldH);
    this.cameras.main.startFollow(this.players[0].visual,true,.085,.12);
    // Let players see upcoming climbs and sky rather than half a screen of soil.
    this.cameras.main.setFollowOffset(0,this.level.cave?40:38);
    this.makeHud();
    // The menu already explains the chapter objective. Avoid covering the
    // first moments of play with a long sentence across the entire sky.
    this.flash(this.chapter.id==='first-forest'?
      'The lost light shines beyond the canopy':this.chapter.name,2100);
  }

  groundAt(x){
    if(this.level.cave)return this.level.cave.groundAt(x);
    const position=clamp(x/TILE,0,this.level.width);
    const cell=Math.min(Math.floor(position),this.level.width-1);
    const t=position-cell;
    return (this.level.surface[cell]*(1-t)+this.level.surface[cell+1]*t)*TILE;
  }

  inWater(x,y){
    if(this.level.cave)return caveContainsWater(this.level,x,y);
    return this.level.waterBodies.some(b=>x>=b.start*TILE&&x<=b.end*TILE&&
      y>=b.surface*TILE&&y<=this.groundAt(x)+3);
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
    const visibleAction=entity.gestureTime>0?entity.gesture:action;
    const art=paintedAction(name,visibleAction);
    const textureName=art?'painted-states':'actor-'+name;
    if(entity.textureName!==textureName){
      entity.textureName=textureName;
      entity.visual.setTexture(textureName);
      entity.visual.setOrigin(art?.5:manifest.origin.x/manifest.frameWidth,
        art?1:manifest.origin.y/manifest.frameHeight);
      entity.action='';
    }
    if(entity.action!==visibleAction){
      entity.action=visibleAction;
      entity.animationTime=0;
    }else entity.animationTime+=delta;
    const pose=poseFor(manifest,visibleAction,entity.animationTime,
      entity.vx??(entity.face||1),entity.homeX??entity.id??0);
    const face=entity.face||1;
    entity.visual.setFrame(art?art.frame:pose.frame);
    entity.visual.setPosition(entity.x+pose.dx*face,entity.y+pose.dy);
    entity.visual.setFlipX(face<0);
    entity.visual.setScale(
      (art?art.width/this.stateFrameWidth:manifest.worldScale)*pose.sx,
      (art?art.height/this.stateFrameHeight:manifest.worldScale)*pose.sy);
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
          captured:false,flying,bubbleRise:0,lureTarget:null,knockVX:0,
          bubbleVisual:null,honeyVisual:null,action:'',animationTime:0,halo,
          visual:this.actor(object.kind,x,y).setDepth(12),
          warning:this.add.graphics().setDepth(24),
          warningArt:enemyTellFrame(object.kind)===null?null:
            this.add.image(x,y-15,'effects',enemyTellFrame(object.kind))
              .setScale(.1).setAlpha(0).setDepth(24)});
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
        const icon=this.add.image(x,y,'props',frame)
          .setOrigin(.5,paintedFootOrigin(object.kind))
          .setScale(object.kind===relicKind?.19:.16).setDepth(10);
        // A little authored motion makes collectibles readable in the
        // painterly scenery without adding a row of HUD markers.
        if(object.kind==='starShard'||object.kind===relicKind)
          this.tweens.add({targets:icon,y:y-5,rotation:{from:-.045,to:.045},
            duration:940+(object.x%7)*85,yoyo:true,repeat:-1,
            ease:'Sine.easeInOut'});
        if(object.kind==='snack')this.tweens.add({targets:icon,
          scale:{from:.155,to:.168},duration:1350+(object.x%4)*180,
          yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
        this.items.push({kind:object.kind,x,y,visual:icon,halo,used:false});
      }
    }
    for(const part of this.level.setpieces||[]){
      const x=part.x*TILE,y=(part.y||0)*TILE;
      const base=part.kind==='bounceBloom'?this.groundAt(x):y;
      const art=this.add.image(x,base,'effects',setpieceFrame(part.kind))
        .setOrigin(.5,paintedFootOrigin(part.kind))
        .setScale(.12).setAlpha(.82).setDepth(4);
      if(part.kind==='bubbleVent'){
        // A small illustrated bubble plume exposes the actual lift column.
        // It is scenery only: the semantic vent volume supplies the force.
        this.tweens.add({targets:art,y:base-11,alpha:.46,
          scale:.15,duration:1050,yoyo:true,repeat:-1});
        const plume=this.add.image(x-4,base-25,'effects',EFFECT_FRAMES.bubble)
          .setScale(.075).setAlpha(.4).setDepth(4);
        this.tweens.add({targets:plume,y:base-103,alpha:0,
          scale:.11,duration:1800,repeat:-1,ease:'Sine.easeOut'});
      }
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
    const wingPhase=Math.floor(m.animationTime*10)%4;
    const frame=m.kind==='pegasus'&&action==='flap'?
      [5,6,6,5][wingPhase]:pose.frame;
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

  wingbeatTrail(x,y){
    // The original painted effects atlas provides a softer wind cue than
    // adding more bright procedural dots around the flying character.
    const wind=this.add.image(x,y+5,'effects',4).setOrigin(.5)
      .setScale(.085).setAlpha(.42).setDepth(16);
    this.tweens.add({targets:wind,y:y+21,scale:.16,alpha:0,
      duration:390,ease:'Sine.easeOut',onComplete:()=>wind.destroy()});
  }

  board(p,m){
    if(m.trust<100||m.rider!==null||p.mount)return false;
    p.form=null;p.bubble=false;p.creatureBounceWindow=0;
    m.rider=p.id;p.mount=m;m.perched=false;
    p.visual.shadow?.setVisible(false);
    p.invincible=.45;
    this.flash(m.kind==='pegasus'?'Pegasus — take to the sky!':
      'Unicorn — gallop!',1300);
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
    const m=p.mount;
    const {action,launch}=stepMountedMotion(m,actions,step,{
      width:this.worldW,height:this.worldH,tile:TILE,
      groundAt:x=>this.groundAt(x),
      platformSegments:this.level.platformSegments,
      ceilingAt:this.level.cave?x=>this.level.cave.ceilingAt(x):null
    });
    if(launch==='takeoff')this.sparkle(m.x,m.y-35,0xffecce);
    else if(launch==='wingbeat'){
      this.sparkle(m.x,m.y-39,0xd9efff);
      this.wingbeatTrail(m.x,m.y);
    }
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
      creatureBounceWindow:0,creatureBounceBoosts:0,
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
    // Three restrained, painted glints instead of generic circular confetti.
    const frame=color===0xc5f5ff?EFFECT_FRAMES.splash:
      color===0xffc7e1?EFFECT_FRAMES.petal:EFFECT_FRAMES.spark;
    for(let i=0;i<3;i++){
      const direction=i-1;
      const art=this.add.image(x+direction*5,y-12,'effects',frame)
        .setScale(.047+Math.abs(direction)*.006).setAlpha(.7)
        .setDepth(40).setTint(color);
      this.tweens.add({targets:art,x:x+direction*19,
        y:y-23-Math.abs(direction)*3,alpha:0,scale:.024,
        duration:390+i*75,ease:'Sine.easeOut',
        onComplete:()=>art.destroy()});
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
    const lure={x,y,food,visual:sprite,landed:false,life:24*60,
      startX:p.x+p.face*9,startY:p.y-21,face:p.face,age:0};
    this.lures.push(lure);
    sprite.setPosition(lure.startX,lure.startY);
    this.flash('A '+food+' treat is on its way',800);
  }

  powerEffect(kind,x,y,face=1){
    const gust=kind==='cloudwhisp'||kind==='skyling';
    const frame=powerFrame(kind);
    const art=this.add.image(x,y-17,'effects',frame)
      .setScale(gust?.12:.095).setAlpha(.86).setDepth(39);
    art.setFlipX(face<0);
    this.tweens.add({targets:art,x:x+(gust?face*28:face*5),
      y:y-(gust?22:28),scale:gust?.16:.12,alpha:0,
      duration:gust?450:530,ease:'Sine.easeOut',
      onComplete:()=>art.destroy()});
  }

  castPower(p){
    if(!p.form||p.powers>0)return;
    if(p.form==='springaroo'||p.form==='tideling')return;
    p.powers=.8;
    gesture(p,'alert',.28);
    if(p.form==='glimmermoth'){
      p.hover=HOVER_SECONDS;
      this.powerEffect(p.form,p.x,p.y,p.face);
      return;
    }
    const shot=launchPower(p.form,p.x,p.y,p.face,p.id);
    const visual=this.add.image(shot.x,shot.y,'effects',powerFrame(p.form))
      .setScale(p.form==='prismtail'?.11:.09).setAlpha(.9)
      .setDepth(33).setFlipX(p.face<0);
    this.powerShots.push({...shot,visual});
  }

  addHoneyPuddle(x){
    const visual=this.add.image(x,this.groundAt(x),'effects',
      EFFECT_FRAMES.honeyPuddle)
      .setOrigin(.5,paintedFootOrigin('honeyPuddle')).setScale(.125)
      .setAlpha(.82).setDepth(13);
    this.honeyPuddles.push({x,life:HONEY_PUDDLE_TICKS,visual});
  }

  powerImpact(shot,animal){
    const effect=applyPowerHit(shot,animal);
    if(effect==='bubble'){
      animal.bubbleVisual?.destroy();
      animal.bubbleVisual=this.add.image(animal.x,animal.y-18,
        'effects',EFFECT_FRAMES.bubbleTrap)
        .setScale(.19).setAlpha(.83).setDepth(25);
    }
    if(effect==='honey'){
      animal.honeyVisual?.destroy();
      animal.honeyVisual=this.add.image(animal.x,animal.y,
        'effects',EFFECT_FRAMES.honeyPuddle)
        .setOrigin(.5,paintedFootOrigin('honeyPuddle'))
        .setScale(.125).setAlpha(.9).setDepth(13);
    }
    this.powerEffect(shot.kind,animal.x,animal.y,
      Math.sign(shot.vx));
    gesture(animal,'stunned',.4);
  }

  updatePowers(step){
    for(const puddle of [...this.honeyPuddles]){
      puddle.life-=step;
      for(const animal of this.animals){
        if(honeyPuddleCatches(puddle,animal,x=>this.groundAt(x)))
          animal.stun=Math.max(animal.stun,.55);
      }
      if(puddle.life<=0){
        puddle.visual.destroy();
        this.honeyPuddles.splice(this.honeyPuddles.indexOf(puddle),1);
      }
    }
    for(const shot of [...this.powerShots]){
      const result=stepPower(shot,step,x=>this.groundAt(x),this.worldW);
      shot.visual.setPosition(shot.x,shot.y);
      // Terrain takes precedence at a wall: a creature behind solid rock
      // cannot be stunned by a projectile whose trajectory is blocked.
      const animal=result.ground?null:this.animals.find(a=>powerHitsCreature(
        shot,result.fromX,result.fromY,a));
      if(animal)this.powerImpact(shot,animal);
      if(animal||result.expired){
        if(!animal&&result.ground&&shot.kind==='mossback')
          this.addHoneyPuddle(shot.x);
        shot.visual.destroy();
        this.powerShots.splice(this.powerShots.indexOf(shot),1);
      }
    }
  }

  throwOrb(p){
    gesture(p,'capture',.38);
    const x=p.x+p.face*7,y=p.y-17;
    const visual=this.add.image(x,y,'effects',EFFECT_FRAMES.bubble)
      .setScale(.06).setAlpha(.93).setDepth(32);
    // A *fixed*, slow, predictably bouncing trajectory. No target-aware
    // adjustments, homing, or hidden capture assistance.
    this.orbs.push({x,y,vx:p.face*2.15,vy:-1,
      visual,life:150,bounces:0,owner:p});
  }

  updateAnimals(step,time){
    // Gameplay and rendered bait now advance together. Pausing freezes food
    // mid-flight instead of letting a wall-clock tween land behind the scenes.
    for(const lure of [...this.lures]){
      if(!lure.landed){
        const wasFlying=!lure.landed;
        const pose=advanceTreatFlight(lure,step);
        lure.visual.setPosition(pose.x,pose.y).setRotation(pose.rotation);
        if(wasFlying&&pose.landed)
          this.sparkle(lure.x,lure.y,0xf3dfb8);
      }else{
        lure.life-=step;
        if(lure.life<=0){
          lure.visual.destroy();
          this.lures.splice(this.lures.indexOf(lure),1);
        }
      }
    }
    for(const animal of this.animals){
      const respawn=tickCreatureRespawn(animal,step);
      if(respawn==='waiting')continue;
      if(respawn==='returned'){
        animal.honeyVisual?.destroy();animal.honeyVisual=null;
        animal.visual.setVisible(true);
        animal.warningArt?.setVisible(true);
        animal.visual.shadow?.setVisible(true);
        if(animal.halo)animal.halo.setVisible(true);
      }
      const lure=chooseCreatureLure(animal,this.lures,x=>this.groundAt(x));
      animal.lureTarget=lure?.x??null;
      const {friendly,diff}=stepCreatureMotion(animal,lure,step,time,{
        width:this.worldW,groundAt:x=>this.groundAt(x)
      });
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
      if(animal.bubbleVisual){
        if(animal.bubbleRise>0)
          animal.bubbleVisual.setPosition(animal.x,animal.y-14);
        else {
          animal.bubbleVisual.destroy();
          animal.bubbleVisual=null;
        }
      }
      if(animal.honeyVisual){
        if(animal.stun>0)
          animal.honeyVisual.setPosition(animal.x,this.groundAt(animal.x)+1);
        else {
          animal.honeyVisual.destroy();
          animal.honeyVisual=null;
        }
      }
      const action=creatureAction(animal,lure,diff);
      this.animate(animal,animal.kind,action,step/60);
      animal.visual.setTint(friendly?0xc7ffda:0xffffff);
      // Threats explicitly warn before a short, directional dash.
      // Merely touching a calm animal never causes damage.
      const close=this.players.find(p=>!p.sleep&&!p.bubble&&
        Math.abs(p.x-animal.x)<52&&Math.abs(p.y-animal.y)<28);
      stepCreatureThreat(animal,close,Boolean(lure),step);
      if(animal.halo)animal.halo.setPosition(animal.x,animal.y-17);
      animal.warning.clear();
      animal.warningArt?.setAlpha(0);
      if(animal.windup>0){
        const attack=ATTACKS[animal.kind];
        const progress=1-animal.windup/attack.windup;
        const distance=animal.kind==='prismtail'?46:51;
        const end=animal.x+animal.attackFace*distance;
        const shimmer=.48+.32*Math.sin(progress*Math.PI*4)**2;
        animal.warningArt?.setPosition(end,animal.y-15)
          .setFlipX(animal.attackFace<0).setAlpha(shimmer)
          .setScale(.085+.025*progress);
        if(animal.kind==='prismtail'){
          // A dotted arcing threat conveys "hop over the approach" instead
          // of looking like Emberkit's straight, low ground rush.
          animal.warning.lineStyle(2,0xe8c2ff,shimmer);
          for(let i=0;i<9;i++){
            const t=i/9,n=(i+1)/9;
            const x=animal.x+animal.attackFace*distance*t;
            const y=animal.y-7-27*Math.sin(Math.PI*t);
            animal.warning.lineBetween(x,y,
              animal.x+animal.attackFace*distance*n,
              animal.y-7-27*Math.sin(Math.PI*n));
          }
          // The endpoint is painted bubble artwork; retain only the honest
          // trajectory as gameplay information.
        }else{
          animal.warning.lineStyle(1.5,0xffc785,shimmer*.72);
          animal.warning.lineBetween(animal.x,animal.y-7,end,animal.y-7);
          // A painted spark marks the charged rush; avoid a giant
          // translucent vector rectangle over the landscape.
        }
      }
      for(const p of this.players){
        if(p.sleep||p.bubble||Math.abs(p.x-animal.x)>19||
          Math.abs(p.y-animal.y)>24)continue;
        if(p.vy>1&&p.y<animal.y-6){
          animal.stun=2.1;animal.windup=0;animal.dash=0;
          gesture(animal,'hurt',.32);
          stompCreature(p);
          this.sparkle(animal.x,animal.y);
          this.flash('Creature bounce! Tap Jump again for a bigger leap',850);
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
    for(const orb of [...this.orbs]){
      const fromX=orb.x,fromY=orb.y,oldBounces=orb.bounces;
      const next=orbStep(orb,this.groundAt(orb.x+orb.vx*step),step);
      Object.assign(orb,next);
      orb.visual.setPosition(orb.x,orb.y)
        .setScale(.06*(.96+.04*Math.cos(this.simulationTime*.006)));
      if(orb.bounces>oldBounces)
        this.sparkle(orb.x,orb.y+5,0xc5f5ff);
      const animal=this.animals.find(a=>!a.captured&&a.distraction>0&&
        orbHitsAnimal(fromX,fromY,orb.x,orb.y,a.x,a.y));
      if(animal){
        animal.captured=true;animal.respawn=RESPAWN_SECONDS;
        animal.bubbleVisual?.destroy();animal.bubbleVisual=null;
        animal.honeyVisual?.destroy();animal.honeyVisual=null;
        animal.visual.setVisible(false);
        animal.visual.shadow?.setVisible(false);
        animal.warning.clear();
        animal.warningArt?.setVisible(false);
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
    p.recalls++;p.bloomWindow=0;p.creatureBounceWindow=0;
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
    const {action,events}=stepPlayerMotion(p,actions,step,{
      width:this.worldW,height:this.worldH,tile:TILE,
      groundAt:x=>this.groundAt(x),
      ceilingAt:this.level.cave?x=>this.level.cave.ceilingAt(x):null,
      inWater:(x,y)=>this.inWater(x,y),
      waterBodies:this.level.waterBodies,
      thermalVolumes:this.level.thermalVolumes,
      platformSegments:this.level.platformSegments,
      climbWalls:this.level.climbWalls
    });
    for(const event of events){
      if(event==='breach')this.powerEffect('tideling',p.x,p.y,p.face);
      else if(event==='bloomBoost'){
        gesture(p,'jump',.22);
        this.sparkle(p.x,p.y,0xffc6e8);
        this.flash('Perfect spring! Extra-high jump',1050);
      }else if(event==='creatureBounceBoost'){
        gesture(p,'jump',.3);
        this.sparkle(p.x,p.y-6,0xffecb5);
        this.flash('Super spring!',850);
      }else if(event==='doubleJump'){
        gesture(p,'jump',.18);this.sparkle(p.x,p.y);
      }else if(event==='wallJump'){
        gesture(p,'jump',.23);this.sparkle(p.x,p.y-13,0xffdca8);
      }else if(event==='flap'){
        gesture(p,'flap',.22);this.sparkle(p.x,p.y,0xd3f6ff);
      }else if(event==='land'){
        gesture(p,'land',.15);
      }else if(event==='hardLand')this.sparkle(p.x,p.y,0xe4f4c9);
      else if(event==='recall')this.recall(p);
    }
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
        this.progress=completeChapter(this.progress,this.chapter.id,this.shared.shards);
        writeProgress(this.progressStorage,this.progress);
        this.flash('Chapter complete! The next light awakens.',1600);
        const next=this.stage+1;
        if(next<CHAPTERS.length)this.startStage(next);
        else this.showMenu();
        return true;
      }
    }
    for(const piece of this.setpieces){
      piece.time=Math.max(0,piece.time-step/60);
      if(piece.kind==='bubbleVent'){
        if(ventContains(p,piece,this.inWater(p.x,p.y-8)))
          applyVentLift(p,step);
        continue;
      }
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

    }
  }

  update(_time,delta){
    const time=this.time.now;
    const actions=[0,1].map(i=>readActions(this.keyboard[i],this.pad(i),this.lastInput[i]));
    this.lastInput=actions;
    if(this.stage<0){
      if(actions[0].leftPressed||actions[1].leftPressed){
        this.changeChapter(-1);
      }else if(actions[0].rightPressed||actions[1].rightPressed){
        this.changeChapter(1);
      }
      if(actions.some(a=>a.jumpPressed||a.foodPressed)){
        this.startStage(this.choice);
        // Preserve the start button's held state across the scene transition.
        // A held A/Space must not become a *new* jump on the first game frame.
        this.lastInput=actions;
      }
      return;
    }
    if(!this.level.cave)moveParallaxAtmosphere(this);
    if(actions.some(a=>a.pausePressed)){
      this.paused=!this.paused;
      if(this.paused)this.tweens.pauseAll();
      else this.tweens.resumeAll();
      this.pausedOverlay.setVisible(this.paused);
      this.pauseMessage.setVisible(this.paused);
    }
    if(this.paused){
      this.pendingMs=0;this.pendingActions=[{},{}];
      return;
    }
    if(this.pad(1)&&this.players.length===1){
      this.twoPlayers=true;this.makePlayer(1);
    }
    // Renderer frames may be shorter than a physics tick. Buffer input edges
    // until their first simulation step, then consume them exactly once.
    const queued=actions.map((a,i)=>queueInputEdges(this.pendingActions[i],a));
    const {ticks,remaining}=simulationTicks(this.pendingMs,delta);
    this.pendingMs=remaining;
    if(ticks===0){
      this.pendingActions=queued;
      return;
    }
    this.pendingActions=[{},{}];
    for(let tick=0;tick<ticks;tick++){
      const tickActions=tick===0?queued:queued.map(withoutInputEdges);
      const step=1;
      const tickTime=this.simulationTime+=TICK_MS;
      const previousStage=this.stage;
      for(const item of this.items){
        if(item.kind==='snack'&&item.used){
          item.respawn-=step/60;
          if(item.respawn<=0){
            item.used=false;item.visual.setVisible(true);
          }
        }
      }
      for(const p of [...this.players])
        this.movePlayer(p,tickActions[p.id],step);
      this.updateMounts(step,tickTime);
      this.updateAnimals(step,tickTime);
      this.updatePowers(step);
      for(const p of [...this.players]){
        if(this.touchWorld(p,step))return;
      }
      if(this.stage!==previousStage)return;
    }
    if(this.stage<0)return;
    const lead=this.players[0];
    this.hud.setText('♥ '+lead.health+'    ✦ '+this.shared.shards+
      '    '+(this.chapter.id==='skywell-ascent'?
        (this.shared.relic?'LANTERN FOUND':'FIND THE LANTERN'):
        this.chapter.id==='luminous-grotto'?
        (this.shared.relic?'PEARL FOUND':'FIND THE PEARL'):
        (this.shared.relic?'LIGHT RESTORED':'FIND THE LIGHT'))+
      (lead.mount?'    '+(lead.mount.kind==='pegasus'?'PEGASUS':'UNICORN'):
       lead.form?'    '+FORMsName(lead.form):'')+
      (this.twoPlayers?'    P2 ♥ '+this.players[1]?.health:''));
    const first=this.animals.find(a=>a.kind==='springaroo'&&!a.captured);
    const teaching=this.chapter.id==='first-forest'&&first;
    this.help.setText(this.chapter.id==='skywell-ascent'&&
      !lead.form&&lead.x<95*16?
        'Skywell · Jump beside a glowing wall, then jump again to climb':
      lead.creatureBounceWindow>0?
      'Tap Jump now for a super spring!':lead.mount?
      (lead.mount.kind==='pegasus'?
        'Pegasus · Tap Jump to flap · Down to descend · T dismount':
        'Unicorn · Run fast · Jump to leap · T dismount'):
      this.mounts.some(m=>m.trust>=100&&m.rider===null&&
        Math.abs(m.x-lead.x)<100)?
        'Friendly mount nearby · T / Y to ride':
      lead.form?FORM_HINTS[lead.form]:
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
