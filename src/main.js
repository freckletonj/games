window.WW = window.WW || {};
WW.main = (() => {
  const canvas=document.getElementById('game'), ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  const menu=document.getElementById('menu');const hud=document.getElementById('hud');
  let game=null,last=0,paused=true,screen='home',cancelCalibration=null,customMap=null,customMapJson=false,pixelsPerTile=1,customBiome='meadow',menuPadLatch='',currentChapterIndex=0;
  const panel=(content)=>{menu.hidden=false;menu.innerHTML=`<section class="panel ${screen==='home'?'panel-home':''}">${content}</section>`;menu.querySelector('button')?.focus({preventScroll:true});};
  const button=(id,label,kind='secondary')=>`<button class="${kind}" data-action="${id}">${label}</button>`;
  function home(){
    if(game){game.stop();game=null;}paused=true;screen='home';cancelCalibration?.();cancelCalibration=null;
    const finished=WW.storage.data.progress.chapters||{};
    const nextUnfinished=WW.chapters.findIndex(chapter=>!Object.hasOwn(finished,chapter.id));
    currentChapterIndex=nextUnfinished<0?0:nextUnfinished;
    const completed=WW.chapters.filter(chapter=>Object.hasOwn(finished,chapter.id)).length;
    const playLabel=currentChapterIndex?'▶ CONTINUE: '+WW.chapters[currentChapterIndex].name :'▶ PLAY MOSS LIGHT MEADOW';
    const portrait=type=>'<img data-sprite="'+type+'" src="'+WW.art.portrait(type)+'" alt="'+WW.catalog.creatures[type].name+'">';
    panel(`
    <div class="home-layout">
      <div class="home-copy">
        <div class="kicker">✦ &nbsp; An enchanted world awaits &nbsp; ✦</div>
        <h1>WONDER<span>WOOD</span></h1>
        <div class="home-rule">A LITTLE MAGIC GOES A LONG WAY</div>
        <h2>Every creature has a story.<br>Every forest has a secret.</h2>
        <p>Wander through moonlit meadows, luminous reefs and starlit peaks. Make friends with magical creatures, borrow their extraordinary powers, and find the lost gems together.</p>
        <div class="buttons">${button('play',playLabel,'primary')}${button('chapters','✦ CHOOSE A LEVEL')}</div>
        <div class="home-note">8 transformations &nbsp; · &nbsp; 3 key traversal powers &nbsp; · &nbsp; ${completed}/${WW.chapters.length} completed</div>
      </div>
      <div class="home-art storybook" aria-label="Four magical creatures beneath a glowing moon" role="img">
        <div class="art-stars"></div><div class="art-orbit"></div>
        ${['springaroo','skyling','tideling','emberkit'].map(t=>'<div class="art-portrait">'+portrait(t)+'</div>').join('')}
        <div class="art-caption">THE WOODS ARE WAKING</div>
      </div>
    </div>
    <div class="home-bottom"><span class="hint">${customMap?'Custom map ready.':'Your next adventure begins here.'} &nbsp; · &nbsp; ${WW.input.pads().length} controller(s) connected</span>
      <div class="buttons">${button('journal','Creature journal')}${button('settings','Settings')}${button('calibrate','Controller setup')}${button('level','Load PNG map')}</div>
    </div>
    <details class="control-guide"><summary>View keyboard controls</summary>
      <div class="instructions"><b>Player 1:</b> A / D move · W jump / tap to flap · F food / creature power · E change food · G catch orb · T transform · R revive · C camp<br>
      <b>Player 2:</b> J / L move · I jump / tap to flap · O food / creature power · M change food · P catch orb · U transform · Y revive · N camp<br>
      <b>Menus:</b> Arrow keys + Enter · Escape pauses · Gems collect on contact</div>
    </details>`);
    const art=menu.querySelector('.home-art');
    if(art)art.style.backgroundImage=`url("${WW.scenery.url('backdrop')}")`;
  }
  function chapters(){
    screen='chapters';
    const cards=WW.chapters.map((c,i)=>`<div class="chapter-card ${c.biome}"><div class="chapter-number">CHAPTER ${i+1} · ${c.difficulty}</div><div class="chapter-illustration"><img src="${WW.art.portrait(['springaroo','tideling','skyling','tideling','skyling'][i])}" alt=""></div><h2>${c.name}</h2><p>${c.tagline}</p><div class="chapter-stats">1 light · ${WW.worlds.summary[c.id].width} steps · ${Object.hasOwn(WW.storage.data.progress.chapters||{},c.id)?'✓ Completed':'New adventure'}</div>${button('stage-'+i,'Explore '+c.name,i===currentChapterIndex?'primary':'secondary')}</div>`).join('');
    panel(`<div class="kicker">The Wonderwood Atlas</div><h1>CHOOSE YOUR TRAIL</h1><p>Every chapter has a new landscape, different puzzles and magical neighbors. Play in any order.</p><div class="chapter-grid">${cards}</div><div class="buttons">${button('home','Back')}</div>`);
  }
  async function play(index=currentChapterIndex) {
    currentChapterIndex=index;
    const chapter=customMap?null:WW.chapters[index];
    if(game){game.stop();game=null;}
    paused=true;screen='loading';
    panel('<div class="kicker">Unfolding the forest map</div><h2>Loading adventure…</h2>');
    try{
      const level=customMap?(customMapJson?await WW.levels.loadJSON(customMap):await WW.levels.load(customMap,pixelsPerTile,customBiome)):WW.worlds.create(chapter);
      level.chapter=chapter;
      if(customMap && !customMapJson)level.biome=customBiome;
      if(level.warnings.some(w=>w.startsWith('No ')))throw Error(level.warnings.join(' · '));
      WW.input.reset();game=WW.games.animals.start(level);menu.hidden=true;paused=false;screen='playing';last=0;
      if(level.warnings.length)game && console.warn('Level warnings:',level.warnings);
      if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
    }catch(error){screen='error';panel(`<h2>Couldn't read this level</h2><p class="warning" id="error"></p><div class="buttons">${button('home','Back to menu')}</div>`);document.getElementById('error').textContent=error.message;}
  }
  function settings(){
    screen='settings';const settings=WW.storage.data.settings;
    panel(`<div class="kicker">Wonderwood Arcade</div><h2>Game settings</h2>
      <p>Controls and progress are stored in this browser. Export a save to keep a backup when you move the HTML file.</p>
      <div class="row"><label for="players">Players</label><select id="players"><option value="1" ${settings.players===1?'selected':''}>1 player</option><option value="2" ${settings.players===2?'selected':''}>2 players</option></select></div>
      <label class="toggle"><input id="rumble" type="checkbox" ${settings.rumble?'checked':''}> Controller vibration (if supported)</label><label class="toggle"><input id="sound" type="checkbox" ${settings.sound?'checked':''}> Magical sound effects</label>
      <div class="buttons">${button('save-settings','Save settings','primary')}${button('export','Export save')}${button('import','Import save')}${button('home','Back')}</div>
      <input id="save-file" type="file" accept="application/json,.json" hidden>
      <div class="instructions">Controller vibration support varies by gamepad, Linux driver, and Firefox version.</div>`);
    document.getElementById('save-file').addEventListener('change',async(e)=>{
      const file=e.target.files[0];if(!file)return;
      try{await WW.storage.importSave(file);settings();}
      catch(err){alert(err.message);}
    });
  }
  function calibration(){
    screen='calibration';const pads=WW.input.pads();if(!pads.length){panel(`<div class="kicker">Controller setup</div><h2>No gamepad detected</h2><p>Connect a USB controller, then press any button on it while Firefox is focused. The browser only exposes gamepads after interaction.</p><div class="buttons">${button('calibrate','Try again','primary')}${button('home','Back')}</div>`);return;}
    const p=pads[0];
    panel(`<div class="kicker">Controller setup · ${p.index+1}</div><h2>Press the requested control</h2><p id="calibration-step"></p><p class="hint">Release each control before the next step. Saves automatically by controller name.</p><div class="buttons">${button('home','Cancel')}</div>`);
    const display={left:'MOVE LEFT',right:'MOVE RIGHT',down:'DIVE DOWN',jump:'JUMP / FLAP',snack:'FOOD / CREATURE POWER',orb:'MAGIC CATCH ORB',transform:'SWITCH FORM',revive:'WAKE / REVIVE',foodCycle:'CHANGE FOOD',recall:'RETURN TO CAMP'};
    cancelCalibration=WW.input.calibrate(p.index,(step,actions)=>{
      const element=document.getElementById('calibration-step');
      if(element)element.textContent=`${step+1} / ${actions.length} — ${display[actions[step]]}`;
    },()=>{cancelCalibration=null;WW.input.rumble(0,.6,220);panel(`<h2>Controller saved!</h2><p>The mapping will load automatically whenever this controller connects.</p><div class="buttons">${button('home','Back to menu','primary')}</div>`);});
  }
  function level(){
    screen='level';panel(`<div class="kicker">For level creators · AI-assisted maps</div><h2>Load your own PNG or compiled JSON map</h2>
      <p>Use the palette from README.md for a semantic PNG, or load level JSON exported by scripts/compile-semantic-level.py. Pixels per tile and scenery biome apply to PNG only; compiled JSON may declare its biome.</p>
      <div class="row"><label>PNG <input type="file" id="level-file" accept="image/png,.json"></label><label>Pixels per tile <input id="tile-size" type="number" min="1" max="64" value="1" style="width:70px"></label><label>Scenery <select id="level-biome"><option value="meadow">Mosslight Meadow</option><option value="coast">Crystal Coast</option><option value="summit">Starfall Summit</option></select></label></div>
      <p class="hint">Use one color per semantic tile, not a painted scene. Start and exit need solid ground beneath them; masks with too many unknown colors are rejected.</p>
      <div class="buttons">${button('load-level','Use this level','primary')}${button('reset-level','Use built-in level')}${button('home','Back')}</div>`);
  }
  function journal(){
    screen='journal';
    const species=Object.entries(WW.catalog.creatures).map(([kind,c])=> {
      const form=WW.catalog.forms[kind];
      const role=c.role+' · '+form.power;
      return '<div class="journal-card"><img src="'+WW.art.portrait(kind)+'" alt=""><div><b>'+c.name+
        '</b><small>'+role+'<br>Favorite: '+WW.catalog.foods[c.favorite].name+
        ' · Counterplay: '+c.tactic+'</small></div></div>';
    }).join('');
    const foods=Object.entries(WW.catalog.foods).map(([kind,c])=>
      '<span class="food-guide"><img src="'+WW.art.foodIcon(kind)+'" alt="">'+c.name+'</span>').join('');
    panel('<div class="kicker">Wonderwood field notes</div><h2>Creatures have lives of their own</h2>'+
      '<p>Leave fruit on the ground. Watch creatures approach and eat. Two favorite treats (or three others) distract any creature for 12 seconds. Throw a G orb to befriend it. Only your latest captured species remains available to transform into; T toggles explorer / creature. F throws food as an explorer but casts your creature power while transformed.</p>'+
      '<div class="journal-grid">'+species+'</div><h3>Picnic basket</h3><div class="guide-foods">'+foods+'</div>'+
      '<p>All eight animals can befriend you. Springaroo, Tidefox and Moonwing are essential for the three lights; other powers offer smaller tactical advantages. Run past, time a head stomp for a brief knockout, lure a creature with fruit, or use a borrowed spell. Watch the warning line before a dash or gust.</p>'+
      '<div class="buttons">'+button('home','Back to menu','primary')+'</div>');
  }
  function pause(){if(!game||screen!=='playing')return;paused=true;screen='paused';panel(`<div class="kicker">Adventure on hold</div><h2>Paused</h2><p>Snack time? Your forest friends will still be here.</p><div class="buttons">${button('resume','Resume','primary')}${button('camp','Return everyone to camp')}${button('checkpoint','Warp to last checkpoint')}${button('restart','Restart level')}${button('home','Main menu')}</div>`);}
  function win(wins,shards=0,total=0){
    paused=true;screen='won';const chapter=customMap?null:WW.chapters[currentChapterIndex];
    const next=chapter&&currentChapterIndex<WW.chapters.length-1;
    panel(`<div class="kicker">Chapter complete · ${chapter?.name||'Custom adventure'}</div><h1>YOU DID IT!</h1><h2>The ancient gate has awakened!</h2><p>You recovered the chapter's light and found ${shards}/${total} hidden star shards. The forest remembers your teamwork. Completed adventures: ${wins}.</p><div class="buttons">${next?button('next','▶ Next: '+WW.chapters[currentChapterIndex+1].name,'primary'):''}${button('restart','Replay chapter')}${button('chapters','Chapter select')}${button('home','Arcade menu')}</div>`);
  }
  menu.addEventListener('click',async e=>{
    const id=e.target.closest('button')?.dataset.action;
    if(!id)return;
    if(id==='play'||id==='restart')await play();
    if(id==='chapters')chapters();
    if(id==='next'){customMap=null;await play(currentChapterIndex+1);}
    if(id.startsWith('stage-')){customMap=null;await play(Number(id.slice(6)));}
    if(id==='home')home();
    if(id==='settings')settings();
    if(id==='journal')journal();
    if(id==='calibrate')calibration();
    if(id==='level')level();
    if(id==='camp'&&screen==='paused'){game.recallParty();paused=false;screen='playing';menu.hidden=true;last=0;}
    if(id==='checkpoint'&&screen==='paused'){game.recallCheckpoint();paused=false;screen='playing';menu.hidden=true;last=0;}
    if(id==='resume'&&screen==='paused'){paused=false;screen='playing';menu.hidden=true;WW.input.reset();last=0;}
    if(id==='save-settings'){WW.storage.data.settings.players=Number(document.getElementById('players').value);WW.storage.data.settings.rumble=document.getElementById('rumble').checked;WW.storage.data.settings.sound=document.getElementById('sound').checked;WW.storage.save();home();}
    if(id==='export')WW.storage.exportSave();
    if(id==='import')document.getElementById('save-file').click();
    if(id==='reset-level'){customMap=null;customMapJson=false;pixelsPerTile=1;customBiome='meadow';home();}
    if(id==='load-level'){
      const file=document.getElementById('level-file').files[0];if(!file){alert('Select a PNG file first.');return;}
      const size=Number(document.getElementById('tile-size').value);
      if(!Number.isInteger(size)||size<1||size>64){alert('Pixels per tile must be 1–64.');return;}
      customMap=URL.createObjectURL(file);customMapJson=file.name.toLowerCase().endsWith('.json');pixelsPerTile=size;customBiome=document.getElementById('level-biome').value;await play();
    }
  });
  addEventListener('keydown',e=>{
    if(e.code==='Escape'){
      if(screen==='playing'){e.preventDefault();pause();}
      else if(screen==='paused'){e.preventDefault();paused=false;screen='playing';menu.hidden=true;WW.input.reset();last=0;}
      else if(!['home','loading','won'].includes(screen)){e.preventDefault();home();}
      return;
    }
    if(menu.hidden||!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','KeyW','KeyS'].includes(e.code))return;
    if(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    const buttons=[...menu.querySelectorAll('button:not([disabled])')];
    if(!buttons.length)return;
    e.preventDefault();const index=buttons.indexOf(document.activeElement);
    const forward=['ArrowDown','ArrowRight','KeyS'].includes(e.code);
    buttons[(index+(forward?1:-1)+buttons.length)%buttons.length].focus();
  });
  function pollMenuGamepad(){
    if(menu.hidden || screen==='calibration'){menuPadLatch='';return;}
    const pad=WW.input.pads()[0];if(!pad){menuPadLatch='';return;}
    const left=pad.buttons[14]?.pressed||pad.axes[0]<-.55;
    const right=pad.buttons[15]?.pressed||pad.axes[0]>.55;
    const up=pad.buttons[12]?.pressed||pad.axes[1]<-.55;
    const down=pad.buttons[13]?.pressed||pad.axes[1]>.55;
    const confirm=pad.buttons[0]?.pressed;
    const value=confirm?'confirm':left||up?'previous':right||down?'next':'';
    if(value&&value!==menuPadLatch){
      const buttons=[...menu.querySelectorAll('button:not([disabled])')];
      if(value==='confirm')document.activeElement?.click?.();
      else if(buttons.length){const selected=buttons.indexOf(document.activeElement);
        buttons[(selected+(value==='next'?1:-1)+buttons.length)%buttons.length].focus({preventScroll:true});}
    }
    menuPadLatch=value;
  }
  function idle(now){
    ctx.setTransform(3,0,0,3,0,0);
    if(WW.scenery.background(ctx,'meadow',0)){
      for(let x=0;x<480;x+=16)WW.scenery.tile(ctx,'meadow','ground',x,244,x,{n:false,e:x<464,w:x>0,s:true},now*.001);
      WW.art.draw(ctx,'springaroo',85,244,Math.floor(now/300)%4,false,null,{action:'run',time:now*.001});
      WW.art.draw(ctx,'hero',235,244,Math.floor(now/300)%4,false,null,{action:'idle',time:now*.001});
      return;
    }
    // The first image decode may be asynchronous; use a quiet backdrop until
    // the painted scene and characters are ready, not a vector placeholder.
    ctx.fillStyle='#263b56';
    ctx.fillRect(0,0,480,270);
  }
  function frame(now){const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(game){if(!paused)game.update(dt);game.render(ctx,now/1000);}else idle(now);
    pollMenuGamepad();requestAnimationFrame(frame);}
  WW.storage.load();WW.input.syncAssignments();home();requestAnimationFrame(frame);
  return {home,pause,win,play,get game(){return game}};
})();
