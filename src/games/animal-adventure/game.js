window.WW = window.WW || {}; WW.games = WW.games || {};
WW.games.animals = (() => {
  const TILE=16,W=480,H=270, FORM=WW.catalog.forms, CREATURE=WW.catalog.creatures, FOOD=WW.catalog.foods;
  const TYPES=Object.keys(FORM),FOODS=Object.keys(FOOD);
  const titles=Object.fromEntries(Object.entries(CREATURE).map(([kind,info])=>[kind,info.name]));
  // One world unit is one source-pixel; frames run at 60 Hz. All map jumps obey these rules.
  const PHYSICS={run:2.25,jump:5.7,doubleJump:5.5,gravity:.27,maxFall:5.7,
    bodyHalf:9,bodyHeight:25,waterExposure:.8,leash:W-75};
  const jumpHeight=PHYSICS.jump**2/(2*PHYSICS.gravity);
  // Two favorite treats (or three other treats) distract an animal long enough for an orb.
  const TRUST_TARGET=100, DISTRACTION_SECONDS=12;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const hash=(a,b)=>((a*137+b*991)*(a*17+b*23))>>>0;
  function start(level) {
    const map=level.grid;const width=level.width*TILE,height=level.height*TILE;
    const chapter=level.chapter||{
      id:'custom',name:'Your Own Wonderwood',biome:level.biome||'meadow',intro:'Explore the map you created!',
      goals:level.objects.filter(o=>o.kind.endsWith('Key')).map(o=>({kind:o.kind,name:o.kind.replace('Key',' Gem'),hint:'Find the glowing gem.'})),signs:[]
    };
    const goals=chapter.goals,goalKinds=new Set(goals.map(g=>g.kind));
    const abilityHelp={
      springaroo:'Double jump with Jump; F blows a short petal puff',
      tideling:'Swim with Jump / Down; F launches a small splash',
      skyling:'Tap Jump for each wingbeat; F sends a gentle feather gust',
      mossback:'F launches honey that sticks a creature in place briefly',
      prismtail:'F catches a creature in a floating bubble',
      glimmermoth:'Press F in the air to hover briefly, without gaining height',
      cloudwhisp:'F sends a wind blast that knocks creatures back and stuns them',
      emberkit:'F sends a short-range, harmless stunning spark'
    };
    const callout=document.getElementById('ability-callout');let abilityUntil=0;
    const terrainTint={meadow:{sky:['#5e4fa8','#a078da','#7cdbd5','#fff0a9'],mountains:['#a69eda','#6bb0cb','#368a93'],tree:['#2b6484','#499aa2','#6be1aa'],soil:['#634a74','#795781','#8e6484'],grass:['#68cf8d','#378e80']},
      coast:{sky:['#236b9b','#69b6d7','#72e7db','#fcebbd'],mountains:['#87cfdf','#44a9cc','#2d72a3'],tree:['#2a7393','#3ba3b5','#81e5e1'],soil:['#325477','#387c9f','#598bac'],grass:['#8ad9c3','#4eb1a9']},
      summit:{sky:['#192859','#684caa','#d284cc','#e8b5f7'],mountains:['#7776c4','#6760aa','#424b8c'],tree:['#465b97','#7b7ec4','#c9aef0'],soil:['#4e4779','#66629b','#8178ac'],grass:['#a6a5f4','#827cce']}}[chapter.biome]||null;
    const tint=terrainTint||{sky:['#5e4fa8','#a078da','#7cdbd5','#fff0a9'],mountains:['#a69eda','#6bb0cb','#368a93'],tree:['#2b6484','#499aa2','#6be1aa'],soil:['#634a74','#795781','#8e6484'],grass:['#68cf8d','#378e80']};
    // Precompute eight-neighbor autotile relationships once per immutable level.
    const terrainNeighbors = map.map((row, y) => row.map((kind, x) => {
      const same = (dx, dy) => map[y + dy]?.[x + dx] === kind;
      return {n:same(0,-1),ne:same(1,-1),e:same(1,0),se:same(1,1),
        s:same(0,1),sw:same(-1,1),w:same(-1,0),nw:same(-1,-1),north:map[y-1]?.[x]||'empty'};
    }));
    const at=(x,y)=>map[Math.floor(y/TILE)]?.[Math.floor(x/TILE)]||'empty';
    // Optional fine-grained heightfield: 16-unit semantic cells remain useful
    // for gameplay and AI, but neither slope collisions nor the art are tiled.
    const surfaceY=(x)=>{
      if(!level.surface)return null;
      const cell=clamp(Math.floor(x/TILE),0,level.width-1);
      const fraction=clamp(x/TILE-cell,0,1);
      return (level.surface[cell]*(1-fraction)+level.surface[cell+1]*fraction)*TILE;
    };
    const solid=(x,y)=>y>=height||x<0||x>=width||at(x,y)==='ground'||
      (level.surface && y>=surfaceY(x) && at(x,y)!=='water');
    const liquid=(x,y)=>at(x,y)==='water';
    const thermal=(x,y)=>at(x,y)==='thermal';
    const first=(kind)=>level.objects.find(o=>o.kind===kind);
    const location=(o)=>{
      const x=(o.x+.5)*TILE;
      const rooted=['p1','p2','checkpoint','exit','snack'].includes(o.kind) ||
        (CREATURE[o.kind] && !['skyling','glimmermoth','cloudwhisp'].includes(o.kind) &&
         at(x,(o.y+.5)*TILE)!=='water' && Math.abs(surfaceY(x)-(o.y+1)*TILE)<20);
      return {x,y:rooted && level.surface?surfaceY(x):(o.y+1)*TILE};
    };
    const spawn=first('p1')?location(first('p1')):{x:48,y:height-32};
    const players=Array.from({length:WW.storage.data.settings.players},(_,id)=>{
      const position=location(first(id===0?'p1':'p2')||first('p1')||{x:3+id*2,y:level.height-3});
      return {id,...position,lastSafe:{...position},vx:0,vy:0,grounded:false,coyote:0,jumpBuffer:0,jumpsUsed:0,
        waterTime:0,face:1,health:3,sleep:false,invincible:0,selected:0,selectedFood:0,energy:Object.fromEntries(TYPES.map(t=>[t,0])),
        form:null,caught:null,hover:0,flapCooldown:0,wingbeat:0,actionCD:0,frame:0,hurt:0,
        unlocked:Object.fromEntries(TYPES.map(kind=>[kind,false]))};
    });
    const animals=level.objects.filter(o=>CREATURE[o.kind]).map((o,i)=>({
      kind:o.kind,...location(o),homeX:(o.x+.5)*TILE,homeY:location(o).y,
      dir:i%2?1:-1,alive:true,respawn:0,trust:0,distractedUntil:0,
      eating:0,windup:0,dashTime:0,dashDir:1,chargeCooldown:1+i*.3,phase:i*.9,frame:0,homeDir:i%2?1:-1,
      stunned:0,stuck:0,trapped:0,gustTime:0,gustHit:[],moving:false
    }));
    const items=level.objects.filter(o=>(['snack','starShard','checkpoint','exit'].includes(o.kind)||goalKinds.has(o.kind))).map(o=>{
      const x=(o.x+.5)*TILE;
      // Gate, camp and basket paintings sit on the *actual* sloping ground,
      // not the top of the next whole semantic tile. Keep platform markers
      // at their authored heights instead.
      const paintedFoot={snack:9,checkpoint:8,exit:8}[o.kind];
      const onGround=level.surface&&paintedFoot&&map[o.y+1]?.[o.x]==='ground';
      return {kind:o.kind,x,y:onGround?surfaceY(x)-paintedFoot:(o.y+.5)*TILE,used:false};
    });
    const shared={foods:Object.fromEntries(FOODS.map(f=>[f, f==='berry'?14:6])),keys:Object.fromEntries(goals.map(g=>[g.kind,false])),checkpoint:{...spawn},shards:0,totalShards:level.objects.filter(o=>o.kind==='starShard').length,trails:0,won:false};
    const challenges=(chapter.events||[]).map(e=>({...e,completed:false,active:false,time:0,owner:null,next:0,cooldown:0,lastRunner:null,relay:false}));
    const projectiles=[],lures=[],captures=[],effects=[];
    let cameraX=0,cameraY=0,clock=0,hudTime=0,shake=0,lastLeashHint=-10,signIndex=-1;
    const message=document.getElementById('message');const hud=document.getElementById('hud');
    function say(text,duration=1800) {
      message.textContent=text;message.classList.add('show');
      message.dataset.until=String(clock+Math.min(duration,2200)/1000);
    }
    function showAbility(p){
      if(!p.form){callout.hidden=true;return;}
      callout.innerHTML=`<img src="${WW.art.portrait(p.form)}" alt=""><span><strong>${titles[p.form]}</strong><small>${abilityHelp[p.form]}</small></span>`;
      callout.hidden=false;abilityUntil=clock+2.2;
    }
    function chapterHint(){
      const closest=players[0];if(!chapter.signs)return;
      chapter.signs.forEach((sign,i)=>{
        if(Math.abs(closest.x-sign.x*TILE)<35 && signIndex!==i){
          signIndex=i;say(sign.title,1350);
        }
      });
    }
    function particles(x,y,color,count=9){for(let i=0;i<count;i++)effects.push({x,y,vx:(Math.random()-.5)*3.8,vy:(Math.random()-.7)*3.3,color,time:.55+Math.random()*.6});}
    function throwThing(player,kind){
      if(player.actionCD>0||player.sleep)return;
      if(kind==='orb'){
        WW.audio.play('orb');
        projectiles.push({kind:'orb',owner:player.id,x:player.x+player.face*12,y:player.y-15,
          vx:player.face*6.1,vy:-.35,ttl:1.2,age:0});
        player.actionCD=.33;
        return;
      }
      const choice=FOODS[player.selectedFood],food=FOOD[choice];
      if(!shared.foods[choice]){say('Your basket is empty. Look for a picnic basket.',1800);return;}
      shared.foods[choice]--;WW.audio.play('food');player.actionCD=.28;
      projectiles.push({kind:'food',food:choice,owner:player.id,
        x:player.x+player.face*11,y:player.y-14,vx:player.face*food.speed,vy:-2.2,
        ttl:4,age:0});
    }
    function usePower(player){
      if(!player.form||player.actionCD>0||player.sleep)return;
      const kind=player.form;
      if(kind==='glimmermoth'){
        player.hover=.72;
        player.actionCD=1.35;
        particles(player.x,player.y-12,FORM[kind].color,9);
        return;
      }
      // Every creature has an F-action. These are modest encounter tools;
      // only Springaroo, Tidefox and Moonwing alter major traversal physics.
      const spells={
        springaroo:['petal',4.0,.65,1.0],
        tideling:['splash',4.0,.70,1.1],
        skyling:['feather',4.2,.80,1.2],
        mossback:['honey',3.3,1.25,1.35],
        prismtail:['bubble',3.6,1.30,1.45],
        cloudwhisp:['gust',5.1,.52,1.6],
        emberkit:['spark',4.4,.58,1.0]
      };
      const [projectile,speed,ttl,cooldown]=spells[kind];
      projectiles.push({kind:projectile,owner:player.id,
        x:player.x+player.face*13,y:player.y-14,vx:player.face*speed,
        vy:projectile==='bubble'?-.15:0,age:0,ttl});
      player.actionCD=cooldown;
      particles(player.x+player.face*12,player.y-14,FORM[kind].color,7);
      WW.audio.play('orb');
    }
    function placeFood(pr){
      const heightAt=liquid(pr.x,pr.y)?Math.floor(pr.y/TILE)*TILE:pr.y;
      lures.push({x:pr.x,y:heightAt,food:pr.food,age:0,ttl:24,used:false});
      particles(pr.x,heightAt-2,FOOD[pr.food].color,6);
    }
    function eatFood(animal,lure){
      lure.used=true;animal.eating=.8;
      const favorite=CREATURE[animal.kind].favorite===lure.food;
      animal.trust=Math.min(TRUST_TARGET,animal.trust+(favorite?60:36));
      WW.audio.play('munch');
      particles(animal.x,animal.y-17,FOOD[lure.food].color,9);
      if(animal.trust>=TRUST_TARGET){
        animal.distractedUntil=clock+DISTRACTION_SECONDS;
        WW.audio.play('ready');
        particles(animal.x,animal.y-19,'#ffeab3',20);
        say(titles[animal.kind]+' is happily distracted! Throw an orb before it looks up.',2500);
      }
    }
    function recallParty(destination=spawn){WW.audio.play('recall');
      players.forEach((p,i)=>{p.x=destination.x+i*25;p.y=destination.y;p.vx=p.vy=0;p.waterTime=0;p.lastSafe={x:p.x,y:p.y};p.grounded=false;
        if(p.sleep){p.sleep=false;p.health=3;}p.invincible=2;particles(p.x,p.y-10,'#b9f6ff',24);});
      cameraX=0;cameraY=0;WW.input.reset();say('Camp portal! Your relics, snacks and transformation time are safe.',2800);
    }
    function hitPlayer(player,sourceX=player.x-player.face*20){
      if(player.invincible>0||player.sleep||shared.won)return;
      player.health--;WW.audio.play('hit');player.invincible=1.2;
      player.hurt=.23;player.grounded=false;
      player.vx=sourceX<player.x?3.3:-3.3;
      player.vy=-3.6;shake=6;
      WW.input.rumble(player.id,.78,180);
      particles(player.x,player.y-14,'#ffb8a4',15);
      if(player.health<=0){
        WW.audio.play('sleep');player.sleep=true;player.vx=0;
        say('A little rest! Press Revive to return to your last safe spot.',2600);
      }
    }
    function revive(player,by){WW.audio.play('revive');player.sleep=false;player.hurt=0;player.health=3;player.invincible=2;player.vy=-2;player.waterTime=0;player.x=player.lastSafe.x;player.y=player.lastSafe.y;particles(player.x,player.y-10,'#aafae3',14); WW.input.rumble(by.id,.45,180);say('Back on your feet!');}
    function movePlayer(p,controls,dt){
      const step=dt*60;
      if(p.sleep){
        if(controls.pressed.recall)recallParty();
        else if(controls.pressed.revive)revive(p,p);
        return;
      }
      p.invincible=Math.max(0,p.invincible-dt);
      p.actionCD=Math.max(0,p.actionCD-dt);
      p.hurt=Math.max(0,p.hurt-dt);
      p.previousX=p.x;p.previousY=p.y;
      p.hover=Math.max(0,p.hover-dt);
      p.flapCooldown=Math.max(0,p.flapCooldown-dt);
      p.wingbeat=Math.max(0,p.wingbeat-dt);
      const direction=Number(controls.right)-Number(controls.left);
      if(direction)p.face=direction;
      const swimming=p.form==='tideling' && (liquid(p.x,p.y-8)||liquid(p.x,p.y+2));
      const flying=p.form==='skyling';
      const run=p.form==='springaroo'?2.65:swimming?2.55:PHYSICS.run;
      const water=liquid(p.x,p.y-9)||liquid(p.x,p.y-1);
      // Acceleration gives movement weight without sacrificing the sprint trial.
      const targetSpeed=direction*run*(water&&!swimming?.42:1);
      const traction=direction?(p.grounded?.52:.34):(p.grounded?.65:.32);
      if(!p.hurt)p.vx+=clamp(targetSpeed-p.vx,-traction*step,traction*step);
      if(!direction&&!p.hurt&&Math.abs(p.vx)<.08)p.vx=0;
      if(swimming){
        p.vy=(Number(controls.down)-Number(controls.jump))*2.45;
        p.coyote=0;p.jumpBuffer=0;p.jumpsUsed=0;
      }else if(water){
        p.vy=Math.min(2.4,p.vy+.14*step);
        p.coyote=0;p.jumpBuffer=0;
      }else{
        p.coyote=p.grounded?.105:Math.max(0,p.coyote-dt);
        p.jumpBuffer=controls.pressed.jump?.12:Math.max(0,p.jumpBuffer-dt);
        if(p.jumpBuffer>0 && (p.coyote>0 || (p.form==='springaroo' && p.jumpsUsed<2))){
          const second=p.coyote<=0;
          p.vy=-(second?PHYSICS.doubleJump:PHYSICS.jump);WW.audio.play(second?'double':'jump');
          p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.jumpsUsed++;
          if(second){particles(p.x,p.y-5,'#f6e190',13);WW.input.rumble(p.id,.25,80);}
        }else if(flying && controls.pressed.jump && p.flapCooldown===0){
          // Each released-and-repressed wingbeat adds an impulse; holding Jump
          // never generates free lift. The cooldown keeps rapid taps consistent.
          p.vy=Math.max(-4.9,p.vy-3.65);
          p.flapCooldown=.15;p.wingbeat=.23;p.jumpBuffer=0;
          WW.audio.play('double');
          particles(p.x-p.face*8,p.y-14,'#e9f0ff',5);
        }
        // Releasing early makes a short hop for grounded forms.
        if(controls.released.jump&&p.vy< -1&&!flying)p.vy*=.56;
        if(flying && (thermal(p.x,p.y-8)||thermal(p.x,p.y-20)))
          p.vy=Math.max(-3.5,p.vy-.18*step);
        p.vy=Math.min(PHYSICS.maxFall,p.vy+PHYSICS.gravity*step);
        if(p.form==='glimmermoth'&&p.hover>0&&p.vy>1.45)p.vy=1.45;
      }
      let nx=p.x+p.vx*step;
      const half=PHYSICS.bodyHalf, upper=PHYSICS.bodyHeight;
      const slopeFoot=level.surface?Math.min(surfaceY(nx-half+2),surfaceY(nx+half-2)):null;
      const walkSlope=p.grounded&&!water&&slopeFoot!==null&&Math.abs(slopeFoot-p.y)<9;
      const feet=walkSlope?slopeFoot:p.y;
      if(p.vx>0&&(solid(nx+half,feet-3)||solid(nx+half,feet-upper)))
        nx=Math.floor((nx+half)/TILE)*TILE-half-1;
      if(p.vx<0&&(solid(nx-half,feet-3)||solid(nx-half,feet-upper)))
        nx=(Math.floor((nx-half)/TILE)+1)*TILE+half+1;
      if(walkSlope&&Math.abs(nx-(p.x+p.vx*step))<.1)p.y=slopeFoot;
      // Shared-camera co-op: neither player may strand another outside the viewport.
      for(const other of players)if(other!==p){
        const limited=clamp(nx,other.x-PHYSICS.leash,other.x+PHYSICS.leash);
        if(limited!==nx&&clock-lastLeashHint>3){say('Stay together! Wait for your teammate.',1200);lastLeashHint=clock;}
        nx=limited;
      }
      p.x=clamp(nx,half+1,width-half-1);
      let ny=p.y+p.vy*step;
      const wasGrounded=p.grounded,landingSpeed=p.vy;
      // Floating platforms are one-way. Continuous slope surfaces provide
      // sub-tile landing and downhill following without staircase collisions.
      const platformAt=(x)=>at(x,ny)==='platform' && p.y<=Math.floor(ny/TILE)*TILE;
      const floorY=level.surface?Math.min(surfaceY(p.x-half+2),surfaceY(p.x+half-2)):null;
      const onSlope=floorY!==null&&p.y<=floorY+9&&ny>=floorY&&
        !liquid(p.x,p.y-2) && !liquid(p.x,ny-2);
      if(p.vy>=0&&(onSlope||solid(p.x-half+2,ny)||solid(p.x+half-2,ny)||
          platformAt(p.x-half+2)||platformAt(p.x+half-2))){
        ny=onSlope?floorY:Math.floor(ny/TILE)*TILE;
        p.vy=0;p.grounded=true;p.jumpsUsed=0;
      }else p.grounded=false;
      if(p.vy<0&&(solid(p.x-half+2,ny-upper)||solid(p.x+half-2,ny-upper))){
        ny=(Math.floor((ny-upper)/TILE)+1)*TILE+upper;p.vy=0;
      }
      p.y=clamp(ny,upper+1,height-8);
      if(p.grounded&&!wasGrounded&&landingSpeed>2.3){
        particles(p.x,p.y-1,chapter.biome==='coast'?'#b1f4e8':'#d8d5aa',6);
        WW.audio.play('land');
      }
      const nowWater=liquid(p.x,p.y-8)||liquid(p.x,p.y-1);
      if(nowWater && p.form!=='tideling'){
        p.waterTime+=dt;
        if(p.waterTime>=PHYSICS.waterExposure){
          p.waterTime=0;
          // Never allow a character to faint or respawn inside liquid.
          const safe=liquid(p.lastSafe.x,p.lastSafe.y-9)?spawn:p.lastSafe;
          p.x=safe.x;p.y=safe.y;p.vx=p.vy=0;p.invincible=0;
          hitPlayer(p);
          say('Deep water! Catch a Tidefox to swim and dive.',2400);
        }
      } else {
        p.waterTime=0;
        if(p.grounded&&!nowWater&&!liquid(p.x+14,p.y-8)&&!liquid(p.x-14,p.y-8))p.lastSafe={x:p.x,y:p.y};
      }
      if(controls.pressed.snack){if(p.form)usePower(p);else throwThing(p,'food');}
      if(controls.pressed.orb)throwThing(p,'orb');
      if(controls.pressed.foodCycle){p.selectedFood=(p.selectedFood+1)%FOODS.length;const food=FOODS[p.selectedFood];say(`P${p.id+1}: ${FOOD[food].name} · ${shared.foods[food]} left`,1350);}
      if(controls.pressed.transform){
        if(p.form){p.form=null;p.hover=0;callout.hidden=true;say('Back to explorer form. F throws food again.',1500);}
        else if(p.caught){
          p.form=p.caught;p.hover=0;WW.audio.play('morph');WW.input.rumble(p.id,.35,180);
          particles(p.x,p.y-10,FORM[p.form].color,24);
          showAbility(p);say(titles[p.form]+' power! '+FORM[p.form].power+'.',1900);
        }else say('Offer fruit, then catch a distracted creature with G to gain its power.',1800);
      }
      if(controls.pressed.recall)recallParty();
      if(controls.pressed.revive)for(const other of players)if(other!==p&&other.sleep&&distance(other,p)<48)revive(other,p);
      p.frame+=dt*(p.grounded?Math.abs(p.vx)*5+1:7);
    }
    function targetFor(animal){
      return players.filter(p=>!p.sleep).sort((a,b)=>distance(a,animal)-distance(b,animal))[0];
    }
    function nearbyFood(animal){
      return lures.filter(food=>!food.used&&food.ttl>0&&Math.abs(food.x-animal.homeX)<180)
        .filter(food=>Math.abs(food.x-animal.x)<170&&Math.abs(food.y-animal.y)<100)
        .sort((a,b)=>Math.hypot(a.x-animal.x,a.y-animal.y)-Math.hypot(b.x-animal.x,b.y-animal.y))[0];
    }
    function standingHeight(x,fallback){
      const tileX=clamp(Math.floor(x/TILE),0,level.width-1);
      if(level.surface)return surfaceY(x);
      const row=map.findIndex(line=>line[tileX]==='ground');
      return row>=0?row*TILE:fallback;
    }
    function knockOut(animal,player){
      animal.alive=false;animal.respawn=7;animal.windup=0;animal.dashTime=0;
      player.vy=-4.7;player.grounded=false;player.coyote=0;player.jumpsUsed=0;
      player.invincible=Math.max(player.invincible,.2);
      WW.audio.play('jump');
      particles(animal.x,animal.y-22,'#fff0bc',13);
    }
    function updateAnimals(dt){
      const step=dt*60;
      for(const a of animals){
        if(!a.alive){
          a.respawn-=dt;
          if(a.respawn<=0){
            a.alive=true;a.trust=0;a.distractedUntil=0;a.eating=0;
            a.stunned=0;a.stuck=0;a.trapped=0;a.x=a.homeX;a.y=a.homeY;
          }
          continue;
        }
        a.phase+=dt;
        a.chargeCooldown=Math.max(0,a.chargeCooldown-dt);
        a.stunned=Math.max(0,a.stunned-dt);
        a.stuck=Math.max(0,a.stuck-dt);
        a.trapped=Math.max(0,a.trapped-dt);
        a.eating=Math.max(0,a.eating-dt);
        const target=targetFor(a),food=nearbyFood(a);
        const distracted=a.distractedUntil>clock,peaceful=!!food||a.eating>0||distracted;
        const incapacitated=a.stunned>0||a.stuck>0||a.trapped>0;
        const near=target&&Math.abs(target.x-a.x)<100&&Math.abs(target.y-a.y)<44;
        const flying=['skyling','glimmermoth','cloudwhisp'].includes(a.kind);
        const aquatic=a.kind==='tideling'&&liquid(a.x,a.y-10);
        const speed={
          springaroo:.88,tideling:.71,skyling:.83,mossback:.39,
          prismtail:1.45,glimmermoth:1.18,cloudwhisp:.56,emberkit:.68
        }[a.kind];
        const patrol={
          springaroo:49,tideling:48,skyling:64,mossback:38,
          prismtail:73,glimmermoth:62,cloudwhisp:56,emberkit:46
        }[a.kind];
        let desiredX=a.homeX+a.dir*patrol,rate=speed;
        // Fixed patrol bounds and visible windups make hazards learnable.
        if(!peaceful&&!incapacitated){
          if(a.kind==='emberkit'||a.kind==='prismtail'){
            if(a.dashTime>0){
              a.dashTime=Math.max(0,a.dashTime-dt);
              desiredX=a.x+a.dashDir*100;rate=a.kind==='emberkit'?3.45:3.05;
            }else if(a.windup>0){
              a.windup=Math.max(0,a.windup-dt);desiredX=a.x;rate=0;
              if(a.windup===0){
                a.dashDir=a.kind==='emberkit'?(target&&target.x<a.x?-1:1):
                  (target&&target.x<a.x?1:-1);
                a.dashTime=a.kind==='emberkit'?.36:.4;
                a.chargeCooldown=a.kind==='emberkit'?2.65:2.9;
                particles(a.x,a.y-17,CREATURE[a.kind].color,9);
              }
            }else if(near&&a.chargeCooldown===0){
              a.windup=a.kind==='emberkit'?.52:.43;desiredX=a.x;rate=0;
              a.dir=target.x<a.x?-1:1;
            }else if(a.kind==='emberkit'&&near){
              desiredX=target.x;rate=.83;
            }else if(a.kind==='prismtail'&&near){
              desiredX=a.x+(a.x<target.x?-75:75);
              rate=1.55;
            }
          }
          if(a.kind==='cloudwhisp'){
            if(a.windup>0){
              a.windup=Math.max(0,a.windup-dt);desiredX=a.x;rate=0;
              if(a.windup===0){a.gustTime=.35;a.gustHit=[];a.chargeCooldown=3.1;}
            }else if(near&&a.chargeCooldown===0){
              a.windup=.65;desiredX=a.x;rate=0;
              a.dir=target.x<a.x?-1:1;
            }
          }
          if(a.kind==='glimmermoth'&&near){
            desiredX=a.x+(a.x<target.x?-80:80);rate=1.45;
          }
        }
        if(peaceful){a.windup=0;a.dashTime=0;a.gustTime=0;}
        if(food&&!distracted&&a.eating===0){
          desiredX=food.x;rate=a.kind==='mossback'?.78:1.18;
        }
        if(a.eating>0||distracted||incapacitated){desiredX=a.x;rate=0;a.windup=0;a.dashTime=0;}
        // Turn at a known leash bound; do not walk over water, cliffs or into walls.
        if(!food&&!near&&Math.abs(a.x-a.homeX)>=patrol-1){
          a.dir=a.x>=a.homeX?-1:1;
          desiredX=a.homeX+a.dir*patrol;
        }
        const beforeX=a.x;
        const dx=clamp(desiredX-a.x,-rate*step,rate*step);
        const candidate=clamp(a.x+dx,a.homeX-125,a.homeX+125);
        const floor=standingHeight(candidate,a.homeY);
        const blocked=aquatic?!liquid(candidate,a.y-10):
          !flying&&(!Number.isFinite(floor)||liquid(candidate,floor-6)||
          Math.abs(floor-a.homeY)>33||solid(candidate,a.y-16));
        if(!blocked){
          a.x=candidate;
          if(dx&&(!food||!incapacitated))a.dir=dx>0?1:-1;
        }else if(!food){a.dir*=-1;a.windup=0;a.dashTime=0;}
        a.moving=Math.abs(a.x-beforeX)>.1;
        if(a.trapped>0){
          a.y=Math.max(a.homeY-47,a.y-.82*step);
          a.moving=false;
        }else if(flying||aquatic){
          const floatY=a.homeY+Math.sin(a.phase*(a.kind==='skyling'?2.2:1.45))*7;
          const wanted=food?food.y-16:floatY;
          a.y+=(wanted-a.y)*Math.min(1,dt*3.6);
        }else{
          const groundY=Math.min(floor,a.homeY+20);
          const bounce=a.kind==='springaroo'?Math.abs(Math.sin(a.phase*4.9))*11:
            a.kind==='prismtail'?Math.abs(Math.sin(a.phase*8))*3:
            a.kind==='emberkit'?Math.abs(Math.sin(a.phase*3.4))*4:1.2*Math.abs(Math.sin(a.phase*2));
          a.y+=(groundY-bounce-a.y)*Math.min(1,dt*18);
        }
        a.frame+=dt*(a.moving?11:5);
        if(food&&!distracted&&a.eating===0&&a.trapped===0&&
            Math.abs(a.x-food.x)<18&&Math.abs(a.y-12-food.y)<37){
          eatFood(a,food);
        }
        // A precise descending head stomp is safe, rewards a bounce, and
        // sends the animal to rest for a few seconds rather than harming it.
        const stomp=players.find(p=>!p.sleep&&p.vy>0.6&&
          Math.abs(p.x-a.x)<17&&p.previousY<=a.y-23&&p.y>=a.y-27&&p.y<a.y-12);
        if(stomp&&!incapacitated){knockOut(a,stomp);continue;}
        if(incapacitated||peaceful)continue;
        if(a.kind==='cloudwhisp'&&a.gustTime>0){
          a.gustTime=Math.max(0,a.gustTime-dt);
          for(const p of players){
            if(!p.sleep&&!a.gustHit.includes(p.id)&&
                (p.x-a.x)*a.dir>0&&(p.x-a.x)*a.dir<87&&Math.abs(p.y-a.y)<37){
              p.vx=a.dir*3.8;p.vy=Math.min(p.vy,-1.4);
              a.gustHit.push(p.id);
              particles(p.x,p.y-13,'#c4f4ff',8);
            }
          }
        }
        // Charge and dash are the only damaging animal contact. Other
        // species are obstacles or skittish wildlife, never random bullets.
        const danger=a.kind==='emberkit'||(a.kind==='prismtail'&&a.dashTime>0);
        if(danger){
          for(const p of players){
            if(!p.sleep&&Math.abs(p.x-a.x)<18&&p.y>a.y-27&&p.y-25<a.y+1){
              hitPlayer(p,a.x);
            }
          }
        }
      }
    }
    function capture(animal,owner){
      const species=CREATURE[animal.kind];
      if(animal.distractedUntil<=clock){
        WW.audio.play('miss');
        say(species.name+' is not distracted. Leave two '+FOOD[species.favorite].name+' treats nearby.',2100);
        return;
      }
      animal.alive=false;animal.respawn=17;animal.windup=0;animal.dashTime=0;
      const player=players[owner];
      // Only the MOST RECENTLY captured species may be selected.
      for(const type of TYPES)player.unlocked[type]=false;
      player.unlocked[animal.kind]=true;
      player.caught=animal.kind;player.selected=TYPES.indexOf(animal.kind);
      player.form=null;player.hover=0;callout.hidden=true;
      captures.push({x:animal.x,y:animal.y-16,age:0,color:species.color,kind:animal.kind});
      WW.audio.play('catch');
      WW.input.rumble(owner,.55,270);shake=2.5;
      particles(animal.x,animal.y-15,species.color,30);
      say(species.name+' befriended! Your latest friend replaces the previous one. Press T to transform.',3100);
    }
    function affectAnimal(a,pr){
      if(pr.kind==='honey')a.stuck=Math.max(a.stuck,3.4);
      else if(pr.kind==='bubble')a.trapped=Math.max(a.trapped,2.8);
      else if(pr.kind==='gust'){
        a.stunned=Math.max(a.stunned,1.45);
        a.x=clamp(a.x+Math.sign(pr.vx)*29,a.homeX-125,a.homeX+125);
      }else if(pr.kind==='spark')a.stunned=Math.max(a.stunned,.9);
      else {
        a.stunned=Math.max(a.stunned,.32);
        a.x=clamp(a.x+Math.sign(pr.vx)*12,a.homeX-125,a.homeX+125);
      }
      a.windup=0;a.dashTime=0;a.gustTime=0;
      WW.audio.play('hit');
      particles(a.x,a.y-16,CREATURE[a.kind].color,12);
    }
    function updateProjectiles(dt){
      const step=dt*60;
      for(let i=projectiles.length-1;i>=0;i--){
        const pr=projectiles[i],oldY=pr.y;
        pr.age+=dt;pr.ttl-=dt;
        pr.x+=pr.vx*step;pr.y+=pr.vy*step;
        pr.vy+=(pr.kind==='food'?.20:pr.kind==='orb'?.045:
          pr.kind==='bubble'?-.012:0)*step;
        if(pr.kind==='food'&&FOOD[pr.food].method==='float'){
          pr.vy=Math.min(pr.vy,2.2);pr.x+=Math.sin(pr.age*9)*.5;
        }
        const floorHit=solid(pr.x,pr.y)||
          (at(pr.x,pr.y)==='platform'&&oldY<=Math.floor(pr.y/TILE)*TILE);
        const waterHit=pr.kind==='food'&&liquid(pr.x,pr.y);
        if(pr.ttl<=0||floorHit||waterHit){
          if(pr.kind==='food'&&pr.ttl>0)placeFood(pr);
          projectiles.splice(i,1);continue;
        }
        if(pr.kind!=='food'){
          const a=animals.find(a=>a.alive&&Math.abs(pr.x-a.x)<18&&Math.abs(pr.y-(a.y-14))<23);
          if(a){
            if(pr.kind==='orb')capture(a,pr.owner);
            else affectAnimal(a,pr);
            projectiles.splice(i,1);
          }
        }
      }
      for(let i=lures.length-1;i>=0;i--){
        lures[i].age+=dt;lures[i].ttl-=dt;
        if(lures[i].used||lures[i].ttl<=0)lures.splice(i,1);
      }
      for(let i=captures.length-1;i>=0;i--){
        captures[i].age+=dt;
        if(captures[i].age>1.05)captures.splice(i,1);
      }
    }
    function updateChallenges(dt){
      for(const c of challenges){
        if(c.type==='trail'){
          if(c.completed)continue;
          c.cooldown=Math.max(0,c.cooldown-dt);
          if(c.active){
            c.time=Math.max(0,c.time-dt);
            if(c.time===0||players.every(p=>p.sleep)){
              c.active=false;c.owner=null;c.next=0;c.cooldown=1.2;c.lastRunner=null;c.relay=false;
              say('The rings faded. Touch the first glow to retry.',1600);
              continue;
            }
          }
          for(const p of players){
            if(p.sleep||c.cooldown>0)continue;
            const node=c.nodes[c.active?c.next:0];
            if(Math.abs(p.x-node[0]*TILE)>17||Math.abs(p.y-13-node[1]*TILE)>22)continue;
            if(!c.active){
              c.active=true;c.owner=p.id;c.time=c.seconds;c.next=1;c.lastRunner=p.id;c.relay=false;
              WW.audio.play('ready');particles(node[0]*TILE,node[1]*TILE,'#c9f6ff',12);
              say(c.name+' — follow the glowing rings!',1650);
            }else{
              if(p.id!==c.lastRunner)c.relay=true;
              c.lastRunner=p.id;c.next++;WW.audio.play('gem');
              particles(node[0]*TILE,node[1]*TILE,'#ffeab1',13);
              if(c.next===c.nodes.length){
                c.completed=true;c.active=false;c.owner=null;
                const bonus=c.relay?4:3;
                shared.trails++;shared.foods.star+=bonus;
                players.forEach(player=>{if(!player.sleep)player.health=Math.min(3,player.health+1);});
                WW.input.rumble(p.id,.6,220);
                particles(node[0]*TILE,node[1]*TILE,'#fff6bd',26);
                say((c.relay?'Team':'Wonder')+' Trail complete! +'+bonus+' Stardrops and a heart.',2200);
              }
            }
            break;
          }
          continue;
        }
        if(c.type!=='sprint'||c.completed)continue;
        if(c.active){
          c.time=Math.max(0,c.time-dt);
          if(c.time<=0){c.active=false;c.owner=null;say('The crystal timer expired. Run through the starting arch to retry!',2100);}
        }
        for(const p of players){
          if(p.sleep)continue;
          if(!c.active&&p.previousX<c.start*TILE&&p.x>=c.start*TILE){
            c.active=true;c.owner=p.id;c.time=c.seconds;
            say(`SPEED TRIAL! Reach the glowing arch in ${c.seconds}s!`,2300);
          }
          if(c.active&&p.id===c.owner&&p.previousX<c.finish*TILE&&p.x>=c.finish*TILE){
            c.completed=true;c.active=false;WW.audio.play('gem');WW.input.rumble(p.id,.55,200);
            particles(p.x,p.y-12,'#ffd78e',32);
            say('SPEED TRIAL COMPLETE! The Prism Gem has awakened.',3000);
          }
        }
      }
    }
    function updateItems(){
      items.forEach(item=>{
        if(item.used&&item.kind==='snack'&&clock>=item.respawn)item.used=false;
        if(item.used)return;
        const p=players.find(p=>!p.sleep&&Math.abs(p.x-item.x)<20&&Math.abs((p.y-13)-item.y)<28);
        if(!p)return;
        if(item.kind==='snack'){
          item.used=true;item.respawn=clock+11;
          for(const food of FOODS)shared.foods[food]+=food==='berry'?4:2;
          say('Picnic basket! Restocked every kind of magic treat.');WW.input.rumble(p.id,.25,100);particles(item.x,item.y,'#ffb7ce',18);
        }
        else if(goalKinds.has(item.kind)){
          const challenge=challenges.find(c=>c.goal===item.kind&&!c.completed);
          if(challenge){
            if(clock>(item.lastHint||0)+2){
              item.lastHint=clock;say(challenge.type==='sprint'?'Run the crystal speed trial first!':'Befriend two Emberkits to awaken this gem!',2500);
            }
            return;
          }
          WW.audio.play('gem');item.used=true;shared.keys[item.kind]=true;
          const goal=goals.find(g=>g.kind===item.kind);
          say(`${goal.name} found! ${goals.filter(g=>shared.keys[g.kind]).length}/${goals.length} relics collected.`,2600);
          WW.input.rumble(p.id,.8,340);particles(item.x,item.y,'#ffec94',32);
        }
        else if(item.kind==='starShard'){
          item.used=true;shared.shards++;shared.foods.star+=2;WW.audio.play('gem');
          WW.input.rumble(p.id,.35,110);particles(item.x,item.y,'#faffbc',18);
          say(`Star shard ${shared.shards}/${shared.totalShards}! +2 Stardrops. Bonus treasure!`,1550);
        }
        else if(item.kind==='checkpoint'){
          shared.checkpoint={x:item.x,y:item.y+8};item.used=true;
          players.forEach(player=>player.health=3);
          WW.audio.play('checkpoint');
          particles(item.x,item.y-8,'#abf5cb',22);
          say('Campfire reached! Checkpoint saved and hearts restored.',2400);
        }
        else if(item.kind==='exit'){
          if(goals.every(g=>shared.keys[g.kind])){
            shared.won=true;const progress=WW.storage.data.progress;
            progress.wins=(progress.wins||0)+1;progress.bestShards=Math.max(progress.bestShards||0,shared.shards);
            progress.chapters||={};progress.chapters[chapter.id]=Math.max(progress.chapters[chapter.id]||0,shared.shards);
            progress.trails||={};progress.trails[chapter.id]=Math.max(progress.trails[chapter.id]||0,shared.trails);
            WW.storage.save();WW.audio.play('win');WW.main.win(progress.wins,shared.shards,shared.totalShards,shared.trails);
          }
          else if(clock>(item.lastHint||0)+2){item.lastHint=clock;say(`Gate locked: ${goals.filter(g=>!shared.keys[g.kind]).map(g=>g.name).join(' · ')||'All relics ready!'}`,2600);}
        }
      });
    }
    function update(dt){
      if(shared.won)return;
      dt=Math.min(dt,.045);clock+=dt; shake=Math.max(0,shake-dt*18);
      for(let i=0;i<players.length;i++)movePlayer(players[i],WW.input.read(i),dt);
      updateAnimals(dt);updateProjectiles(dt);updateChallenges(dt);updateItems();chapterHint();
      if(clock>abilityUntil)callout.hidden=true;
      effects.forEach(e=>{e.x+=e.vx*dt*60;e.y+=e.vy*dt*60;e.vy+=.09*dt*60;e.time-=dt;});
      for(let i=effects.length-1;i>=0;i--)if(effects[i].time<=0)effects.splice(i,1);
      const active=players.filter(p=>!p.sleep);const focus=active.length?active:players;
      const xs=players.map(p=>p.x);
      const minX=Math.min(...xs),maxX=Math.max(...xs);
      // The desired camera position must contain *all* players plus a margin.
      const targetX=clamp((minX+maxX)/2-W/2,maxX-(W-30),minX-30);
      const desiredX=clamp(targetX+(players.length===1?players[0].vx*14:0),0,Math.max(0,width-W));
      const smoothingX=Math.abs(desiredX-cameraX)>W*.85?1:Math.min(1,dt*10);
      cameraX+=(desiredX-cameraX)*smoothingX;
      const minY=Math.min(...players.map(p=>p.y)),maxY=Math.max(...players.map(p=>p.y));
      const desiredY=clamp((minY+maxY)/2-H*.73,0,Math.max(0,height-H));
      const smoothingY=Math.abs(desiredY-cameraY)>H*.9?1:Math.min(1,dt*8);
      cameraY+=(desiredY-cameraY)*smoothingY;
      if(clock>+(message.dataset.until||0))message.classList.remove('show');
      if(clock-hudTime>.16){
        hudTime=clock;
        hud.innerHTML=`
          <div class="compact-players">${players.map(p=>{
            const chosen=p.caught,food=FOODS[p.selectedFood];
            const display=p.form||chosen||'hero';
            return `<div class="compact-player p${p.id+1}" title="Player ${p.id+1}">
              <b>P${p.id+1}</b><span class="mini-hearts">${'♥'.repeat(p.health)}${'♡'.repeat(3-p.health)}</span>
              <span class="mini-form ${p.form?'morphed':''}" title="${titles[display]||'Explorer'}">
                <img src="${WW.art.portrait(display)}" alt="${titles[display]||'Explorer'}">
              </span>
              <span class="mini-food" title="${p.form?FORM[p.form].power:FOOD[food].name}">
                ${p.form?'✦':'<img src="'+WW.art.foodIcon(food)+'" alt="">×'+shared.foods[food]}
              </span>
            </div>`;
          }).join('')}</div>
          <div class="compact-quest" title="${chapter.name}">
            <span class="quest-gem ${goals.every(g=>shared.keys[g.kind])?'found':''}">◆</span>
            <small>✦ ${shared.shards}/${shared.totalShards}${shared.trails?' · ✧':''}</small>
          </div>`;
      }
    }
    function box(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
    function background(ctx,time){
      if(WW.scenery.paintBackdrop(ctx,level.art?.background,cameraX,cameraY))return;
      if(WW.scenery.background(ctx,chapter.biome,cameraX)){
        // Each painted biome has its own atmospheric motion: fireflies,
        // refracted sea spray or quiet stars. All effects sit behind collisions.
        ctx.save();
        ctx.globalCompositeOperation='screen';
        for(let i=0;i<27;i++){
          const coast=chapter.biome==='coast',summit=chapter.biome==='summit';
          const speed=coast?8:summit?1.7:4;
          const drift=coast?-time*speed:time*speed;
          const x=((i*113.1-cameraX*.09+drift)%(W+60)+(W+60))%(W+60)-25;
          const y=25+(hash(i,13)%194)+Math.sin(time*(coast?2.4:.9)+i)* (coast?8:4);
          const twinkle=.5+.5*Math.sin(time*(summit?1.8:3)+i*2.5);
          ctx.globalAlpha=.13+.42*twinkle;
          if(coast){
            ctx.fillStyle=i%2?'#d4fffa':'#72dbe9';
            ctx.beginPath();ctx.ellipse(x,y,1.7,.55,-.5,0,Math.PI*2);ctx.fill();
          }else if(summit){
            ctx.strokeStyle=i%3?'#e4d2ff':'#a6f7e9';
            ctx.lineWidth=.65;
            ctx.beginPath();ctx.moveTo(x-2,y);ctx.lineTo(x+2,y);
            ctx.moveTo(x,y-2.5);ctx.lineTo(x,y+2.5);ctx.stroke();
          }else{
            ctx.fillStyle=i%3?'#f8e8ae':'#caffdb';
            ctx.beginPath();ctx.arc(x,y,i%7===0?1.6:.85,0,Math.PI*2);ctx.fill();
          }
        }
        ctx.restore();
        return;
      }
      const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,tint.sky[0]);sky.addColorStop(.30,tint.sky[1]);sky.addColorStop(.72,tint.sky[2]);sky.addColorStop(1,tint.sky[3]);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
      // Layered glowing moon and drifting fireflies make the biome feel enchanted.
      const moon=ctx.createRadialGradient(390,43,5,390,43,56);
      moon.addColorStop(0,'#fff6c9ab');moon.addColorStop(.5,'#e8d5ff45');moon.addColorStop(1,'#e8d5ff00');
      ctx.fillStyle=moon;ctx.fillRect(332,-15,116,116);
      ctx.fillStyle='#fff3bd';ctx.beginPath();ctx.arc(390,43,17,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#e2e9db';ctx.beginPath();ctx.arc(397,35,12,0,Math.PI*2);ctx.fill();
      // Tiny constellations turn the upper sky into a navigable, living backdrop.
      for(let i=0;i<65;i++){
        const drift=cameraX*.1+time*1.9;
        const x=((i*129.1-drift)%(W+30)+W+30)%(W+30);
        const y=19+(hash(i,13)%145)+Math.sin(time*1.4+i)*3;
        const glow=.35+.4*(.5+.5*Math.sin(time*2.4+i*8));
        ctx.globalAlpha=glow;box(ctx,x,y,2+(i%4===0?1:0),2,i%3?'#e4ffca':'#ffcff2');
      }
      ctx.globalAlpha=1;
      // Deep atmospheric perspective keeps the detailed foreground legible.
      for(let layer=0;layer<3;layer++){
        const offset=cameraX*(.12+layer*.2);const base=115+layer*39;const colors=tint.mountains;
        ctx.fillStyle=colors[layer];ctx.beginPath();ctx.moveTo(0,H);
        for(let x=-40;x<W+90;x+=25){const world=x+offset;const height=Math.sin(world*.018+layer)*15+Math.sin(world*.047)*11;ctx.lineTo(x,base+height);}
        ctx.lineTo(W,H);ctx.fill();
        if(layer===2){for(let n=-2;n<20;n++){
          const xx=n*42-(offset*.68%42);const yy=base+8+Math.sin(n*2.1)*9;
          box(ctx,xx+8,yy,5,70,'#356d82');box(ctx,xx-7,yy-15,34,23,'#4baaa1');box(ctx,xx-2,yy-27,24,19,'#6cc7b4');
        }}
      }
      if(chapter.biome==='summit'){
        for(let stripe=0;stripe<5;stripe++){
          ctx.globalAlpha=.10;ctx.fillStyle=stripe%2?'#bbf9ef':'#f8a3f6';ctx.beginPath();
          for(let x=0;x<=W;x+=8){const y=16+stripe*12+Math.sin(x*.017+time*.35+stripe)*13;
            if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
          ctx.lineTo(W,0);ctx.lineTo(0,0);ctx.fill();
        }ctx.globalAlpha=1;
      }
      // Slow luminous ribbons and distant dust establish movement without visual noise.
      if(chapter.biome!=='coast'){
        ctx.save();ctx.globalCompositeOperation='screen';
        for(let band=0;band<3;band++){
          const glow=ctx.createLinearGradient(0,28+band*23,0,95+band*35);
          glow.addColorStop(0,'#b6f4db00');glow.addColorStop(.5,chapter.biome==='summit'?'#e7a9ef18':'#a4f9d619');glow.addColorStop(1,'#b6f4db00');
          ctx.fillStyle=glow;ctx.beginPath();
          for(let x=0;x<=W;x+=12){
            const y=34+band*21+Math.sin(x*.017+time*.22+band*1.7)*14;
            if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
          }
          for(let x=W;x>=0;x-=12)ctx.lineTo(x,79+band*21+Math.sin(x*.017+time*.22+band*1.7)*12);
          ctx.closePath();ctx.fill();
        }
        ctx.restore();
      }
      for(let n=0;n<8;n++){
        const x=((n*108-cameraX*.14+time*1.7)%(W+120)+W+120)%(W+120)-40;
        const y=27+n%3*17;box(ctx,x,y,32,8,'#ede6ff');box(ctx,x+8,y-6,20,11,'#fff7ea');
      }
    }
    function drawLandmarks(ctx,time){
      for(const place of level.landmarks||[]){
        const x=place.x*TILE;
        if(x<cameraX-130||x>cameraX+W+130)continue;
        const row=map.findIndex(line=>line[place.x]==='ground'||line[place.x]==='water');
        if(row<0)continue;
        const foot=level.surface&&map[row][place.x]==='ground'?surfaceY(x):row*TILE;
        ctx.save();ctx.translate(x,foot);
        WW.scenery.landmark(ctx,chapter.biome,place.type,time);
        ctx.restore();
      }
    }
    function groundDetails(ctx,time){
      // Sparse small painted vegetation is distinct from the seamless terrain.
      // Never introduce decorative collision or change the semantic map.
      const themes={
        meadow:['flowers','mushrooms','stones'],
        coast:['reeds','stones','shells'],
        summit:['moonStone','mushrooms','stones']
      };
      const choices=themes[chapter.biome]||themes.meadow;
      const left=Math.max(0,Math.floor(cameraX/TILE)-2);
      const right=Math.min(level.width,Math.ceil((cameraX+W)/TILE)+2);
      for(let x=left;x<right;x++){
        const seed=hash(x,17);
        if(seed%7!==0)continue;
        if(level.surface){
          const groundY=surfaceY(x*TILE+8);
          if(liquid(x*TILE+8,groundY-8))continue;
          const kind=choices[seed%choices.length];
          const w=kind==='stones'?23:kind==='shells'?28:20;
          const h=kind==='reeds'?24:kind==='moonStone'?26:21;
          WW.illustrations.draw(ctx,kind,x*TILE+8,groundY+2,w,h,.9);
          continue;
        }
        for(let y=1;y<level.height;y++){
          if(map[y]?.[x]!=='ground'||map[y-1]?.[x]!=='empty')continue;
          const kind=choices[seed%choices.length];
          const w=kind==='stones'?23:kind==='shells'?28:20;
          const h=kind==='reeds'?24:kind==='moonStone'?26:21;
          WW.illustrations.draw(ctx,kind,x*TILE+8,y*TILE+2,w,h,.9);
          break;
        }
      }
    }
    function terrain(ctx,time){
      const left=Math.max(0,Math.floor(cameraX/TILE)-1),right=Math.min(level.width,Math.ceil((cameraX+W)/TILE)+1);
      const top=Math.max(0,Math.floor(cameraY/TILE)-1),bottom=Math.min(level.height,Math.ceil((cameraY+H)/TILE)+1);
      for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
        const t=map[y][x];if(t==='empty')continue;
        const px=x*TILE,py=y*TILE,h=hash(x,y);
        // The authored slope skin draws one continuous grass line. Suppress
        // coarse ground-tile caps beneath it to avoid floating bright stripes.
        const neighbors=level.surface&&t==='ground'&&terrainNeighbors[y][x].north==='empty'
          ? {...terrainNeighbors[y][x],n:true}:terrainNeighbors[y][x];
        if(WW.scenery.tile(ctx,chapter.biome,t,px,py,h,neighbors,time))continue;
        if(t==='ground'){
          box(ctx,px,py,16,16,tint.soil[0]);box(ctx,px,py+4,16,12,tint.soil[h%2?1:2]);
          if(y===0||map[y-1][x]!=='ground'){
            box(ctx,px,py,16,6,tint.grass[0]);box(ctx,px,py+5,16,2,tint.grass[1]);
            box(ctx,px+2,py-2,3,3,'#a4ed96');box(ctx,px+11,py-1,2,3,'#efffa1');
          }
          // Warm mineral flecks and darker edges give the soil a tactile cut-paper finish.
          if(h%5===0)box(ctx,px+5,py+9,4,2,'#f6ad9b');if(h%7===0)box(ctx,px+12,py+12,2,2,'#c38bd7');
          if(h%23===0){box(ctx,px+8,py+6,3,7,'#7b7bb1');box(ctx,px+9,py+5,1,5,'#b1c9f0');}
        } else if(t==='platform'){
          box(ctx,px,py,16,7,chapter.biome==='summit'?'#7a66b8':'#6659a1');box(ctx,px,py,16,3,chapter.biome==='coast'?'#a9faff':'#b2ffd1');
          box(ctx,px+2,py+7,12,3,'#555583');
          box(ctx,px+5,py+10,6,3,'#7f7dba');
          if(h%3===0){box(ctx,px+5,py-3,2,4,'#aeefcf');box(ctx,px+3,py-5,6,3,'#f4a0cf');}
        } else if(t==='thermal'){
          ctx.globalAlpha=.3+.16*Math.sin(time*3+x*.3);
          box(ctx,px+4+Math.sin(time*4+y)*3,py,7,16,'#7fe1ff');
          box(ctx,px+7+Math.sin(time*6+x)*3,py+4,3,7,'#fff5fc');
          ctx.globalAlpha=1;
        } else if(t==='water'){
          box(ctx,px,py,16,16,chapter.biome==='coast'?(y%2?'#2269b0':'#2689cf'):y%2?'#3b89da':'#3f9fde');
          if(y===0||map[y-1][x]!=='water'){box(ctx,px,py,16,3,'#9be5e1');box(ctx,px+(Math.floor(time*9+x*7)%11),py+1,5,1,'#edf9ce');}
          if(h%6===0)box(ctx,px+5,py+8+Math.sin(time*3+x)*2,2,2,'#8fe4e5');
          if(h%11===0){
            ctx.globalAlpha=.32+.2*Math.sin(time*2.5+x);
            box(ctx,px+2,py+5,9,1,'#c3fff1');box(ctx,px+4,py+11,6,1,'#88dbe6');
            ctx.globalAlpha=1;
          }
        }
      }
      // tiny foreground blossoms, all procedural and repeatable
      for(let x=left;x<right;x++)for(let y=top+1;y<bottom;y++)if(!WW.scenery.ready('tiles')&&map[y]?.[x]==='ground'&&map[y-1]?.[x]==='empty'&&hash(x,y)%8===1){
        const px=x*TILE+6,py=y*TILE-2;box(ctx,px,py-4,2,5,'#3e8269');box(ctx,px-2,py-6,6,3,'#f39cc3');box(ctx,px,py-7,2,2,'#ffea9f');
      }
    }
    function objective(){
      const goal=goals.find(g=>!shared.keys[g.kind]);
      if(goal){
        const active=players[0],kind=goal.form;
        if(kind&&!active.unlocked[kind]){
          const creature=animals.filter(a=>a.alive&&a.kind===kind)
            .sort((a,b)=>distance(a,active)-distance(b,active))[0];
          if(creature)return {
            x:creature.x,y:creature.y,goal:kind,
            name:'BEFRIEND '+titles[kind].toUpperCase(),
            hint:'F: leave '+FOOD[FORM[kind].favorite].name+' · wait for DISTRACTED · G: orb'
          };
        }
        const gem=items.find(item=>item.kind===goal.kind);
        return {x:gem.x,y:gem.y,name:goal.name.toUpperCase(),goal:goal.kind,
          hint:active.form!==kind?'T: become '+titles[kind]+' · '+goal.hint:goal.hint};
      }
      const gate=items.find(item=>item.kind==='exit');
      return {x:gate.x,y:gate.y,name:'RETURN TO THE GATE',hint:'Your light is found · carry it to the gate',goal:'exit'};
    }
    function trailGuide(ctx,now){
      const current=objective(),p=players[0],delta=current.x-p.x;
      // A quiet progress rail replaces constant prose and tile-count readouts.
      const left=W/2-68,top=H-13,bar=124;
      box(ctx,left-5,top-6,bar+10,14,'#102b3c9a');
      box(ctx,left,top,bar,3,'#577476');
      box(ctx,left,top,bar*clamp(p.x/width,0,1),3,'#d9dab7');
      for(const gem of items.filter(item=>goalKinds.has(item.kind))){
        const gx=left+bar*gem.x/width;
        box(ctx,gx-1,top-3,3,9,shared.keys[gem.kind]?'#ffd68b':'#92afb3');
      }
      // A tiny marker on the existing progress rail makes optional routes discoverable.
      for(const c of challenges){
        if(c.type!=='trail')continue;
        const tx=left+bar*clamp(c.nodes[0][0]*TILE/width,0,1);
        box(ctx,tx-2,top-4,5,8,c.completed?'#96ddb4':'#f4d98a');
      }
      for(const player of players){
        const px=left+bar*clamp(player.x/width,0,1);
        box(ctx,px-2,top-2,5,7,player.id===0?'#fff2d7':'#c8b6f4');
      }
      if(Math.abs(delta)>W*.37){
        const right=delta>0,x=right?W-19:19,y=H*.51;
        ctx.globalAlpha=.48+.25*Math.sin(now*3.4);
        ctx.fillStyle='#f6dfa4';ctx.beginPath();
        ctx.moveTo(x+(right?7:-7),y);
        ctx.lineTo(x+(right?-4:4),y-7);
        ctx.lineTo(x+(right?-4:4),y+7);
        ctx.closePath();ctx.fill();ctx.globalAlpha=1;
      }
    }
    function render(ctx,now){
      ctx.setTransform(3,0,0,3,0,0);
      background(ctx,now);
      ctx.save();ctx.translate(Math.round((Math.random()-.5)*shake),Math.round((Math.random()-.5)*shake));ctx.translate(-Math.round(cameraX),-Math.round(cameraY));
      // The panorama is already painted; avoid translucent sprite repeats in mid-air.
      drawLandmarks(ctx,now);terrain(ctx,now);
      if(level.surface){
        const left=Math.max(0,Math.floor(cameraX/TILE)-1);
        const right=Math.min(level.width,Math.ceil((cameraX+W)/TILE)+1);
        for(let x=left;x<right;x++)
          WW.scenery.slope(ctx,chapter.biome,x*TILE,level.surface[x]*TILE,level.surface[x+1]*TILE);
      }
      WW.scenery.paintLayers(ctx,level.art?.foreground,cameraX,cameraY);
      groundDetails(ctx,now);
      for(const sign of chapter.signs||[]){
        const x=sign.x*TILE;if(x<cameraX-65||x>cameraX+W+65)continue;
        const ground=Array.from({length:level.height},(_,y)=>y).find(y=>map[y]?.[sign.x]==='ground');
        if(ground===undefined)continue;
        const y=level.surface?surfaceY(x):ground*TILE;
        WW.props.sign(ctx,x,y,sign.title,chapter.biome,now);
      }
      for(const c of challenges){
        if(c.type!=='sprint')continue;
        for(const [x,word] of [[c.start*TILE,'START'],[c.finish*TILE,'FINISH']]){
          const top=players[0].y-61;
          if(x<cameraX-50||x>cameraX+W+50)continue;
          box(ctx,x-4,top,8,61,c.completed?'#85d5ac':'#9b7ae8');
          box(ctx,x-16,top-7,33,12,c.completed?'#4eaa94':'#6b4eab');
          ctx.fillStyle='#fff2c6';ctx.font='bold 7px sans-serif';ctx.fillText(word,x-12,top+1);
        }
      }
      // Show only the current ring and a faint preview: skill, not HUD prose.
      for(const c of challenges){
        if(c.type!=='trail'||c.completed)continue;
        for(let i=0;i<c.nodes.length;i++){
          const current=i===(c.active?c.next:0);
          if(!current&&i!==(c.active?c.next+1:1))continue;
          const [tileX,tileY]=c.nodes[i],x=tileX*TILE,y=tileY*TILE;
          if(x<cameraX-26||x>cameraX+W+26||y<cameraY-26||y>cameraY+H+26)continue;
          const pulse=Math.sin(now*4+i)*1.2;
          ctx.save();ctx.globalAlpha=current?.95:.36;
          ctx.strokeStyle=current?'#ffedaa':'#a4edff';ctx.lineWidth=current?2.5:1.5;
          ctx.beginPath();ctx.ellipse(x,y,12+pulse,16+pulse,0,0,Math.PI*2);ctx.stroke();
          WW.illustrations.draw(ctx,'spark',x,y+5,16,16);
          ctx.restore();
        }
      }
      items.forEach(it=>{if(it.used&&it.kind!=='checkpoint')return;const bob=Math.sin(now*3+it.x)*2;
        if(it.kind==='snack')WW.props.snack(ctx,it.x,it.y+8+bob,now);
        if(it.kind==='starShard'){
          WW.props.star(ctx,it.x,it.y+bob,now);
        }
        if(goalKinds.has(it.kind)){
          const tint=({springKey:'#ff94d5',skyKey:'#f5dfa9',diveKey:'#91f5ff',prismKey:'#ffaf68',mossKey:'#a7f8a0',cloudKey:'#d9bfff',emberKey:'#ff8d6d'})[it.kind]||'#ffe79f';
          WW.props.light(ctx,it.x,it.y+bob,tint,now);
          ctx.fillStyle='#fff4dd';ctx.font='bold 8px sans-serif';ctx.fillText('LIGHT',it.x-12,it.y-19+bob);
        }
        if(it.kind==='exit'){
          WW.props.gate(ctx,it.x,it.y,goals.every(g=>shared.keys[g.kind]),chapter.biome,now);
        }
        if(it.kind==='checkpoint') {
          WW.props.checkpoint(ctx,it.x,it.y,it.used,chapter.biome,now);
        }
      });
      lures.forEach(lure=>{
        const icon={berry:'berryBush',nectar:'nectarFruit',star:'stardropFruit'}[lure.food];
        WW.illustrations.draw(ctx,icon,lure.x,lure.y+1,19,20);
      });
      animals.forEach(a=>{
        if(!a.alive)return;
        const near=players.some(p=>!p.sleep&&Math.abs(p.x-a.x)<55&&Math.abs(p.y-a.y)<45);
        const species=CREATURE[a.kind],ready=a.distractedUntil>clock;
        // Shadows belong on supporting terrain; flying wildlife cast none.
        if(!['skyling','glimmermoth','cloudwhisp'].includes(a.kind)){
          const col=clamp(Math.floor(a.x/TILE),0,level.width-1);
          const firstRow=Math.max(0,Math.floor((a.y+1)/TILE));
          let surfaceY=null;
          for(let row=firstRow;row<level.height;row++){
            if(map[row][col]==='ground'||map[row][col]==='platform'){
              surfaceY=row*TILE;break;
            }
          }
          if(surfaceY!==null){
            const rise=Math.max(0,surfaceY-a.y);
            if(rise<24){
              ctx.save();
              ctx.globalAlpha=.17*(1-rise/24);
              ctx.fillStyle='#102e3a';
              ctx.beginPath();ctx.ellipse(a.x,surfaceY+.5,11-rise*.16,2.5,0,0,Math.PI*2);ctx.fill();
              ctx.restore();
            }
          }
        }
        // Illustrated status effects stay bound to the animal's location.
        if(a.trapped>0){
          WW.illustrations.draw(ctx,'bubbleTrap',a.x,a.y+5,47,57,.85);
        }
        if(a.stuck>0){
          WW.illustrations.draw(ctx,'honeyPuddle',a.x,a.y+3,42,17,.96);
        }
        WW.art.draw(ctx,a.kind,a.x,a.y,Math.floor(a.frame)%6,a.dir<0,null,{
          action:a.stunned>0?'hurt':a.eating>0?'eat':ready?'happy':a.windup?'alert':a.moving?'run':'idle',time:a.phase
        });
        if(a.stunned>0){
          WW.illustrations.draw(ctx,'spark',a.x-12,a.y-25,17,18,.88);
          WW.illustrations.draw(ctx,'spark',a.x+11,a.y-31,13,15,.77);
        }
        if(a.windup>0&&!ready){
          ctx.save();ctx.globalAlpha=.5+.4*Math.sin(now*19);
          ctx.strokeStyle=a.kind==='cloudwhisp'?'#b5edff':'#ffc78a';
          ctx.lineWidth=2;ctx.setLineDash([4,3]);
          ctx.beginPath();ctx.moveTo(a.x,a.y-12);
          ctx.lineTo(a.x+a.dir*(a.kind==='cloudwhisp'?78:57),a.y-12);
          ctx.stroke();ctx.setLineDash([]);ctx.restore();
        }
        if(a.gustTime>0){
          for(let i=0;i<2;i++){
            ctx.save();ctx.translate(a.x+a.dir*(24+i*23),a.y-13);
            ctx.scale(a.dir,1);
            WW.illustrations.draw(ctx,'gust',0,11,27+i*9,23+i*7,.65);
            ctx.restore();
          }
        }
        if(a.eating>0||ready){
          ctx.fillStyle='#ffeab9';ctx.font='bold 9px sans-serif';
          ctx.fillText('♥',a.x+9,a.y-23-2*Math.sin(now*5));
        }
        if(a.windup&&!a.eating){ctx.fillStyle='#ffd6a2';ctx.font='bold 11px sans-serif';ctx.fillText('!',a.x-3,a.y-32);}
        if(!near)return;
        if(species.capturable){
          if(a.trust>0){
            box(ctx,a.x-19,a.y-39,38,4,'#183a46');
            box(ctx,a.x-18,a.y-38,36*a.trust/TRUST_TARGET,2,ready?'#f7dc94':'#b0e2b5');
          }
          // Keep the illustrated creatures visible; the trail HUD explains food.
          ctx.save();
          ctx.fillStyle=ready?'#ffe9b3':'#f4f2df';
          ctx.font='bold 7px sans-serif';
          ctx.textAlign='center';ctx.shadowColor='#173342';ctx.shadowBlur=2;
          ctx.fillText(ready?'♥ DISTRACTED · G':a.windup>0?'! WINDING UP':
            a.stunned>0?'✦ STUNNED':titles[a.kind],a.x,a.y-45,86);
          ctx.restore();
        }else if(a.kind==='emberkit'){
          ctx.fillStyle='#ffd6a2';ctx.font='bold 8px sans-serif';
          ctx.fillText(a.eating?'♥ SNACK TIME':'! TERRITORIAL',a.x-27,a.y-34);
        }
      });
      captures.forEach(orb=>{
        const t=orb.age/1.05,spin=t*Math.PI*5;
        ctx.save();ctx.translate(orb.x,orb.y);
        ctx.globalAlpha=Math.max(0,1-t);ctx.strokeStyle=orb.color;
        ctx.lineWidth=2.5*(1-t)+.4;
        ctx.beginPath();ctx.arc(0,0,5+25*Math.sin(Math.min(1,t)*Math.PI),spin,spin+Math.PI*1.7);ctx.stroke();
        for(let j=0;j<7;j++){
          const angle=spin+j*Math.PI*2/7;
          const radius=7+22*t;
          ctx.fillStyle=j%2?'#fff3d4':orb.color;
          ctx.fillRect(Math.cos(angle)*radius-2,Math.sin(angle)*radius-2,3,3);
        }
        if(t<.55){
          ctx.globalAlpha=(.55-t)*1.3;
          ctx.save();ctx.scale(1-t*.9,1-t*.9);
          WW.art.draw(ctx,orb.kind,0,13,0,false);
          ctx.restore();
        }
        ctx.globalAlpha=1;
        ctx.fillStyle='#fff4df';ctx.beginPath();ctx.arc(0,0,3+3*(1-t),0,Math.PI*2);ctx.fill();
        ctx.restore();
      });
      projectiles.forEach(pr=>{
        const asset=pr.kind==='food'?
          ({berry:'berryBush',nectar:'nectarFruit',star:'stardropFruit'}[pr.food]):
          ({orb:'bubble',honey:'honey',bubble:'bubble',gust:'gust',
            spark:'spark',petal:'petal',feather:'gust',splash:'splash'}[pr.kind]);
        ctx.save();
        ctx.translate(pr.x,pr.y);
        if(pr.vx<0)ctx.scale(-1,1);
        const wide=['gust','petal','splash','honey'].includes(pr.kind);
        WW.illustrations.draw(ctx,asset,0,wide?11:9,wide?25:19,wide?22:19);
        ctx.restore();
      });
      players.forEach(p=>{
        if(p.sleep){
          WW.art.draw(ctx,'hero',p.x,p.y+8,1,p.face<0,p.id,{action:'sleep',time:now});
          // The dizzy stars are independently animated, never painted onto the KO sprite.
          for(let i=0;i<3;i++){
            const phase=now*2.8+i*Math.PI*2/3;
            const sx=p.x+Math.cos(phase)*14;
            const sy=p.y-29+Math.sin(phase)*5;
            const size=8+(1+Math.sin(phase))*1.7;
            WW.illustrations.draw(ctx,'spark',sx,sy+size/2,size,size,.7+.25*Math.sin(phase)**2);
          }
        }else{
          if(p.form){ctx.save();ctx.globalAlpha=.19+.09*Math.sin(now*5);ctx.fillStyle=FORM[p.form].color;ctx.beginPath();ctx.ellipse(p.x,p.y-13,18,23,0,0,Math.PI*2);ctx.fill();ctx.restore();}
          if(p.invincible<=0||Math.floor(now*15)%2===0)
            WW.art.draw(ctx,p.form||'hero',p.x,p.y,Math.floor(p.frame)%6,p.face<0,p.id,{
              action:p.hurt>0?'hurt':!p.grounded?(p.vy<0?'jump':'fall'):Math.abs(p.vx)>0.25?'run':'idle',
              time:now,grounded:p.grounded
            });
        }
        // Colored player markers remain clear even while transformed.
        box(ctx,p.x-8,p.y-43,16,3,'#152e42');box(ctx,p.x-7,p.y-42,14,2,p.id===0?'#ffd782':'#91d2ff');
        ctx.font='bold 8px sans-serif';ctx.fillStyle='#102b41';ctx.fillText(String(p.id+1),p.x-2,p.y-46);
      });
      effects.forEach(e=>{
        // A larger faint halo lets spell effects read as light, not confetti.
        ctx.globalAlpha=Math.min(.22,e.time*.3);
        box(ctx,e.x-3,e.y-3,9,9,e.color);
        ctx.globalAlpha=1;
        box(ctx,e.x,e.y,3,3,e.color);
      });ctx.restore();
      // Screen-space light and vignette are atmospheric only: no physics or map semantics change.
      const sunlight=ctx.createRadialGradient(W*.46,H*.12,5,W*.46,H*.12,W*.85);
      sunlight.addColorStop(0,chapter.biome==='summit'?'#f6c9ff13':'#fff4c51c');
      sunlight.addColorStop(.6,'#b8f9dd05');sunlight.addColorStop(1,'#08152652');
      ctx.fillStyle=sunlight;ctx.fillRect(0,0,W,H);
      const edge=ctx.createLinearGradient(0,0,0,H);
      edge.addColorStop(0,'#0c1c2e30');edge.addColorStop(.25,'#0c1c2e00');
      edge.addColorStop(.8,'#0c1c2e00');edge.addColorStop(1,'#0b1d3138');
      ctx.fillStyle=edge;ctx.fillRect(0,0,W,H);
      const race=challenges.find(c=>c.type==='sprint'&&c.active);
      if(race){box(ctx,140,32,200,20,'#203252d5');ctx.font='bold 12px sans-serif';ctx.fillStyle='#ffebb9';ctx.fillText(`CRYSTAL DASH: ${race.time.toFixed(1)}s`,164,46);}
      const trail=challenges.find(c=>c.type==='trail'&&c.active);
      if(trail){
        const x=W/2-40;
        box(ctx,x,15,80,4,'#203252b8');
        box(ctx,x,15,80*trail.time/trail.seconds,4,'#ffe4a3');
        for(let i=0;i<trail.nodes.length;i++)
          box(ctx,x+i*25,23,5,5,i<trail.next?'#ffe4a3':'#7097ad');
      }
      trailGuide(ctx,now);
    }
    hud.hidden=false;callout.hidden=true;say(chapter.name,1500);
    return {update,render,recallParty,recallCheckpoint(){recallParty(shared.checkpoint);},stop(){hud.hidden=true;callout.hidden=true;message.classList.remove('show');},get state(){return {chapter,goals,challenges,players,shared,animals,items,projectiles,lures,captures,cameraX,cameraY,objective:objective(),physics:PHYSICS,jumpHeight}}};
  }
  return {start};
})();
