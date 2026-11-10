window.WW = window.WW || {};
WW.main = (() => {
  const canvas=document.getElementById('game'), ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  const menu=document.getElementById('menu');const hud=document.getElementById('hud');
  let game=null,last=0,paused=true,screen='home',cancelCalibration=null,customMap=null,pixelsPerTile=1;
  const builtinMap=window.WONDERWOOD_MAP.startsWith('data:')?window.WONDERWOOD_MAP:'src/games/animal-adventure/levels/first-forest.png';
  const panel=(content)=>{menu.hidden=false;menu.innerHTML=`<section class="panel">${content}</section>`;};
  const button=(id,label,kind='secondary')=>`<button class="${kind}" data-action="${id}">${label}</button>`;
  function home(){
    if(game){game.stop();game=null;}paused=true;screen='home';cancelCalibration?.();cancelCalibration=null;
    panel(`<div class="kicker">An adventure arcade for the whole family</div><h1>WONDERWOOD</h1>
      <h2>Three magical powers. Three hidden gems.</h2><p>Befriend and catch fantasy creatures! Springaroo double-jumps, Moonwing flies, Tidefox dives. Each capture gives that player one timed transformation. The deep lake is dangerous unless you become a Tidefox.</p>
      <div class="chips"><span class="chip">Local co-op</span><span class="chip">USB gamepads</span><span class="chip">Offline play</span><span class="chip">Pixel-art world</span></div>
      <div class="buttons">${button('play','▶ PLAY THE FOREST','primary')}${button('settings','⚙ Settings')}${button('calibrate','🎮 Map controller')}${button('level','🗺 Load PNG level')}</div>
      <div class="instructions"><b>P1:</b> A / D move, W jump, S dive, F snack, G magic orb, Q choose animal, T transform, R revive<br>
      <b>P2:</b> J / L move, I jump, K dive, O snack, P orb, H choose, U transform, Y revive<br>
      <b>Controllers:</b> left stick / D-pad move · A jump · B snack · X orb · Y transform · RB choose · LB revive</div>
      <div class="hint">${customMap?'Custom level loaded for this session.':'First Forest: Canopy Gem + Sky Gem + River Gem.'} &nbsp; · &nbsp; ${WW.input.pads().length} controller(s) detected</div>`);
  }
  async function play() {
    const url=customMap||builtinMap;
    if(game){game.stop();game=null;}
    paused=true;screen='loading';
    panel('<div class="kicker">Unfolding the forest map</div><h2>Loading adventure…</h2>');
    try{
      const level=await WW.levels.load(url,pixelsPerTile);
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
      <label class="toggle"><input id="rumble" type="checkbox" ${settings.rumble?'checked':''}> Controller vibration (if supported)</label>
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
    const display={left:'MOVE LEFT',right:'MOVE RIGHT',down:'MOVE / DIVE DOWN',jump:'JUMP / SWIM UP',snack:'THROW SNACK',orb:'THROW MAGIC ORB',cycle:'CHOOSE ANIMAL FORM',transform:'TRANSFORM',revive:'REVIVE'};
    cancelCalibration=WW.input.calibrate(p.index,(step,actions)=>{
      const element=document.getElementById('calibration-step');
      if(element)element.textContent=`${step+1} / ${actions.length} — ${display[actions[step]]}`;
    },()=>{cancelCalibration=null;WW.input.rumble(0,.6,220);panel(`<h2>Controller saved!</h2><p>The mapping will load automatically whenever this controller connects.</p><div class="buttons">${button('home','Back to menu','primary')}</div>`);});
  }
  function level(){
    screen='level';panel(`<div class="kicker">For level creators · AI-assisted maps</div><h2>Load your own PNG map</h2>
      <p>Use the palette from README.md. One pixel is one tile by default; for an AI-generated image with large color blocks, enter the number of image pixels per tile. The parser uses center sampling and approximate colors.</p>
      <div class="row"><label>PNG <input type="file" id="level-file" accept="image/png"></label><label>Pixels per tile <input id="tile-size" type="number" min="1" max="64" value="1" style="width:70px"></label></div>
      <p class="hint">A green start marker and a red exit marker are required. Unknown colors become empty terrain and are reported in the console.</p>
      <div class="buttons">${button('load-level','Use this level','primary')}${button('reset-level','Use built-in level')}${button('home','Back')}</div>`);
  }
  function pause(){if(!game||screen!=='playing')return;paused=true;screen='paused';panel(`<div class="kicker">Adventure on hold</div><h2>Paused</h2><p>Snack time? Your forest friends will still be here.</p><div class="buttons">${button('resume','Resume','primary')}${button('restart','Restart level')}${button('home','Main menu')}</div>`);}
  function win(wins){paused=true;screen='won';panel(`<div class="kicker">A forest full of friends</div><h1>YOU DID IT!</h1><h2>All three gems found. The gate is open!</h2><p>Your teamwork saved the day. Adventures completed: ${wins}. The animals are already getting up to more mischief.</p><div class="buttons">${button('restart','Play again','primary')}${button('home','Arcade menu')}</div>`);}
  menu.addEventListener('click',async e=>{
    const id=e.target.closest('button')?.dataset.action;
    if(!id)return;
    if(id==='play'||id==='restart')await play();
    if(id==='home')home();
    if(id==='settings')settings();
    if(id==='calibrate')calibration();
    if(id==='level')level();
    if(id==='resume'&&screen==='paused'){paused=false;screen='playing';menu.hidden=true;WW.input.reset();last=0;}
    if(id==='save-settings'){WW.storage.data.settings.players=Number(document.getElementById('players').value);WW.storage.data.settings.rumble=document.getElementById('rumble').checked;WW.storage.save();home();}
    if(id==='export')WW.storage.exportSave();
    if(id==='import')document.getElementById('save-file').click();
    if(id==='reset-level'){customMap=null;pixelsPerTile=1;home();}
    if(id==='load-level'){
      const file=document.getElementById('level-file').files[0];if(!file){alert('Select a PNG file first.');return;}
      const size=Number(document.getElementById('tile-size').value);
      if(!Number.isInteger(size)||size<1||size>64){alert('Pixels per tile must be 1–64.');return;}
      customMap=URL.createObjectURL(file);pixelsPerTile=size;await play();
    }
  });
  addEventListener('keydown',e=>{if(e.code!=='Escape')return;if(screen==='playing'){e.preventDefault();pause();}else if(screen==='paused'){e.preventDefault();paused=false;screen='playing';menu.hidden=true;WW.input.reset();last=0;}});
  function idle(now){
    ctx.setTransform(2,0,0,2,0,0);
    const t=now*.001;const sky=ctx.createLinearGradient(0,0,0,270);sky.addColorStop(0,'#73b6cf');sky.addColorStop(1,'#dbedcf');ctx.fillStyle=sky;ctx.fillRect(0,0,480,270);
    for(let layer=0;layer<3;layer++){
      const h=135+layer*38;ctx.fillStyle=['#aacfc1','#77b0a9','#427e7a'][layer];ctx.beginPath();ctx.moveTo(0,270);
      for(let x=0;x<500;x+=16)ctx.lineTo(x,h+Math.sin(x*.023+layer+t*.06)*14+Math.sin(x*.09)*6);ctx.lineTo(480,270);ctx.fill();
    }
    for(let i=0;i<25;i++){const x=i*24+(Math.sin(i*2)*8);ctx.fillStyle='#285963';ctx.fillRect(x,201,5,60);ctx.fillStyle=i%2?'#478b79':'#57987b';ctx.fillRect(x-9,178+Math.sin(i)*12,24,28);}
    ctx.fillStyle='#89bd71';ctx.fillRect(0,244,480,26);
    for(let x=0;x<480;x+=16){ctx.fillStyle='#528b69';ctx.fillRect(x,243,16,3);ctx.fillStyle='#a0d181';ctx.fillRect(x+4,240,3,4);}
    WW.art.draw(ctx,'springaroo',85,244,Math.floor(t*3)%4);WW.art.draw(ctx,'skyling',375,183+Math.sin(t*2)*5,Math.floor(t*6)%4);WW.art.draw(ctx,'tideling',135,244,Math.floor(t*3)%4);WW.art.draw(ctx,'hero',235,242,Math.floor(t*2)%4);
  }
  function frame(now){const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(game){if(!paused)game.update(dt);game.render(ctx,now/1000);}else idle(now);requestAnimationFrame(frame);}
  WW.storage.load();WW.input.syncAssignments();home();requestAnimationFrame(frame);
  return {home,pause,win,play,get game(){return game}};
})();
