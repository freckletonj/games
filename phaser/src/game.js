import Phaser from 'phaser';
import './bootstrap.js';
import {campaign,compileChapter} from './campaign.js';
import {characters,mounts,riders,bounceBloom,captureOrb,fainted,floaters,jungleMonkey,jungleRope,backgrounds,sheets,silhouettes,ventBubbles,windColumn} from './assets.js';
import {EFFECT_FRAMES,FAINTED_FRAME,FLOAT_FRAME,paintedAction,powerFrame,enemyTellFrame,
  paintedFootOrigin} from './action-art.js';
import {MOUNTS,LOCATIONS,seatFor,stepMountedMotion,stepWildMount,landsOnMount} from './mounts.js';
import {captureBurst,drawCaptureBurst} from './capture-effects.js';
import {bindings,controlGuide,readActions} from './input.js';
import {screenWake} from './screen-wake.js';
import {makePartyTextures,friendshipArt,drawFriendship,cloudArt,drawCloud} from './party-effects.js';
import {CLOUD_TICKS,CLOUD_COOLDOWN,CLOUD_RANGE,steerCloud,fitAssistToView,
  closestCloudTarget} from './cloud-assist.js';
import {platformTopAt,orbStep,orbHitsAnimal} from './physics.js';
import {triggerBloom,bloomFrame,BLOOM_COOLDOWN,BLOOM_ART} from './springboard.js';
import {makeVentBubbles,animateVentBubbles,VENT_BUBBLE_FRAME,
  makeThermals,makeWindSprite,animateWind,WIND_FRAME} from './traversal-art.js';
import {stepPlayerMotion} from './player-motion.js';
import {driftBubble,partyFraming,stragglerReady} from './coop.js';
import {JUMP_EVENTS,PICKUPS,PICKUP_ART,PICKUP_FRAME,takePickup} from './pickups.js';
import pickupAtlas from '../assets/generated/playful-pickups.webp';
import {createRopes,ropePoint,stepRopes} from './rope-swing.js';
import {createMonkeys,stepMonkeys,monkeyFrame} from './monkey-motion.js';
import {TICK_MS,simulationTicks,queueInputEdges,withoutInputEdges} from './fixed-clock.js';
import {poseFor,gesture} from './animation.js';
import {feedTrust,RESPAWN_SECONDS,DISTRACTION_SECONDS} from './creatures.js';
import {advanceTreatFlight,treatLanding} from './treat-motion.js';
import {chooseCreatureLure,HOVER_SECONDS,ventContains,
  applyVentLift} from './gameplay-rules.js';
import {launchPower,stepPower,powerHitsCreature,applyPowerHit,
  honeyPuddleCatches,HONEY_PUDDLE_TICKS,stepPlayerTrap} from './power-projectiles.js';
import {ATTACKS,tickCreatureRespawn,stepCreatureMotion,creatureAction,stepCreatureThreat,
  stompCreature} from './creature-motion.js';
import {caveContainsWater} from './cave-layout.js';
import {makeGeometryOverlay,paintScene,paintGrayboxGround,sceneTextures} from './painted-scene.js';
import {deckTopAt,platformPosition,stepPlatforms} from './moving-platforms.js';
import {machinePlatforms,stepMachines} from './machines.js';
import {createPuzzleObjects,pushPuzzleObject,blockPuzzleX,puzzleTop,punchWall,
  stepPuzzleObjects,puzzleHint,cavernHint} from './puzzle-objects.js';
import sealAtlas from '../assets/generated/stonewake-hollow/seal-fragments.webp';
import sealPlan from '../levels/stonewake-seal.json' with {type:'json'};
import {bodyHitsRock,rockContains,sweepRockBody} from './cave-solids.js';
import {surfaceGroundAt} from './surface-geometry.js';
import {createTempleWorld,stepTempleWorld,templeInWater,templeBasinAt,
  templeBlockHorizontal,templeCurrent,snapshotTempleWorld,
  restoreTempleWorld} from './temple-world.js';
import {createTempleScene,drawTempleScene} from './temple-scene.js';
import {createPalaceWorld,stepPalaceWorld,restorePalaceWorld,
  palaceBlockHorizontal,palaceSteepBanks} from './palace-world.js';
import {createPalaceScene,drawPalaceScene} from './palace-scene.js';
import {createRaceWorld,stepRaceWorld,raceCameraFrame,raceHazardContact} from './race-world.js';
import {createRaceScene,drawRaceScene} from './race-scene.js';
import {readProgress,playChapter,completeChapter,writeProgress,browserProgressStorage} from './progress.js';

// Every chapter, including the three unpainted geometry-first levels, now
// lives in the normal campaign. No filename, fragment or preview flag is needed.
const CHAPTERS=campaign(WW.chapters);
const APPROVED_SCENE_ART=__SCENE_ASSETS__;
const TILE=16;
const VIEW_W=480;
const VIEW_H=270;
const SKY={meadow:0xa4d9c2,coast:0xa8dbe0,summit:0x98a4ce};
const FORMS={springaroo:'Double jump',tideling:'Swim and dive',skyling:'Four wingbeats',
  mossback:'Honey',prismtail:'Bubbles',glimmermoth:'Four flaps and hover',cloudwhisp:'Four flaps and gust',emberkit:'Sprint and high jump',
  gravelback:'Push boulders',flintfist:'Stone punch'};
const EXPLORERS={hero:'Original',princess:'Princess',steampunk:'Steampunk'};
const EXPLORER_IDS=Object.keys(EXPLORERS);
const LEVEL_COLUMNS=3;
const STILL={left:false,right:false,up:false,jump:false,down:false};
const FRUITS=['berry','nectar','star'];
const FLORA_ATLAS_SCALE=2;
const FAVORITES={springaroo:'berry',tideling:'nectar',skyling:'star',mossback:'berry',
  prismtail:'berry',glimmermoth:'star',cloudwhisp:'nectar',emberkit:'berry',gravelback:'berry',flintfist:'berry'};
const FORM_HINTS={
  springaroo:'Tap Jump twice to leap higher',
  tideling:'Hold Jump to swim · Down to dive',
  skyling:'Tap Jump to flap · F / B to cast a gust',
  mossback:'F / B to throw sticky honey',
  prismtail:'F / B to float creatures in bubbles',
  glimmermoth:'Tap Jump to flap · F / B to hover',
  cloudwhisp:'Tap Jump to flap · F / B to cast a gust',
  emberkit:'Run fast · Jump to leap higher',
  gravelback:'Walk into a boulder to push it',
  flintfist:'F / B · punch cracked stone'
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
    this.load.spritesheet('riders',riders.url,{
      frameWidth:riders.manifest.frameWidth,frameHeight:riders.manifest.frameHeight
    });
    this.load.image('capture-orb',captureOrb);
    this.load.image('jungle-rope',jungleRope);
    this.load.spritesheet('playful-pickups',pickupAtlas,{
      frameWidth:PICKUP_FRAME,frameHeight:PICKUP_FRAME
    });
    this.load.spritesheet('jungle-monkey',jungleMonkey,{frameWidth:192,frameHeight:192});
    this.load.spritesheet('wind-column',windColumn,{frameWidth:WIND_FRAME.width,frameHeight:WIND_FRAME.height});
    this.load.spritesheet('vent-bubbles',ventBubbles,{frameWidth:VENT_BUBBLE_FRAME,frameHeight:VENT_BUBBLE_FRAME});
    this.load.spritesheet('bounce-bloom',bounceBloom,{frameWidth:BLOOM_ART.width,frameHeight:BLOOM_ART.height});
    this.load.spritesheet('fainted',fainted,{
      frameWidth:FAINTED_FRAME.width,frameHeight:FAINTED_FRAME.height
    });
    this.load.spritesheet('floaters',floaters,{frameWidth:FLOAT_FRAME.width,frameHeight:FLOAT_FRAME.height});
    for(const [name,url] of Object.entries(backgrounds))this.load.image('back-'+name,url);
    for(const [name,url] of Object.entries(sheets)){
      const scale=name==='flora'?FLORA_ATLAS_SCALE:1;
      this.load.spritesheet(name,url,{frameWidth:180*scale,frameHeight:270*scale});
    }
    for(const [name,url] of Object.entries(silhouettes))this.load.image('kenney-'+name,url);
    this.load.spritesheet('seal-fragments',sealAtlas,{
      frameWidth:sealPlan.size[0]*2,frameHeight:sealPlan.size[1]*2
    });
    for(const [chapter,art] of Object.entries(APPROVED_SCENE_ART)){
      for(const {key,url} of sceneTextures(chapter,art))this.load.image(key,url);
      for(const [id,url] of Object.entries(art.platforms??{}))
        this.load.image('deck-'+chapter+'-'+id,url);
    }
  }

  create(){
    this.keyboard=bindings.map(layout=>Object.fromEntries(Object.entries(layout)
      .map(([action,codes])=>[action,codes.map(code=>this.input.keyboard.addKey(code))])));
    this.lastInput=[{},{}];
    this.keyboardUsed=[false,false];
    this.setScreenWake=screenWake();
    this.assistOption=document.getElementById('ww-assist');
    this.progressStorage=browserProgressStorage();
    this.progress=readProgress(this.progressStorage,CHAPTERS.map(chapter=>chapter.id));
    const requested=location.hash.slice(1);
    const requestedChapter=CHAPTERS.findIndex(chapter=>chapter.id===requested);
    this.choice=requestedChapter>=0?requestedChapter:
      Math.max(0,CHAPTERS.findIndex(chapter=>
        chapter.id===this.progress.lastPlayed));
    this.explorerChoices=[0,0];
    this.confirmedExplorers=[null,null];
    this.menuEl=document.getElementById('ww-menu');
    this.characterMenu=document.getElementById('ww-character-select');
    this.levelMenu=document.getElementById('ww-level-select');
    this.menuHint=document.getElementById('ww-menu-description');
    this.continueButton=document.getElementById('ww-menu-continue');
    this.continueButton.onclick=()=>this.showLevelSelection();
    document.getElementById('ww-menu-back').onclick=()=>this.showCharacterSelection();
    document.getElementById('ww-menu-play').onclick=()=>this.startStage(this.choice);
    this.makeSelectionCards();
    this.stage=-1;
    this.makeBerryTexture();
    this.makeKeyTexture();
    makePartyTextures(this.textures);
    // Revive has the same binding as the legacy game. H returns to the menu.
    this.input.keyboard.on('keydown-H',()=>{if(this.stage>=0)this.showMenu();});
    this.input.keyboard.on('keydown-V',()=>{
      if(this.geometryOverlay)this.geometryOverlay.setVisible(!this.geometryOverlay.visible);
    });
    this.showMenu();
    document.getElementById('ww-startup')?.setAttribute('hidden','');
    // The smoke test reads state but never mutates gameplay state directly.
    window.__wonderwoodPhaser={
      engine:'Phaser 4',
      snapshot:()=>({stage:this.stage,choice:this.choice,menu:this.menuScreen,chapter:this.chapter?.id||null,
        mounts:this.mounts?.map(m=>({kind:m.kind,x:m.x,y:m.y,vx:m.vx,vy:m.vy,
          trust:m.trust,rider:m.rider,grounded:m.grounded,flaps:m.flaps,
          action:m.action,frame:m.visual?.frame?.name}))||[],
        animalCount:this.animals?.length||0,
        ropes:this.ropes.map(({id,angle,omega})=>({id,angle,omega})),
        monkeys:this.monkeys.map(({id,x,y,state,perchedOn,visual})=>
          ({id,x,y,state,perchedOn,frame:Number(visual.frame.name)})),
        platformCount:this.level?.platformSegments?.length||0,
        climbWallCount:this.level?.climbWalls?.length||0,
        worldWidth:this.worldW||0,
        cameraZoom:this.cameras.main.zoom,
        cameraView:{x:this.cameras.main.worldView.x,y:this.cameras.main.worldView.y,
          width:this.cameras.main.worldView.width,height:this.cameras.main.worldView.height},
        pickups:this.items.filter(item=>PICKUPS[item.kind])
          .map(({kind,x,y,used})=>({kind,x,y,used})),
        sceneArt:this.stage>=0?{
          geometryOverlay:this.geometryOverlay.visible,
          layers:this.sceneArt.map(layer=>({
            textureKey:layer.texture.key,origin:[layer.x,layer.y],
            sourcePixels:[layer.width,layer.height],
            worldPixels:[layer.displayWidth,layer.displayHeight],
            scrollFactor:layer.scrollFactorX
          }))
        }:null,
        movingPlatforms:this.walkableMachines?.map(({id,position})=>({id,position}))||[],
        race:this.raceWorld?{...this.raceWorld.state,
          hazards:this.raceWorld.hazards.map(h=>({...h}))}:null,
        palace:this.palaceWorld?{tick:this.palaceWorld.state.tick,
          mirrors:{...this.palaceWorld.state.mirrors},
          shutters:{...this.palaceWorld.state.shutters},
          charged:{...this.palaceWorld.state.charged},
          chargeTicks:{...this.palaceWorld.state.chargeTicks},
          gates:{...this.palaceWorld.state.gates},
          lit:[...(this.palaceWorld.state.light?.lit??[])],
          platforms:{...this.palaceWorld.state.platforms}}:null,
        temple:this.templeWorld?{tick:this.templeWorld.state.tick,
          surfaces:{...this.templeWorld.state.surfaces},
          modes:{...this.templeWorld.state.modes},
          gates:{...this.templeWorld.state.gates},
          rafts:this.templeWorld.decks.map(d=>({id:d.id,position:d.position})),
          crates:this.templeWorld.crates.map(c=>({id:c.id,x:c.x,y:c.y}))}:null,
        puzzleObjects:this.puzzleObjects?.map(({id,x,bottom,state,angle,speed,hits})=>({id,x,bottom,state,angle,speed,hits}))||[],
        players:this.players?.map(p=>({x:p.x,y:p.y,face:p.face,vx:p.vx,vy:p.vy,
          floating:p.floating??false,action:p.action,frame:Number(p.visual?.frame?.name),
          texture:p.visual?.texture?.key,grounded:p.grounded,explorer:p.explorer,trap:p.trap?.kind??null,
          rope:p.rope?.id??null,ropeGrip:p.rope?p.ropeGrip:null,
          onPlatform:p.onPlatform,jumps:p.jumps,flaps:p.flaps,food:FRUITS[p.food],form:p.form,
          caught:p.caught,health:p.health,sleep:p.sleep,
          checkpoint:p.checkpoint,bubble:Boolean(p.bubble),mount:p.mount?.kind||null,
          assist:Boolean(p.assist),clouded:p.clouded?.ticks??0,
          bubbleFrame:p.bubble?.visual.frame.name??null,dandelion:p.dandelion,iceWater:p.iceWater,
          ground:this.groundAt(p.x),inWater:this.inWater(p.x,p.y-8),
          bloomWindow:p.bloomWindow||0,bloomBoosts:p.bloomBoosts||0,
          creatureBounceWindow:p.creatureBounceWindow||0,
          creatureBounceBoosts:p.creatureBounceBoosts||0,
          wallJumps:p.wallJumps||0,
          recalls:p.recalls||0}))||[],
        animals:this.animals?.map(a=>({kind:a.kind,x:a.x,y:a.y,action:a.action,
          frame:Number(a.visual?.frame?.name),
          texture:a.visual?.texture?.key,
          trust:a.trust,clouded:a.clouded?.ticks??0,
          distracted:a.distraction,respawn:a.respawn,
          captured:a.captured,windup:a.windup,dash:a.dash,
          bubble:a.bubble,bubbleRise:a.bubbleRise||0,
          lureTarget:a.lureTarget??null,
          warningFrame:a.warningArt?.frame?.name??null,
          warningAlpha:a.warningArt?.alpha??null}))||[],
        lures:this.lures?.map(f=>({x:f.x,y:f.y,food:f.food,landed:f.landed,age:f.age}))||[],
        orbs:this.orbs?.length||0,
        captureBursts:this.captureBursts?.map(({age})=>age)||[],
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
        gateEntry:this.gateEntry?.ticks??null,
        cloudCooldown:this.cloudCooldown,cloudShot:Boolean(this.cloudShot),
        simulationSeconds:Number((this.simulationTime/1000).toFixed(3)),
        foods:this.shared?.foods?{...this.shared.foods}:null,
        picnics:this.shared?.picnics||0,
        relic:this.shared?.relic||false,shards:this.shared?.shards||0,
        progress:{...this.progress,completed:[...this.progress.completed],
          bestShards:{...this.progress.bestShards}}})
    };
  }

  clearScene(){
    this.cameras.main.stopFollow();
    this.tweens.resumeAll();
    this.tweens.killAll();
    this.children.removeAll(true);
    this.cameras.main.setZoom(2);
    this.cameras.main.setScroll(0,0);
    this.cameras.main.setBounds(0,0,VIEW_W,VIEW_H);
    document.getElementById('ww-ui').hidden=true;
    this.menuEl.hidden=true;
    this.players=[];
    this.animals=[];
    this.mounts=[];
    this.ropes=[];
    this.ropeLines=null;
    this.monkeys=[];
    this.items=[];
    this.orbs=[];
    this.captureBursts=[];
    this.powerShots=[];
    this.honeyPuddles=[];
    this.lures=[];
    this.cloudCooldown=0;
    this.cloudShot=null;
    this.cloudedNPCs=[];
    this.gateEntry=null;
    this.setpieces=[];
    this.geometryOverlay=null;
    this.movingPlatforms=[];
    this.machines=[];
    this.puzzleObjects=[];
    this.walkableMachines=[];
    this.templeWorld=null;
    this.palaceWorld=null;
    this.palaceScene=null;
    this.palaceCheckpoint=null;
    this.raceWorld=null;
    this.raceScene=null;
    this.raceRecalling=false;
    this.templeArt=null;
    this.templeCheckpoint=null;
    this.templeRecalling=false;
    this.deckOverlay=null;
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
    const scale=FLORA_ATLAS_SCALE;
    ctx.drawImage(source,76*scale,143*scale,43*scale,45*scale,4,4,43,45);
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

  makeKeyTexture(){
    const texture=this.textures.createCanvas('gate-key',64,64);
    const ctx=texture.context;
    ctx.translate(32,32);
    ctx.rotate(-Math.PI/5);
    ctx.lineJoin='round';
    ctx.beginPath();
    ctx.moveTo(-8,-4);
    ctx.lineTo(25,-4);
    ctx.lineTo(25,9);
    ctx.lineTo(18,9);
    ctx.lineTo(18,3);
    ctx.lineTo(13,3);
    ctx.lineTo(13,7);
    ctx.lineTo(6,7);
    ctx.lineTo(6,3);
    ctx.lineTo(-8,3);
    ctx.closePath();
    ctx.fillStyle='#f8c461';ctx.strokeStyle='#513013';ctx.lineWidth=3;
    ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(-15,0,9,0,Math.PI*2);
    ctx.strokeStyle='#513013';ctx.lineWidth=9;ctx.stroke();
    ctx.strokeStyle='#ffd583';ctx.lineWidth=5;ctx.stroke();
    ctx.beginPath();ctx.moveTo(-4,-2);ctx.lineTo(23,-2);
    ctx.strokeStyle='#fff3bf';ctx.lineWidth=2;ctx.stroke();
    texture.refresh();
  }

  makeSelectionCards(){
    const party=document.getElementById('ww-party');
    this.explorerButtons=this.explorerChoices.map((_,id)=>{
      const group=document.createElement('fieldset');
      const legend=document.createElement('legend');
      group.append(legend);
      const cards=document.createElement('div');
      cards.className='ww-explorers';
      const buttons=EXPLORER_IDS.map((name,index)=>{
        const button=document.createElement('button');
        button.type='button';
        const atlas=this.textures.get('actor-'+name);
        const frame=atlas.get(0);
        const portrait=document.createElement('canvas');
        portrait.width=frame.cutWidth;
        portrait.height=frame.cutHeight;
        portrait.setAttribute('aria-hidden','true');
        portrait.getContext('2d').drawImage(atlas.getSourceImage(),frame.cutX,frame.cutY,
          frame.cutWidth,frame.cutHeight,0,0,portrait.width,portrait.height);
        button.append(portrait,EXPLORERS[name]);
        button.onclick=()=>{
          this.explorerChoices[id]=index;
          this.confirmedExplorers[id]=this.confirmedExplorers[id]===name?null:name;
          this.updateExplorerCards();
        };
        cards.append(button);
        return button;
      });
      group.append(cards);
      party.append(group);
      return {legend,buttons};
    });
    const grid=document.getElementById('ww-level-grid');
    this.levelButtons=CHAPTERS.map((chapter,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.append(chapter.name,document.createElement('small'));
      button.onclick=()=>{
        this.choice=index;
        this.updateLevelCards();
      };
      grid.append(button);
      return button;
    });
  }

  showMenu(){
    this.setScreenWake(false);
    this.clearScene();
    this.stage=-1;
    this.chapter=null;
    this.confirmedExplorers=[null,null];
    this.addBackground(CHAPTERS[0].biome);
    this.menuEl.hidden=false;
    this.showCharacterSelection();
  }

  showCharacterSelection(){
    this.menuScreen='characters';
    this.characterMenu.hidden=false;
    this.levelMenu.hidden=true;
    this.previewBiome(CHAPTERS[0].biome);
    this.updateExplorerCards();
  }

  updateExplorerCards(){
    this.explorerButtons.forEach(({legend,buttons},id)=>{
      const confirmed=this.confirmedExplorers[id];
      legend.textContent='Player '+(id+1)+(confirmed?' · Ready':id===1?' · Optional':'');
      buttons.forEach((button,index)=>{
        button.dataset.current=this.explorerChoices[id]===index;
        button.setAttribute('aria-pressed',confirmed===EXPLORER_IDS[index]);
      });
    });
    this.continueButton.disabled=!this.confirmedExplorers.some(Boolean);
  }

  showLevelSelection(){
    this.menuScreen='levels';
    this.characterMenu.hidden=true;
    this.levelMenu.hidden=false;
    this.updateLevelCards();
  }

  updateLevelCards(){
    const chapter=CHAPTERS[this.choice];
    this.menuHint.textContent=chapter.tagline;
    this.previewBiome(chapter.biome);
    this.levelButtons.forEach((button,index)=>{
      button.dataset.current=index===this.choice;
      button.setAttribute('aria-pressed',index===this.choice);
      button.lastElementChild.textContent=this.progress.completed.includes(CHAPTERS[index].id)?
        'Completed':'';
    });
  }

  previewBiome(biome){
    this.backdrop.setTexture('back-'+biome);
    this.backdrop.setScale(Math.max(960/this.backdrop.width,540/this.backdrop.height));
    this.cameras.main.setBackgroundColor(SKY[biome]);
  }

  updateMenu(actions){
    if(this.menuScreen==='characters'){
      if(actions.some(a=>a.cloudPressed))this.assistOption.checked=!this.assistOption.checked;
      const alreadyReady=[...this.confirmedExplorers];
      const confirms=actions.map(a=>a.jumpPressed||a.foodPressed);
      const newPlayer=confirms.some((pressed,id)=>pressed&&!alreadyReady[id]);
      actions.forEach((a,id)=>{
        const direction=Number(a.rightPressed)-Number(a.leftPressed);
        if(direction){
          this.explorerChoices[id]=(this.explorerChoices[id]+direction+EXPLORER_IDS.length)%EXPLORER_IDS.length;
          this.confirmedExplorers[id]=null;
        }
        if(confirms[id])this.confirmedExplorers[id]=EXPLORER_IDS[this.explorerChoices[id]];
      });
      if(!newPlayer&&confirms.some((pressed,id)=>
        pressed&&alreadyReady[id]===this.confirmedExplorers[id]))this.showLevelSelection();
      else this.updateExplorerCards();
      return;
    }
    const horizontal=Number(actions.some(a=>a.rightPressed))-Number(actions.some(a=>a.leftPressed));
    const vertical=Number(actions.some(a=>a.downPressed))-Number(actions.some(a=>a.upPressed));
    const next=this.choice+horizontal+LEVEL_COLUMNS*vertical;
    if(next>=0&&next<CHAPTERS.length&&next!==this.choice){
      this.choice=next;
      this.updateLevelCards();
    }
    if(actions.some(a=>a.jumpPressed||a.foodPressed)){
      this.startStage(this.choice);
      this.lastInput=actions;
    }else if(actions.some(a=>a.pausePressed))this.showCharacterSelection();
  }

  startStage(index){
    const cooldown=this.stage>=0?this.cloudCooldown:0;
    this.clearScene();
    this.cloudCooldown=cooldown;
    this.setScreenWake(true);
    this.choice=index;
    this.stage=index;
    this.menuScreen=null;
    this.chapter=CHAPTERS[index];
    this.progress=playChapter(this.progress,this.chapter.id);
    writeProgress(this.progressStorage,this.progress);
    this.level=compileChapter(this.chapter,WW.worldCompiler);
    this.templeWorld=this.level.templeSpec?
      createTempleWorld(this.level.templeSpec):null;
    this.palaceWorld=this.level.palaceSpec?
      createPalaceWorld(this.level.palaceSpec,this.level):null;
    if(this.palaceWorld)this.palaceCheckpoint=this.palaceWorld.state;
    this.raceWorld=this.level.raceSpec?createRaceWorld(this.level.raceSpec):null;
    if(this.templeWorld){
      this.level.waterBodies=this.templeWorld.waterBodies;
      this.templeCheckpoint=snapshotTempleWorld(this.templeWorld);
    }
    this.worldW=this.level.width*TILE;
    this.worldH=this.level.height*TILE;
    this.shared={relic:!this.level.objects.some(o=>o.kind===this.chapter.key),shards:0,collected:new Set(),checkpoint:null,
      picnics:0,foods:{berry:14,nectar:6,star:6}};
    this.cameras.main.setBackgroundColor(this.level.cave?0x0b1c2c:SKY[this.level.biome]);
    this.isCavern=this.chapter.id==='cavern-ascent';
    const approved=APPROVED_SCENE_ART[this.chapter.id];
    if(!approved){
      if(!this.templeWorld&&!this.palaceWorld&&!this.raceWorld)
        throw Error('Missing approved art for '+this.chapter.id);
      this.sceneArt=[];
      if(!this.templeWorld)paintGrayboxGround(this);
    }else this.sceneArt=paintScene(this,approved);
    this.geometryOverlay=makeGeometryOverlay(this);
    this.movingPlatforms=(this.level.movingPlatforms??[]).map(platform=>{
      const position=platformPosition(platform,0);
      const visual=this.add.image(...position,'deck-'+this.chapter.id+'-'+platform.id)
        .setOrigin(.5,0).setDisplaySize(...platform.size).setDepth(-19);
      return {...platform,position,previous:position,visual};
    });
    this.machines=machinePlatforms(this.level.machines??[]);
    for(const machine of this.machines){
      const [x,y]=machine.home,[w,h]=machine.size;
      const gear=machine.kind==='gear';
      machine.visual=this.add.image(x,y,'deck-'+this.chapter.id+'-'+machine.id)
        .setOrigin(.5,gear ? .5 : 0).setDisplaySize(w,h).setDepth(-19);
      if(machine.kind==='conveyor'){
        machine.tread=this.add.tileSprite(x,y+1,w-22,11,
          'deck-'+this.chapter.id+'-feed-tread')
          .setTileScale(.5).setOrigin(.5,0).setDepth(-18);
      }
    }
    this.walkableMachines=[...this.movingPlatforms,...this.machines,
      ...(this.templeWorld?.decks??[]),...(this.templeWorld?.crates??[]),
      ...(this.palaceWorld?.decks??[])];
    this.puzzleObjects=createPuzzleObjects(this.level.puzzleObjects??[]);
    for(const object of this.puzzleObjects){
      if(object.kind==='breakable-wall')this.makeSealVisual(object);
      else object.visual=this.add.image(object.x,object.bottom,'deck-'+this.chapter.id+'-'+object.id)
        .setOrigin(.5,1).setDisplaySize(...object.size).setDepth(-19);
    }
    if(this.walkableMachines.length||this.puzzleObjects.length)this.deckOverlay=this.add.graphics().setDepth(101);
    this.templeArt=this.templeWorld?createTempleScene(this,this.level.templeSpec,
      this.templeWorld,APPROVED_SCENE_ART[this.chapter.id]):null;
    this.palaceScene=this.palaceWorld?createPalaceScene(this,
      this.level.palaceSpec):null;
    this.raceScene=this.raceWorld?createRaceScene(this,
      this.level.raceSpec):null;
    this.windColumns=makeThermals(this,this.level.thermalVolumes,TILE);
    this.spawnObjects();
    this.spawnMounts();
    this.ropes=createRopes(this.level.ropes??[]);
    if(this.ropes.length)this.ropeLines=this.add.graphics().setDepth(15);
    for(const rope of this.ropes){
      rope.visual=this.add.image(...rope.anchor,'jungle-rope')
        .setOrigin(.5,0).setDisplaySize(8,rope.length).setDepth(16)
        .setRotation(-rope.angle);
    }
    this.drawRopes();
    this.monkeys=createMonkeys(this.level.monkeys??[],TILE,x=>this.groundAt(x));
    for(const monkey of this.monkeys)
      monkey.visual=this.add.image(monkey.x,monkey.y,'jungle-monkey',0)
        .setOrigin(.5,164/192).setScale(.16).setDepth(28);
    this.confirmedExplorers.forEach((explorer,id)=>{
      if(explorer)this.makePlayer(id,explorer,
        id===1&&this.confirmedExplorers[0]&&this.assistOption.checked);
    });
    const camera=this.cameras.main;
    // Frame local switches, rays and their associated platforms together.
    this.defaultZoom=this.palaceWorld?1.35:
      this.level.cave?(this.chapter.id==='skywell-ascent'?1.4:1.25):2;
    this.lookUp=this.level.cave?40:38;
    camera.setZoom(this.defaultZoom).setBounds(0,0,this.worldW,this.worldH);
    const [lead,partner]=this.players;
    if(this.raceWorld){
      camera.stopFollow();
      const frame=raceCameraFrame(this.level.raceSpec,
        this.raceWorld.state,this.players);
      camera.setZoom(frame.zoom).centerOn(frame.x,frame.y);
      if(partner?.assist)this.moveAssistPlayer(partner,STILL);
    }else if(this.palaceWorld){
      camera.stopFollow();
      camera.centerOn(lead.x+155,lead.y-160);
    }else if(partner){
      camera.setRoundPixels(false).centerOn(partner.assist?lead.x:(lead.x+partner.x)/2,lead.y-this.lookUp);
      if(partner.assist)this.moveAssistPlayer(partner,STILL);
    }else{
      // Follow at subpixel precision in Stonewake to keep contacts aligned.
      camera.startFollow(lead.visual,!this.puzzleObjects.length,.085,.12);
      camera.setFollowOffset(0,this.lookUp);
    }
    this.makeHud();
    // The menu already explains the chapter objective. Avoid covering the
    // first moments of play with a long sentence across the entire sky.
    this.flash(this.chapter.name,1600);
  }

  drawRopes(){
    if(!this.ropeLines)return;
    this.ropeLines.clear();
    for(const rope of this.ropes){
      const tip=ropePoint(rope);
      this.ropeLines.lineStyle(4.8,0x573c28).lineBetween(...rope.anchor,...tip);
      this.ropeLines.lineStyle(2.8,0xad7a44).lineBetween(...rope.anchor,...tip);
      rope.visual.setRotation(-rope.angle);
    }
  }

  groundAt(x){
    if(this.level.cave)return this.level.cave.groundAt(x);
    const voidArea=this.level.raceSpec?.flightVoid;
    if(voidArea&&x>=voidArea.from*TILE&&x<voidArea.to*TILE)
      return this.worldH+256;
    return surfaceGroundAt(this.level,x);
  }

  inWater(x,y){
    if(this.templeWorld)return templeInWater(this.templeWorld,
      px=>this.groundAt(px),x,y);
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
    const visibleAction=action!=='float'&&action!=='hang'&&entity.gestureTime>0?entity.gesture:action;
    const art=paintedAction(name,visibleAction);
    const textureName=art?.texture??'actor-'+name;
    if(entity.textureName!==textureName){
      entity.textureName=textureName;
      entity.visual.setTexture(textureName);
      entity.visual.setOrigin(art?.5:manifest.origin.x/manifest.frameWidth,
        art?art.originY:manifest.origin.y/manifest.frameHeight);
      entity.action='';
    }
    if(entity.action!==visibleAction){
      entity.action=visibleAction;
      entity.animationTime=0;
    }else entity.animationTime+=delta;
    const pose=poseFor(manifest,visibleAction,entity.animationTime,
      entity.vx??(entity.face||1),entity.homeX??entity.id??0);
    const face=entity.face||1;
    const clip=art?.clip;
    const frameNumber=clip?art.frame+clip.frames[Math.floor(entity.animationTime*clip.fps)%clip.frames.length]:
      art?.frame??pose.frame;
    entity.visual.setFrame(frameNumber);
    entity.visual.setPosition(entity.x+pose.dx*face,entity.y+pose.dy);
    entity.visual.setFlipX(face<0);
    const frame=entity.visual.frame;
    const sx=art?art.width/frame.cutWidth:manifest.worldScale;
    const sy=art?.height?art.height/frame.cutHeight:sx;
    entity.visual.setScale(sx*pose.sx,sy*pose.sy);
    entity.visual.setRotation(face*pose.rotation);
    if(entity.visual.shadow){
      const floor=entity.perch?.y??this.groundAt(entity.x);
      const ledge=entity.id!==undefined&&!entity.grounded?
        platformTopAt(entity.x,entity.y,floor,this.level.platformSegments,TILE):null;
      const shadowY=entity.grounded?entity.y:ledge??floor;
      const elevation=Math.max(0,shadowY-entity.y);
      const weight=Math.max(.33,1-elevation/155);
      entity.visual.shadow.setPosition(entity.x,shadowY+3)
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
      const pickup=PICKUPS[object.kind];
      if(pickup){
        const y=this.groundAt(x);
        const visual=this.add.image(x,y-13,'playful-pickups',pickup.frame)
          .setDisplaySize(pickup.size,pickup.size).setDepth(10);
        this.tweens.add({targets:visual,y:y-18,angle:{from:-4,to:4},
          duration:950+(object.x%6)*80,ease:'Sine.easeInOut',yoyo:true,repeat:-1});
        this.items.push({kind:object.kind,x,y,visual,used:false});
      }else if(FORMS[object.kind]){
        const flying=['skyling','glimmermoth','cloudwhisp'].includes(object.kind);
        const perch=object.perch?{
          left:object.perch.x*TILE,right:(object.perch.x+object.perch.length)*TILE,
          y:object.perch.y*TILE
        }:null;
        const y=perch?perch.y:flying?(object.y+.5)*TILE:this.groundAt(x);
        this.animals.push({kind:object.kind,x,y,homeX:x,homeY:y,
          friendship:friendshipArt(this,10),loveUntil:0,
          face:1,trust:0,distraction:0,respawn:0,bubble:0,
          stun:0,attack:0,windup:0,dash:0,attackFace:1,shotWait:1,shotWindup:0,
          captured:false,flying,perch,bubbleRise:0,lureTarget:null,knockVX:0,
          bubbleVisual:null,honeyVisual:null,action:'',animationTime:0,
          visual:this.actor(object.kind,x,y).setDepth(12),
          warning:this.add.graphics().setDepth(24),
          warningArt:enemyTellFrame(object.kind)===null?null:
            this.add.image(x,y-15,'effects',enemyTellFrame(object.kind))
              .setScale(.1).setAlpha(0).setDepth(24)});
      } else if(['starShard','snack','checkpoint','exit',relicKind].includes(object.kind)){
        const rooted=['snack','checkpoint','exit'].includes(object.kind);
        const y=rooted?(object.perch?object.perch.y*TILE:this.groundAt(x)):
          (object.y+.5)*TILE;
        const frame=object.kind==='starShard'?6:object.kind==='snack'?5:
          object.kind==='checkpoint'?2:object.kind==='exit'?0:7;
        const important=object.kind===relicKind||object.kind==='exit'||
          object.kind==='checkpoint';
        const exit=object.kind==='exit';
        const halo=important?this.add.ellipse(x,y-(exit?41:19),
          exit?84:object.kind===relicKind?36:28,exit?78:object.kind===relicKind?42:33,
          object.kind===relicKind?0xfff6cb:0xbaf4de,.11)
          .setStrokeStyle(1.1,object.kind===relicKind?0xffefbc:0xc9f8e4,.45)
          .setDepth(8):null;
        if(halo)this.tweens.add({targets:halo,alpha:{from:.17,to:.48},
          scale:{from:.91,to:1.11},duration:1200+(object.x%5)*120,
          ease:'Sine.easeInOut',yoyo:true,repeat:-1});
        const icon=object.kind===relicKind?
          this.add.image(x,y-13,'gate-key').setDisplaySize(42,42).setDepth(10):
          this.add.image(x,y,'props',frame)
            .setOrigin(.5,paintedFootOrigin(object.kind)).setScale(exit?.48:.16).setDepth(10);
        if(object.kind==='exit'&&this.shared.relic)icon.setFrame(1);
        // A little authored motion makes collectibles readable in the
        // painterly scenery without adding a row of HUD markers.
        if(object.kind==='starShard'||object.kind===relicKind)
          this.tweens.add({targets:icon,y:icon.y-5,rotation:{from:-.045,to:.045},
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
      if(part.kind==='bubbleVent'){
        const pool=this.level.waterBodies.find(b=>part.x>=b.start&&part.x<=b.end);
        this.setpieces.push({kind:part.kind,x,y,...makeVentBubbles(this,x,y,pool.surface*TILE)});
        continue;
      }
      const base=part.kind==='bounceBloom'?this.groundAt(x):y;
      const art=part.kind==='bounceBloom'?
        this.add.image(x,base,'bounce-bloom',0)
          .setOrigin(.5,BLOOM_ART.rootY/BLOOM_ART.height).setScale(.16).setDepth(4):
        makeWindSprite(this,x,y-4,32,44,4);
      this.setpieces.push({kind:part.kind,x,y:base,time:0,visual:art});
    }
  }

  spawnMounts(){
    const encounters=this.level.raceSpec?.mountEncounters.map(
      mount=>[mount.kind,mount.at[0]])??LOCATIONS[this.chapter.id]??[];
    for(const [kind,cell,ledgeHeight] of encounters){
      const {manifest}=mounts[kind];
      const x=(cell+.5)*TILE;
      const y=ledgeHeight!==undefined?ledgeHeight*TILE:this.groundAt(x);
      const visual=this.add.sprite(x,y,'mount-'+kind,0)
        .setOrigin(manifest.origin.x/manifest.frameWidth,
          manifest.origin.y/manifest.frameHeight)
        .setScale(manifest.worldScale).setDepth(24);
      const shadow=this.add.ellipse(x,y+2,48,8,0x18383c,.22).setDepth(8);
      this.mounts.push({kind,x,y,homeX:x,homeY:y,perched:ledgeHeight!==undefined,
        vx:0,vy:0,face:1,grounded:true,trust:0,rider:null,chew:0,
        flapWait:0,flaps:0,rear:0,approached:false,action:'',animationTime:0,
        visual,shadow,friendship:friendshipArt(this,22),loveUntil:0});
    }
  }

  animateMount(m,action,delta){
    const manifest=mounts[m.kind].manifest;
    if(m.action!==action){m.action=action;m.animationTime=0;}
    else m.animationTime+=delta;
    const clip=manifest.animations[action==='rear'?'jump':action];
    const index=Math.floor(m.animationTime*clip.fps);
    const frame=clip.frames[action==='jump'||action==='rear'?
      Math.min(index,clip.frames.length-1):index%clip.frames.length];
    const lift=action==='rear'?Math.sin(Math.PI*Math.min(1,m.animationTime/.66)):0;
    m.visual.setFrame(frame).setPosition(m.x,m.y-6*lift).setFlipX(m.face<0)
      .setRotation(-m.face*.14*lift);
    const support=m.perched?m.homeY:this.supportAt(m.x,m.y);
    m.shadow.setPosition(m.x,support+3);
    const elevation=Math.max(0,support-m.y);
    m.shadow.setScale(Math.max(.38,1-elevation/190));
    drawFriendship(m.friendship,m.x,m.y,this.simulationTime/1000,
      m.rider!==null?0:m.trust>=100?1:this.simulationTime<m.loveUntil?.7:0,83);
    return frame;
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
    this.changeForm(p,null);
    p.creatureBounceWindow=0;
    m.rider=p.id;p.mount=m;m.perched=false;m.rear=0;m.vx=0;
    p.visual.shadow?.setVisible(false);
    p.gestureTime=0;
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
    p.vx=m.vx*.7;p.vy=m.vy;m.vx=0;
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
      ceilingAt:this.level.cave?x=>this.level.cave.ceilingAt(x):null,
      flightVolumes:this.level.raceSpec?.flightVolumes??[],
      jumpScale:this.raceWorld&&m.kind==='unicorn'?1.15:1
    });
    if(launch)m.action='';
    if(launch==='takeoff')this.sparkle(m.x,m.y-35,0xffecce);
    else if(launch==='wingbeat'){
      this.sparkle(m.x,m.y-39,0xd9efff);
      this.wingbeatTrail(m.x,m.y);
    }
    const frame=this.animateMount(m,action,step/60);
    const mountArt=mounts[m.kind].manifest;
    // Preserve the gameplay position while the art follows the painted saddle.
    const seat=seatFor(m.kind,m.grounded?action:'jump');
    p.x=m.x+seat.x*m.face;
    p.y=m.y+seat.y;
    const [seatX,seatY]=mountArt.seats[frame];
    p.vx=m.vx;p.vy=m.vy;p.face=m.face;p.grounded=m.grounded;
    const riderArt=riders.manifest;
    const riderFrame=riderArt.explorers.indexOf(p.explorer)*riderArt.columns+mountArt.riderFrames[frame];
    p.textureName='riders';
    p.action='ride';
    p.visual.setTexture('riders',riderFrame)
      .setOrigin(riderArt.origin.x/riderArt.frameWidth,riderArt.origin.y/riderArt.frameHeight)
      .setPosition(m.x+seatX*mountArt.worldScale*m.face,m.y+seatY*mountArt.worldScale)
      .setFlipX(p.face<0).setScale(riderArt.worldScale).setRotation(0);
  }

  updateMounts(step,time){
    const world={width:this.worldW,tile:TILE,platformSegments:this.level.platformSegments,
      groundAt:x=>this.groundAt(x),inWater:(x,y)=>this.inWater(x,y)};
    for(const m of this.mounts){
      if(m.rider!==null||m.clouded)continue;
      // Leave a dismounted, trusted Unicorn where its rider left it.
      // The ground race keeps scrolling, so returning to the Unicorn is a
      // player choice rather than a forced pause or an AI grazing detour.
      if(this.raceWorld?.state.phase==='groundScroll'&&
         m.kind==='unicorn'&&m.trust>=100&&m.grounded){
        this.animateMount(m,'idle',step/60);
        continue;
      }
      const near=this.players.filter(p=>!p.sleep&&!p.bubble&&!p.assist&&!p.clouded&&
        Math.abs(p.x-m.x)<80&&Math.abs(p.y-m.y)<48)
        .sort((a,b)=>Math.abs(a.x-m.x)-Math.abs(b.x-m.x))[0];
      const food=m.trust<100?this.lures.find(f=>f.landed&&Math.abs(f.x-m.x)<155&&
        Math.abs(f.y-m.y)<48):null;
      const action=stepWildMount(m,near,food,step,time,world);
      if(m.grounded&&food&&Math.abs(food.x-m.x)<18&&Math.abs(food.y-m.y)<24){
        m.trust=feedTrust(m.trust,MOUNTS[m.kind].favorite,food.food);
        m.chew=.45;
        m.loveUntil=time+1250;
        food.visual.destroy();
        this.lures.splice(this.lures.indexOf(food),1);
        this.sparkle(m.x,m.y-32,0xf8e9ba);
        this.flash(m.trust===100?
          m.kind+' trusts you! Press T / Y nearby to ride':
          m.kind+' enjoyed the treat',1750);
      }
      this.animateMount(m,action,step/60);
    }
  }

  makePlayer(id,explorer,assist){
    const spawn=this.level.objects.find(o=>o.kind==='p1');
    const x=(spawn.x+.5)*TILE+(id?14:0), y=this.groundAt(x);
    const visual=this.actor(explorer,x,y).setDepth(30+id);
    if(id===1)visual.setTint(0xcacaff);
    const player={id,explorer,x,y,vx:0,vy:0,face:1,grounded:true,coyote:5,
      jumpBuffer:0,jumps:0,flaps:0,flapWait:0,health:3,sleep:false,invincible:0,
      creatureBounceWindow:0,creatureBounceBoosts:0,
      form:null,caught:null,food:0,powers:0,punchTicks:0,hover:0,breach:0,
      bubble:null,bubbleDelay:0,dandelion:0,iceWater:0,iceArt:null,
      mount:null,trap:null,trapGrace:0,trapVisual:null,
      bloomWindow:0,bloomBoosts:0,recalls:0,
      checkpoint:{x,y},action:'',animationTime:0,visual};
    if(assist){
      player.assist=cloudArt(this);
      player.y-=32;
      player.grounded=false;
      visual.shadow.setVisible(false);
    }
    this.players.push(player);
    return player;
  }

  makeHud(){
    // DOM UI is independent of Phaser's zoomed scrolling world camera.
    const ui=document.getElementById('ww-ui');
    ui.hidden=false;
    const status=document.getElementById('ww-objective');
    this.healthBars=[...document.querySelectorAll('#ww-health progress')];
    const notice=document.getElementById('ww-notice');
    const help=document.getElementById('ww-help');
    // Palace captions live at the floor; keep instructions in the HUD,
    // not across the switches that the player must shoot.
    help.style.top=this.palaceWorld?'68px':'';
    help.style.bottom=this.palaceWorld?'auto':'';
    help.style.left=this.palaceWorld?'12px':'';
    help.style.transform=this.palaceWorld?'none':'';
    help.style.textAlign=this.palaceWorld?'left':'';
    help.style.fontSize=this.palaceWorld?'12px':'';
    const pause=document.getElementById('ww-pause');
    pause.hidden=true;
    this.hud={setText:value=>{status.textContent=value;}};
    this.notice={setText:value=>{notice.textContent=value;}};
    this.help={setText:value=>{help.textContent=value;}};
    this.pausePanel=pause;
    this.pauseControls=document.getElementById('ww-pause-controls');
    this.pauseDevices=null;
    this.noticeUntil=0;
  }

  showPauseControls(pads){
    const devices=this.players.map(p=>[p.id,Boolean(pads[p.id]),this.keyboardUsed[p.id],Boolean(p.clouded)]);
    const signature=JSON.stringify(devices);
    if(this.pauseDevices===signature)return;
    this.pauseDevices=signature;
    const tables=[];
    for(const p of this.players){
      const hasPad=Boolean(pads[p.id]);
      const sources=hasPad?(this.keyboardUsed[p.id]?[true,false]:[true]):[false];
      for(const pad of sources){
        const table=document.createElement('table');
        table.createCaption().textContent='P'+(p.id+1)+' · '+(pad?'Gamepad':'Keyboard');
        const rows=controlGuide(p.id,pad,p.assist);
        if(p.clouded)rows.unshift(['Steer cloud',pad?'Left stick / D-pad':'A / D / S / Arrow keys'],
          ['Break free',pad?'A / Cross':'W / Space']);
        for(const [action,input] of rows){
          const row=table.insertRow();
          const label=document.createElement('th');
          label.scope='row';
          label.textContent=action;
          row.append(label);
          row.insertCell().textContent=input;
        }
        tables.push(table);
      }
    }
    this.pauseControls.replaceChildren(...tables);
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

  waterSplash(x){
    // Temple flooding extends up sloping banks beyond the flat-floor cells.
    // A splash outside an actual basin should not try to read its surface.
    const water=this.templeWorld?
      templeBasinAt(this.templeWorld,px=>this.groundAt(px),x):
      this.level.waterBodies.find(b=>x>=b.start*TILE&&x<b.end*TILE);
    if(!water)return;
    const y=water.surface*TILE;
    const ripple=this.add.ellipse(x,y,14,4).setStrokeStyle(1,0xc8faff,.8).setDepth(26);
    this.tweens.add({targets:ripple,scaleX:2.9,scaleY:1.7,alpha:0,
      duration:410,onComplete:()=>ripple.destroy()});
    for(const side of [-1,1]){
      const spray=this.add.image(x+side*4,y-4,'effects',EFFECT_FRAMES.splash)
        .setFlipX(side<0).setRotation(side*-.3).setScale(.11).setDepth(39);
      this.tweens.add({targets:spray,x:x+side*17,y:y-13,alpha:0,scale:.058,
        duration:360,ease:'Sine.easeOut',onComplete:()=>spray.destroy()});
    }
  }

  pickupBurst(frame,x,y){
    for(const side of [-1,1]){
      const tuft=this.add.image(x,y,'playful-pickups',frame)
        .setDisplaySize(21,21).setFlipX(side<0).setRotation(side*.24).setDepth(38);
      this.tweens.add({targets:tuft,x:x+side*17,y:y-15,alpha:0,
        angle:side*32,duration:520,ease:'Sine.easeOut',onComplete:()=>tuft.destroy()});
    }
  }

  drawIceFeet(p){
    const visible=p.iceWater>0&&!p.bubble&&!p.mount&&!p.rope&&!p.sleep&&
      !p.floating&&!p.assist&&!p.clouded&&!this.inWater(p.x,p.y-8);
    if(visible&&!p.iceArt)
      p.iceArt=[-1,1].map(()=>this.add.image(p.x,p.y,'playful-pickups',PICKUP_ART.iceCube)
        .setDisplaySize(11,11).setDepth(36));
    p.iceArt?.forEach((cube,i)=>cube.setVisible(visible)
      .setPosition(p.visual.x+(i?4.5:-4.5),p.visual.y-2)
      .setRotation((i?1:-1)*.12+p.vx*.034));
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

  playerPerch(p){
    return this.animals.find(a=>a.perch&&p.grounded&&p.y===a.perch.y&&
      p.x>=a.perch.left-4&&p.x<=a.perch.right+4)?.perch;
  }

  throwFood(p){
    const food=p.assist?'berry':FRUITS[p.food];
    if(p.assist&&(p.y>this.groundAt(p.x)||p.y<(this.level.cave?.ceilingAt(p.x)??0)||
      rockContains(this.level.rockPolygons??[],p.x,p.y)))return;
    if(!p.assist&&this.shared.foods[food]===0){
      this.flash('Find a picnic basket to refill '+food+' treats',1400);
      return;
    }
    if(!p.assist)this.shared.foods[food]--;
    const perch=this.playerPerch(p);
    // A throw must be allowed to leave its launch ledge. Clamping to that
    // ledge makes a berry land at the player's feet near either edge.
    const x=p.assist?p.x:clamp(p.x+p.face*96+p.vx*5,16,this.worldW-16);
    const y=this.groundAt(x);
    gesture(p,'feed',.27);
    const texture=food==='berry'?'painted-berry':'flora';
    const sprite=food==='berry'?
      this.add.image(p.x,p.y-18,texture).setDisplaySize(19,20):
      this.add.image(p.x,p.y-18,texture,p.food).setScale(.071/FLORA_ATLAS_SCALE);
    sprite.setOrigin(.5,1).setDepth(18);
    const lure={x,y,food,visual:sprite,landed:false,life:24*60,
      startX:p.assist?p.x:clamp(p.x+p.face*9,16,this.worldW-16),
      startY:p.y-(p.assist?0:21),
      face:p.face,age:0,drop:Boolean(p.assist),perch,
      ballistic:this.isCavern&&!p.assist,
      velocityX:p.face*2.6+p.vx*.15,velocityY:-3};
    this.lures.push(lure);
    sprite.setPosition(lure.startX,lure.startY);
    if(!p.assist)this.flash('A '+food+' treat is on its way',800);
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
    if(['springaroo','tideling','gravelback','emberkit'].includes(p.form))return;
    p.powers=.8;
    gesture(p,'alert',.28);
    if(p.form==='flintfist'){
      gesture(p,'punch',.34);
      p.punchTicks=5;
      return;
    }
    if(p.form==='glimmermoth'){
      p.hover=HOVER_SECONDS;
      this.powerEffect(p.form,p.x,p.y,p.face);
      return;
    }
    this.shootPower(p.form,p,p.id);
  }

  shootPower(kind,source,owner){
    const shot=launchPower(kind,source.x,source.y,source.face,owner);
    const visual=this.add.image(shot.x,shot.y,'effects',powerFrame(kind))
      .setScale(kind==='prismtail'?.11:.09).setAlpha(.9)
      .setDepth(33).setFlipX(source.face<0);
    this.powerShots.push({...shot,visual});
  }

  aimCreaturePower(animal,lure,step){
    const kind=animal.kind;
    if(kind!=='mossback'&&kind!=='prismtail')return;
    animal.shotWait=Math.max(0,animal.shotWait-step/60);
    if(lure||animal.distraction>0||animal.stun>0||animal.bubbleRise>0){
      if(animal.shotWindup>0)animal.gestureTime=0;
      animal.shotWindup=0;
      return;
    }
    if(animal.shotWindup>0){
      animal.shotWindup=Math.max(0,animal.shotWindup-step/60);
      if(animal.shotWindup===0){
        this.shootPower(kind,animal,null);
        animal.shotWait=3;
      }
      return;
    }
    if(animal.windup>0||animal.dash>0||animal.shotWait>0)return;
    const target=this.players.find(p=>!p.sleep&&!p.bubble&&!p.assist&&!p.clouded&&!p.trap&&
      Math.abs(p.x-animal.x)>=(kind==='prismtail'?52:20)&&
      Math.abs(p.x-animal.x)<(kind==='prismtail'?112:86)&&Math.abs(p.y-animal.y)<28);
    if(target){
      animal.face=target.x>animal.x?1:-1;
      animal.shotWindup=.48;
      gesture(animal,'alert',.48);
    }
  }

  trapPlayer(p,kind){
    if(p.mount)this.dismount(p);
    p.trap={kind,ticks:0};p.vx=0;p.vy=0;p.launchSpeed=0;p.gestureTime=0;
    p.jumpBuffer=0;p.creatureBounceWindow=0;p.bloomWindow=0;
    const bubble=kind==='prismtail';
    p.trapVisual=this.add.image(p.x,p.y,'effects',
      bubble?EFFECT_FRAMES.bubbleTrap:EFFECT_FRAMES.honeyPuddle)
      .setOrigin(.5,bubble?.5:paintedFootOrigin('honeyPuddle'))
      .setScale(bubble?.24:.13).setAlpha(.86).setDepth(bubble?37:21);
    this.flash(bubble?'Caught in a bubble! Tap Jump to break free.':
      'Stuck in honey! Tap Jump to break free.',1800);
  }

  clearTrap(p){
    p.trapVisual?.destroy();p.trapVisual=null;p.trap=null;
  }

  makeSealVisual(wall){
    const [width,height]=wall.size;
    let frame=0;
    wall.fragments=wall.fracture.map(band=>band.pieces.map(points=>{
      const xs=points.map(([x])=>x),ys=points.map(([,y])=>y);
      const cx=(Math.min(...xs)+Math.max(...xs))/2;
      const cy=(Math.min(...ys)+Math.max(...ys))/2;
      return this.add.image(wall.x-width/2+cx,wall.bottom-height+cy,
        'seal-fragments',frame++)
        .setOrigin(cx/width,cy/height).setDisplaySize(width,height).setDepth(-19);
    }));
  }

  strikeWall(p){
    const hit=punchWall(this.puzzleObjects,p);
    this.sparkle(p.x+p.face*24,p.y-18,0xffd398);
    if(!hit)return;
    const {wall,band}=hit;
    const {kick,fall,crumble}=sealPlan.debris;
    for(const [i,fragment] of wall.fragments[band].entries()){
      const side=i?1:-1;
      const x=fragment.x,y=fragment.y;
      const landing=wall.bottom-9;
      fragment.setDepth(19);
      this.sparkle(x,y,0xe5ad7d);
      this.tweens.chain({targets:fragment,tweens:[
        {x:x+side*(kick.spread+band*3)+p.face*9,y:y-kick.rise,angle:side*kick.turn,
          duration:kick.ms,ease:'Quad.easeOut'},
        {x:x+side*(fall.spread+band*3)+p.face*12,y:landing,angle:side*fall.turn,alpha:.78,
          duration:fall.ms+Math.max(0,landing-y)*2,ease:'Quad.easeIn',
          onComplete:()=>this.sparkle(fragment.x,landing+10,0xc79982)},
        {scale:fragment.scale*crumble.scale,alpha:0,duration:crumble.ms,ease:'Quad.easeOut'}
      ],onComplete:()=>fragment.destroy()});
    }
    if(wall.state==='broken')this.flash('The cave is open!',1400);
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
      const wild=shot.owner===null;
      const animal=result.ground||wild?null:this.animals.find(a=>powerHitsCreature(
        shot,result.fromX,result.fromY,a));
      const target=result.ground||!wild?null:this.players.find(p=>
        !p.sleep&&!p.bubble&&!p.assist&&!p.clouded&&!p.trap&&p.trapGrace<=0&&
        powerHitsCreature(shot,result.fromX,result.fromY,p));
      if(target)this.trapPlayer(target,shot.kind);
      if(animal)this.powerImpact(shot,animal);
      if(animal||target||result.expired){
        if(!wild&&!animal&&result.ground&&shot.kind==='mossback')
          this.addHoneyPuddle(shot.x);
        shot.visual.destroy();
        this.powerShots.splice(this.powerShots.indexOf(shot),1);
      }
    }
  }

  changeForm(p,form){
    if(p.form===form)return;
    p.form=form;
    gesture(p,'transform',.54);
    this.burstAt(p.x,p.y-17);
  }

  burstAt(x,y){
    const burst=captureBurst(this,x,y);
    drawCaptureBurst(burst);
    this.captureBursts.push(burst);
  }

  updateCaptureBursts(){
    this.captureBursts=this.captureBursts.filter(burst=>{
      burst.age++;
      if(drawCaptureBurst(burst))return true;
      burst.art.destroy();
      return false;
    });
  }

  throwOrb(p){
    gesture(p,'capture',.38);
    const x=p.x+p.face*7,y=p.y-17;
    const visual=this.add.image(x,y,'capture-orb').setDisplaySize(14,14).setDepth(32);
    // A *fixed*, slow, predictably bouncing trajectory. No target-aware
    // adjustments, homing, or hidden capture assistance.
    const perch=this.playerPerch(p);
    this.orbs.push({x,y,vx:p.face*2.15,vy:-1,perch,
      visual,life:150,bounces:0,owner:p});
  }

  updateAnimals(step,time){
    // Gameplay and rendered bait now advance together. Pausing freezes food
    // mid-flight instead of letting a wall-clock tween land behind the scenes.
    for(const lure of [...this.lures]){
      if(!lure.landed){
        const segments=lure.perch?[...this.level.platformSegments,{
          kind:'platform',x:lure.perch.left/TILE,length:(lure.perch.right-lure.perch.left)/TILE,
          y:lure.perch.y/TILE
        }]:this.level.platformSegments;
        const pose=advanceTreatFlight(lure,step,(from,to)=>treatLanding(from,to,
          segments,this.walkableMachines,x=>this.groundAt(x),TILE,
          this.level.rockPolygons));
        lure.visual.setPosition(pose.x,pose.y).setRotation(pose.rotation);
        if(pose.landed)this.sparkle(lure.x,lure.y,0xf3dfb8);
      }else{
        if(lure.deck){
          lure.x+=lure.deck.position[0]-lure.deck.previous[0];
          lure.y=deckTopAt(lure.deck,lure.x);
          lure.visual.setPosition(lure.x,lure.y);
        }
        lure.life-=step;
        if(lure.life<=0){
          lure.visual.destroy();
          this.lures.splice(this.lures.indexOf(lure),1);
        }
      }
    }
    for(const animal of this.animals){
      if(animal.clouded)continue;
      const respawn=tickCreatureRespawn(animal,step);
      if(respawn==='waiting')continue;
      if(respawn==='returned'){
        animal.honeyVisual?.destroy();animal.honeyVisual=null;
        animal.visual.setVisible(true);
        animal.warningArt?.setVisible(true);
        animal.visual.shadow?.setVisible(true);
      }
      const floor=x=>animal.perch?.y??this.groundAt(x);
      const lure=chooseCreatureLure(animal,this.lures,floor);
      animal.lureTarget=lure?.x??null;
      this.aimCreaturePower(animal,lure,step);
      stepCreatureMotion(animal,lure,step,time,{
        width:this.worldW,groundAt:floor
      });
      if(lure&&Math.abs(animal.x-lure.x)<12&&Math.abs(animal.y-lure.y)<25){
        animal.trust=feedTrust(animal.trust,FAVORITES[animal.kind],lure.food);
        if(animal.trust===100)animal.distraction=DISTRACTION_SECONDS;
        lure.visual.destroy();
        this.lures.splice(this.lures.indexOf(lure),1);
        animal.loveUntil=time+1250;
        gesture(animal,'eat',.5);
        this.flash(animal.trust>=100?
          FORMsName(animal.kind)+' is friendly — throw a capture orb!':
          FORMsName(animal.kind)+' enjoyed the treat',1300);
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
      const action=creatureAction(animal);
      this.animate(animal,animal.kind,action,step/60);
      drawFriendship(animal.friendship,animal.x,animal.y,time/1000,
        animal.distraction>0?1:time<animal.loveUntil?.72:0);
      // Threats explicitly warn before a short, directional dash.
      // Merely touching a calm animal never causes damage.
      const close=this.players.find(p=>!p.sleep&&!p.bubble&&!p.assist&&!p.clouded&&!p.trap&&
        Math.abs(p.x-animal.x)<52&&Math.abs(p.y-animal.y)<28);
      if(!animal.shotWindup)stepCreatureThreat(animal,close,Boolean(lure),step);
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
        if(p.sleep||p.bubble||p.assist||p.clouded||p.trap||Math.abs(p.x-animal.x)>19||
          Math.abs(p.y-animal.y)>24)continue;
        if(!p.mount&&p.vy>1&&p.y<animal.y-6){
          animal.stun=2.1;animal.windup=0;animal.dash=0;
          gesture(animal,'hurt',.32);
          stompCreature(p);
          this.sparkle(animal.x,animal.y);
          this.flash('Creature bounce! Tap Jump again for a bigger leap',850);
        }else if(animal.dash>0&&p.invincible<=0){
          if(p.mount)this.dismount(p);
          p.health--;p.invincible=1.5;p.vx=animal.x<p.x?3:-3;
          gesture(p,'hurt',.36);
          p.vy=-3.3;animal.dash=0;animal.attack=1.25;
          this.flash('Look for the warning, then jump over!',1200);
          if(p.health<=0){
            p.health=0;p.sleep=true;p.vx=0;p.vy=0;p.gestureTime=0;
            this.flash('Resting! Press R / LB to revive at camp',2400);
          }
        }
      }
    }
    for(const orb of [...this.orbs]){
      const fromX=orb.x,fromY=orb.y,oldBounces=orb.bounces;
      const x=orb.x+orb.vx*step;
      const floor=orb.perch&&x>=orb.perch.left&&x<=orb.perch.right?
        orb.perch.y:this.groundAt(x);
      const segments=orb.perch?[...this.level.platformSegments,{
        kind:'platform',x:orb.perch.left/TILE,
        length:(orb.perch.right-orb.perch.left)/TILE,y:orb.perch.y/TILE
      }]:this.level.platformSegments;
      const landing=this.level.cave?(from,to)=>treatLanding(from,to,
        segments,this.walkableMachines,px=>this.groundAt(px),TILE,
        this.level.rockPolygons):null;
      const next=orbStep(orb,floor,step,landing);
      Object.assign(orb,next);
      if(this.palaceWorld){
        const hit=this.level.palaceSpec.controlStations.find(control=>{
          const [cx,cy]=control.at.map(n=>n*TILE);
          return Math.hypot(orb.x-cx,orb.y-cy)<44;
        });
        if(hit){
          this.palaceWorld.orbHits.push(hit.id);
          this.sparkle(orb.x,orb.y,0xffe9ad);
          orb.life=0;
        }
      }
      orb.visual.setPosition(orb.x,orb.y)
        .setRotation((150-orb.life)*.09*Math.sign(orb.vx));
      if(orb.bounces>oldBounces)
        this.sparkle(orb.x,orb.y+5,0xc5f5ff);
      const animal=this.animals.find(a=>!a.captured&&a.distraction>0&&
        orbHitsAnimal(fromX,fromY,orb.x,orb.y,a.x,a.y));
      if(animal){
        if(animal.clouded)this.endCloud(animal);
        animal.captured=true;animal.respawn=RESPAWN_SECONDS;
        animal.bubbleVisual?.destroy();animal.bubbleVisual=null;
        animal.honeyVisual?.destroy();animal.honeyVisual=null;
        animal.visual.setVisible(false);
        animal.visual.shadow?.setVisible(false);
        animal.warning.clear();
        animal.warningArt?.setVisible(false);
        drawFriendship(animal.friendship,animal.x,animal.y,0,0);
        orb.owner.caught=animal.kind;
        this.changeForm(orb.owner,null);
        if(animal.perch&&!this.isCavern&&!this.puzzleObjects.some(o=>o.kind==='tipping-log'&&o.state==='settled')){
          orb.owner.checkpoint={x:animal.perch.left+22,y:animal.perch.y};
        }
        this.burstAt(orb.x,orb.y);
        this.flash('Befriended '+FORMsName(animal.kind)+'! Press T / Y to transform',3000);
        orb.life=0;
      }
      if(orb.life<=0||orb.bounces>3||
        orb.x<0||orb.x>this.worldW){
        orb.visual.destroy();this.orbs.splice(this.orbs.indexOf(orb),1);
      }
    }
  }

  resetRaceParty(){
    const sanctuary=this.raceWorld.state.checkpoint==='sanctuary';
    const candidates=this.level.raceSpec.mountEncounters.filter(mount=>
      mount.kind===(sanctuary?'pegasus':'unicorn'));
    this.raceRecalling=true;
    for(const player of this.players){
      if(!player.assist&&player.mount)this.dismount(player);
    }
    for(const mount of this.mounts){
      if(mount.kind!==candidates[0].kind)continue;
      mount.x=mount.homeX;
      mount.y=this.groundAt(mount.x);
      mount.vx=0;mount.vy=0;mount.grounded=true;mount.jumpCut=false;
      mount.flaps=0;mount.flapWait=0;mount.rider=null;
      mount.visual.clearTint().setAlpha(1).setRotation(0);
    }
    for(const player of this.players){
      if(player.assist)continue;
      const encounter=candidates[Math.min(player.id,candidates.length-1)];
      const x=encounter.at[0]*TILE-58;
      player.checkpoint={x,y:this.groundAt(x)};
      this.recall(player);
    }
    for(const player of this.players)
      player.visual.clearTint().setAlpha(1).setRotation(0);
    this.raceRecalling=false;
  }

  playRaceImpact(hit){
    const hazard=this.raceWorld.hazards.find(h=>h.id===hit);
    const player=this.players.find(p=>p.mount&&hazard&&
      raceHazardContact(hazard,p.mount));
    this.cameras.main.shake(150,.004);
    if(!player)return;
    const mount=player.mount;
    mount.visual.setTint(0xffc0ac);
    player.visual.setTint(0xffc0ac);
    this.tweens.add({targets:[mount.visual,player.visual],
      y:'-=13',angle:-15*mount.face,duration:210,hold:150,yoyo:true,
      ease:'Cubic.easeOut'});
  }

  recall(p){
    if(this.raceWorld&&!this.raceRecalling){
      stepRaceWorld(this.level.raceSpec,this.raceWorld,this.players,
        {recall:true});
      this.resetRaceParty();
      return;
    }
    if(this.palaceWorld&&!this.templeRecalling){
      this.templeRecalling=true;
      restorePalaceWorld(this.palaceWorld,this.palaceCheckpoint);
      for(const explorer of this.players)this.recall(explorer);
      this.templeRecalling=false;
      return;
    }
    if(this.templeWorld&&!this.templeRecalling){
      this.templeRecalling=true;
      restoreTempleWorld(this.level.templeSpec,this.templeWorld,
        this.templeCheckpoint);
      for(const explorer of this.players)this.recall(explorer);
      this.templeRecalling=false;
      return;
    }
    p.onPlatform=null;p.launchSpeed=0;p.floatTime=0;p.floating=false;
    p.rope=null;p.ropeLock=0;
    if(p.mount)this.dismount(p);
    this.clearTrap(p);p.trapGrace=0;p.gestureTime=0;
    p.x=p.checkpoint.x;p.y=p.checkpoint.y;p.vx=0;p.vy=0;
    p.recalls++;p.bloomWindow=0;p.creatureBounceWindow=0;
    p.grounded=true;p.sleep=false;p.punchTicks=0;
    p.bubbleDelay=0;p.dandelion=0;p.iceWater=0;
    p.jumps=0;p.flaps=0;p.flapWait=0;
    p.invincible=1.5;p.health=3;
    p.visual.setPosition(p.x,p.y);
    this.flash('Back at the last safe camp',1300);
  }

  updateRaceCamera(){
    const camera=this.cameras.main;
    const frame=raceCameraFrame(this.level.raceSpec,
      this.raceWorld.state,this.players);
    camera.setZoom(frame.zoom).centerOn(frame.x,frame.y);
  }

  updatePalaceCamera(){
    const human=this.players.filter(p=>!p.assist&&!p.bubble);
    if(!human.length)return;
    const centerX=human.reduce((sum,p)=>sum+p.x,0)/human.length;
    const centerY=human.reduce((sum,p)=>sum+p.y,0)/human.length;
    const spread=human.length>1?
      Math.max(...human.map(p=>p.x))-Math.min(...human.map(p=>p.x)):0;
    const zoom=Math.min(this.defaultZoom,960/(spread+290));
    this.cameras.main.setZoom(Math.max(.95,zoom))
      .centerOn(centerX+(human.length===1?155:90),centerY-160);
  }

  updatePartyCamera(){
    const [lead,partner]=this.players;
    if(!partner)return;
    const camera=this.cameras.main;
    let frame=partyFraming(lead,partner.bubble||partner.assist?null:partner,
      camera.width,camera.height,this.defaultZoom,this.lookUp);
    if(!partner.bubble&&!partner.assist&&stragglerReady(partner,frame.beyond)){
      this.startBubble(partner);
      frame=partyFraming(lead,null,camera.width,camera.height,this.defaultZoom,this.lookUp);
    }
    const dz=frame.zoom-camera.zoom;
    camera.setZoom(Math.abs(dz)<.001?frame.zoom:camera.zoom+dz*(dz<0?.075:.035));
    const x=camera.scrollX+camera.width/2,y=camera.scrollY+camera.height/2;
    camera.centerOn(x+(frame.x-x)*.085,y+(frame.y-y)*.12);
  }

  startBubble(p){
    const {x,y}=p;
    if(p.mount)this.dismount(p);
    this.clearTrap(p);
    p.x=x;p.y=y;p.vx=0;p.vy=0;p.rope=null;p.onPlatform=null;
    p.grounded=false;p.floating=false;p.coyote=0;p.launchSpeed=0;
    p.bloomWindow=0;p.creatureBounceWindow=0;p.jumpBuffer=0;p.punchTicks=0;
    p.gestureTime=0;p.bubbleDelay=0;
    p.bubble={vx:0,vy:0,ticks:0,popRequested:false,
      visual:this.add.image(x,y-22,'vent-bubbles',0).setDepth(35)};
    this.drawBubble(p);
  }

  drawBubble(p){
    const {ticks,visual}=p.bubble;
    const size=68+3*Math.sin(ticks*.085);
    visual.setPosition(p.x,p.y-22).setDisplaySize(size,size+7)
      .setFrame(Math.floor(ticks/9)%4);
    this.animate(p,p.form||p.explorer,'jump',TICK_MS/1000);
    p.visual.setAlpha(1);
    p.visual.shadow.setVisible(false);
  }

  bubblePathClear(lead,x,y){
    const dx=x-lead.x,dy=y-lead.y;
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/7));
    const rocks=this.level.rockPolygons??[];
    for(let i=1;i<=steps;i++){
      const px=lead.x+dx*i/steps,py=lead.y+dy*i/steps;
      const previousX=lead.x+dx*(i-1)/steps;
      const ceiling=this.level.cave?.ceilingAt(px)??0;
      if(py>this.groundAt(px)||py-27<ceiling||bodyHitsRock(rocks,px,py)||
        blockPuzzleX(this.puzzleObjects,previousX,px,py)!==px||
        this.level.climbWalls?.some(w=>Math.abs(px-w.x*TILE)<12&&
          py>w.top*TILE&&py-27<w.bottom*TILE))return false;
    }
    return true;
  }

  moveBubble(p,actions){
    const lead=this.players[0],bubble=p.bubble;
    const behind=clamp(lead.x-lead.face*38,14,this.worldW-14);
    const [x,y]=[[behind,lead.y-37],[lead.x,lead.y-28],[lead.x,lead.y-7]]
      .find(([x,y])=>this.bubblePathClear(lead,x,y))??[lead.x,lead.y];
    driftBubble(p,{x,y},++bubble.ticks/60);
    p.x=clamp(p.x,10,this.worldW-10);
    p.y=clamp(p.y,28,this.worldH-10);
    bubble.popRequested||=actions.jumpPressed||actions.foodPressed||actions.capturePressed||
      actions.transformPressed||actions.leftPressed||actions.rightPressed||
      actions.upPressed||actions.downPressed||actions.nextPressed||
      actions.recallPressed||actions.revivePressed;
    if(bubble.popRequested&&distance(lead,p)<105&&this.bubblePathClear(lead,p.x,p.y)){
      p.bubble=null;p.vx=bubble.vx*.45;p.vy=0;p.jumps=0;
      p.invincible=Math.max(p.invincible,1);
      if(p.sleep){p.sleep=false;p.health=3;}
      p.visual.shadow.setVisible(true);
      this.animate(p,p.form||p.explorer,'fall',0);
      const art=bubble.visual.setPosition(p.x,p.y-22).setFrame(4);
      this.tweens.addCounter({from:4,to:7.99,duration:230,
        onUpdate:tween=>art.setFrame(Math.floor(tween.getValue())),
        onComplete:()=>art.destroy()});
      return;
    }
    this.drawBubble(p);
  }

  moveAssistPlayer(p,actions){
    steerCloud(p,actions,true);
    p.x+=p.vx;p.y+=p.vy;
    const camera=this.cameras.main;
    const width=camera.width/camera.zoom,height=camera.height/camera.zoom;
    fitAssistToView(p,camera.scrollX+(camera.width-width)/2,
      camera.scrollY+(camera.height-height)/2,width,height,this.worldW,this.worldH);
    if(actions.foodPressed)this.throwFood(p);
    if(actions.capturePressed)this.throwOrb(p);
    if(actions.transformPressed&&p.caught)this.changeForm(p,p.form?null:p.caught);
    this.animate(p,p.form||p.explorer,'idle',TICK_MS/1000);
    drawCloud(p.assist,p.x,p.y,this.simulationTime/1000,62,false);
  }

  cloudPathClear(from,x,y){
    const steps=Math.max(1,Math.ceil(Math.hypot(x-from.x,y-from.y)/6));
    let previousX=from.x;
    for(let i=1;i<=steps;i++){
      const px=from.x+(x-from.x)*i/steps,py=from.y+(y-from.y)*i/steps;
      if(py>=this.groundAt(px)||py<=(this.level.cave?.ceilingAt(px)??0)||
        rockContains(this.level.rockPolygons??[],px,py)||
        blockPuzzleX(this.puzzleObjects,previousX,px,py+10)!==px||
        this.level.climbWalls?.some(w=>Math.abs(px-w.x*TILE)<9&&
          py>w.top*TILE&&py<w.bottom*TILE))return false;
      previousX=px;
    }
    return true;
  }

  updateCloudAssist(p,actions){
    this.cloudCooldown=Math.max(0,this.cloudCooldown-1);
    this.cloudedNPCs=this.cloudedNPCs.filter(target=>{
      const cloud=target.clouded;
      if(!cloud)return false;
      if(--cloud.ticks===0){
        this.endCloud(target);
        return false;
      }
      const y=Math.max(cloud.baseY-42,(this.level.cave?.ceilingAt(target.x)??0)+34);
      const nextY=Math.min(cloud.baseY,target.y+(y-target.y)*.055);
      target.y=sweepRockBody(this.level.rockPolygons??[],target.x,target.y,nextY,'y').value;
      if(target.visual.texture.key==='jungle-monkey')target.visual.setPosition(target.x,target.y);
      else if(target.rider===null)this.animateMount(target,'jump',TICK_MS/1000);
      else {
        this.animate(target,target.kind,'idle',TICK_MS/1000);
        drawFriendship(target.friendship,target.x,target.y,this.simulationTime/1000,
          target.distraction>0?1:0);
      }
      drawCloud(cloud.art,target.x,target.y,this.simulationTime/1000,cloud.width,true);
      return true;
    });
    const lead=this.players[0];
    const eligible=target=>!target.clouded&&!target.captured&&!target.sleep&&!target.bubble&&!target.trap&&
      (target.rider===undefined||target.rider===null)&&
      (target.perchedOn===undefined||target.perchedOn===null);
    if(actions.cloudPressed&&!this.cloudCooldown&&!this.cloudShot){
      const x=p.x+p.face*12,y=p.y-16;
      const target=closestCloudTarget({x:p.x,y},[lead,...this.animals,...this.mounts,...this.monkeys].filter(eligible),
        target=>this.cloudPathClear({x,y},target.x,target.y-15));
      this.cloudShot={x,y,face:p.face,ticks:Math.ceil(CLOUD_RANGE/5)+10,target,
        visual:this.add.image(x,y,'assist-cloud').setDisplaySize(29,16).setDepth(36)};
    }
    const shot=this.cloudShot;
    if(!shot)return;
    const target=shot.target&&eligible(shot.target)?shot.target:null;
    const dx=target?target.x-shot.x:shot.face*5;
    const dy=target?target.y-15-shot.y:0;
    const length=Math.hypot(dx,dy);
    const ratio=Math.min(1,5/Math.max(.01,length));
    const x=shot.x+dx*ratio,y=shot.y+dy*ratio;
    const clear=this.cloudPathClear(shot,x,y);
    const hit=clear&&target&&length<=9;
    if(hit)this.engulfInCloud(target,lead);
    if(hit||!clear||--shot.ticks===0||x<0||x>this.worldW){
      shot.visual.destroy();
      this.cloudShot=null;
    }else{
      shot.x=x;shot.y=y;
      shot.visual.setPosition(x,y);
    }
  }

  engulfInCloud(target,lead){
    if(target===lead){
      const {x,y}=target;
      if(target.mount)this.dismount(target);
      target.x=x;target.y=y;
      target.rope=null;target.onPlatform=null;target.grounded=false;target.coyote=0;
      target.jumpBuffer=0;target.gestureTime=0;target.floating=false;target.launchSpeed=0;
      target.punchTicks=0;
      this.cloudCooldown=CLOUD_COOLDOWN;
      target.visual.shadow.setVisible(false);
    }else{
      this.cloudedNPCs.push(target);
      target.warning?.clear();
      target.warningArt?.setAlpha(0);
      target.windup=0;target.dash=0;target.shotWindup=0;
    }
    target.vx=0;target.vy=0;
    target.clouded={art:cloudArt(this),baseY:target.y,ticks:CLOUD_TICKS,
      width:target.rider===null?92:72};
    drawCloud(target.clouded.art,target.x,target.y,this.simulationTime/1000,target.clouded.width,true);
  }

  endCloud(target){
    const cloud=target.clouded;
    cloud.art.forEach(puff=>puff.destroy());
    target.clouded=null;
    if(target===this.players[0]){
      target.visual.shadow.setVisible(true);
    }else if(target.rider===null){
      target.perched=false;target.grounded=false;target.vy=0;
    }else if(target.visual.texture.key==='jungle-monkey'){
      target.state='leap';target.time=0;target.target=null;target.vy=0;
    }else if(!target.flying){
      const floor=target.perch?.y??this.groundAt(target.x);
      target.bubbleRise=Math.max(target.bubbleRise,floor-target.y);
    }
  }

  moveCloudedPlayer(p,actions){
    if(actions.jumpPressed||--p.clouded.ticks===0){
      this.endCloud(p);
      p.vy=actions.jumpPressed?-2.5:0;
      return;
    }
    steerCloud(p,actions);
    const rising=p.clouded.ticks>CLOUD_TICKS-30&&!actions.up&&!actions.down;
    const x=clamp(p.x+p.vx,10,this.worldW-10);
    const y=clamp(p.y+p.vy-(rising?.62:0),28,this.worldH-10);
    if(this.bubblePathClear(p,x,p.y))p.x=x;
    if(this.bubblePathClear(p,p.x,y))p.y=y;
    this.animate(p,p.form||p.explorer,'idle',TICK_MS/1000);
    p.visual.setAlpha(1);
    drawCloud(p.clouded.art,p.x,p.y,this.simulationTime/1000,p.clouded.width,true);
  }

  movePlayer(p,actions,step){
    if(p.clouded){
      this.moveCloudedPlayer(p,actions);
      return;
    }
    if(p.bubble){
      this.moveBubble(p,actions);
      return;
    }
    if(p.sleep){
      if(actions.revivePressed||actions.recallPressed)this.recall(p);
      else {
        this.playerMotion(p,STILL,step);
        this.animate(p,p.form||p.explorer,'sleep',step/60);
        p.visual.setAlpha(1);
      }
      return;
    }
    if(actions.revivePressed){
      for(const partner of this.players){
        if(partner!==p&&partner.sleep&&!partner.bubble&&distance(partner,p)<48)
          this.recall(partner);
      }
    }
    p.visual.setAlpha(p.invincible>0&&Math.floor(this.time.now/100)%2===0?.53:1);
    if(actions.nextPressed)p.food=(p.food+1)%FRUITS.length;
    if((actions.recallPressed&&!p.trap)||p.y>=(this.level.recallBelow??Infinity))this.recall(p);
    p.trapGrace=Math.max(0,p.trapGrace-step);
    if(p.trap){
      if(stepPlayerTrap(p.trap,actions.jumpPressed,step)){
        if(p.trap.kind==='prismtail'&&actions.jumpPressed)p.vy=-2.5;
        this.clearTrap(p);p.trapGrace=60;
      }else{
        const bubble=p.trap.kind==='prismtail';
        if(bubble){
          const roof=this.level.cave?.ceilingAt(p.x)??0;
          const wanted=Math.max(roof+32,p.y-(p.trap.ticks<85?.55:0)*step);
          p.y=sweepRockBody(this.level.rockPolygons??[],p.x,p.y,Math.min(p.y,wanted),'y').value;
          p.grounded=false;p.onPlatform=null;p.coyote=0;
        }else this.playerMotion(p,STILL,step);
        p.trapVisual.setPosition(p.x,p.y-(bubble?19:0));
        this.animate(p,p.form||p.explorer,'stunned',step/60);
        return;
      }
    }
    const nearbyMount=this.mounts.find(m=>m.trust>=100&&m.rider===null&&!m.clouded&&
      Math.abs(m.x-p.x)<58&&Math.abs(m.y-p.y)<62);
    if(actions.transformPressed&&p.mount){
      this.dismount(p);
    }else if(actions.transformPressed&&nearbyMount){
      this.board(p,nearbyMount);
    }else if(actions.transformPressed&&p.caught){
      this.changeForm(p,p.form?null:p.caught);
      this.flash(p.form?FORMsName(p.form)+' form':'Explorer form',1300);
    }
    if(p.punchTicks>0&&--p.punchTicks===0&&p.form==='flintfist')this.strikeWall(p);
    if(actions.foodPressed&&!p.mount)
      p.form?this.castPower(p):this.throwFood(p);
    if(actions.capturePressed&&!p.form&&!p.mount)this.throwOrb(p);
    p.invincible=Math.max(0,p.invincible-step/60);
    if(p.mount){
      this.moveMountedPlayer(p,actions,step);
      return;
    }
    const pushing=pushPuzzleObject(this.puzzleObjects,p,actions);
    const beforeX=p.x,beforeY=p.y;
    const {action,events}=this.playerMotion(p,actions,step,
      pushing?(pushing.kind==='push-boulder'?Math.max(.24,pushing.speed):0):null);
    const mount=this.mounts.find(m=>landsOnMount(p,beforeY,m));
    if(mount){
      stompCreature(p);
      gesture(p,'jump',.16);
      this.sparkle(p.x,p.y,0xffecb5);
    }
    for(const event of events){
      if(p.dandelion>0&&JUMP_EVENTS.has(event))
        this.pickupBurst(PICKUP_ART.fluff,beforeX,beforeY-3);
      if(event==='breach'||event==='waterJump')this.waterSplash(beforeX);
      else if(event==='piston'){
        this.sparkle(p.x,p.y,0xffdf9a);
        this.flash('Steam launch!',950);
      }else if(event==='ropePump'){
        this.sparkle(p.x,p.y-23,0xffecc2);
      }else if(event==='bloomBoost'){
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
    this.animate(p,p.form||p.explorer,pushing&&p.grounded?'push':action,step/60);
  }

  playerMotion(p,actions,step,pushSpeed=null){
    return stepPlayerMotion(p,actions,step,{
      width:this.worldW,height:this.worldH,tile:TILE,
      groundAt:x=>this.groundAt(x),
      ceilingAt:this.level.cave?x=>this.level.cave.ceilingAt(x):null,
      inWater:(x,y)=>this.inWater(x,y),
      basinAt:this.templeWorld?x=>templeBasinAt(
        this.templeWorld,px=>this.groundAt(px),x):null,
      currentAt:this.templeWorld?(x,y)=>templeCurrent(
        this.templeWorld,this.level.templeSpec,x,y):null,
      waterBodies:this.level.waterBodies,
      thermalVolumes:this.level.thermalVolumes,
      platformSegments:this.level.platformSegments,
      climbWalls:this.level.climbWalls,
      movingPlatforms:this.walkableMachines,
      floorSegments:this.level.floorSegments,
      rockPolygons:this.level.rockPolygons,
      ropes:this.ropes,
      pushSpeed,
      blockHorizontal:this.puzzleObjects.length||this.templeWorld||this.palaceWorld?
        (from,to,feet,onTerrain)=>{
          const puzzle=this.puzzleObjects.length?
            blockPuzzleX(this.puzzleObjects,from,to,feet):to;
          const temple=this.templeWorld?templeBlockHorizontal(
            this.level.templeSpec,this.templeWorld,from,puzzle,feet):puzzle;
          return this.palaceWorld?palaceBlockHorizontal(
            this.level.palaceSpec,this.palaceWorld,from,temple,feet,onTerrain):temple;
        }:null
    });
  }

  touchWorld(p,step){
    if(p.bubble||p.sleep||p.trap||p.assist||p.clouded)return;
    for(const item of this.items){
      const exit=item.kind==='exit';
      if(item.used||Math.abs(item.x-p.x)>(exit?28:19)||Math.abs(item.y-12-p.y)>26)continue;
      if(PICKUPS[item.kind]){
        if(p.mount||p.rope)continue;
        item.used=true;item.visual.destroy();
        takePickup(p,item.kind);
        if(item.kind==='toadstool'){
          gesture(p,'jump',.22);
          this.pickupBurst(PICKUP_ART.spores,p.x,p.y);
        }else if(item.kind==='dandelion'){
          this.pickupBurst(PICKUP_ART.fluff,p.x,p.y-10);
        }else this.sparkle(p.x,p.y,0xbeeaff);
        this.flash(PICKUPS[item.kind].notice,1700);
      }else if(item.kind==='starShard'){
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
        if(this.templeWorld)this.templeCheckpoint=
          snapshotTempleWorld(this.templeWorld);
        if(this.palaceWorld)this.palaceCheckpoint=this.palaceWorld.state;
        for(const explorer of this.players){
          explorer.checkpoint={...this.shared.checkpoint};
          if(!explorer.sleep)explorer.health=3;
        }
        this.sparkle(item.x,item.y,0xb7f4c8);
        this.flash('Campfire reached! Health restored',1350);
        item.visual.setFrame(3);
        if(item.halo)item.halo.setStrokeStyle(1.4,0x9de9bb,.68);
      }else if(item.kind===this.chapter.key){
        item.used=true;item.visual.destroy();item.halo?.destroy();
        this.shared.relic=true;
        this.items.find(exit=>exit.kind==='exit')?.visual.setFrame(1);
        this.sparkle(item.x,item.y,0xfffac1);
        this.flash('Gate key found! Head for the exit.',2200);
      }else if(item.kind==='exit'&&this.shared.relic){
        const {x,y}=p;
        if(p.mount)this.dismount(p);
        p.x=x;p.y=y;p.face=Math.sign(item.x-x)||p.face;
        p.rope=null;p.gestureTime=0;p.vx=p.face*.86;p.vy=0;
        this.gateEntry={player:p,door:item,x,y,ticks:0};
        return true;
      }
    }
    for(const piece of this.setpieces){
      if(piece.kind==='bubbleVent'){
        if(ventContains(p,piece,this.inWater(p.x,p.y-8)))
          applyVentLift(p,step);
        continue;
      }
      if(Math.abs(piece.x-p.x)>13||Math.abs(piece.y-p.y)>23)continue;
      if(piece.kind==='bounceBloom'&&piece.time===0&&p.vy>=0){
        triggerBloom(p,p.jumpBuffer>0);
        piece.time=BLOOM_COOLDOWN;
        piece.visual.setFrame(4);
        this.sparkle(piece.x,piece.y,0xffc7e1);
        this.flash(p.bloomWindow>0?
          'Spring bloom! Tap jump again for a super bounce!':
          'Perfectly timed springboard boost!',1350);
      }else if(piece.kind==='windRing')p.vy=Math.min(p.vy,-4.1);

    }
  }

  walkThroughGate(){
    const gate=this.gateEntry,{player:p,door}=gate;
    const t=++gate.ticks/54;
    const across=Math.min(1,t/.86);
    p.x=gate.x+(door.x+p.face*12-gate.x)*across;
    p.y=gate.y+(door.y-gate.y)*across;
    this.animate(p,p.form||p.explorer,'run',TICK_MS/1600);
    p.visual.setAlpha(clamp((.94-t)/.33,0,1));
    p.visual.shadow.setAlpha(.28*p.visual.alpha);
    if(t<1)return false;
    this.progress=completeChapter(this.progress,this.chapter.id,this.shared.shards);
    writeProgress(this.progressStorage,this.progress);
    const next=this.stage+1;
    if(next<CHAPTERS.length)this.startStage(next);
    else this.showMenu();
    return true;
  }

  update(_time,delta){
    const time=this.time.now;
    const connected=this.input.gamepad?.enabled?navigator.getGamepads():[];
    const pads=[0,1].map(i=>connected[i]?.connected?this.input.gamepad.getPad(i):null);
    const actions=pads.map((pad,i)=>{
      this.keyboardUsed[i]||=Object.entries(this.keyboard[i]).some(([action,keys])=>
        action!=='pause'&&keys.some(key=>key.isDown));
      return readActions(this.keyboard[i],pad,this.lastInput[i]);
    });
    this.lastInput=actions;
    if(this.stage<0){
      this.updateMenu(actions);
      return;
    }
    if(actions.some(a=>a.pausePressed)){
      this.paused=!this.paused;
      if(this.paused)this.tweens.pauseAll();
      else this.tweens.resumeAll();
      this.pausePanel.hidden=!this.paused;
    }
    if(this.paused){
      this.showPauseControls(pads);
      this.pendingMs=0;this.pendingActions=[{},{}];
      return;
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
      if(this.gateEntry){
        if(this.walkThroughGate())return;
        continue;
      }
      // Preserve the exact obstacle, rider pose and camera for the impact
      // animation. Do not advance mounts or detect a second collision while
      // the party is waiting to be safely recalled.
      if(this.raceWorld?.state.phase==='crash'){
        const crash=stepRaceWorld(this.level.raceSpec,
          this.raceWorld,this.players);
        if(crash.restarted)this.resetRaceParty();
        this.updateRaceCamera();
        continue;
      }
      for(const item of this.items){
        if(item.kind==='snack'&&item.used){
          item.respawn-=step/60;
          if(item.respawn<=0){
            item.used=false;item.visual.setVisible(true);
          }
        }
      }
      const seconds=tickTime/1000;
      for(const wind of this.windColumns)animateWind(wind,seconds);
      for(const piece of this.setpieces){
        if(piece.kind==='bubbleVent')animateVentBubbles(piece,seconds);
        else if(piece.kind==='windRing')animateWind(piece.visual,seconds);
        else if(piece.kind==='bounceBloom'){
          piece.time=Math.max(0,piece.time-step/60);
          piece.visual.setFrame(bloomFrame(seconds+piece.x*.01,piece.time));
        }
      }
      this.updateCaptureBursts();
      if(this.templeWorld)stepTempleWorld(this.level.templeSpec,
        this.templeWorld,this.players,tickActions);
      if(this.palaceWorld)stepPalaceWorld(this.level.palaceSpec,
        this.palaceWorld,this.players,tickActions);
      stepPlatforms(this.movingPlatforms,tickTime/1000);
      stepMachines(this.machines,Math.round(tickTime/TICK_MS));
      const settled=stepPuzzleObjects(this.puzzleObjects,this.walkableMachines);
      for(const object of this.puzzleObjects){
        if(!object.visual)continue;
        // State transitions own the transform. Snapshotting the pivot with
        // the angle keeps an unmoved prop exactly still between ticks.
        if(object.x!==object.visual.x||object.bottom!==object.visual.y)
          object.visual.setPosition(object.x,object.bottom);
        if(object.angle!==object.visual.rotation)object.visual.setRotation(object.angle);
      }
      for(const object of settled)
        this.sparkle(object.x,object.platform[1],0xffe9ad);
      const floor=x=>this.groundAt(x);
      stepRopes(this.ropes,this.players,floor,step);
      this.drawRopes();
      for(const p of this.players){
        if(p.assist)continue;
        p.dandelion=Math.max(0,p.dandelion-1);
        p.iceWater=Math.max(0,p.iceWater-1);
        this.movePlayer(p,tickActions[p.id],step);
      }
      if(this.raceWorld){
        const result=stepRaceWorld(this.level.raceSpec,
          this.raceWorld,this.players);
        if(result.restarted)this.resetRaceParty();
        if(result.hit)this.playRaceImpact(result.hit);
        if(result.transition&&result.state.phase==='sanctuaryStop'){
          const x=this.level.raceSpec.recovery.sanctuaryCheckpoint*TILE;
          this.shared.checkpoint={x,y:this.groundAt(x)};
          for(const player of this.players)
            if(!player.assist)player.checkpoint={...this.shared.checkpoint};
        }
        this.updateRaceCamera();
      }else if(this.palaceWorld)this.updatePalaceCamera();
      else this.updatePartyCamera();
      const assistant=this.players[1];
      if(assistant?.assist){
        this.moveAssistPlayer(assistant,tickActions[assistant.id]);
        this.updateCloudAssist(assistant,tickActions[assistant.id]);
      }
      stepMonkeys(this.monkeys,this.players,tickActions,floor,this.level.recallBelow,step);
      for(const monkey of this.monkeys)
        monkey.visual.setPosition(monkey.x,monkey.y).setFrame(monkeyFrame(monkey))
          .setFlipX(monkey.face<0).setDepth(monkey.perchedOn===null?28:34);
      this.updateMounts(step,tickTime);
      this.updateAnimals(step,tickTime);
      this.updatePowers(step);
      for(const p of [...this.players]){
        if(this.touchWorld(p,step))return;
        this.drawIceFeet(p);
      }
    }
    if(this.stage<0)return;
    if(this.templeArt)drawTempleScene(this.templeArt,this.level.templeSpec,
      this.templeWorld,x=>this.groundAt(x),this.geometryOverlay.visible);
    if(this.palaceScene)drawPalaceScene(this.palaceScene,
      this.level.palaceSpec,this.palaceWorld,this.players);
    if(this.raceScene)drawRaceScene(this.raceScene,
      this.level.raceSpec,this.raceWorld,this.players);
    if(this.deckOverlay){
      this.deckOverlay.clear();
      if(this.geometryOverlay.visible){
        this.deckOverlay.lineStyle(2,0xffd28d,1);
        for(const object of this.puzzleObjects){
          if(object.state!=='ready')continue;
          const [width]=object.size;
          const top=puzzleTop(object);
          this.deckOverlay.strokeRect(object.x-width/2,top,width,object.bottom-top);
        }
        for(const deck of this.walkableMachines){
          if(deck.enabled===false)continue;
          const [x]=deck.position,half=deck.size[deck.kind==='gear'?1:0]/2;
          for(let px=x-half;px<x+half;px+=4){
            const end=Math.min(px+4,x+half);
            this.deckOverlay.lineBetween(px,deckTopAt(deck,px),end,deckTopAt(deck,end));
          }
        }
        if(this.palaceWorld){
          // Show the steep banks that cannot be walked up on ground, and
          // the full effective player-center bounds of each closed door.
          this.deckOverlay.lineStyle(4,0xffa36b,.9);
          for(const bank of palaceSteepBanks(this.level.palaceSpec))
            this.deckOverlay.lineBetween(bank.fromX,bank.fromY,
              bank.toX,bank.toY);
          this.deckOverlay.lineStyle(2,0xff7187,.9);
          for(const gate of this.level.palaceSpec.beamGates){
            if(this.palaceWorld.state.gates[gate.id])continue;
            const [x,y]=gate.at.map(cell=>cell*TILE);
            this.deckOverlay.strokeRect(x-gate.size[0]/2-10,y,
              gate.size[0]+20,gate.size[1]);
          }
        }
      }
    }
    const lead=this.players[0];
    this.healthBars.forEach((bar,id)=>{
      const player=this.players.find(p=>p.id===id);
      bar.parentElement.hidden=!player;
      if(player)bar.value=player.health;
    });
    this.hud.setText('✦ '+this.shared.shards+
      '    '+(this.shared.relic?'GATE OPEN':'FIND THE GATE KEY')+
      (lead.mount?'    '+(lead.mount.kind==='pegasus'?'PEGASUS':'UNICORN'):
       lead.form?'    '+FORMsName(lead.form):''));
    const first=this.animals.find(a=>a.kind==='springaroo'&&!a.captured);
    const teaching=this.chapter.id==='first-forest'&&first;
    const orchardHint=lead.x<440?'Jump onto the copper lift. Ride up to the stone steps.':
      lead.x<960?'Wait at the edge for the green ferry. Ride it across the ravine.':
      lead.x<1230?'Ride the brass gondola up to the roof garden.':'Follow the garden to its light.';
    const machineHint=lead.x<427?'Run with the belt and jump from the edge.':
      lead.x<845?'Jump across the turning gears.':
      lead.x<1450?'Stand on the flashing piston and wait for the launch.':
        'Find the gate key.';
    const jungleHint=lead.rope?
      'Up / Down · climb   ·   Tap ← / → low to swing higher   ·   Jump · let go':
      lead.x<1410?'Hold ↑ to grab a rope · P2 uses 8':'Find the key on the canopy shelf.';
    const templeCrate=this.templeWorld?.crates[0];
    const templeState=this.templeWorld?.state;
    const templeTailReady=this.templeWorld?.decks.find(d=>d.id==='wheel-bridge-b')?.enabled;
    const templeHint=!this.templeWorld?'':lead.x<70*TILE?
      'Board the raft in low water. High tide holds briefly for your jump to the dock.':
      lead.x<107*TILE&&!templeState.gates['sluice-gate']?
        templeCrate.x<87*TILE?
          '↑ at the left valve to fill. Brace against the crate and push it over the stone weir.':
        templeCrate.x<93*TILE-15?
          'Push the floating crate right until it stops over the golden floor socket.':
          'Ride the raft to the upper valve; ↑ cycles Fill → Hold → Drain. Drain the crate onto the socket.':
      lead.x<107*TILE?'Socket latched! The sluice refills automatically. Ride up to the open door.':
      lead.x<170*TILE&&!templeState.released?
        'Fill the head reservoir, ride its raft to the high ledge, then ↑ to release the cascade.':
      lead.x<170*TILE&&!templeState.wheelActive?
        'Release armed! Fill the head water and watch the wheel charge.':
      !templeTailReady?
        'Bridge A is solid. Wait for the downstream raft and Bridge B to rise before crossing.':
        'Both bridges are solid. Jump from A to the raft, then from the raft to B.';
    // The optical devices themselves carry the teaching: reflected rays,
    // receiver charge, bridge previews and a small prompt at the nearest dial.
    // Avoid a screen-wide puzzle walkthrough that covers those devices.
    const palaceHint=this.palaceWorld&&this.level.palaceSpec.controlStations
      .some(station=>this.players.some(p=>!p.assist&&
        Math.hypot(p.x-station.at[0]*TILE,p.y-24-station.at[1]*TILE)<45))?
      '↑ / D-pad Up · Rotate the mirror or open the curtain':'';
    const leadHint=this.templeWorld?templeHint:this.palaceWorld?palaceHint:
      this.raceWorld?.state.phase==='crash'?
      'Impact · Recovering at the last safe camp…':
      this.raceWorld?.state.phase==='waitingForUnicorns'?
      'Give a Unicorn two berry treats (F), then press T to ride. Both riders must mount.':
      this.raceWorld?.state.phase==='waitingForPegasi'?
      'Choose stars (E), give a Pegasus two treats (F), and press T to fly.':
      this.raceWorld?.state.phase==='groundScroll'?
      this.players.some(p=>!p.assist&&!p.mount)?
        'Unicorn race still scrolling · Keep up on foot or press T / Y beside your Unicorn.':
        'Jump to the highlighted upper platforms, or gallop below and time the obstacles.':
      this.raceWorld?.state.phase==='flightScroll'?
      'Pegasus · Flap between thunderclouds above and storm clouds below; dodge falling rocks!':
      lead.clouded?'P1 · Steer with the stick or direction keys · Jump to break free':
      lead.sleep?'R / LB · revive at camp':
      this.isCavern?cavernHint(this.puzzleObjects,lead,this.animals,this.shared.relic):
      this.puzzleObjects.length?puzzleHint(this.puzzleObjects,lead,this.animals):
      this.chapter.id==='brassworks'?machineHint:
      this.chapter.id==='clockwork-orchard'?orchardHint:
      this.chapter.id==='monkey-jungle'?jungleHint:
      this.chapter.id==='skywell-ascent'&&lead.x<50*TILE?
      lead.caught&&!lead.form?
        'T / Y · transform into your Glimmermoth':
      !lead.form?
        lead.food===2?
          'F / B · offer two star treats · G / X to catch the Glimmermoth':
          'E / LT or RT · select star treats for the nearby Glimmermoth':
        'Amber walls · hold toward the wall, tap Jump, release and tap again':
      lead.creatureBounceWindow>0?
      'Tap Jump now for a super spring!':lead.mount?
      (lead.mount.kind==='pegasus'?
        'Pegasus · Tap Jump to flap · Down to descend · T dismount':
        'Unicorn · Run fast · Jump to leap · T dismount'):
      this.mounts.some(m=>m.trust>=100&&m.rider===null&&!m.clouded&&
        Math.abs(m.x-lead.x)<100)?
        'Friendly mount nearby · T / Y to ride':
      lead.form?FORM_HINTS[lead.form]:
      lead.caught?'T / Y · transform into '+FORMsName(lead.caught):
      teaching&&first.distraction>0?'G / X · catch your new friend':
      teaching?'F / B · offer two berries to the nearby Springaroo':'';
    const bubble=this.players[1]?.bubble;
    const bubbleHint=!bubble?'':bubble.popRequested?
      'P2 · Drifting back into reach':'P2 · Press I / A to pop your bubble';
    const assistHint=this.players[1]?.assist?
      this.cloudCooldown>0?'P2 cloud recharges in '+Math.ceil(this.cloudCooldown/60)+'s':
        'P2 · B key / RB or R1 to send a cloud':'';
    this.help.setText([leadHint,bubbleHint,assistHint].filter(Boolean).join('   •   '));
    if(time>this.noticeUntil)this.notice.setText('');
  }
}

function FORMsName(name){
  return {springaroo:'Springaroo',tideling:'Tidefox',skyling:'Moonwing',
    mossback:'Mossback',prismtail:'Prismtail',glimmermoth:'Glimmermoth',
    cloudwhisp:'Cloudwhisp',emberkit:'Emberkit',gravelback:'Gravelback',flintfist:'Flintfist'}[name]||name;
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
