window.WW = window.WW || {}; WW.games = WW.games || {};
WW.games.animals = (() => {
  const TILE=16,W=480,H=270, FORM=WW.catalog.forms,FOOD=WW.catalog.foods;
  const TYPES=Object.keys(FORM),FOODS=Object.keys(FOOD);
  const titles=Object.fromEntries(TYPES.map(t=>[t,FORM[t].name]));
  // One world unit is one source-pixel; frames run at 60 Hz. All map jumps obey these rules.
  const PHYSICS={run:2.25,jump:5.7,doubleJump:5.5,gravity:.27,maxFall:5.7,
    bodyHalf:9,bodyHeight:25,waterExposure:.8,leash:W-75};
  const jumpHeight=PHYSICS.jump**2/(2*PHYSICS.gravity);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const hash=(a,b)=>((a*137+b*991)*(a*17+b*23))>>>0;
  function start(level) {
    const map=level.grid;const width=level.width*TILE,height=level.height*TILE;
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
    const animals=level.objects.filter(o=>TYPES.includes(o.kind)).map((o,i)=>({kind:o.kind,...location(o),origin:(o.x+.5)*TILE,vy:0,alive:true,respawn:0,wary:100,attackCD:1+i*.6,dir:i%2?1:-1,phase:i*1.3,frame:0}));
    const items=level.objects.filter(o=>['snack','skyKey','diveKey','springKey','starShard','checkpoint','exit'].includes(o.kind)).map(o=>({kind:o.kind,x:(o.x+.5)*TILE,y:(o.y+.5)*TILE,used:false}));
    const shared={foods:Object.fromEntries(FOODS.map(f=>[f, f==='berry'?14:6])),skyKey:false,diveKey:false,springKey:false,checkpoint:{...spawn},shards:0,totalShards:level.objects.filter(o=>o.kind==='starShard').length,won:false};
    const projectiles=[],effects=[];let cameraX=0,cameraY=0,clock=0,hudTime=0,shake=0,lastLeashHint=-10;
    const message=document.getElementById('message');const hud=document.getElementById('hud');
    function say(text,duration=2100) {message.textContent=text;message.classList.add('show');message.dataset.until=String(clock+duration/1000);}
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
      const boost=food===favorite?1.7:1;
      a.wary=Math.max(0,a.wary-amount*boost);
      a.attackCD=Math.max(a.attackCD,.55);
      particles(a.x,a.y-14,FOOD[food].color,food===favorite?16:10);
      if(food===favorite)say(`${titles[a.kind]} LOVES ${FOOD[food].name}! +${Math.round(amount*boost)} friendship`,1400);
      else if(a.wary===0)say(`${titles[a.kind]} is friendly! Your orb has a 98% chance.`,1600);
    }
    function recallParty(){WW.audio.play('recall');
      players.forEach((p,i)=>{p.x=spawn.x+i*25;p.y=spawn.y;p.vx=p.vy=0;p.waterTime=0;p.lastSafe={x:p.x,y:p.y};p.grounded=false;
        if(p.sleep){p.sleep=false;p.health=3;}p.invincible=2;particles(p.x,p.y-10,'#b9f6ff',24);});
      cameraX=0;cameraY=0;WW.input.reset();say('Homeward spell! Your gems, snacks and transformation time are safe.',2800);
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
      const direction=Number(controls.right)-Number(controls.left);
      if(direction)p.face=direction;
      const swimming=p.form==='tideling' && (liquid(p.x,p.y-8)||liquid(p.x,p.y+2));
      const flying=p.form==='skyling';
      const run=p.form==='prismtail'?4.0:p.form==='springaroo'?2.6:swimming?2.45:PHYSICS.run;
      const water=liquid(p.x,p.y-9)||liquid(p.x,p.y-1);
      p.vx=direction*run*(water&&!swimming?.42:1);
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
        if(flying && controls.jump) p.vy=Math.max(-2.95,p.vy-.52*step);
        if(p.form==='cloudwhisp'&&controls.jump&&p.vy>0)p.vy=Math.min(p.vy,.78);
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
      // Floating platforms are one-way: jump through from below, land from above.
      const platformAt=(x)=>at(x,ny)==='platform' && p.y<=Math.floor(ny/TILE)*TILE;
      if(p.vy>=0&&(solid(p.x-half+2,ny)||solid(p.x+half-2,ny)||platformAt(p.x-half+2)||platformAt(p.x+half-2))){
        ny=Math.floor(ny/TILE)*TILE;p.vy=0;p.grounded=true;p.jumpsUsed=0;
      }else p.grounded=false;
      if(p.vy<0&&(solid(p.x-half+2,ny-upper)||solid(p.x+half-2,ny-upper))){
        ny=(Math.floor((ny-upper)/TILE)+1)*TILE+upper;p.vy=0;
      }
      p.y=clamp(ny,upper+1,height-8);
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
        if(p.form===type){p.form=null;say(`P${p.id+1}: Returned to explorer. Remaining magic saved!`,1450);}
        else if(p.energy[type]>.02){p.form=type;WW.audio.play('morph');WW.input.rumble(p.id,.35,180);particles(p.x,p.y-10,FORM[type].color,24);
          say(`P${p.id+1} becomes ${titles[type]}! ${Math.ceil(p.energy[type])}s of magic available.`,2200);}
        else say(`P${p.id+1}: Befriend a ${titles[type]} to earn transformation time.`,1500);
      }
      if(p.form){
        p.energy[p.form]=Math.max(0,p.energy[p.form]-dt);
        if(p.energy[p.form]<=0){p.form=null;particles(p.x,p.y-9,'#ffffff',15);say(`P${p.id+1}: Time's up! Catch another creature.`,1850);
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
    function updateAnimals(dt){
      animals.forEach(a=>{
        if(!a.alive){a.respawn-=dt;if(a.respawn<=0){a.alive=true;a.wary=100;a.attackCD=2;}return;}
        a.phase+=dt;
        if(a.kind==='skyling'||a.kind==='cloudwhisp'||a.kind==='glimmermoth'){a.x=a.origin+Math.sin(a.phase*.7)*16;a.y+=Math.sin(a.phase*2)*.12;}
        else {a.dir=Math.sin(a.phase*.85)>0?1:-1;a.x=a.origin+Math.sin(a.phase*.85)*13;}
        const target=targetFor(a); a.attackCD-=dt;
        if(a.wary>0&&target&&distance(target,a)<105&&a.attackCD<=0){
          const dx=target.x-a.x,dy=(target.y-9)-(a.y-9),len=Math.hypot(dx,dy)||1;
          const attacks={skyling:'feather',tideling:'bubble',springaroo:'thorn',cloudwhisp:'gust',prismtail:'spark',mossback:'seed',glimmermoth:'starlight',emberkit:'ember'};
          const kind=attacks[a.kind];
          const base=kind==='spark'?3.5:kind==='gust'?1.5:2.1;
          const bursts=kind==='feather'?[-.36,0,.36]:kind==='ember'?[-.22,.22]:[0];
          for(const offset of bursts){
            const c=Math.cos(offset),si=Math.sin(offset);
            const vx=(dx/len*c-dy/len*si)*base;
            const vy=(dy/len*c+dx/len*si)*base;
            projectiles.push({kind,owner:-1,x:a.x,y:a.y-12,vx,vy,ttl:kind==='gust'?1.3:2.1,age:0});
          }
          a.attackCD=a.kind==='skyling'?2.9:a.kind==='springaroo'?2.3:2.1;
        }
        if(a.wary<=0) a.frame+=dt*3;else a.frame+=dt*6;
      });
    }
    function capture(animal,owner){
      const chance=.12+.86*Math.pow(1-animal.wary/100,1.55);
      if(Math.random()<chance){
        WW.audio.play('catch');animal.alive=false;animal.respawn=5;players[owner].energy[animal.kind]+=FORM[animal.kind].seconds;players[owner].selected=TYPES.indexOf(animal.kind);
        particles(animal.x,animal.y-8,FORM[animal.kind].color,28);
        WW.input.rumble(owner,.55,290);say(`P${owner+1} befriended ${titles[animal.kind]}! +${FORM[animal.kind].seconds}s of ${FORM[animal.kind].power.toLowerCase()}. Press Transform!`,2800);
      } else {WW.audio.play('miss');particles(animal.x,animal.y-8,'#f4b0dd',7);say(`The orb missed! Catch chance ${Math.round(chance*100)}%.`,1200);}
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
        else if(item.kind==='springKey'||item.kind==='skyKey'||item.kind==='diveKey'){
          WW.audio.play('gem');item.used=true;shared[item.kind]=true;
          const names={springKey:'Canopy',skyKey:'Sky',diveKey:'River'};
          say(`${names[item.kind]} gem collected! It stays yours, even if you return to camp.`,2750);
          WW.input.rumble(p.id,.8,340);particles(item.x,item.y,'#ffec94',32);
        }
        else if(item.kind==='starShard'){
          item.used=true;shared.shards++;shared.foods.star+=2;WW.audio.play('gem');
          WW.input.rumble(p.id,.35,110);particles(item.x,item.y,'#faffbc',18);
          say(`Star shard ${shared.shards}/${shared.totalShards}! +2 Stardrops. Bonus treasure!`,1550);
        }
        else if(item.kind==='checkpoint'){shared.checkpoint={x:item.x,y:item.y+8};item.used=true;say('Checkpoint activated!');}
        else if(item.kind==='exit'){
          if(shared.skyKey&&shared.diveKey&&shared.springKey){shared.won=true;WW.storage.data.progress.wins++;WW.storage.data.progress.bestShards=Math.max(WW.storage.data.progress.bestShards||0,shared.shards);WW.storage.save();WW.audio.play('win');WW.main.win(WW.storage.data.progress.wins,shared.shards,shared.totalShards);}
          else if(clock>(item.lastHint||0)+2){item.lastHint=clock;say(`Gate needs 3 gems: Canopy ${shared.springKey?'✓':'✗'} · Sky ${shared.skyKey?'✓':'✗'} · River ${shared.diveKey?'✓':'✗'}`);}
        }
      });
    }
    function update(dt){
      if(shared.won)return;
      dt=Math.min(dt,.045);clock+=dt; shake=Math.max(0,shake-dt*18);
      for(let i=0;i<players.length;i++)movePlayer(players[i],WW.input.read(i),dt);
      updateAnimals(dt);updateProjectiles(dt);updateItems();
      effects.forEach(e=>{e.x+=e.vx*dt*60;e.y+=e.vy*dt*60;e.vy+=.09*dt*60;e.time-=dt;});
      for(let i=effects.length-1;i>=0;i--)if(effects[i].time<=0)effects.splice(i,1);
      const active=players.filter(p=>!p.sleep);const focus=active.length?active:players;
      const xs=players.map(p=>p.x);
      const minX=Math.min(...xs),maxX=Math.max(...xs);
      // The desired camera position must contain *all* players plus a margin.
      const targetX=clamp((minX+maxX)/2-W/2,maxX-(W-30),minX-30);
      cameraX=clamp(targetX,0,Math.max(0,width-W));
      const minY=Math.min(...players.map(p=>p.y)),maxY=Math.max(...players.map(p=>p.y));
      cameraY=clamp((minY+maxY)/2-H*.55,0,Math.max(0,height-H));
      if(clock>+(message.dataset.until||0))message.classList.remove('show');
      if(clock-hudTime>.16){
        hudTime=clock;
        const pic=(type)=>`<img class="portrait" alt="${titles[type]}" src="${WW.art.portrait(type)}">`;
        hud.innerHTML=`<div class="hud-player">${players.map(p=>{
          const chosen=TYPES[p.selected],food=FOODS[p.selectedFood];
          return `<div class="player-info" style="border-color:${p.id?'#93d8ff':'#ffe094'}"><div class="player-top"><strong>P${p.id+1} ${p.sleep?'ASLEEP':''}</strong><span>${Array.from({length:3},(_,i)=>i<p.health?'♥':'♡').join('')}</span></div>
            <div class="form-row">${TYPES.map(t=>`<span class="form-chip ${p.selected===TYPES.indexOf(t)?'selected':''} ${p.form===t?'active':''} ${p.energy[t]>.1?'unlocked':''}" title="${titles[t]} – ${FORM[t].power}">${pic(t)}<small>${p.energy[t]>0?Math.ceil(p.energy[t])+'s':'·'}</small></span>`).join('')}</div>
            <div class="hud-caption">${p.form?'Playing as '+titles[p.form]+' · '+Math.ceil(p.energy[p.form])+'s left':`Selected ${titles[chosen]} · ${Math.ceil(p.energy[chosen])}s stored`}</div>
            <div class="food-caption"><img src="${WW.art.foodIcon(food)}" alt=""> ${FOOD[food].name} × ${shared.foods[food]} <span>⟳ E / M</span></div></div>`;}).join('')}</div>
          <div class="hud-center"><div class="quest-title">THE THREE GEMS · ✧ ${shared.shards}/${shared.totalShards} STARS</div><div class="gems"><span class="${shared.springKey?'done':''}">✿ Canopy</span><span class="${shared.skyKey?'done':''}">✧ Sky</span><span class="${shared.diveKey?'done':''}">❖ River</span></div><div class="tiny">Q/H choose form · T/U morph · C/N return to camp</div></div>`;
      }
    }
    function box(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
    function background(ctx,time){
      const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#625cba');sky.addColorStop(.30,'#9586e2');sky.addColorStop(.72,'#78d8d5');sky.addColorStop(1,'#d3f6ae');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
      // Layered glowing moon and drifting fireflies make the biome feel enchanted.
      const moon=ctx.createRadialGradient(390,43,5,390,43,56);
      moon.addColorStop(0,'#fff6c9ab');moon.addColorStop(.5,'#e8d5ff45');moon.addColorStop(1,'#e8d5ff00');
      ctx.fillStyle=moon;ctx.fillRect(332,-15,116,116);
      ctx.fillStyle='#fff3bd';ctx.beginPath();ctx.arc(390,43,17,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#e2e9db';ctx.beginPath();ctx.arc(397,35,12,0,Math.PI*2);ctx.fill();
      for(let i=0;i<40;i++){
        const drift=cameraX*.1+time*1.9;
        const x=((i*129.1-drift)%(W+30)+W+30)%(W+30);
        const y=19+(hash(i,13)%145)+Math.sin(time*1.4+i)*3;
        const glow=.35+.4*(.5+.5*Math.sin(time*2.4+i*8));
        ctx.globalAlpha=glow;box(ctx,x,y,2+(i%4===0?1:0),2,i%3?'#e4ffca':'#ffcff2');
      }
      ctx.globalAlpha=1;
      for(let layer=0;layer<3;layer++){
        const offset=cameraX*(.12+layer*.2);const base=115+layer*39;const colors=['#c4aee6','#87bad4','#448ca2'];
        ctx.fillStyle=colors[layer];ctx.beginPath();ctx.moveTo(0,H);
        for(let x=-40;x<W+90;x+=25){const world=x+offset;const height=Math.sin(world*.018+layer)*15+Math.sin(world*.047)*11;ctx.lineTo(x,base+height);}
        ctx.lineTo(W,H);ctx.fill();
        if(layer===2){for(let n=-2;n<20;n++){
          const xx=n*42-(offset*.68%42);const yy=base+8+Math.sin(n*2.1)*9;
          box(ctx,xx+8,yy,5,70,'#356d82');box(ctx,xx-7,yy-15,34,23,'#4baaa1');box(ctx,xx-2,yy-27,24,19,'#6cc7b4');
        }}
      }
      for(let n=0;n<8;n++){
        const x=((n*108-cameraX*.14+time*1.7)%(W+120)+W+120)%(W+120)-40;
        const y=27+n%3*17;box(ctx,x,y,32,8,'#ede6ff');box(ctx,x+8,y-6,20,11,'#fff7ea');
      }
    }
    function sceneryBack(ctx,time){
      // Large overlapping silhouettes give the world a sense of scale and depth.
      const l=Math.floor((cameraX-80)/100),r=Math.ceil((cameraX+W+80)/100);
      for(let i=l;i<=r;i++){
        const x=i*102+(hash(i,29)%32),bottom=308;
        const sway=Math.sin(time*.7+i)*2;
        ctx.fillStyle=i%2?'#286479':'#316878';
        ctx.beginPath();ctx.moveTo(x-8,bottom);ctx.lineTo(x-3,166+(i%3)*12);ctx.lineTo(x+7,164+(i%3)*12);ctx.lineTo(x+13,bottom);ctx.closePath();ctx.fill();
        const y=153+(i%3)*13;
        for(const [dx,dy,radius,color] of [[-22,6,20,'#357f91'],[19,6,22,'#378fa1'],[0,-13,24,'#3ba5aa'],[-9,-19,16,'#57bcb6']]){
          ctx.fillStyle=color;ctx.beginPath();ctx.arc(x+dx+sway,y+dy,radius,0,Math.PI*2);ctx.fill();
        }
        for(let j=0;j<7;j++){const xx=x-24+(hash(i,j)%50),yy=y-23+(hash(j,i)%33);
          box(ctx,xx,yy,2,3,hash(i,j)%2?'#8befc9':'#d2d2ff');}
        // Hanging lanterns bloom gently, but don't obscure traversal geometry.
        if(i%3===0){box(ctx,x+16,y+7,1,24,'#6fd3ae');
          const glow=ctx.createRadialGradient(x+16,y+31,0,x+16,y+31,14);
          glow.addColorStop(0,'#fff7acb5');glow.addColorStop(1,'#fff7ac00');ctx.fillStyle=glow;ctx.fillRect(x+2,y+17,28,28);
          box(ctx,x+13,y+27,7,7,'#fff2b1');}
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
          box(ctx,px,py,16,16,'#634a74');box(ctx,px,py+4,16,12,(h%2?'#795781':'#8e6484'));
          if(y===0||map[y-1][x]!=='ground'){
            box(ctx,px,py,16,6,'#68cf8d');box(ctx,px,py+5,16,2,'#378e80');
            box(ctx,px+2,py-2,3,3,'#a4ed96');box(ctx,px+11,py-1,2,3,'#efffa1');
          }
          if(h%5===0)box(ctx,px+5,py+9,4,2,'#f6ad9b');if(h%7===0)box(ctx,px+12,py+12,2,2,'#c38bd7');
          if(h%23===0){box(ctx,px+8,py+6,3,7,'#7b7bb1');box(ctx,px+9,py+5,1,5,'#b1c9f0');}
        } else if(t==='platform'){
          box(ctx,px,py,16,7,'#6659a1');box(ctx,px,py,16,3,'#b2ffd1');
          box(ctx,px+2,py+7,12,3,'#555583');
          box(ctx,px+5,py+10,6,3,'#7f7dba');
          if(h%3===0){box(ctx,px+5,py-3,2,4,'#aeefcf');box(ctx,px+3,py-5,6,3,'#f4a0cf');}
        } else if(t==='water'){
          box(ctx,px,py,16,16,y%2?'#3b89da':'#3f9fde');
          if(y===0||map[y-1][x]!=='water'){box(ctx,px,py,16,3,'#9be5e1');box(ctx,px+(Math.floor(time*9+x*7)%11),py+1,5,1,'#edf9ce');}
          if(h%6===0)box(ctx,px+5,py+8+Math.sin(time*3+x)*2,2,2,'#8fe4e5');
        }
      }
      // tiny foreground blossoms, all procedural and repeatable
      for(let x=left;x<right;x++)for(let y=top+1;y<bottom;y++)if(map[y]?.[x]==='ground'&&map[y-1]?.[x]==='empty'&&hash(x,y)%8===1){
        const px=x*TILE+6,py=y*TILE-2;box(ctx,px,py-4,2,5,'#3e8269');box(ctx,px-2,py-6,6,3,'#f39cc3');box(ctx,px,py-7,2,2,'#ffea9f');
      }
    }
    function render(ctx,now){
      ctx.setTransform(3,0,0,3,0,0);
      background(ctx,now);
      ctx.save();ctx.translate(Math.round((Math.random()-.5)*shake),Math.round((Math.random()-.5)*shake));ctx.translate(-Math.round(cameraX),-Math.round(cameraY));
      sceneryBack(ctx,now);terrain(ctx,now);groundDetails(ctx,now);
      items.forEach(it=>{if(it.used)return;const bob=Math.sin(now*3+it.x)*2;
        if(it.kind==='snack')WW.art.draw(ctx,'snack',it.x,it.y+8+bob,Math.floor(now*3)%4);
        if(it.kind==='starShard'){
          ctx.save();ctx.translate(it.x,it.y+bob);ctx.rotate(Math.sin(now*3+it.x)*.22);
          ctx.fillStyle='#fff8bd';ctx.beginPath();for(let i=0;i<10;i++){
            const a=i*Math.PI/5-Math.PI/2,r=i%2?3:8;
            ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
          }ctx.closePath();ctx.fill();box(ctx,-1,-3,2,4,'#ffffff');ctx.restore();
        }
        if(it.kind==='skyKey'||it.kind==='diveKey'||it.kind==='springKey'){
          const tint=it.kind==='skyKey'?'#fff0a3':it.kind==='springKey'?'#ff94d5':'#91f5ff';
          ctx.save();ctx.translate(it.x,it.y+bob);ctx.rotate(now*.65);
          box(ctx,-5,-5,10,10,tint);box(ctx,-2,-10,4,5,'#ffffff');box(ctx,6,-2,5,4,tint);box(ctx,-9,-1,4,3,tint);ctx.restore();
          ctx.globalAlpha=.65+.3*Math.sin(now*5);box(ctx,it.x-2,it.y-13+bob,4,2,'#fffcef');box(ctx,it.x+12,it.y+bob,3,3,tint);ctx.globalAlpha=1;
          ctx.fillStyle='#fff4dd';ctx.font='bold 8px sans-serif';ctx.fillText('GEM',it.x-9,it.y-19+bob);
        }
        if(it.kind==='exit'){
          box(ctx,it.x-12,it.y-28,24,36,'#725771');box(ctx,it.x-8,it.y-25,16,31,shared.skyKey&&shared.diveKey&&shared.springKey?'#6befc6':'#423c6b');
          box(ctx,it.x-5,it.y-20,10,14,'#af9abb');box(ctx,it.x-3,it.y-19,6,10,'#433f7d');box(ctx,it.x+4,it.y-9,2,2,'#ffdc80');
        }
        if(it.kind==='checkpoint') {box(ctx,it.x-2,it.y-22,3,27,'#765968');box(ctx,it.x+1,it.y-22,14,9,'#9bf6c9');}
      });
      animals.forEach(a=>{
        if(!a.alive)return;
        const frame=Math.floor(a.frame)%4;
        WW.art.draw(ctx,a.kind,a.x,a.y,frame,a.dir<0);
        const wary=a.wary;box(ctx,a.x-13,a.y-49,26,4,'#263f46');box(ctx,a.x-12,a.y-48,24*(wary/100),2,wary>40?'#fa8c82':'#a1eaa2');
        if(!wary){box(ctx,a.x-2,a.y-52,4,3,'#ff9eb6');box(ctx,a.x-4,a.y-50,8,3,'#ff9eb6');}
        const chance=Math.round((.12+.86*Math.pow(1-a.wary/100,1.55))*100);
        ctx.fillStyle='#f4fbef';ctx.font='bold 7px sans-serif';
        ctx.fillText(titles[a.kind],a.x-17,a.y-59);
        if(a.wary<100){ctx.fillStyle='#fceab0';ctx.fillText(`Catch ${chance}%`,a.x-17,a.y-51);}
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
      effects.forEach(e=>box(ctx,e.x,e.y,3,3,e.color));ctx.restore();
      if(!shared.skyKey||!shared.diveKey||!shared.springKey){
        box(ctx,8,H-23,453,16,'#14243cda');ctx.font='bold 8px sans-serif';ctx.fillStyle='#fff3c6';ctx.fillText(!shared.springKey?'SPRINGAROO ➜ double-jump to the canopy gem':!shared.skyKey?'MOONWING ➜ fly to the sky gem':'TIDEFOX ➜ dive to the river gem · C to return to camp',15,H-12);
      }
    }
    hud.hidden=false;say('Catch three magical creatures. Their powers unlock three gems!',3600);
    return {update,render,recallParty,stop(){hud.hidden=true;message.classList.remove('show');},get state(){return {players,shared,animals,items,projectiles,cameraX,cameraY,physics:PHYSICS,jumpHeight}}};
  }
  return {start};
})();
