window.WW = window.WW || {}; WW.games = WW.games || {};
WW.games.animals = (() => {
  const TILE=16,W=480,H=270, TYPES=['springaroo','skyling','tideling'];
  const titles={springaroo:'Springaroo',skyling:'Moonwing',tideling:'Tidefox'};
  const icons={springaroo:'✦',skyling:'✧',tideling:'❋'};
  // One world unit is one source-pixel; frames run at 60 Hz. All map jumps obey these rules.
  const PHYSICS={run:2.25,jump:5.7,doubleJump:5.5,gravity:.27,maxFall:5.7,
    bodyHalf:9,bodyHeight:25,waterExposure:.9,leash:W-72};
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
        waterTime:0,face:1,health:3,sleep:false,invincible:0,selected:0,charges:Object.fromEntries(TYPES.map(t=>[t,0])),
        form:null,until:0,actionCD:0,frame:0};
    });
    const animals=level.objects.filter(o=>TYPES.includes(o.kind)).map((o,i)=>({kind:o.kind,...location(o),origin:(o.x+.5)*TILE,vy:0,alive:true,respawn:0,wary:100,attackCD:1+i*.6,dir:i%2?1:-1,phase:i*1.3,frame:0}));
    const items=level.objects.filter(o=>['snack','skyKey','diveKey','springKey','checkpoint','exit'].includes(o.kind)).map(o=>({kind:o.kind,x:(o.x+.5)*TILE,y:(o.y+.5)*TILE,used:false}));
    const shared={snacks:14,skyKey:false,diveKey:false,springKey:false,checkpoint:{...spawn},won:false};
    const projectiles=[],effects=[];let cameraX=0,cameraY=0,clock=0,hudTime=0,shake=0,lastLeashHint=-10;
    const message=document.getElementById('message');const hud=document.getElementById('hud');
    function say(text,duration=2100) {message.textContent=text;message.classList.add('show');message.dataset.until=String(clock+duration/1000);}
    function particles(x,y,color,count=9){for(let i=0;i<count;i++)effects.push({x,y,vx:(Math.random()-.5)*3.8,vy:(Math.random()-.7)*3.3,color,time:.55+Math.random()*.6});}
    function throwThing(player,kind){
      if(player.actionCD>0||player.sleep)return;
      if(kind==='snack'){if(shared.snacks<=0){say('No snacks left! Find the pink berries.');return;} shared.snacks--;}
      projectiles.push({kind,owner:player.id,x:player.x+player.face*9,y:player.y-11,vx:player.face*4.1,vy:-1.6,ttl:1.4});
      player.actionCD=kind==='orb'?.7:.28;
    }
    function hitPlayer(player){
      if(player.invincible>0||player.sleep||shared.won)return;
      player.health--;player.invincible=1.5;shake=6; WW.input.rumble(player.id,.95,220);particles(player.x,player.y-10,'#ffb8a4',10);
      if(player.health===0){player.sleep=true;player.vx=0;say(player.id===0?'You fainted! Press Revive to wake up.':'A friend fainted! Move close and press Revive.',3000);}
    }
    function revive(player,by){player.sleep=false;player.health=3;player.invincible=2;player.vy=-2;player.waterTime=0;particles(player.x,player.y-10,'#aafae3',14); WW.input.rumble(by.id,.45,180);say('Back on your feet!');}
    function movePlayer(p,controls,dt){
      const step=dt*60;
      if(p.sleep){
        if(p.id===0&&controls.pressed.revive)revive(p,p);
        return;
      }
      p.invincible=Math.max(0,p.invincible-dt);
      p.actionCD=Math.max(0,p.actionCD-dt);
      const direction=Number(controls.right)-Number(controls.left);
      if(direction)p.face=direction;
      const swimming=p.form==='tideling' && (liquid(p.x,p.y-8)||liquid(p.x,p.y+2));
      const flying=p.form==='skyling';
      const run=p.form==='springaroo'?2.6:swimming?2.45:PHYSICS.run;
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
          p.vy=-(second?PHYSICS.doubleJump:PHYSICS.jump);
          p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.jumpsUsed++;
          if(second){particles(p.x,p.y-5,'#f6e190',13);WW.input.rumble(p.id,.25,80);}
        }
        if(flying && controls.jump) p.vy=Math.max(-2.95,p.vy-.52*step);
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
          p.x=p.lastSafe.x;p.y=p.lastSafe.y;p.vx=p.vy=0;
          hitPlayer(p);
          say('Deep water! Catch a Tidefox to swim and dive.',2400);
        }
      } else {
        p.waterTime=0;
        if(p.grounded&&!nowWater)p.lastSafe={x:p.x,y:p.y};
      }
      if(controls.pressed.snack)throwThing(p,'snack');
      if(controls.pressed.orb)throwThing(p,'orb');
      if(controls.pressed.cycle){p.selected=(p.selected+1)%TYPES.length;const type=TYPES[p.selected];say(`P${p.id+1}: ${titles[type]} · ${p.charges[type]} charge(s)`,1150);}
      if(controls.pressed.transform){
        const type=TYPES[p.selected];
        if(p.form)say(`P${p.id+1}: Your current magic must finish first.`,1000);
        else if(p.charges[type]>0){
          p.charges[type]--;p.form=type;p.until=clock+22;
          WW.input.rumble(p.id,.5,280);particles(p.x,p.y-10,'#e1b4ff',22);
          say(`P${p.id+1} becomes ${titles[type]} for 22 seconds!`,2800);
        }else say(`P${p.id+1}: Catch a ${titles[type]} first!`,1350);
      }
      if(p.form&&clock>=p.until){
        p.form=null;
        if(nowWater){p.x=p.lastSafe.x;p.y=p.lastSafe.y;p.vy=0;}
        particles(p.x,p.y-9,'#ffffff',12);say(`P${p.id+1}: Magic faded. Catch another creature!`,1800);
      }
      if(controls.pressed.revive)for(const other of players)if(other!==p&&other.sleep&&distance(other,p)<48)revive(other,p);
      p.frame+=Math.abs(p.vx)*dt*6;
    }
    function targetFor(animal){return players.filter(p=>!p.sleep).sort((a,b)=>distance(a,animal)-distance(b,animal))[0];}
    function updateAnimals(dt){
      animals.forEach(a=>{
        if(!a.alive){a.respawn-=dt;if(a.respawn<=0){a.alive=true;a.wary=100;a.attackCD=2;}return;}
        a.phase+=dt;
        if(a.kind==='skyling'){a.x=a.origin+Math.sin(a.phase*.7)*16;a.y+=Math.sin(a.phase*2)*.12;}
        else {a.dir=Math.sin(a.phase*.85)>0?1:-1;a.x=a.origin+Math.sin(a.phase*.85)*13;}
        const target=targetFor(a); a.attackCD-=dt;
        if(a.wary>0&&target&&distance(target,a)<105&&a.attackCD<=0){
          const dx=target.x-a.x,dy=(target.y-9)-(a.y-9),len=Math.hypot(dx,dy)||1;
          const kind=a.kind==='skyling'?'feather':a.kind==='tideling'?'bubble':'thorn';
          projectiles.push({kind,owner:-1,x:a.x,y:a.y-12,vx:dx/len*2.1,vy:dy/len*2.1,ttl:2.3});
          a.attackCD=a.kind==='springaroo'?2.3:1.9;
        }
        if(a.wary<=0) a.frame+=dt*3;else a.frame+=dt*6;
      });
    }
    function capture(animal,owner){
      const chance=.12+.86*Math.pow(1-animal.wary/100,1.55);
      if(Math.random()<chance){
        animal.alive=false;animal.respawn=7;players[owner].charges[animal.kind]++;particles(animal.x,animal.y-8,'#fff2a0',24);
        WW.input.rumble(owner,.55,290);say(`P${owner+1} caught ${titles[animal.kind]}! One 22-second transformation earned.`,2900);
      } else {particles(animal.x,animal.y-8,'#f4b0dd',7);say(`The orb missed! Catch chance ${Math.round(chance*100)}%.`,1200);}
    }
    function updateProjectiles(dt){
      for(let i=projectiles.length-1;i>=0;i--){
        const pr=projectiles[i];pr.ttl-=dt;pr.x+=pr.vx*dt*60;pr.y+=pr.vy*dt*60;
        if(pr.kind==='snack'||pr.kind==='orb')pr.vy+=.085*dt*60;
        if(pr.ttl<=0||solid(pr.x,pr.y)){projectiles.splice(i,1);continue;}
        if(pr.owner>=0){
          const a=animals.find(a=>a.alive&&Math.hypot(pr.x-a.x,pr.y-(a.y-10))<12);
          if(a){projectiles.splice(i,1);if(pr.kind==='snack'){a.wary=Math.max(0,a.wary-36);particles(a.x,a.y-12,'#f9d68a',9);say(a.wary===0?`${titles[a.kind]} is friendly! Great time to catch!`:`${titles[a.kind]} is warming up (${Math.round(100-a.wary)}% friendly).`,1100);}
          else capture(a,pr.owner);}
        }else{
          const p=players.find(p=>!p.sleep&&p.invincible<=0&&Math.hypot(pr.x-p.x,pr.y-(p.y-9))<9);
          if(p){projectiles.splice(i,1);hitPlayer(p);}
        }
      }
    }
    function updateItems(){
      items.forEach(item=>{
        if(item.used&&item.kind==='snack'&&clock>=item.respawn)item.used=false;
        if(item.used)return;
        const p=players.find(p=>!p.sleep&&Math.hypot(p.x-item.x,(p.y-9)-item.y)<14);
        if(!p)return;
        if(item.kind==='snack'){item.used=true;item.respawn=clock+13;shared.snacks+=5;say('+5 yummy snacks!');WW.input.rumble(p.id,.25,100);particles(item.x,item.y,'#ffb7ce');}
        else if(item.kind==='springKey'&&p.form==='springaroo'){item.used=true;shared.springKey=true;say('Canopy gem found! A perfect double jump!');WW.input.rumble(p.id,.7,380);particles(item.x,item.y,'#ffb6e7',24);}
        else if(item.kind==='skyKey'&&p.form==='skyling'){item.used=true;shared.skyKey=true;say('Sky key found! The river key is still below.');WW.input.rumble(p.id,.7,380);particles(item.x,item.y,'#f7de83',21);}
        else if(item.kind==='diveKey'&&p.form==='tideling'){item.used=true;shared.diveKey=true;say('River key found! Both keys open the gate.');WW.input.rumble(p.id,.7,380);particles(item.x,item.y,'#88f6ff',21);}
        else if(item.kind==='checkpoint'){shared.checkpoint={x:item.x,y:item.y+8};item.used=true;say('Checkpoint activated!');}
        else if(item.kind==='exit'){
          if(shared.skyKey&&shared.diveKey&&shared.springKey){shared.won=true;WW.storage.data.progress.wins++;WW.storage.save();WW.main.win(WW.storage.data.progress.wins);}
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
      if(clock-hudTime>.13){
        hudTime=clock;
        hud.innerHTML=`<div class="hud-player">${players.map(p=>`<div class="player-info" style="border-left:4px solid ${p.id?'#9ad8ff':'#ffd782'}"><b>P${p.id+1}</b> ${p.sleep?'SLEEPING':Array.from({length:3},(_,i)=>`<span class="${i<p.health?'heart':'heart-off'}">♥</span>`).join('')}<div class="tiny">${titles[TYPES[p.selected]]}: ${p.charges[TYPES[p.selected]]} charge${p.charges[TYPES[p.selected]]===1?'':'s'} ${p.form?'· '+titles[p.form]+' '+Math.max(0,Math.ceil(p.until-clock))+'s':''}</div></div>`).join('')}</div><div class="hud-center">✦ ${shared.snacks} snacks &nbsp; Canopy ${shared.springKey?'✓':'◇'} · Sky ${shared.skyKey?'✓':'◇'} · River ${shared.diveKey?'✓':'◇'}<div class="tiny">Select your form · Transform yourself · Esc pauses</div></div>`;
      }
    }
    function box(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
    function background(ctx,time){
      const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#76bcd6');sky.addColorStop(.75,'#bee8d3');sky.addColorStop(1,'#eef3bd');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
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
        const offset=cameraX*(.12+layer*.2);const base=115+layer*39;const colors=['#a6cbbf','#6daca8','#477f84'];
        ctx.fillStyle=colors[layer];ctx.beginPath();ctx.moveTo(0,H);
        for(let x=-40;x<W+90;x+=25){const world=x+offset;const height=Math.sin(world*.018+layer)*15+Math.sin(world*.047)*11;ctx.lineTo(x,base+height);}
        ctx.lineTo(W,H);ctx.fill();
        if(layer===2){for(let n=-2;n<20;n++){
          const xx=n*42-(offset*.68%42);const yy=base+8+Math.sin(n*2.1)*9;
          box(ctx,xx+8,yy,5,70,'#37636b');box(ctx,xx-7,yy-15,34,23,'#4f938b');box(ctx,xx-2,yy-27,24,19,'#5ba291');
        }}
      }
      for(let n=0;n<8;n++){
        const x=((n*108-cameraX*.14+time*1.7)%(W+120)+W+120)%(W+120)-40;
        const y=27+n%3*17;box(ctx,x,y,32,8,'#eaf9ea');box(ctx,x+8,y-6,20,11,'#eaf9ea');
      }
    }
    function terrain(ctx,time){
      const left=Math.max(0,Math.floor(cameraX/TILE)-1),right=Math.min(level.width,Math.ceil((cameraX+W)/TILE)+1);
      const top=Math.max(0,Math.floor(cameraY/TILE)-1),bottom=Math.min(level.height,Math.ceil((cameraY+H)/TILE)+1);
      for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
        const t=map[y][x];if(t==='empty')continue;
        const px=x*TILE,py=y*TILE,h=hash(x,y);
        if(t==='ground'){
          box(ctx,px,py,16,16,'#7d594d');box(ctx,px,py+4,16,12,(h%2?'#775346':'#8d624c'));
          if(y===0||map[y-1][x]!=='ground'){
            box(ctx,px,py,16,5,'#4b9f5a');box(ctx,px,py+4,16,2,'#347a52');
            box(ctx,px+2,py-2,3,3,'#8dd26e');box(ctx,px+11,py-1,2,3,'#a4d86b');
          }
          if(h%5===0)box(ctx,px+5,py+9,4,2,'#b38b66');if(h%7===0)box(ctx,px+12,py+12,2,2,'#573e45');
          if(h%23===0){box(ctx,px+8,py+6,3,7,'#7b7bb1');box(ctx,px+9,py+5,1,5,'#b1c9f0');}
        } else if(t==='platform'){
          box(ctx,px,py,16,7,'#6966ab');box(ctx,px,py,16,3,'#a4e9bf');
          box(ctx,px+2,py+7,12,3,'#555583');
          box(ctx,px+5,py+10,6,3,'#7f7dba');
          if(h%3===0){box(ctx,px+5,py-3,2,4,'#aeefcf');box(ctx,px+3,py-5,6,3,'#f4a0cf');}
        } else if(t==='water'){
          box(ctx,px,py,16,16,y%2?'#368cc9':'#329ed3');
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
      ctx.setTransform(2,0,0,2,0,0);
      background(ctx,now);
      ctx.save();ctx.translate(Math.round((Math.random()-.5)*shake),Math.round((Math.random()-.5)*shake));ctx.translate(-Math.round(cameraX),-Math.round(cameraY));
      terrain(ctx,now);
      items.forEach(it=>{if(it.used)return;const bob=Math.sin(now*3+it.x)*2;
        if(it.kind==='snack')WW.art.draw(ctx,'snack',it.x,it.y+8+bob,Math.floor(now*3)%4);
        if(it.kind==='skyKey'||it.kind==='diveKey'||it.kind==='springKey'){
          box(ctx,it.x-4,it.y-4+bob,8,8,it.kind==='skyKey'?'#ffe7a0':it.kind==='springKey'?'#ff94d5':'#adfafa');box(ctx,it.x-2,it.y-7+bob,4,4,'#ffffff');box(ctx,it.x+3,it.y+2+bob,7,2,'#ffde7e');
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
        const wary=a.wary;box(ctx,a.x-11,a.y-23,22,4,'#263f46');box(ctx,a.x-10,a.y-22,20*(wary/100),2,wary>40?'#fa8c82':'#a1eaa2');
        if(!wary){box(ctx,a.x-2,a.y-28,4,3,'#ff9eb6');box(ctx,a.x-4,a.y-26,8,3,'#ff9eb6');}
        const chance=Math.round((.12+.86*Math.pow(1-a.wary/100,1.55))*100);
        ctx.fillStyle='#f4fbef';ctx.font='bold 7px sans-serif';
        ctx.fillText(titles[a.kind],a.x-17,a.y-39);
        if(a.wary<100){ctx.fillStyle='#fceab0';ctx.fillText(`Catch ${chance}%`,a.x-17,a.y-30);}
      });
      projectiles.forEach(pr=>{
        const color={snack:'#fe92b7',orb:'#d8bcff',feather:'#f7eec7',bubble:'#9fe4fa',thorn:'#f5ae7a'}[pr.kind];
        box(ctx,pr.x-3,pr.y-3,6,6,'#273e55');box(ctx,pr.x-2,pr.y-2,4,4,color);if(pr.kind==='orb')box(ctx,pr.x-1,pr.y-1,2,2,'#ffffff');
      });
      players.forEach(p=>{
        if(p.invincible>0&&Math.floor(now*13)%2)return;
        if(p.sleep){WW.art.draw(ctx,'hero',p.x,p.y+7,1,p.face<0,p.id);box(ctx,p.x+7,p.y-25,4,5,'#ecf6ff');box(ctx,p.x+12,p.y-31,5,6,'#ecf6ff');}
        else WW.art.draw(ctx,p.form||'hero',p.x,p.y,Math.floor(p.frame)%4,p.face<0,p.id);
        // Colored player markers remain clear even while transformed.
        box(ctx,p.x-8,p.y-35,16,3,'#152e42');box(ctx,p.x-7,p.y-34,14,2,p.id===0?'#ffd782':'#91d2ff');
        ctx.font='bold 8px sans-serif';ctx.fillStyle='#102b41';ctx.fillText(String(p.id+1),p.x-2,p.y-38);
      });
      effects.forEach(e=>box(ctx,e.x,e.y,3,3,e.color));ctx.restore();
      if(!shared.skyKey||!shared.diveKey||!shared.springKey){
        box(ctx,9,H-24,355,16,'#233d50cf');ctx.font='9px monospace';ctx.fillStyle='#fff2c6';ctx.fillText(!shared.springKey?'Double jump as a SPRINGAROO for the canopy gem!':!shared.skyKey?'Fly as a MOONWING to the sky gem!':'Dive as a TIDEFOX for the river gem!',15,H-13);
      }
    }
    hud.hidden=false;say('Catch three magical creatures. Their powers unlock three gems!',3600);
    return {update,render,stop(){hud.hidden=true;message.classList.remove('show');},get state(){return {players,shared,animals,items,cameraX,cameraY,physics:PHYSICS,jumpHeight}}};
  }
  return {start};
})();
