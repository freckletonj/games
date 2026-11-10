window.WW = window.WW || {}; WW.games = WW.games || {};
WW.games.animals = (() => {
  const TILE=16,W=480,H=270, FORM=WW.catalog.forms,FOOD=WW.catalog.foods;
  const TYPES=Object.keys(FORM),FOODS=Object.keys(FOOD);
  const titles=Object.fromEntries(TYPES.map(t=>[t,FORM[t].name]));
  // One world unit is one source-pixel; frames run at 60 Hz. All map jumps obey these rules.
  const PHYSICS={run:2.25,jump:5.7,doubleJump:5.5,gravity:.27,maxFall:5.7,
    bodyHalf:9,bodyHeight:25,waterExposure:.8,leash:W-75};
  const jumpHeight=PHYSICS.jump**2/(2*PHYSICS.gravity);
  // Creatures are caught through preparation and accurate throws, never a dice roll.
  const BOND_THRESHOLD=30;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const hash=(a,b)=>((a*137+b*991)*(a*17+b*23))>>>0;
  function start(level) {
    const map=level.grid;const width=level.width*TILE,height=level.height*TILE;
    const chapter=level.chapter||{
      id:'custom',name:'Your Own Wonderwood',biome:'meadow',intro:'Explore the map you created!',
      goals:level.objects.filter(o=>o.kind.endsWith('Key')).map(o=>({kind:o.kind,name:o.kind.replace('Key',' Gem'),hint:'Find the glowing gem.'})),signs:[]
    };
    const goals=chapter.goals,goalKinds=new Set(goals.map(g=>g.kind));
    const abilityHelp={springaroo:'Press Jump again while airborne · Double jump',skyling:'Hold Jump to fly upward',
      tideling:'In water: Jump swims up · Down dives',cloudwhisp:'Hold Jump while falling to glide',
      prismtail:'Run to sprint through long crossings',mossback:'Your armor blocks incoming magic',
      glimmermoth:'Stand near wary creatures to calm them',emberkit:'Press Down on the ground for a warmth burst'};
    const callout=document.getElementById('ability-callout');let abilityUntil=0;
    const terrainTint={meadow:{sky:['#5e4fa8','#a078da','#7cdbd5','#fff0a9'],mountains:['#a69eda','#6bb0cb','#368a93'],tree:['#2b6484','#499aa2','#6be1aa'],soil:['#634a74','#795781','#8e6484'],grass:['#68cf8d','#378e80']},
      coast:{sky:['#236b9b','#69b6d7','#72e7db','#fcebbd'],mountains:['#87cfdf','#44a9cc','#2d72a3'],tree:['#2a7393','#3ba3b5','#81e5e1'],soil:['#325477','#387c9f','#598bac'],grass:['#8ad9c3','#4eb1a9']},
      summit:{sky:['#192859','#684caa','#d284cc','#e8b5f7'],mountains:['#7776c4','#6760aa','#424b8c'],tree:['#465b97','#7b7ec4','#c9aef0'],soil:['#4e4779','#66629b','#8178ac'],grass:['#a6a5f4','#827cce']}}[chapter.biome]||null;
    const tint=terrainTint||{sky:['#5e4fa8','#a078da','#7cdbd5','#fff0a9'],mountains:['#a69eda','#6bb0cb','#368a93'],tree:['#2b6484','#499aa2','#6be1aa'],soil:['#634a74','#795781','#8e6484'],grass:['#68cf8d','#378e80']};
    const at=(x,y)=>map[Math.floor(y/TILE)]?.[Math.floor(x/TILE)]||'empty';
    const solid=(x,y)=>y>=height||x<0||x>=width||at(x,y)==='ground';
    const liquid=(x,y)=>at(x,y)==='water';
    const first=(kind)=>level.objects.find(o=>o.kind===kind);
    const location=(o)=>({x:(o.x+.5)*TILE,y:(o.y+1)*TILE});
    const spawn=first('p1')?location(first('p1')):{x:48,y:height-32};
    const players=Array.from({length:WW.storage.data.settings.players},(_,id)=>{
      const position=location(first(id===0?'p1':'p2')||first('p1')||{x:3+id*2,y:level.height-3});
      return {id,...position,lastSafe:{...position},vx:0,vy:0,grounded:false,coyote:0,jumpBuffer:0,jumpsUsed:0,
        waterTime:0,face:1,health:3,sleep:false,invincible:0,selected:0,selectedFood:0,energy:Object.fromEntries(TYPES.map(t=>[t,0])),
        form:null,actionCD:0,frame:0,windup:0};
    });
    const animals=level.objects.filter(o=>TYPES.includes(o.kind)).map((o,i)=>({
      kind:o.kind,...location(o),origin:(o.x+.5)*TILE,homeY:(o.y+1)*TILE,
      vy:0,alive:true,respawn:0,wary:100,attackCD:1.4+i*.28,dir:i%2?1:-1,
      phase:i*1.3,frame:0,windup:0,dashTime:0,dashDir:1,hop:0,homeX:(o.x+.5)*TILE,
      behavior:({springaroo:'hopper',skyling:'swooper',tideling:'swimmer',cloudwhisp:'orbiter',prismtail:'sprinter',
        mossback:'guardian',glimmermoth:'shy',emberkit:'stalker'})[o.kind]
    }));
    const items=level.objects.filter(o=>(['snack','starShard','checkpoint','exit'].includes(o.kind)||goalKinds.has(o.kind))).map(o=>({kind:o.kind,x:(o.x+.5)*TILE,y:(o.y+.5)*TILE,used:false}));
    const shared={foods:Object.fromEntries(FOODS.map(f=>[f, f==='berry'?14:6])),keys:Object.fromEntries(goals.map(g=>[g.kind,false])),checkpoint:{...spawn},shards:0,totalShards:level.objects.filter(o=>o.kind==='starShard').length,won:false};
    const challenges=(chapter.events||[]).map(e=>({...e,completed:false,active:false,time:0,owner:null}));
    const projectiles=[],effects=[];let cameraX=0,cameraY=0,clock=0,hudTime=0,shake=0,lastLeashHint=-10,signIndex=-1;
    const message=document.getElementById('message');const hud=document.getElementById('hud');
    function say(text,duration=2100) {message.textContent=text;message.classList.add('show');message.dataset.until=String(clock+duration/1000);}
    function showAbility(p){
      if(!p.form){callout.hidden=true;return;}
      callout.innerHTML=`<img src="${WW.art.portrait(p.form)}" alt=""><span><strong>P${p.id+1} · ${titles[p.form]}</strong><small>${abilityHelp[p.form]} · ${Math.ceil(p.energy[p.form])}s remaining</small></span>`;
      callout.hidden=false;abilityUntil=clock+3.7;
    }
    function chapterHint(){
      const closest=players[0];if(!chapter.signs)return;
      chapter.signs.forEach((sign,i)=>{
        if(Math.abs(closest.x-sign.x*TILE)<35 && signIndex!==i){
          signIndex=i;say(`${sign.title}: ${sign.hint}`,4100);
        }
      });
    }
    function particles(x,y,color,count=9){for(let i=0;i<count;i++)effects.push({x,y,vx:(Math.random()-.5)*3.8,vy:(Math.random()-.7)*3.3,color,time:.55+Math.random()*.6});}
    function throwThing(player,kind){
      if(player.actionCD>0||player.sleep)return;
      if(kind==='orb'){WW.audio.play('orb');
        projectiles.push({kind,owner:player.id,x:player.x+player.face*10,y:player.y-12,vx:player.face*5.4,vy:-.45,ttl:1.25});
        player.actionCD=.45;
        return;
      }
      const choice=FOODS[player.selectedFood],food=FOOD[choice];
      if(shared.foods[choice]<=0){say(`Out of ${food.name}! Try another treat or find a snack bush.`);return;}
      shared.foods[choice]--;WW.audio.play('food');
      player.actionCD=food.method==='spray'?.48:.3;
      if(food.method==='spray'){
        let touched=0;
        for(const a of animals)if(a.alive&&Math.abs(player.x-a.x)<74&&Math.abs(player.y-10-(a.y-10))<38&&player.face*(a.x-player.x)>-8){
          charm(a,food.affection,choice,player.id);touched++;
        }
        for(let i=0;i<16;i++)effects.push({x:player.x+player.face*10,y:player.y-14,vx:player.face*(1+Math.random()*3),vy:(Math.random()-.5)*2,color:'#85fbe7',time:.45});
        if(!touched)say('Nectar mist sparkles ahead. Try near a creature!',1100);
        WW.input.rumble(player.id,.18,90);
        return;
      }
      projectiles.push({kind:'food',food:choice,owner:player.id,x:player.x+player.face*10,y:player.y-11,
        vx:player.face*food.speed,vy:food.method==='straight'?-0.2:food.method==='float'?-2.3:-2.0,
        ttl:food.method==='float'?2.5:1.7,age:0,hit:[]});
    }
    function charm(a,amount,food,owner){
      const favorite=FORM[a.kind].favorite;
      const wasReady=a.wary<=BOND_THRESHOLD;
      const boost=food===favorite?1.7:1;
      a.wary=Math.max(0,a.wary-amount*boost);
      a.attackCD=Math.max(a.attackCD,.55);
      particles(a.x,a.y-14,FOOD[food].color,food===favorite?16:10);
      if(!wasReady&&a.wary<=BOND_THRESHOLD){
        say(`${titles[a.kind]} trusts you! Aim a capture orb (G / X) to borrow its power.`,1900);
        WW.audio.play('ready');
      } else if(food===favorite){
        say(`${titles[a.kind]} loves ${FOOD[food].name}! Keep building trust.`,1350);
      }
    }
    function recallParty(destination=spawn){WW.audio.play('recall');
      players.forEach((p,i)=>{p.x=destination.x+i*25;p.y=destination.y;p.vx=p.vy=0;p.waterTime=0;p.lastSafe={x:p.x,y:p.y};p.grounded=false;
        if(p.sleep){p.sleep=false;p.health=3;}p.invincible=2;particles(p.x,p.y-10,'#b9f6ff',24);});
      cameraX=0;cameraY=0;WW.input.reset();say('Camp portal! Your relics, snacks and transformation time are safe.',2800);
    }
    function hitPlayer(player){
      if(player.invincible>0||player.sleep||shared.won)return;
      player.health--;WW.audio.play('hit');player.invincible=1.5;shake=6; WW.input.rumble(player.id,.95,220);particles(player.x,player.y-10,'#ffb8a4',10);
      if(player.health===0){WW.audio.play('sleep');player.sleep=true;player.vx=0;say(player.id===0?'You fainted! Press Revive to wake up.':'A friend fainted! Move close and press Revive.',3000);}
    }
    function revive(player,by){WW.audio.play('revive');player.sleep=false;player.health=3;player.invincible=2;player.vy=-2;player.waterTime=0;player.x=player.lastSafe.x;player.y=player.lastSafe.y;particles(player.x,player.y-10,'#aafae3',14); WW.input.rumble(by.id,.45,180);say('Back on your feet!');}
    function movePlayer(p,controls,dt){
      const step=dt*60;
      if(p.sleep){
        if(controls.pressed.recall)recallParty();
        else if(controls.pressed.revive)revive(p,p);
        return;
      }
      p.invincible=Math.max(0,p.invincible-dt);
      p.actionCD=Math.max(0,p.actionCD-dt);
      p.previousX=p.x;
      const direction=Number(controls.right)-Number(controls.left);
      if(direction)p.face=direction;
      const swimming=p.form==='tideling' && (liquid(p.x,p.y-8)||liquid(p.x,p.y+2));
      const flying=p.form==='skyling';
      const run=p.form==='prismtail'?4.0:p.form==='springaroo'?2.6:swimming?2.45:PHYSICS.run;
      const water=liquid(p.x,p.y-9)||liquid(p.x,p.y-1);
      // Acceleration gives movement weight without sacrificing the sprint trial.
      const targetSpeed=direction*run*(water&&!swimming?.42:1);
      const traction=direction?(p.grounded?.52:.34):(p.grounded?.65:.32);
      p.vx+=clamp(targetSpeed-p.vx,-traction*step,traction*step);
      if(!direction&&Math.abs(p.vx)<.08)p.vx=0;
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
        }
        // Releasing early makes a short hop; holding yields full jump height.
        if(controls.released.jump&&p.vy< -1&&!flying)p.vy*=.56;
        if(flying && controls.jump) p.vy=Math.max(-2.95,p.vy-.52*step);
        if(p.form==='cloudwhisp'&&controls.jump&&p.vy>0)p.vy=Math.min(p.vy,.78);
        // Starfall thermals lift gliding creatures; other forms cross without being carried.
        if(p.form==='cloudwhisp'&&(at(p.x,p.y-12)==='thermal'||at(p.x,p.y-25)==='thermal')){
          p.vy=Math.max(-2.7,p.vy-.45*step);
          if(Math.floor(clock*8)!==Math.floor((clock-dt)*8))particles(p.x,p.y-15,'#b8f9ff',3);
        }
        p.vy=Math.min(PHYSICS.maxFall,p.vy+PHYSICS.gravity*step);
      }
      let nx=p.x+p.vx*step;
      const half=PHYSICS.bodyHalf, upper=PHYSICS.bodyHeight;
      if(p.vx>0&&(solid(nx+half,p.y-3)||solid(nx+half,p.y-upper)))nx=Math.floor((nx+half)/TILE)*TILE-half-1;
      if(p.vx<0&&(solid(nx-half,p.y-3)||solid(nx-half,p.y-upper)))nx=(Math.floor((nx-half)/TILE)+1)*TILE+half+1;
      // Shared-camera co-op: neither player may strand another outside the viewport.
      for(const other of players)if(other!==p){
        const limited=clamp(nx,other.x-PHYSICS.leash,other.x+PHYSICS.leash);
        if(limited!==nx&&clock-lastLeashHint>3){say('Stay together! Wait for your teammate.',1200);lastLeashHint=clock;}
        nx=limited;
      }
      p.x=clamp(nx,half+1,width-half-1);
      let ny=p.y+p.vy*step;
      const wasGrounded=p.grounded,landingSpeed=p.vy;
      // Floating platforms are one-way: jump through from below, land from above.
      const platformAt=(x)=>at(x,ny)==='platform' && p.y<=Math.floor(ny/TILE)*TILE;
      if(p.vy>=0&&(solid(p.x-half+2,ny)||solid(p.x+half-2,ny)||platformAt(p.x-half+2)||platformAt(p.x+half-2))){
        ny=Math.floor(ny/TILE)*TILE;p.vy=0;p.grounded=true;p.jumpsUsed=0;
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
      if(controls.pressed.snack)throwThing(p,'food');
      if(controls.pressed.orb)throwThing(p,'orb');
      if(controls.pressed.foodCycle){p.selectedFood=(p.selectedFood+1)%FOODS.length;const food=FOODS[p.selectedFood];say(`P${p.id+1}: ${FOOD[food].name} · ${shared.foods[food]} left`,1350);}
      if(controls.pressed.cycle){p.selected=(p.selected+1)%TYPES.length;const type=TYPES[p.selected];say(`P${p.id+1}: ${titles[type]} · ${Math.ceil(p.energy[type])}s stored · ${FORM[type].power}`,1450);}
      if(controls.pressed.transform){
        const type=TYPES[p.selected];
        if(p.form===type){p.form=null;callout.hidden=true;say(`P${p.id+1}: Returned to explorer. Remaining magic saved!`,1450);}
        else if(p.energy[type]>.02){p.form=type;WW.audio.play('morph');WW.input.rumble(p.id,.35,180);particles(p.x,p.y-10,FORM[type].color,24);
          showAbility(p);say(`P${p.id+1} becomes ${titles[type]}! ${FORM[type].power}.`,1700);}
        else say(`P${p.id+1}: Befriend a ${titles[type]} to earn transformation time.`,1500);
      }
      if(p.form){
        p.energy[p.form]=Math.max(0,p.energy[p.form]-dt);
        if(p.energy[p.form]<=0){p.form=null;callout.hidden=true;particles(p.x,p.y-9,'#ffffff',15);say(`P${p.id+1}: Time's up! Catch another creature.`,1850);
          if(nowWater){const safe=liquid(p.lastSafe.x,p.lastSafe.y-9)?spawn:p.lastSafe;p.x=safe.x;p.y=safe.y;p.vy=0;p.invincible=1;}
        }
      }
      if(p.form==='glimmermoth' && Math.floor(clock*5)!==Math.floor((clock-dt)*5)){
        for(const a of animals)if(a.alive&&a.wary>0&&distance(p,a)<76){a.wary=Math.max(0,a.wary-2.7);a.attackCD=Math.max(a.attackCD,.3);particles(a.x,a.y-14,'#f2b8ff',2);}
      }
      if(p.form==='emberkit'&&controls.pressed.down&&p.grounded&&p.actionCD<=0){
        for(const a of animals)if(a.alive&&distance(p,a)<90){a.wary=Math.max(0,a.wary-27);particles(a.x,a.y-14,'#ffc28b',15);}
        p.actionCD=2.2;WW.input.rumble(p.id,.3,120);say('Emberkit released a warmth wave!',1350);
      }
      if(controls.pressed.recall)recallParty();
      if(controls.pressed.revive)for(const other of players)if(other!==p&&other.sleep&&distance(other,p)<48)revive(other,p);
      p.frame+=Math.abs(p.vx)*dt*6;
    }
    function targetFor(animal){return players.filter(p=>!p.sleep).sort((a,b)=>distance(a,animal)-distance(b,animal))[0];}
    function fireAnimalAttack(a,target){
      const dx=target.x-a.x,dy=(target.y-9)-(a.y-9),len=Math.hypot(dx,dy)||1;
      const attacks={skyling:'feather',tideling:'bubble',springaroo:'thorn',cloudwhisp:'gust',
        prismtail:'spark',mossback:'seed',glimmermoth:'starlight',emberkit:'ember'};
      const kind=attacks[a.kind],base=kind==='spark'?3.3:kind==='gust'?1.4:2.0;
      const spreads={feather:[-.4,0,.4],ember:[-.25,.25],seed:[-.22,.22],starlight:[0],thorn:[0],gust:[0],spark:[0],bubble:[-.18,.18]};
      for(const offset of spreads[kind]){
        const c=Math.cos(offset),si=Math.sin(offset);
        projectiles.push({kind,owner:-1,x:a.x,y:a.y-12,
          vx:(dx/len*c-dy/len*si)*base,vy:(dy/len*c+dx/len*si)*base,
          ttl:kind==='gust'?1.7:2.0,age:0});
      }
      particles(a.x,a.y-13,FORM[a.kind].color,5);
    }
    function updateAnimals(dt){
      const step=dt*60;
      for(const a of animals){
        if(!a.alive){a.respawn-=dt;if(a.respawn<=0){a.alive=true;a.wary=100;a.attackCD=2;a.windup=0;a.dashTime=0;}continue;}
        a.phase+=dt;a.frame+=dt*(a.wary>BOND_THRESHOLD?6:3);
        const target=targetFor(a),near=target&&distance(target,a)<175&&a.wary>BOND_THRESHOLD;
        const dx=target?target.x-a.x:0;
        const home=a.homeX,baseY=a.homeY;
        // The eight magical species have distinct movement and combat patterns.
        switch(a.behavior){
          case 'hopper':{
            const hopping=near?Math.abs(Math.sin(a.phase*3.1)):Math.abs(Math.sin(a.phase*1.7));
            a.y=baseY-hopping*(near?23:9);
            a.x=clamp(a.x+(near?Math.sign(dx)*.78:Math.sin(a.phase)*.4)*step,home-47,home+47);
            break;
          }
          case 'swooper':{
            a.x=clamp(a.x+(near?Math.sign(dx)*1.0:Math.cos(a.phase*1.4)*.46)*step,home-85,home+85);
            const dive=near?clamp((target.y-45-baseY)*.4,-22,20):0;
            a.y=baseY+Math.sin(a.phase*2.8)*13+dive;
            break;
          }
          case 'swimmer':
            a.x=home+Math.sin(a.phase*1.35)*35;a.y=baseY+Math.sin(a.phase*3.7)*7;break;
          case 'orbiter':
            a.x=home+Math.cos(a.phase*1.22)*28;a.y=baseY+Math.sin(a.phase*1.8)*21;break;
          case 'sprinter':{
            if(a.dashTime>0){
              a.x=clamp(a.x+a.dashDir*3.6*step,home-89,home+89);
              a.dashTime=Math.max(0,a.dashTime-dt);
              if(target&&Math.abs(target.x-a.x)<21&&Math.abs(target.y-a.y)<24)hitPlayer(target);
            }else if(!near)a.x=home+Math.sin(a.phase*.9)*15;
            else a.x+=clamp(dx*.012,-.6,.6)*step;
            a.y=baseY-2-Math.abs(Math.sin(a.phase*6))*4;
            break;
          }
          case 'guardian':
            a.x=home+Math.sin(a.phase*.65)*4;a.y=baseY;break;
          case 'shy':{
            // Glimmermoths avoid confrontation: approach carefully or use nectar mist.
            if(target&&distance(target,a)<115) a.x=clamp(a.x-Math.sign(dx)*1.25*step,home-67,home+67);
            else a.x+=(home-a.x)*Math.min(.04*step,1);
            a.y=baseY+Math.sin(a.phase*3.2)*12;
            break;
          }
          case 'stalker':{
            a.x=clamp(a.x+(near?Math.sign(dx)*.55:Math.sin(a.phase)*.28)*step,home-52,home+52);
            a.y=baseY-Math.abs(Math.sin(a.phase*2.1))*(near?19:8);
            if(near&&Math.abs(dx)<15&&Math.abs(target.y-a.y)<20)hitPlayer(target);
            break;
          }
        }
        a.dir=target&&near?(dx>=0?1:-1):(Math.cos(a.phase)>=0?1:-1);
        if(a.wary<=BOND_THRESHOLD){a.windup=0;continue;}
        if(a.windup>0){
          a.windup-=dt;
          if(a.windup<=0){
            a.windup=0;
            if(target&&distance(target,a)<220){
              fireAnimalAttack(a,target);
              if(a.behavior==='sprinter'){a.dashTime=.33;a.dashDir=dx>=0?1:-1;}
            }
            a.attackCD=a.behavior==='guardian'?3.4:a.behavior==='shy'?4.8:a.behavior==='swooper'?3.6:2.7;
          }
        }else{
          a.attackCD-=dt;
          if(near&&distance(target,a)<(a.behavior==='guardian'?166:130)&&a.attackCD<=0){
            a.windup=a.behavior==='sprinter'?.72:.48;
          }
        }
      }
    }
    function capture(animal,owner){
      if(animal.wary>BOND_THRESHOLD){
        WW.audio.play('miss');
        particles(animal.x,animal.y-8,'#f4b0dd',7);
        say(`${titles[animal.kind]} is still wary. Try ${FOOD[FORM[animal.kind].favorite].name} to earn its trust!`,1900);
        return;
      }
        WW.audio.play('catch');animal.alive=false;animal.respawn=5;
        for(const c of challenges)if(c.type==='befriend'&&c.kind===animal.kind&&!c.completed){
          c.catches=(c.catches||0)+1;
          if(c.catches>=c.count){c.completed=true;say('Hearth ritual complete! The Ember Gem can now be collected.',3200);}
        }
        players[owner].energy[animal.kind]+=FORM[animal.kind].seconds;players[owner].selected=TYPES.indexOf(animal.kind);
        particles(animal.x,animal.y-8,FORM[animal.kind].color,28);
        WW.input.rumble(owner,.55,290);say(`P${owner+1} befriended ${titles[animal.kind]}! +${FORM[animal.kind].seconds}s of ${FORM[animal.kind].power.toLowerCase()}. Press Transform!`,2800);
    }
    function updateProjectiles(dt){
      for(let i=projectiles.length-1;i>=0;i--){
        const pr=projectiles[i];pr.age=(pr.age||0)+dt;pr.ttl-=dt;
        pr.x+=pr.vx*dt*60;pr.y+=pr.vy*dt*60;
        if(pr.kind==='food'){
          const method=FOOD[pr.food].method;
          if(method==='lob'||method==='splash')pr.vy+=.11*dt*60;
          if(method==='float'){pr.vy=Math.max(-.3,pr.vy+.04*dt*60);pr.x+=Math.sin(pr.age*10)*.7;}
        } else if(pr.kind==='orb')pr.vy+=.045*dt*60;
        if(pr.kind==='seed'||pr.kind==='thorn')pr.vy+=.05*dt*60;
        if(pr.kind==='feather'||pr.kind==='starlight')pr.y+=Math.sin(pr.age*11)*.6;
        if(pr.kind==='bubble'){pr.vy-=.015*dt*60;pr.x+=Math.sin(pr.age*8)*.65;}
        if(pr.kind==='gust'){pr.vx*=Math.pow(.985,dt*60);pr.y+=Math.sin(pr.age*13)*.9;}
        if(pr.kind==='ember'){pr.vx*=Math.pow(1.006,dt*60);pr.vy*=Math.pow(1.006,dt*60);}
        if(pr.ttl<=0||solid(pr.x,pr.y)){
          if(pr.kind==='food'&&FOOD[pr.food].method==='splash')splash(pr);
          projectiles.splice(i,1);continue;
        }
        if(pr.owner>=0){
          const a=animals.find(a=>a.alive&&Math.hypot(pr.x-a.x,pr.y-(a.y-10))<14);
          if(a){projectiles.splice(i,1);if(pr.kind==='food'){
            if(FOOD[pr.food].method==='splash')splash(pr);else charm(a,FOOD[pr.food].affection,pr.food,pr.owner);
          }else capture(a,pr.owner);}
        }else{
          const p=players.find(p=>!p.sleep&&p.invincible<=0&&Math.hypot(pr.x-p.x,pr.y-(p.y-9))<11);
          if(p){projectiles.splice(i,1);if(p.form==='mossback'){
              particles(p.x,p.y-12,'#c9ffd4',9);WW.input.rumble(p.id,.15,80);
            }else hitPlayer(p);}
        }
      }
    }
    function splash(pr){for(const a of animals)if(a.alive&&Math.hypot(a.x-pr.x,a.y-11-pr.y)<46)charm(a,FOOD.honey.affection,'honey',pr.owner);
      particles(pr.x,pr.y,'#ffcd75',20);}
    function updateChallenges(dt){
      for(const c of challenges){
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
            WW.storage.save();WW.audio.play('win');WW.main.win(progress.wins,shared.shards,shared.totalShards);
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
        // Only the current and selected forms appear in the permanent HUD. The full roster lives in the guide.
        const portrait=t=>`<img src="${WW.art.portrait(t)}" alt="${t}">`;
        hud.innerHTML=`<div class="compact-players">${players.map(p=>{
          const chosen=TYPES[p.selected],food=FOODS[p.selectedFood];
          return `<div class="compact-player p${p.id+1}">
              <b>P${p.id+1}</b><span class="mini-hearts">${Array.from({length:3},(_,i)=>i<p.health?'♥':'♡').join('')}</span>
              <span class="mini-form ${p.form?'morphed':''}" title="${p.form?abilityHelp[p.form]:FORM[chosen].power}">${portrait(p.form||chosen)}<span>${p.form?Math.ceil(p.energy[p.form])+'s':Math.ceil(p.energy[chosen])+'s'}</span></span>
              <span class="mini-label">${p.sleep?'ASLEEP':p.form?titles[p.form]+' · '+FORM[p.form].power:titles[chosen]}</span>
              <span class="mini-food"> <img src="${WW.art.foodIcon(food)}" alt="">${shared.foods[food]}</span>
            </div>`;}).join('')}</div>
          <div class="compact-quest"><b>${chapter.name}</b><span>${goals.map(g=>`<span class="quest-gem ${shared.keys[g.kind]?'found':''}" title="${g.name}">◆</span>`).join('')}</span><small>✦ ${shared.shards}/${shared.totalShards}</small></div>`;
      }
    }
    function box(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
    function background(ctx,time){
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
    function sceneryBack(ctx,time){
      const l=Math.floor((cameraX-120)/110),r=Math.ceil((cameraX+W+120)/110);
      const base=spawn.y+28;
      for(let i=l;i<=r;i++){
        const x=i*110+(hash(i,29)%23),wind=Math.sin(time*.66+i)*2;
        const high=base-130-(i%3)*8;
        if(chapter.biome==='coast'){
          // Glassy mineral spires with sharp colored facets and teal reef anemones.
          const y=high-5+(i%2)*15;
          ctx.fillStyle='#23588a';ctx.beginPath();ctx.moveTo(x-28,base);ctx.lineTo(x-10,y+23);
          ctx.lineTo(x+8,y-23);ctx.lineTo(x+30,y+27);ctx.lineTo(x+46,base);ctx.fill();
          ctx.fillStyle='#7be1e2';ctx.beginPath();ctx.moveTo(x+8,y-23);ctx.lineTo(x+30,y+27);ctx.lineTo(x+10,y+12);ctx.fill();
          ctx.fillStyle='#b3f9ef';ctx.beginPath();ctx.moveTo(x-10,y+23);ctx.lineTo(x+8,y-23);ctx.lineTo(x+2,y+30);ctx.fill();
          for(let j=0;j<8;j++){
            const xx=x-33+(hash(i,j)%75),yy=base-22+(hash(j,i)%19);
            box(ctx,xx,yy,3,8,j%2?'#94ffe3':'#d59cf3');box(ctx,xx-3,yy-3,9,4,'#67c9e7');
          }
        }else if(chapter.biome==='summit'){
          // Cliffs, shards and floating islets under the aurora.
          ctx.fillStyle='#3f4c92';ctx.beginPath();ctx.moveTo(x-38,base);ctx.lineTo(x-9,high+15);
          ctx.lineTo(x+6,high-38);ctx.lineTo(x+28,high+28);ctx.lineTo(x+48,base);ctx.fill();
          ctx.fillStyle='#b2a3f4';ctx.beginPath();ctx.moveTo(x+6,high-38);ctx.lineTo(x+28,high+28);
          ctx.lineTo(x+6,high+19);ctx.fill();
          ctx.fillStyle='#8dbad9';ctx.beginPath();ctx.ellipse(x+31,high-49,17,6,-.15,0,Math.PI*2);ctx.fill();
          box(ctx,x+12,high-53,33,4,'#c4c2ff');
          for(let j=0;j<5;j++){
            box(ctx,x-14+(hash(i,j)%52),high-28+(hash(j,i)%40),2,2,'#f0dcff');
          }
        }else{
          // Monumental lantern trees and mushroom terraces (all original procedural pixels).
          box(ctx,x-9,high+33,21,base-high-33,'#285978');
          box(ctx,x-5,high+35,5,base-high-35,'#3986a0');
          const clusters=[[-20,9,24,tint.tree[0]],[19,8,25,tint.tree[1]],[-1,-11,31,tint.tree[2]],[-12,-30,17,'#83e7bb']];
          for(const [dx,dy,rad,color] of clusters){
            ctx.fillStyle=color;ctx.beginPath();ctx.arc(x+dx+wind,high+dy,rad,0,Math.PI*2);ctx.fill();
          }
          for(let j=0;j<10;j++){
            const xx=x-31+(hash(i,j)%65),yy=high-30+(hash(j,i)%52);
            box(ctx,xx,yy,3,3,j%2?'#ffe4af':'#b9ffee');
          }
          if(i%3===0){
            box(ctx,x+18,high+17,2,29,'#62b49c');
            const glow=ctx.createRadialGradient(x+19,high+47,1,x+19,high+47,23);
            glow.addColorStop(0,'#ffe8a68a');glow.addColorStop(1,'#ffe8a600');
            ctx.fillStyle=glow;ctx.fillRect(x-4,high+24,46,46);
            box(ctx,x+15,high+44,9,10,'#ffe8a6');
          }
          box(ctx,x-26,base-10,18,7,'#cc8ecb');box(ctx,x-23,base-17,12,9,'#f8b6e3');
          box(ctx,x+20,base-13,15,8,'#86d8d1');box(ctx,x+22,base-22,11,12,'#9dffda');
        }
      }
    }
    function groundDetails(ctx,time){
      const left=Math.max(0,Math.floor(cameraX/TILE)-1),right=Math.min(level.width,Math.ceil((cameraX+W)/TILE)+1);
      for(let x=left;x<right;x++){
        for(let y=1;y<level.height-1;y++){
          if(map[y]?.[x]!=='ground'||map[y-1]?.[x]!=='empty')continue;
          const px=x*TILE+8,py=y*TILE,h=hash(x,y);
          if(h%9===0){
            box(ctx,px-1,py-18,3,18,'#2a936d');
            box(ctx,px-5,py-22,11,6,'#ff87c2');box(ctx,px-2,py-26,6,7,'#ffd5f2');
            box(ctx,px-1,py-23,3,3,'#ffe68e');
          }else if(h%13===0){
            box(ctx,px-3,py-12,7,10,'#80def5');box(ctx,px-1,py-19,3,7,'#e2f9fa');
            box(ctx,px-6,py-7,4,5,'#d6a5ff');
          }else if(h%4===0){
            box(ctx,px-4,py-5,2,5,'#52c884');box(ctx,px+1,py-8,2,8,'#61d79b');
            box(ctx,px-6,py-9,4,5,'#d4a9ff');box(ctx,px,py-12,4,5,'#ffb5cf');
          }
          if(h%21===0){const f=1+Math.sin(time*3+x)*2;box(ctx,px+4,py-20+f,3,3,'#ffffae');}
        }
      }
    }
    function terrain(ctx,time){
      const left=Math.max(0,Math.floor(cameraX/TILE)-1),right=Math.min(level.width,Math.ceil((cameraX+W)/TILE)+1);
      const top=Math.max(0,Math.floor(cameraY/TILE)-1),bottom=Math.min(level.height,Math.ceil((cameraY+H)/TILE)+1);
      for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
        const t=map[y][x];if(t==='empty')continue;
        const px=x*TILE,py=y*TILE,h=hash(x,y);
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
      for(let x=left;x<right;x++)for(let y=top+1;y<bottom;y++)if(map[y]?.[x]==='ground'&&map[y-1]?.[x]==='empty'&&hash(x,y)%8===1){
        const px=x*TILE+6,py=y*TILE-2;box(ctx,px,py-4,2,5,'#3e8269');box(ctx,px-2,py-6,6,3,'#f39cc3');box(ctx,px,py-7,2,2,'#ffea9f');
      }
    }
    function objective(){
      const seeker=players[0];
      const remaining=goals.filter(goal=>!shared.keys[goal.kind]);
      const choices=remaining.map(goal=>{
        const pending=challenges.find(c=>c.goal===goal.kind&&!c.completed);
        const gem=items.find(item=>item.kind===goal.kind);
        if(pending?.type==='sprint')return {
          x:(pending.active?pending.finish:pending.start)*TILE,y:seeker.y,
          name:pending.active?'REACH THE FINISH':'FIND THE STARTING ARCH',
          hint:pending.active?'Keep sprinting!':'Use Prismtail for the crystal speed trial',
          goal:goal.kind
        };
        if(pending?.type==='befriend'){
          const creature=animals.filter(a=>a.kind===pending.kind&&a.alive).sort((a,b)=>distance(a,seeker)-distance(b,seeker))[0];
          return {x:creature?.x??gem.x,y:creature?.y??gem.y,
            name:'BEFRIEND EMBERKITS',
            hint:`${pending.catches||0}/${pending.count} befriended · offer Honeybombs`,
            goal:goal.kind};
        }
        return {x:gem.x,y:gem.y,name:goal.name.toUpperCase(),hint:goal.hint,goal:goal.kind};
      });
      choices.sort((a,b)=>Math.abs(a.x-seeker.x)-Math.abs(b.x-seeker.x));
      if(choices.length)return choices[0];
      const gate=items.find(item=>item.kind==='exit');
      return {x:gate.x,y:gate.y,name:'THE ANCIENT GATE',hint:'All relics found · reach the gate to finish!',goal:'exit'};
    }
    function trailGuide(ctx,now){
      const current=objective(),p=players[0],delta=current.x-p.x;
      const miles=Math.round(Math.abs(delta)/TILE);
      const direction=Math.abs(delta)<TILE*2?'HERE':delta>0?'RIGHT':'LEFT';
      const goalLabel=current.name.length>30?current.name.slice(0,28)+'…':current.name;
      // A two-line compass replaces the tiny, long-form debug string.
      box(ctx,9,H-34,311,26,'#102b3ce7');
      box(ctx,9,H-34,3,26,'#e7cb89');
      ctx.textAlign='left';ctx.fillStyle='#f5db9d';ctx.font='bold 9px sans-serif';
      ctx.fillText(`✦ ${goalLabel} · ${direction} ${miles} TILES`,16,H-23,295);
      ctx.fillStyle='#d4e9df';ctx.font='8px sans-serif';
      ctx.fillText(current.hint,16,H-12,292);
      // A compact trail atlas communicates overall chapter scale and explored distance.
      const left=W-147,top=H-34,bar=119;
      box(ctx,left,top,138,26,'#102b3ce7');
      ctx.fillStyle='#e5d9ad';ctx.font='bold 8px sans-serif';
      ctx.fillText('TRAIL',left+8,top+9);
      box(ctx,left+8,top+16,bar,3,'#49636b');
      box(ctx,left+8,top+16,bar*clamp(p.x/width,0,1),3,'#a6dbbd');
      for(const gem of items.filter(item=>goalKinds.has(item.kind))){
        const gx=left+8+bar*gem.x/width;
        box(ctx,gx-1,top+13,3,9,shared.keys[gem.kind]?'#f4d18c':'#7797a0');
      }
      for(const player of players){
        const px=left+8+bar*clamp(player.x/width,0,1);
        box(ctx,px-2,top+13,5,9,player.id===0?'#ffefd2':'#c9bdff');
      }
      // Offscreen arrows anchor navigation without moving the camera or blocking play.
      if(Math.abs(delta)>W*.42){
        const right=delta>0,x=right?W-19:19,y=H*.51;
        ctx.globalAlpha=.6+.4*Math.sin(now*3.4);
        ctx.fillStyle='#f5da9d';ctx.beginPath();
        ctx.moveTo(x+(right?7:-7),y);
        ctx.lineTo(x+(right?-4:4),y-7);
        ctx.lineTo(x+(right?-4:4),y+7);
        ctx.closePath();ctx.fill();
        ctx.globalAlpha=1;
      }
    }
    function render(ctx,now){
      ctx.setTransform(3,0,0,3,0,0);
      background(ctx,now);
      ctx.save();ctx.translate(Math.round((Math.random()-.5)*shake),Math.round((Math.random()-.5)*shake));ctx.translate(-Math.round(cameraX),-Math.round(cameraY));
      sceneryBack(ctx,now);terrain(ctx,now);groundDetails(ctx,now);
      for(const sign of chapter.signs||[]){
        const x=sign.x*TILE;if(x<cameraX-65||x>cameraX+W+65)continue;
        const ground=Array.from({length:level.height},(_,y)=>y).find(y=>map[y]?.[sign.x]==='ground');
        if(ground===undefined)continue;
        const y=ground*TILE;
        box(ctx,x-1,y-57,4,59,'#57476f');box(ctx,x-23,y-59,48,17,chapter.biome==='coast'?'#2a82a0':'#654a90');
        box(ctx,x-19,y-56,40,3,'#d4f5dd');
        ctx.font='bold 6px sans-serif';ctx.fillStyle='#fff4d1';ctx.textAlign='center';
        ctx.fillText(sign.title.slice(0,16),x,y-48);ctx.textAlign='left';
        box(ctx,x-2,y-37,8,6,'#ffd6a8');
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
      items.forEach(it=>{if(it.used&&it.kind!=='checkpoint')return;const bob=Math.sin(now*3+it.x)*2;
        if(it.kind==='snack')WW.art.draw(ctx,'snack',it.x,it.y+8+bob,Math.floor(now*3)%4);
        if(it.kind==='starShard'){
          ctx.save();ctx.translate(it.x,it.y+bob);ctx.rotate(Math.sin(now*3+it.x)*.22);
          ctx.fillStyle='#fff8bd';ctx.beginPath();for(let i=0;i<10;i++){
            const a=i*Math.PI/5-Math.PI/2,r=i%2?3:8;
            ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
          }ctx.closePath();ctx.fill();box(ctx,-1,-3,2,4,'#ffffff');ctx.restore();
        }
        if(goalKinds.has(it.kind)){
          const tint=({springKey:'#ff94d5',skyKey:'#f5dfa9',diveKey:'#91f5ff',prismKey:'#ffaf68',mossKey:'#a7f8a0',cloudKey:'#d9bfff',emberKey:'#ff8d6d'})[it.kind]||'#ffe79f';
          ctx.save();ctx.translate(it.x,it.y+bob);ctx.rotate(now*.65);
          box(ctx,-5,-5,10,10,tint);box(ctx,-2,-10,4,5,'#ffffff');box(ctx,6,-2,5,4,tint);box(ctx,-9,-1,4,3,tint);ctx.restore();
          ctx.globalAlpha=.65+.3*Math.sin(now*5);box(ctx,it.x-2,it.y-13+bob,4,2,'#fffcef');box(ctx,it.x+12,it.y+bob,3,3,tint);ctx.globalAlpha=1;
          ctx.fillStyle='#fff4dd';ctx.font='bold 8px sans-serif';ctx.fillText('GEM',it.x-9,it.y-19+bob);
        }
        if(it.kind==='exit'){
          box(ctx,it.x-12,it.y-28,24,36,'#725771');box(ctx,it.x-8,it.y-25,16,31,goals.every(g=>shared.keys[g.kind])?'#6befc6':'#423c6b');
          box(ctx,it.x-5,it.y-20,10,14,'#af9abb');box(ctx,it.x-3,it.y-19,6,10,'#433f7d');box(ctx,it.x+4,it.y-9,2,2,'#ffdc80');
        }
        if(it.kind==='checkpoint') {
          box(ctx,it.x-2,it.y-22,3,27,it.used?'#bde5af':'#765968');
          box(ctx,it.x+1,it.y-22,14,9,it.used?'#f5dfa1':'#9bf6c9');
          if(it.used){
            ctx.globalAlpha=.3+.2*Math.sin(now*3);
            ctx.fillStyle='#fff3aa';ctx.beginPath();ctx.arc(it.x+7,it.y-18,12,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;
          }
        }
      });
      animals.forEach(a=>{
        if(!a.alive)return;
        const frame=Math.floor(a.frame)%4;
        if(a.dashTime>0){
          ctx.globalAlpha=.3;for(let j=1;j<4;j++)WW.art.draw(ctx,a.kind,a.x-a.dashDir*j*9,a.y,frame,a.dir<0);
          ctx.globalAlpha=1;
        }
        if(a.behavior==='guardian'){
          ctx.strokeStyle='#c7f1a8';ctx.lineWidth=2;ctx.globalAlpha=.4+.2*Math.sin(now*2);
          ctx.beginPath();ctx.ellipse(a.x,a.y-17,21,25,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
        }
        WW.art.draw(ctx,a.kind,a.x,a.y,frame,a.dir<0);
        if(a.windup>0){
          const pulse=.65+.35*Math.sin(now*19);ctx.save();ctx.globalAlpha=pulse;
          ctx.fillStyle='#ffcc8a';ctx.fillRect(a.x-4,a.y-70,9,11);
          ctx.fillStyle='#543e65';ctx.font='bold 10px sans-serif';ctx.fillText('!',a.x-1,a.y-61);
          ctx.restore();
        }
        const near=players.some(p=>!p.sleep&&Math.abs(p.x-a.x)<115&&Math.abs(p.y-a.y)<82);
        if(near){
          const ready=a.wary<=BOND_THRESHOLD;
          box(ctx,a.x-15,a.y-49,30,4,'#193c4a');
          box(ctx,a.x-14,a.y-48,28*(1-a.wary/100),2,ready?'#f8d990':'#99e5c3');
          ctx.fillStyle=ready?'#ffe5a4':'#f6f5e8';
          ctx.font='bold 8px sans-serif';
          ctx.fillText(titles[a.kind],a.x-18,a.y-60);
          ctx.font='bold 7px sans-serif';
          if(ready){
            ctx.fillText('♥ READY · G',a.x-18,a.y-52);
            ctx.globalAlpha=.35+.2*Math.sin(now*5);
            ctx.strokeStyle='#e6f4ac';ctx.lineWidth=1.2;ctx.beginPath();
            ctx.ellipse(a.x,a.y-18,22,26,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
          }else{
            ctx.fillStyle='#deefcc';
            ctx.fillText('♥ '+FOOD[FORM[a.kind].favorite].name,a.x-18,a.y-52);
          }
        }
      });
      projectiles.forEach(pr=>{
        const color=pr.kind==='food'?FOOD[pr.food].color:({orb:'#d8bcff',feather:'#f7eec7',bubble:'#9fe4fa',thorn:'#f5ae7a',gust:'#c4f4ff',spark:'#ffcbb9',seed:'#b4eb98',starlight:'#edc9ff',ember:'#ffb675'}[pr.kind]||'#ffffff');
        box(ctx,pr.x-4,pr.y-4,8,8,'#273e55');box(ctx,pr.x-3,pr.y-3,6,6,color);if(pr.kind==='orb'||pr.kind==='food')box(ctx,pr.x-1,pr.y-2,2,2,'#ffffff');
      });
      players.forEach(p=>{
        if(p.sleep){
          WW.art.draw(ctx,'hero',p.x,p.y+8,1,p.face<0,p.id);
          ctx.font='bold 10px sans-serif';ctx.fillStyle='#f9fbff';
          ctx.fillText('z',p.x+10,p.y-24-Math.sin(now*2)*3);ctx.fillText('Z',p.x+19,p.y-33-Math.sin(now*2+.8)*3);
        }else{
          if(p.form){ctx.save();ctx.globalAlpha=.19+.09*Math.sin(now*5);ctx.fillStyle=FORM[p.form].color;ctx.beginPath();ctx.ellipse(p.x,p.y-13,18,23,0,0,Math.PI*2);ctx.fill();ctx.restore();}
          WW.art.draw(ctx,p.form||'hero',p.x,p.y,Math.floor(p.frame)%4,p.face<0,p.id);
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
      trailGuide(ctx,now);
    }
    hud.hidden=false;callout.hidden=true;say(`${chapter.name} · ${chapter.intro}`,4200);
    return {update,render,recallParty,recallCheckpoint(){recallParty(shared.checkpoint);},stop(){hud.hidden=true;callout.hidden=true;message.classList.remove('show');},get state(){return {chapter,goals,challenges,players,shared,animals,items,projectiles,cameraX,cameraY,objective:objective(),physics:PHYSICS,jumpHeight}}};
  }
  return {start};
})();
