window.WW = window.WW || {}; WW.games = WW.games || {};
WW.games.animals = (() => {
  const TILE=16,W=480,H=270, FORM=WW.catalog.forms, CREATURE=WW.catalog.creatures, MOUNTS=WW.catalog.mounts, FOOD=WW.catalog.foods;
  const TYPES=Object.keys(FORM),FOODS=Object.keys(FOOD);
  const titles=Object.fromEntries(Object.entries(CREATURE).map(([kind,info])=>[kind,info.name]));
  // One world unit is one source-pixel; frames run at 60 Hz. All map jumps obey these rules.
  const PHYSICS={run:2.25,jump:5.7,doubleJump:5.5,gravity:.27,maxFall:5.7,
    bodyHalf:9,bodyHeight:25,waterExposure:.8};
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
      tideling:'Swim with Jump / Down; hold Jump near the surface to leap ashore. F splashes',
      skyling:'Four wingbeats per flight. Land or find wind to recharge; F sends a feather gust',
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
    // Connected platform silhouettes are rendered as physical spans, not
    // individual textured rectangles. Merge overlapping same-style runs.
    const platformSpans=[];
    for(const span of (level.platformSegments||[]).filter(p=>p.kind==='platform')
      .sort((a,b)=>a.y-b.y||a.x-b.x)){
      const prev=platformSpans.at(-1);
      if(prev&&prev.y===span.y&&prev.style===span.style&&
         span.x<=prev.x+prev.length+1){
        prev.length=Math.max(prev.length,span.x+span.length-prev.x);
      }else platformSpans.push({...span});
    }
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
        ((MOUNTS[o.kind] || CREATURE[o.kind]) &&
         !['skyling','glimmermoth','cloudwhisp'].includes(o.kind) &&
         at(x,(o.y+.5)*TILE)!=='water' && Math.abs(surfaceY(x)-(o.y+1)*TILE)<20);
      return {x,y:rooted && level.surface?surfaceY(x):(o.y+1)*TILE};
    };
    const spawn=first('p1')?location(first('p1')):{x:48,y:height-32};
    const players=Array.from({length:WW.storage.data.settings.players},(_,id)=>{
      const position=location(first(id===0?'p1':'p2')||first('p1')||{x:3+id*2,y:level.height-3});
      return {id,...position,lastSafe:{...position},vx:0,vy:0,grounded:false,coyote:0,jumpBuffer:0,jumpsUsed:0,
        waterTime:0,face:1,health:3,sleep:false,invincible:0,selected:0,selectedFood:0,energy:Object.fromEntries(TYPES.map(t=>[t,0])),
        form:null,caught:null,hover:0,flapCooldown:0,flapBuffer:0,flaps:4,flapRecharge:0,wingbeat:0,actionCD:0,frame:0,hurt:0,
        bloomBoostWindow:0,lastJumpPress:-100,
        bubble:false,bubbleGrace:0,breachCooldown:0,windPush:0,mount:null,mountCooldown:0,
        unlocked:Object.fromEntries(TYPES.map(kind=>[kind,false]))};
    });
    const animals=level.objects.filter(o=>CREATURE[o.kind]).map((o,i)=>({
      kind:o.kind,...location(o),homeX:(o.x+.5)*TILE,homeY:location(o).y,
      id:i,dir:i%2?1:-1,alive:true,respawn:0,trust:0,distractedUntil:0,
      turnCooldown:0,aggroUntil:0,
      eating:0,windup:0,dashTime:0,dashDir:1,chargeCooldown:1+i*.3,phase:i*.9,frame:0,homeDir:i%2?1:-1,
      stunned:0,stuck:0,trapped:0,gustTime:0,gustHit:[],moving:false
    }));
    const mounts=level.objects.filter(o=>MOUNTS[o.kind]).map((o,id)=>({
      id,kind:o.kind,...location(o),homeX:location(o).x,homeY:location(o).y,
      vx:0,vy:0,dir:1,grounded:true,trust:0,eating:0,rider:null,phase:id*1.3
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
    // Level-authored interactive landmarks are independent of painted scenery.
    const setpieces=(level.setpieces||[]).map(piece=>({
      ...piece,x:(piece.x+.5)*TILE,y:piece.y*TILE,
      target:{x:(piece.target[0]+.5)*TILE,y:piece.target[1]*TILE},ready:[0,0]
    }));
    let cameraX=0,cameraY=0,clock=0,hudTime=0,shake=0,signIndex=-1;
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
          vx:player.face*5.3,vy:-.35,ttl:1.55,age:0,bounces:0});
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
      players.forEach((p,i)=>{
        if(p.mount!==null){
          const mount=mounts[p.mount];
          mount.rider=null;mount.x=mount.homeX;mount.y=mount.homeY;
          mount.vx=mount.vy=0;mount.grounded=true;p.mount=null;
        }
        p.x=destination.x+i*25;p.y=destination.y;p.vx=p.vy=0;p.waterTime=0;p.lastSafe={x:p.x,y:p.y};p.grounded=false;
        p.bubble=false;p.bubbleGrace=0;
        if(p.sleep){p.sleep=false;p.health=3;}p.invincible=2;particles(p.x,p.y-10,'#b9f6ff',24);});
      cameraX=0;cameraY=0;WW.input.reset();say('Camp portal! Your relics, snacks and transformation time are safe.',2800);
    }
    function hitPlayer(player,sourceX=player.x-player.face*20){
      if(player.invincible>0||player.sleep||player.bubble||shared.won)return;
      if(player.mount!==null)dismount(player);
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
    function enterFollowBubble(partner) {
      if(partner.mount!==null)dismount(partner);
      partner.bubble=true;partner.vx=partner.vy=0;partner.grounded=false;
      const anchor=WW.coop.bubbleAnchor(players[0],width,height);
      partner.x=anchor.x;partner.y=anchor.y;
      WW.audio.play('recall');
      particles(partner.x,partner.y-14,'#b4eeff',15);
      say('P2 is riding along! Press a button to pop the bubble.',1800);
    }
    function touchSetpieces(p,controls,swimming){
      for(const s of setpieces){
        if(Math.abs(p.x-s.x)>25)continue;
        if(s.kind==='bounceBloom' && p.grounded &&
           (!s.requires || p.form===s.requires) &&
           Math.abs(p.x-s.x)<16 && Math.abs(p.y-s.y)<11 &&
           clock>=(s.ready[p.id]||0)){
          const perfect=clock-p.lastJumpPress<=.12;
          p.vy=perfect?-9.2:-7.35;
          p.bloomBoostWindow=perfect?0:.14;
          p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.jumpsUsed=1;
          s.ready[p.id]=clock+.65;
          WW.audio.play('double');WW.input.rumble(p.id,perfect?.48:.32,105);
          particles(s.x,s.y-12,perfect?'#fff5b0':chapter.biome==='summit'?'#d9b4ff':'#ffd3ab',perfect?24:16);
        }else if(s.kind==='windRing' && p.form==='skyling' &&
                 Math.abs(p.y-13-s.y)<22 && clock>=(s.ready[p.id]||0)){
          p.vy=Math.min(p.vy,-4.8);p.flapCooldown=0;p.flaps=Math.min(4,p.flaps+2);p.wingbeat=.28;
          s.ready[p.id]=clock+2.1;
          WW.audio.play('double');WW.input.rumble(p.id,.18,90);
          particles(s.x,s.y,'#d7f6ff',17);
        }else if(s.kind==='bubbleVent' && liquid(p.x,p.y-8) &&
                 Math.abs(p.x-s.x)<20 && Math.abs(p.y-11-s.y)<38){
          // Passive lift stays visible, but a committed dive can push against
          // the current. Otherwise vents near deep relics become hard walls.
          const lift=swimming&&controls.down?.1:swimming?.68:.38;
          p.vy=swimming&&controls.jump?Math.min(p.vy,-3.75):
            Math.max(-3.75,p.vy-lift);
        }
      }
    }
    function movePlayer(p,controls,dt){
      const step=dt*60;
      if(p.bubble){
        // Floating passengers have no collisions, attacks, objectives or
        // physics updates. Any action button lets P2 rejoin beside P1.
        const anchor=WW.coop.bubbleAnchor(players[0],width,height);
        p.x+=(anchor.x-p.x)*Math.min(1,dt*16);
        p.y+=(anchor.y-p.y)*Math.min(1,dt*16);
        if(WW.coop.wantsToPop(controls)){
          p.bubble=false;p.bubbleGrace=1;
          p.sleep=false;p.health=Math.max(1,p.health);
          p.vx=p.vy=0;p.grounded=false;p.waterTime=0;
          p.invincible=Math.max(p.invincible,2);
          WW.audio.play('revive');
          particles(p.x,p.y-14,'#d5f9ff',22);
          say('P2 is back! Stay nearby, or ride along again.',1450);
        }
        return;
      }
      p.bubbleGrace=Math.max(0,p.bubbleGrace-dt);
      p.mountCooldown=Math.max(0,p.mountCooldown-dt);
      if(p.sleep){
        if(controls.pressed.recall)recallParty();
        else if(controls.pressed.revive)revive(p,p);
        return;
      }
      if(p.mount!==null){
        moveMountedPlayer(p,controls,dt);
        return;
      }
      p.invincible=Math.max(0,p.invincible-dt);
      p.actionCD=Math.max(0,p.actionCD-dt);
      p.hurt=Math.max(0,p.hurt-dt);
      p.previousX=p.x;p.previousY=p.y;
      p.hover=Math.max(0,p.hover-dt);
      p.flapCooldown=Math.max(0,p.flapCooldown-dt);
      p.flapBuffer=Math.max(0,p.flapBuffer-dt);
      p.bloomBoostWindow=Math.max(0,p.bloomBoostWindow-dt);
      p.windPush=Math.max(0,p.windPush-dt);
      let bloomBoosted=false;
      if(controls.pressed.jump){
        p.lastJumpPress=clock;
        if(p.bloomBoostWindow>0){
          bloomBoosted=true;
          p.vy=Math.min(p.vy,-9.2);
          p.bloomBoostWindow=0;p.jumpBuffer=0;
          WW.audio.play('double');WW.input.rumble(p.id,.48,105);
          particles(p.x,p.y-5,'#fff5b0',21);
        }else if(p.form==='skyling'&&!p.grounded&&p.flaps>0) p.flapBuffer=.19;
      }
      p.wingbeat=Math.max(0,p.wingbeat-dt);
      p.breachCooldown=Math.max(0,p.breachCooldown-dt);
      const direction=Number(controls.right)-Number(controls.left);
      if(direction)p.face=direction;
      const swimming=p.form==='tideling' && (liquid(p.x,p.y-8)||liquid(p.x,p.y+2));
      const flying=p.form==='skyling';
      if(flying&&p.grounded){p.flaps=4;p.flapRecharge=0;}
      const run=p.form==='springaroo'?2.65:swimming?2.55:PHYSICS.run;
      const water=liquid(p.x,p.y-9)||liquid(p.x,p.y-1);
      const updraft=!water&&(thermal(p.x,p.y-8)||thermal(p.x,p.y-20));
      // Acceleration gives movement weight without sacrificing the sprint trial.
      const targetSpeed=direction*run*(water&&!swimming?.42:1);
      const traction=direction?(p.grounded?.52:.34):(p.grounded?.65:.32);
      if(!p.hurt&&p.windPush===0)p.vx+=clamp(targetSpeed-p.vx,-traction*step,traction*step);
      if(!direction&&!p.hurt&&Math.abs(p.vx)<.08)p.vx=0;
      if(swimming){
        // Water resistance preserves momentum; without strokes Tidefox sinks slowly.
        const stroke=controls.down?.23:controls.jump?-.32:.065;
        p.vy=clamp(p.vy*.92+stroke*step,-2.6,2.6);
        // A Tidefox can breach the surface instead of getting pinned against
        // the bank. Carry its upward momentum through the final underwater frames.
        const pool=(level.waterBodies||[]).find(b=>
          p.x>=b.start*TILE&&p.x<b.end*TILE);
        if(controls.jump && p.breachCooldown>0){
          p.vy=Math.min(p.vy,-5.1);
        }else if(controls.jump && pool &&
                 p.y-pool.surface*TILE<30 && p.breachCooldown===0){
          p.vy=-5.1;p.breachCooldown=.48;
          particles(p.x,p.y-13,'#b9f8f2',10);
          WW.audio.play('jump');
        }
        p.coyote=0;p.jumpBuffer=0;p.jumpsUsed=0;
      }else if(water){
        p.vy=Math.min(2.4,p.vy+.14*step);
        p.coyote=0;p.jumpBuffer=0;
      }else{
        p.coyote=p.grounded?.105:Math.max(0,p.coyote-dt);
        p.jumpBuffer=controls.pressed.jump&&!bloomBoosted?.12:
          bloomBoosted?0:Math.max(0,p.jumpBuffer-dt);
        if(p.jumpBuffer>0 && (p.coyote>0 || (p.form==='springaroo' && p.jumpsUsed<2))){
          const second=p.coyote<=0;
          p.vy=-(second?PHYSICS.doubleJump:PHYSICS.jump);WW.audio.play(second?'double':'jump');
          p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.flapBuffer=0;p.jumpsUsed++;
          if(second){particles(p.x,p.y-5,'#f6e190',13);WW.input.rumble(p.id,.25,80);}
        }else if(flying && p.flapBuffer>0 && p.flapCooldown===0 && p.flaps>0){
          // Buffer a fresh tap through the short flap cooldown. Holding Jump
          // cannot queue additional flaps; ground takeoff consumes its own tap.
          p.vy=Math.max(-4.9,p.vy-3.65);
          p.flaps--;p.flapCooldown=.15;p.wingbeat=.23;p.jumpBuffer=0;p.flapBuffer=0;
          WW.audio.play('double');
          particles(p.x-p.face*8,p.y-14,'#e9f0ff',5);
        }
        // Releasing early makes a short hop for grounded forms.
        if(controls.released.jump&&p.vy< -1&&!flying)p.vy*=.56;
        p.vy=Math.min(PHYSICS.maxFall,p.vy+PHYSICS.gravity*step);
        if(p.form==='glimmermoth'&&p.hover>0&&p.vy>1.45)p.vy=1.45;
      }
      if(updraft){
        // Upward acceleration must exceed gravity to match the visible air stream.
        p.vy=Math.max(-3.6,p.vy-(flying?.46:.34)*step);
        if(flying){
          p.flapRecharge+=dt;
          if(p.flapRecharge>=.42){
            p.flaps=Math.min(4,p.flaps+1);p.flapRecharge=0;
          }
        }
      }else p.flapRecharge=0;
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
      touchSetpieces(p,controls,swimming);
      if(controls.pressed.snack){if(p.form)usePower(p);else throwThing(p,'food');}
      if(controls.pressed.orb)throwThing(p,'orb');
      if(controls.pressed.foodCycle){p.selectedFood=(p.selectedFood+1)%FOODS.length;const food=FOODS[p.selectedFood];say(`P${p.id+1}: ${FOOD[food].name} · ${shared.foods[food]} left`,1350);}
      if(controls.pressed.transform){
        if(p.form){p.form=null;p.hover=0;p.flaps=4;callout.hidden=true;say('Back to explorer form. F throws food again.',1500);}
        else if(p.caught){
          p.form=p.caught;p.hover=0;p.flaps=4;WW.audio.play('morph');WW.input.rumble(p.id,.35,180);
          particles(p.x,p.y-10,FORM[p.form].color,24);
          showAbility(p);say(titles[p.form]+' power! '+FORM[p.form].power+'.',1900);
        }else say('Offer fruit, then catch a distracted creature with G to gain its power.',1800);
      }
      if(controls.pressed.recall)recallParty();
      if(controls.pressed.revive)for(const other of players)if(other!==p&&other.sleep&&distance(other,p)<48)revive(other,p);
      p.frame+=dt*(p.grounded?Math.abs(p.vx)*5+1:7);
    }
    function dismount(p){
      const mount=mounts[p.mount];
      mount.rider=null;mount.vx=p.vx*.55;
      p.mount=null;p.mountCooldown=.65;
      p.x=clamp(mount.x+mount.dir*28,11,width-11);
      p.y=clamp(mount.y-33,PHYSICS.bodyHeight+1,height-12);
      p.vy=-2.5;p.grounded=false;p.coyote=0;p.jumpBuffer=0;
      p.invincible=Math.max(p.invincible,.7);
      say('Back on foot. Feed a mount and land on its back to ride again.',1700);
    }
    function moveMountedPlayer(p,controls,dt){
      const m=mounts[p.mount],spec=MOUNTS[m.kind],step=dt*60;
      if(controls.pressed.transform){dismount(p);return;}
      if(controls.pressed.recall){recallParty();return;}
      p.previousX=p.x;p.previousY=p.y;
      p.invincible=Math.max(0,p.invincible-dt);
      const direction=Number(controls.right)-Number(controls.left);
      if(direction){m.dir=direction;p.face=direction;}
      const target=direction*spec.speed;
      m.vx+=clamp(target-m.vx,-(m.grounded?.46:.26)*step,(m.grounded?.46:.26)*step);
      if(m.kind==='unicorn'){
        if(controls.pressed.jump&&m.grounded){
          m.vy=-spec.jump;m.grounded=false;WW.audio.play('double');
          particles(m.x,m.y-5,'#f6d7ff',17);
        }
        m.vy=Math.min(PHYSICS.maxFall,m.vy+PHYSICS.gravity*step);
      }else{
        // Pegasus can climb for as long as Jump is held; Down intentionally dives.
        // Unlike Moonwing, it has no finite wingbeat or flight-energy budget.
        if(controls.jump)m.vy=Math.max(-4.6,m.vy-.43*step);
        else if(controls.down)m.vy=Math.min(4.5,m.vy+.35*step);
        else m.vy=clamp(m.vy*.92+.045*step,-4.5,2.5);
      }
      const half=18,upper=38;
      const nx=clamp(m.x+m.vx*step,half+1,width-half-1);
      const feet=m.y;
      const ground=level.surface?Math.min(surfaceY(nx-half+3),surfaceY(nx+half-3)):null;
      const walkSlope=m.grounded&&!liquid(nx,feet-5)&&ground!==null&&
        Math.abs(ground-feet)<13;
      const blocked=liquid(nx,feet-8)&&m.grounded||
        (m.vx>0&&(solid(nx+half,feet-6)||solid(nx+half,feet-upper)))||
        (m.vx<0&&(solid(nx-half,feet-6)||solid(nx-half,feet-upper)));
      if(!blocked){
        m.x=nx;
        if(walkSlope)m.y=ground;
      }else m.vx=0;
      let ny=m.y+m.vy*step;
      const floor=level.surface?Math.min(surfaceY(m.x-half+3),surfaceY(m.x+half-3)):null;
      const onSlope=floor!==null&&m.y<=floor+12&&ny>=floor&&
        !liquid(m.x,m.y-6)&&!liquid(m.x,ny-6);
      const platform=at(m.x,ny)==='platform'&&
        m.y<=Math.floor(ny/TILE)*TILE;
      if(m.vy>=0&&(onSlope||solid(m.x-half+3,ny)||solid(m.x+half-3,ny)||platform)){
        ny=onSlope?floor:Math.floor(ny/TILE)*TILE;
        m.vy=0;m.grounded=true;
      }else m.grounded=false;
      if(m.vy<0&&(solid(m.x-half+3,ny-upper)||solid(m.x+half-3,ny-upper))){
        ny=(Math.floor((ny-upper)/TILE)+1)*TILE+upper;m.vy=0;
      }
      m.y=clamp(ny,upper+1,height-8);
      m.phase+=dt*(m.grounded?4+Math.abs(m.vx)*2:8);
      p.x=m.x;p.y=m.y-32;p.vx=m.vx;p.vy=m.vy;p.grounded=m.grounded;
      p.coyote=0;p.jumpsUsed=0;p.waterTime=0;
      if(m.grounded&&!liquid(m.x,m.y-8))p.lastSafe={x:p.x,y:p.y};
      p.frame+=dt*(Math.abs(m.vx)*3+4);
    }
    function updateMounts(dt){
      const step=dt*60;
      for(const m of mounts){
        if(m.rider!==null)continue;
        m.phase+=dt;
        m.eating=Math.max(0,m.eating-dt);
        if(!m.grounded){
          m.vy=Math.min(PHYSICS.maxFall,m.vy+PHYSICS.gravity*step);
          m.y+=m.vy*step;
          const ground=standingHeight(m.x,m.homeY);
          if(m.y>=ground){m.y=ground;m.vy=0;m.grounded=true;}
          continue;
        }
        const lure=nearbyFood(m);
        if(lure){
          const nextX=clamp(m.x+clamp(lure.x-m.x,-1.15*step,1.15*step),
            18,width-18);
          const floor=standingHeight(nextX,m.homeY);
          if(!liquid(nextX,floor-8)&&Math.abs(floor-m.y)<17){
            m.dir=nextX>=m.x?1:-1;m.vx=(nextX-m.x)/step;
            m.x=nextX;m.y=floor;
          }
          if(Math.abs(m.x-lure.x)<21&&Math.abs(m.y-lure.y)<40){
            lure.used=true;m.eating=.8;
            const favorite=MOUNTS[m.kind].favorite===lure.food;
            m.trust=Math.min(TRUST_TARGET,m.trust+(favorite?60:36));
            WW.audio.play('munch');
            particles(m.x,m.y-27,MOUNTS[m.kind].color,10);
            if(m.trust>=TRUST_TARGET){
              WW.audio.play('ready');
              say(MOUNTS[m.kind].name+' trusts you! Jump onto its back to ride.',2200);
            }
          }
        }else{
          const target=m.homeX+m.dir*24;
          const nextX=clamp(m.x+clamp(target-m.x,-.35*step,.35*step),
            Math.max(18,m.homeX-26),Math.min(width-18,m.homeX+26));
          const floor=standingHeight(nextX,m.homeY);
          if(Math.abs(m.x-target)<2)m.dir*=-1;
          if(!liquid(nextX,floor-8)&&Math.abs(floor-m.y)<13){
            m.vx=(nextX-m.x)/step;m.x=nextX;m.y=floor;
          }else{m.dir*=-1;m.vx=0;}
        }
        if(m.trust<TRUST_TARGET)continue;
        const rider=players.find(p=>!p.sleep&&!p.bubble&&p.mount===null&&
          p.mountCooldown===0&&p.vy>=0&&
          Math.abs(p.x-m.x)<27&&p.previousY<=m.y-23&&
          p.y>=m.y-27&&p.y<=m.y-10);
        if(rider){
          m.rider=rider.id;rider.mount=m.id;rider.x=m.x;rider.y=m.y-32;
          rider.vx=m.vx;rider.vy=m.vy;rider.grounded=m.grounded;
          rider.waterTime=0;
          WW.audio.play('morph');
          WW.input.rumble(rider.id,.4,180);
          particles(m.x,m.y-28,MOUNTS[m.kind].color,22);
          say(m.kind==='unicorn'?
            'Unicorn! Run fast, press Jump for a soaring leap. T dismounts.':
            'Pegasus! Hold Jump to climb, Down to descend. Fly freely! T dismounts.',2200);
        }
      }
    }
    function targetFor(animal){
      return players.filter(p=>!p.sleep&&!p.bubble).sort((a,b)=>distance(a,animal)-distance(b,animal))[0];
    }
    function nearbyFood(animal){
      return lures.filter(food=>!food.used&&food.ttl>0)
        .filter(food=>Math.abs(food.x-animal.x)<200&&Math.abs(food.y-animal.y)<100)
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
            a.turnCooldown=0;a.aggroUntil=0;
          }
          continue;
        }
        a.phase+=dt;
        a.chargeCooldown=Math.max(0,a.chargeCooldown-dt);
        a.stunned=Math.max(0,a.stunned-dt);
        a.stuck=Math.max(0,a.stuck-dt);
        a.trapped=Math.max(0,a.trapped-dt);
        a.eating=Math.max(0,a.eating-dt);
        a.turnCooldown=Math.max(0,a.turnCooldown-dt);
        const target=targetFor(a),food=nearbyFood(a);
        const distracted=a.distractedUntil>clock,peaceful=!!food||a.eating>0||distracted;
        const incapacitated=a.stunned>0||a.stuck>0||a.trapped>0;
        const near=target&&Math.abs(target.x-a.x)<(a.kind==='cloudwhisp'?170:100)&&
          Math.abs(target.y-a.y)<(a.kind==='cloudwhisp'?72:44);
        if(near) a.aggroUntil=clock+3;
        const pursuing=target&&!peaceful&&!incapacitated&&a.aggroUntil>clock&&
          ['emberkit','prismtail','cloudwhisp'].includes(a.kind);
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
            }else if(a.kind==='emberkit'&&pursuing){
              desiredX=target.x;rate=.83;
            }else if(a.kind==='prismtail'&&near){
              desiredX=a.x+(a.x<target.x?-75:75);
              rate=1.55;
            }
          }
          if(a.kind==='cloudwhisp'){
            if(a.windup>0){
              a.windup=Math.max(0,a.windup-dt);desiredX=a.x;rate=0;
              if(a.windup===0){a.gustTime=.48;a.gustHit=[];a.chargeCooldown=2.7;}
            }else if(near&&a.chargeCooldown===0){
              a.windup=.48;desiredX=a.x;rate=0;
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
        if(!food&&!pursuing&&Math.abs(a.x-a.homeX)>=patrol-1){
          const inward=a.x>=a.homeX?-1:1;
          if(a.dir!==inward){a.dir=inward;a.turnCooldown=.24;}
          desiredX=a.homeX+a.dir*patrol;
        }
        const beforeX=a.x;
        const dx=clamp(desiredX-a.x,-rate*step,rate*step);
        // Real terrain and obstacles constrain enemies, not invisible spawn leashes
        // during a pursuit. Ordinary patrols still stay near their habitats.
        const candidate=clamp(a.x+dx,
          pursuing?9:Math.max(9,a.homeX-125),
          pursuing?width-9:Math.min(width-9,a.homeX+125));
        const floor=standingHeight(candidate,a.homeY);
        const previousFloor=standingHeight(a.x,a.homeY);
        const blocked=aquatic?!liquid(candidate,a.y-10):
          !flying&&(!Number.isFinite(floor)||liquid(candidate,floor-6)||
          Math.abs(floor-previousFloor)>18||solid(candidate,a.y-16));
        if(!blocked){
          a.x=candidate;
          const nextFacing=dx>0?1:-1;
          if(Math.abs(dx)>.1 && !a.windup && a.turnCooldown===0 &&
             a.dir!==nextFacing){
            a.dir=nextFacing;a.turnCooldown=.24;
          }
        }else if(!food&&a.turnCooldown===0){
          a.dir*=-1;a.turnCooldown=.3;a.windup=0;a.dashTime=0;
        }
        a.moving=Math.abs(a.x-beforeX)>.1;
        if(a.trapped>0){
          a.y=Math.max(a.homeY-47,a.y-.82*step);
          a.moving=false;
        }else if(flying||aquatic){
          const floatY=a.homeY+Math.sin(a.phase*(a.kind==='skyling'?2.2:1.45))*7;
          const wanted=food?food.y-16:floatY;
          a.y+=(wanted-a.y)*Math.min(1,dt*3.6);
        }else{
          const groundY=floor;
          const bounce=a.kind==='springaroo'?Math.abs(Math.sin(a.phase*4.9))*11:
            a.kind==='prismtail'?Math.abs(Math.sin(a.phase*8))*3:
            a.kind==='emberkit'?Math.abs(Math.sin(a.phase*3.4))*4:1.2*Math.abs(Math.sin(a.phase*2));
          a.y+=(groundY-bounce-a.y)*Math.min(1,dt*18);
        }
        a.frame+=dt*(a.moving?11:5);
        if(food&&!distracted&&a.trapped===0&&
            Math.abs(a.x-food.x)<18&&Math.abs(a.y-12-food.y)<37){
          // Accept a second favorite while still chewing the first; don't let
          // a short animation lockout silently swallow a quick second throw.
          eatFood(a,food);
        }
        // A precise descending head stomp is safe, rewards a bounce, and
        // sends the animal to rest for a few seconds rather than harming it.
        const stomp=players.find(p=>!p.sleep&&!p.bubble&&p.mount===null&&p.vy>0.6&&
          Math.abs(p.x-a.x)<17&&p.previousY<=a.y-23&&p.y>=a.y-27&&p.y<a.y-12);
        if(stomp&&!incapacitated){knockOut(a,stomp);continue;}
        if(incapacitated||peaceful)continue;
        if(a.kind==='cloudwhisp'&&a.gustTime>0){
          a.gustTime=Math.max(0,a.gustTime-dt);
          for(const p of players){
            if(!p.sleep&&!p.bubble&&!a.gustHit.includes(p.id)&&
                (p.x-a.x)*a.dir>0&&(p.x-a.x)*a.dir<155&&Math.abs(p.y-a.y)<65){
              p.vx=a.dir*7.2;p.vy=Math.min(p.vy,-2.4);
              p.windPush=.22;
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
            if(!p.sleep&&!p.bubble&&Math.abs(p.x-a.x)<18&&p.y>a.y-27&&p.y-25<a.y+1){
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
        pr.vy+=(pr.kind==='food'?.20:pr.kind==='orb'?.14:
          pr.kind==='bubble'?-.012:0)*step;
        if(pr.kind==='food'&&FOOD[pr.food].method==='float'){
          pr.vy=Math.min(pr.vy,2.2);pr.x+=Math.sin(pr.age*9)*.5;
        }
        const onPlatform=at(pr.x,pr.y)==='platform' &&
          oldY<=Math.floor(pr.y/TILE)*TILE;
        const floorHit=solid(pr.x,pr.y)||onPlatform;
        const waterHit=pr.kind==='food'&&liquid(pr.x,pr.y);
        if(pr.ttl<=0){projectiles.splice(i,1);continue;}
        if(pr.kind==='orb'&&floorHit){
          const floor=onPlatform?Math.floor(pr.y/TILE)*TILE:
            level.surface?surfaceY(pr.x):Math.floor(pr.y/TILE)*TILE;
          if(pr.vy>=0&&oldY<=floor+3&&pr.bounces<10){
            // Small elastic hops skim continuous slopes without going through rock.
            pr.y=floor-2;
            pr.vy=-Math.max(.85,Math.min(2.2,pr.vy*.5));
            pr.vx*=.96;pr.bounces++;
          }else{projectiles.splice(i,1);continue;}
        }else if(floorHit||waterHit){
          if(pr.kind==='food')placeFood(pr);
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
            if(c.time===0||players.every(p=>p.sleep||p.bubble)){
              c.active=false;c.owner=null;c.next=0;c.cooldown=1.2;c.lastRunner=null;c.relay=false;
              say('The rings faded. Touch the first glow to retry.',1600);
              continue;
            }
          }
          for(const p of players){
            if(p.sleep||p.bubble||c.cooldown>0)continue;
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
          if(p.sleep||p.bubble)continue;
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
        const p=players.find(p=>!p.sleep&&!p.bubble&&Math.abs(p.x-item.x)<20&&
          Math.abs((p.y+(p.mount!==null?16:-13))-item.y)<28);
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
      const follower=players[1];
      if(follower&&!follower.bubble&&follower.bubbleGrace===0 &&
         WW.coop.shouldBubble(players[0],follower))enterFollowBubble(follower);
      updateAnimals(dt);updateMounts(dt);updateProjectiles(dt);updateChallenges(dt);updateItems();chapterHint();
      if(clock>abilityUntil)callout.hidden=true;
      effects.forEach(e=>{e.x+=e.vx*dt*60;e.y+=e.vy*dt*60;e.vy+=.09*dt*60;e.time-=dt;});
      for(let i=effects.length-1;i>=0;i--)if(effects[i].time<=0)effects.splice(i,1);
      // Player 1 leads the camera in co-op. P2 can explore normally while
      // nearby, but never restricts movement or pushes the camera off course.
      const target=WW.coop.cameraTarget(players[0],width,height,W,H);
      // Gently reveal the upper part of the authored architecture while
      // retaining the player and platform hazards in the lower screen.
      const focus=(level.vistas||[]).find(v=>
        Math.abs(players[0].x-(v.x+.5)*TILE)<v.span*TILE*.65);
      if(focus){
        const proximity=1-Math.abs(players[0].x-(focus.x+.5)*TILE)/
          (focus.span*TILE*.65);
        target.y=clamp(target.y-40*proximity,0,Math.max(0,height-H));
      }
      const smoothingX=Math.abs(target.x-cameraX)>W*.85?1:Math.min(1,dt*10);
      cameraX+=(target.x-cameraX)*smoothingX;
      const smoothingY=Math.abs(target.y-cameraY)>H*.9?1:Math.min(1,dt*8);
      cameraY+=(target.y-cameraY)*smoothingY;
      if(clock>+(message.dataset.until||0))message.classList.remove('show');
      if(clock-hudTime>.16){
        hudTime=clock;
        hud.innerHTML=`
          <div class="compact-players">${players.map(p=>{
            const chosen=p.caught,food=FOODS[p.selectedFood];
            const display=p.form||chosen||'hero';
            return `<div class="compact-player p${p.id+1}" title="Player ${p.id+1}">
              <b>P${p.id+1}${p.bubble?' ◌':''}</b><span class="mini-hearts">${'♥'.repeat(p.health)}${'♡'.repeat(3-p.health)}</span>
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
      if(WW.scenery.background(ctx,chapter.biome,cameraX,level,cameraY)){
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
      // Imported grids still use traditional landmarks. Built-in levels use
      // one composed landmark per authored gameplay section.
      if(level.vistas?.length)return;
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
      if(level.dressing){
        const left=cameraX-35,right=cameraX+W+35;
        for(const prop of level.dressing){
          const x=(prop.x+.5)*TILE;
          if(x<left||x>right)continue;
          const dimensions={
            flowers:[24,24],mushrooms:[22,23],stones:[27,17],
            reeds:[20,29],shells:[29,22],moonStone:[25,27],
            berryBush:[26,27]
          }[prop.asset];
          WW.illustrations.draw(ctx,prop.asset,x,prop.y*TILE+3,
            dimensions[0]*prop.scale,dimensions[1]*prop.scale,.9);
        }
        return;
      }
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
    function paintGoalRoute(ctx,now){
      const goal=goals[0];
      if(!goal||shared.keys[goal.kind]||!level.goalRoute?.length)return;
      const player=players[0],match={springKey:'springaroo',
        diveKey:'tideling',skyKey:'skyling'}[goal.kind];
      const color={springKey:'#f9d991',diveKey:'#9debe9',
        skyKey:'#edddff'}[goal.kind]||'#f9d991';
      for(let i=0;i<level.goalRoute.length-1;i++){
        const [tx,ty]=level.goalRoute[i];
        const x=(tx+.5)*TILE,y=ty*TILE-9;
        const distance=Math.hypot(x-player.x,y-player.y+12);
        if(distance>260||x<cameraX-22||x>cameraX+W+22||
           y<cameraY-24||y>cameraY+H+24)continue;
        const near=1-Math.min(1,distance/260);
        const pulse=.67+.33*Math.sin(now*2.4+i*2);
        const opacity=(player.form===match?.65:.34)*(.3+near*.7)*pulse;
        ctx.save();ctx.globalAlpha=opacity;
        ctx.strokeStyle=color;ctx.lineWidth=1.1;
        ctx.beginPath();ctx.arc(x,y,7+Math.sin(now*1.7+i)*1.6,
          Math.PI*.1,Math.PI*1.75);ctx.stroke();
        WW.illustrations.draw(ctx,goal.kind==='diveKey'?'bubble':'spark',
          x,y+5,12,12,.9);
        ctx.restore();
      }
    }
    function paintSetpieces(ctx,now){
      const colors={meadow:['#f9b5c5','#f4e49e'],coast:['#80e7dc','#fff0b0'],
        summit:['#bea5f5','#f6d0f4']}[chapter.biome] || ['#f9b5c5','#fff0b0'];
      for(const s of setpieces){
        if(s.x<cameraX-45||s.x>cameraX+W+45||
           s.y<cameraY-65||s.y>cameraY+H+65)continue;
        const pulse=Math.sin(now*3+s.x*.05);
        // Keep navigational motes contextual. They reveal the *authored*
        // destination only when a player with the useful form approaches.
        const nearby=players.some(p=>!p.bubble&&
          Math.abs(p.x-s.x)<180&&Math.abs(p.y-s.y)<165&&
          (s.kind==='bounceBloom'&&(!s.requires||p.form===s.requires)||
           (s.kind==='windRing'&&p.form==='skyling')||
           (s.kind==='bubbleVent'&&p.form==='tideling')));
        if(nearby){
          const dx=s.target.x-s.x,color=s.kind==='bounceBloom'?'#fff0b2':
            s.kind==='windRing'?'#d8edff':'#b4fff5';
          ctx.save();ctx.globalAlpha=.25;ctx.strokeStyle=color;
          ctx.lineWidth=1.4;ctx.setLineDash([3,8]);
          ctx.beginPath();ctx.moveTo(s.x,s.y-12);
          ctx.quadraticCurveTo(s.x+dx*.2,s.target.y-20,s.target.x,s.target.y);
          ctx.stroke();ctx.setLineDash([]);
          ctx.globalAlpha=.6;
          for(let i=1;i<8;i++){
            const t=((i+now*.6)%8)/8,u=1-t;
            const px=u*u*s.x+2*u*t*(s.x+dx*.2)+t*t*s.target.x;
            const py=u*u*(s.y-12)+2*u*t*(s.target.y-20)+t*t*s.target.y;
            ctx.fillStyle=color;ctx.beginPath();
            ctx.arc(px,py,1.5+(i%3)*.35,0,Math.PI*2);ctx.fill();
          }
          ctx.restore();
        }
        ctx.save();ctx.translate(s.x,s.y);
        if(s.kind==='bounceBloom'){
          // A spring flower communicates launch through upright petals.
          WW.illustrations.draw(ctx,'flowers',0,7,43,39,.92);
          ctx.shadowColor=colors[0];ctx.shadowBlur=11;
          for(let i=0;i<6;i++){
            const angle=i*Math.PI/3+Math.sin(now*1.7)*.06;
            ctx.save();ctx.rotate(angle);
            ctx.fillStyle=i%2?colors[0]:colors[1];
            ctx.beginPath();ctx.ellipse(0,-9.5,5.5,10.5+pulse,0,0,Math.PI*2);
            ctx.fill();ctx.restore();
          }
          ctx.shadowBlur=0;
          ctx.fillStyle='#fff7cc';ctx.beginPath();ctx.arc(0,0,5.4,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle='#fff7e2';ctx.lineWidth=1.5;
          ctx.beginPath();ctx.moveTo(0,-12-pulse*2);ctx.lineTo(0,-23-pulse*2);
          ctx.moveTo(-4,-19-pulse*2);ctx.lineTo(0,-24-pulse*2);
          ctx.lineTo(4,-19-pulse*2);ctx.stroke();
        }else if(s.kind==='windRing'){
          const glow=ctx.createRadialGradient(0,0,2,0,0,23);
          glow.addColorStop(0,'#dcffff7a');glow.addColorStop(.6,'#acdaf64d');
          glow.addColorStop(1,'#c7c7fc00');
          ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,24,0,Math.PI*2);ctx.fill();
          ctx.save();ctx.rotate(now*.43);
          ctx.strokeStyle='#f9eec4';ctx.lineWidth=2.5;
          ctx.setLineDash([15,5,6,5]);
          ctx.beginPath();ctx.arc(0,0,14+pulse*.55,0,Math.PI*2);ctx.stroke();
          ctx.restore();
          ctx.strokeStyle='#a3e7f2bd';ctx.lineWidth=1.2;
          ctx.beginPath();ctx.ellipse(0,0,19,7,-.46,0,Math.PI*2);ctx.stroke();
          ctx.fillStyle='#fff5d0';ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();
          for(let i=0;i<3;i++){
            const phase=now*2.1+i*2.09;
            ctx.fillStyle=i===1?'#f8d8fb':'#d4f9fa';
            ctx.beginPath();ctx.arc(Math.cos(phase)*20,Math.sin(phase)*16,1.8,0,Math.PI*2);ctx.fill();
          }
        }else if(s.kind==='bubbleVent'){
          WW.illustrations.draw(ctx,'shells',0,13,35,27,.9);
          const glow=ctx.createRadialGradient(0,0,2,0,0,27);
          glow.addColorStop(0,'#b5fff7a0');glow.addColorStop(1,'#63d9ee00');
          ctx.fillStyle=glow;ctx.fillRect(-28,-38,56,52);
          for(let i=0;i<8;i++){
            const progress=((now*(.43+i%3*.13)+i*.19)%1+1)%1;
            const x=Math.sin(now*1.3+i*2.7)*6+(i%3-1)*5;
            const y=7-progress*52,r=2+(i%3)*1.6;
            ctx.strokeStyle=i%2?'#e8fff1b8':'#a1f8ffbb';
            ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
            ctx.fillStyle='#f4fff999';ctx.beginPath();
            ctx.arc(x-r*.3,y-r*.35,.7,0,Math.PI*2);ctx.fill();
          }
        }
        ctx.restore();
      }
    }
    function terrain(ctx,time){
      const left=Math.max(0,Math.floor(cameraX/TILE)-1),right=Math.min(level.width,Math.ceil((cameraX+W)/TILE)+1);
      const top=Math.max(0,Math.floor(cameraY/TILE)-1),bottom=Math.min(level.height,Math.ceil((cameraY+H)/TILE)+1);
      for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
        const t=map[y][x];
        // Paint contained water as one basin, never striped texture cells.
        if(t==='empty'||(t==='water'&&level.waterBodies?.length)||
           (t==='platform'&&platformSpans.length)||
           (t==='thermal'&&level.thermalVolumes?.length))continue;
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
      // The world itself teaches navigation. Only an unobtrusive direction
      // cue appears when the next goal is beyond the camera.
      if(Math.abs(delta)>W*.37){
        const right=delta>0,x=right?W-19:19,y=H*.51;
        ctx.globalAlpha=.35+.18*Math.sin(now*3.4);
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
      WW.vistas.atmosphere(ctx,level,cameraX,now);
      ctx.save();ctx.translate(Math.round((Math.random()-.5)*shake),Math.round((Math.random()-.5)*shake));ctx.translate(-Math.round(cameraX),-Math.round(cameraY));
      // The panorama is already painted; avoid translucent sprite repeats in mid-air.
      WW.vistas.draw(ctx,level,cameraX,cameraY,now);
       drawLandmarks(ctx,now);terrain(ctx,now);
      if(level.surface){
        const left=Math.max(0,Math.floor(cameraX/TILE)-1);
        const right=Math.min(level.width,Math.ceil((cameraX+W)/TILE)+1);
        for(let x=left;x<right;x++)
          WW.scenery.slope(ctx,chapter.biome,x*TILE,level.surface[x]*TILE,level.surface[x+1]*TILE);
      }
      WW.scenery.terrainRelief(ctx,level,chapter.biome,cameraX,cameraY);
      WW.scenery.waterVolume(ctx,level,cameraX,now);
      WW.scenery.thermalColumns(ctx,level,cameraX,cameraY,now);
      for(const span of platformSpans){
        if((span.x+span.length)*TILE<cameraX-24||
            span.x*TILE>cameraX+W+24||span.y*TILE<cameraY-48||
            span.y*TILE>cameraY+H+26)continue;
        WW.scenery.platformSpan(ctx,chapter.biome,span,now,level);
      }
      WW.scenery.paintLayers(ctx,level.art?.foreground,cameraX,cameraY);
      groundDetails(ctx,now);
      paintGoalRoute(ctx,now);
       paintSetpieces(ctx,now);
      // Narrative hints remain proximity-triggered, but enormous repeated
      // sign sprites no longer compete with each area's focal architecture.
      for(const sign of level.vistas?.length?[]:(chapter.signs||[])){
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
          // The illuminated relic painting itself communicates the reward;
          // world-space text labels would spoil the scene composition.
        }
        if(it.kind==='exit'){
          WW.props.gate(ctx,it.x,it.y,goals.every(g=>shared.keys[g.kind]),chapter.biome,now);
        }
        if(it.kind==='checkpoint') {
          WW.props.checkpoint(ctx,it.x,it.y,it.used,chapter.biome,now);
        }
      });
      lures.forEach(lure=>{
        WW.art.drawFruit(ctx,lure.food,lure.x,lure.y-5,13);
      });
      mounts.forEach(m=>{
        WW.art.drawMount(ctx,m.kind,m.x,m.y,m.dir<0,{
          action:m.rider!==null?'run':m.eating>0?'eat':
            m.trust>=TRUST_TARGET?'happy':Math.abs(m.vx)>.15?'run':'idle',
          time:m.phase, flying:m.kind==='pegasus'&&!m.grounded
        });
        if(m.trust>0&&m.rider===null){
          box(ctx,m.x-20,m.y-55,40,4,'#213345');
          box(ctx,m.x-19,m.y-54,38*m.trust/TRUST_TARGET,2,
            m.trust>=TRUST_TARGET?'#ffdc88':'#cfb9e8');
        }
      });
      animals.forEach(a=>{
        if(!a.alive)return;
        const near=players.some(p=>!p.sleep&&!p.bubble&&Math.abs(p.x-a.x)<55&&Math.abs(p.y-a.y)<45);
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
          ctx.lineTo(a.x+a.dir*(a.kind==='cloudwhisp'?152:57),a.y-12);
          ctx.stroke();ctx.setLineDash([]);ctx.restore();
        }
        if(a.gustTime>0){
          for(let i=0;i<3;i++){
            ctx.save();ctx.translate(a.x+a.dir*(33+i*47),a.y-13);
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
        if(pr.kind==='food'){
          WW.art.drawFruit(ctx,pr.food,pr.x,pr.y,13);
          return;
        }
        const asset=({orb:'bubble',honey:'honey',bubble:'bubble',gust:'gust',
          spark:'spark',petal:'petal',feather:'gust',splash:'splash'})[pr.kind];
        ctx.save();
        ctx.translate(pr.x,pr.y);
        if(pr.vx<0)ctx.scale(-1,1);
        const wide=['gust','petal','splash','honey'].includes(pr.kind);
        WW.illustrations.draw(ctx,asset,0,wide?11:9,wide?25:19,wide?22:19);
        ctx.restore();
      });
      players.forEach(p=>{
        if(p.bubble){
          // A translucent floating companion, visibly distinct from an
          // active player. Keep their captured creature appearance intact.
          const float=Math.sin(now*3.6)*1.6;
          const cy=p.y-18+float;
          ctx.save();
          ctx.beginPath();ctx.arc(p.x,cy,23,0,Math.PI*2);ctx.clip();
          const sheen=ctx.createRadialGradient(p.x-9,cy-10,2,p.x,cy,28);
          sheen.addColorStop(0,'#f6ffff80');
          sheen.addColorStop(.63,'#87d7f442');
          sheen.addColorStop(1,'#5f95e066');
          ctx.fillStyle=sheen;ctx.fillRect(p.x-24,cy-24,48,48);
          ctx.save();ctx.translate(p.x,cy+8);ctx.scale(.65,.65);
          WW.art.draw(ctx,p.form||'hero',0,15,Math.floor(p.frame)%6,false,p.id,
            {action:'idle',time:now});
          ctx.restore();ctx.restore();
          ctx.save();
          ctx.strokeStyle='#e1fff1e3';ctx.lineWidth=2;
          ctx.beginPath();ctx.arc(p.x,cy,23,0,Math.PI*2);ctx.stroke();
          ctx.strokeStyle='#ffffffaa';ctx.lineWidth=2.4;
          ctx.beginPath();ctx.arc(p.x-3,cy-3,17,3.7,4.85);ctx.stroke();
          ctx.restore();
        }else if(p.sleep){
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
          if(p.form&&p.mount===null){ctx.save();ctx.globalAlpha=.19+.09*Math.sin(now*5);ctx.fillStyle=FORM[p.form].color;ctx.beginPath();ctx.ellipse(p.x,p.y-13,18,23,0,0,Math.PI*2);ctx.fill();ctx.restore();}
          if(p.invincible<=0||Math.floor(now*15)%2===0){
            ctx.save();
            if(p.mount!==null){
              // Rider uses the saddle pivot; the mount supplies the running
              // and flying animation rather than the rider cycling walk poses.
              ctx.translate(p.x,p.y+2);ctx.scale(.80,.82);
            }
            WW.art.draw(ctx,p.form||'hero',p.mount!==null?0:p.x,
              p.mount!==null?0:p.y,Math.floor(p.frame)%6,p.face<0,p.id,{
                action:p.mount!==null?'idle':p.hurt>0?'hurt':
                  !p.grounded?(p.vy<0?'jump':'fall'):Math.abs(p.vx)>0.25?'run':'idle',
                time:now,grounded:p.grounded&&p.mount===null
              });
            ctx.restore();
          }
        }
        // Four tiny feathers over Moonwing communicate remaining lift without
        // a permanent HUD meter or instructional text across the scene.
        if(p.form==='skyling'&&!p.grounded&&!p.sleep&&p.mount===null){
          ctx.save();
          for(let i=0;i<4;i++){
            ctx.globalAlpha=i<p.flaps?.83:.19;
            ctx.fillStyle=i<p.flaps?'#fff4d4':'#98a6c9';
            const x=p.x-9+i*6,y=p.y-42-Math.sin(now*3+i)*.7;
            ctx.beginPath();ctx.ellipse(x,y,1.8,3.3,-.5,0,Math.PI*2);ctx.fill();
          }
          ctx.restore();
        }
        // Solo play needs no floating number over the protagonist. Keep
        // distinct team colors only when two explorers share the screen.
        if(players.length>1){
          box(ctx,p.x-8,p.y-43,16,3,'#152e42');
          box(ctx,p.x-7,p.y-42,14,2,p.id===0?'#ffd782':'#91d2ff');
          ctx.font='bold 8px sans-serif';ctx.fillStyle='#102b41';
          ctx.fillText(String(p.id+1),p.x-2,p.y-46);
        }
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
    return {update,render,recallParty,recallCheckpoint(){recallParty(shared.checkpoint);},stop(){hud.hidden=true;callout.hidden=true;message.classList.remove('show');},get state(){return {chapter,goals,challenges,players,shared,animals,mounts,items,setpieces,projectiles,lures,captures,cameraX,cameraY,objective:objective(),physics:PHYSICS,jumpHeight}}};
  }
  return {start};
})();
