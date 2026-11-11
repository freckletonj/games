window.WW = window.WW || {};
WW.input = (() => {
  const actions = ['left','right','down','jump','snack','orb','transform','revive','foodCycle','recall'];
  const defaults = { left:[{type:'axis',index:0,sign:-1},{type:'button',index:14}],right:[{type:'axis',index:0,sign:1},{type:'button',index:15}],down:[{type:'axis',index:1,sign:1},{type:'button',index:13}],jump:[{type:'button',index:0}],snack:[{type:'button',index:1}],orb:[{type:'button',index:2}],transform:[{type:'button',index:3}],revive:[{type:'button',index:4}],foodCycle:[{type:'button',index:7}],recall:[{type:'button',index:8}] };
  const keyMaps = [ { left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],down:['KeyS','ArrowDown'],jump:['KeyW','Space','ArrowUp'],snack:['KeyF'],orb:['KeyG'],transform:['KeyT'],revive:['KeyR'],foodCycle:['KeyE'],recall:['KeyC'] }, { left:['KeyJ'],right:['KeyL'],down:['KeyK'],jump:['KeyI'],snack:['KeyO'],orb:['KeyP'],transform:['KeyU'],revive:['KeyY'],foodCycle:['KeyM'],recall:['KeyN'] } ];
  const keys = new Set(); const prev = [new Set(), new Set()]; const assigned = new Map();
  addEventListener('keydown', e => {if (/^(Arrow|Space)/.test(e.code) && document.getElementById('menu')?.hidden) e.preventDefault(); keys.add(e.code);});
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  function pads() { return navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; }
  function syncAssignments() {
    const connected = pads();
    for (const [slot,index] of assigned) if (!connected.some(p => p.index === index)) assigned.delete(slot);
    connected.forEach((p,i) => { if (i < 2 && ![...assigned.values()].includes(p.index) && !assigned.has(i)) assigned.set(i,p.index); });
  }
  function bindingActive(pad, binding) {
    return binding.type === 'button' ? (pad.buttons[binding.index]?.value || 0) > .55 : (pad.axes[binding.index] || 0) * binding.sign > .55;
  }
  function getProfile(pad) {return WW.storage.data.profiles[pad.id] || defaults;}
  function sample(slot) {
    const pad = pads().find(p => p.index === assigned.get(slot)); const profile = pad && getProfile(pad);
    return Object.fromEntries(actions.map(action => [action, keyMaps[slot][action].some(key=>keys.has(key)) || !!(pad && (profile[action] || []).some(b=>bindingActive(pad,b)))]));
  }
  function read(slot) {
    const current = sample(slot); const pressed = {}; const released = {};
    for (const action of actions) { pressed[action] = current[action] && !prev[slot].has(action); released[action] = !current[action] && prev[slot].has(action); }
    prev[slot] = new Set(actions.filter(a=>current[a]));
    return { ...current, pressed, released };
  }
  function reset() {
    keys.clear();syncAssignments();
    // When leaving a menu or returning to camp, a held confirm/recall button
    // must not fire a fresh jump or spell until the controller is released.
    for(let slot=0;slot<prev.length;slot++){
      const current=sample(slot);
      prev[slot]=new Set(actions.filter(action=>current[action]));
    }
  }
  function rumble(slot, strength=.5, duration=160) {
    if (!WW.storage.data.settings.rumble) return;
    const pad = pads().find(p=>p.index===assigned.get(slot));
    const actuator = pad?.vibrationActuator;
    if (actuator?.playEffect) actuator.playEffect('dual-rumble',{duration,strongMagnitude:strength,weakMagnitude:strength*.7}).catch(()=>{});
  }
  function snapshot(pad) { return { buttons:pad.buttons.map(b=>b.value), axes:[...pad.axes] }; }
  function changed(pad, baseline) {
    for (let i=0;i<pad.buttons.length;i++) if ((pad.buttons[i]?.value || 0) > .65 && (baseline.buttons[i] || 0) < .2) return {type:'button',index:i};
    for (let i=0;i<pad.axes.length;i++) {
      const value=pad.axes[i]; if (Math.abs(value)>.7 && Math.abs(value-(baseline.axes[i] || 0))>.55) return {type:'axis',index:i,sign:Math.sign(value)};
    }
    return null;
  }
  function calibrate(index, onStep, onComplete) {
    const pad = pads().find(p=>p.index===index); if (!pad) return () => {};
    let step=0, base=snapshot(pad), armed=false, frame=0; const result={};
    function tick(){
      const p=pads().find(p=>p.index===index); if(!p)return;
      const neutral = p.buttons.every(b=>b.value<.2) && p.axes.every((a,i)=>Math.abs(a-(base.axes[i]||0)) < .25);
      if(!armed && neutral) armed=true;
      if(armed){const b=changed(p,base); if(b){result[actions[step]]=[b]; step++; armed=false; if(step<actions.length)onStep(step,actions); if(step===actions.length){WW.storage.data.profiles[p.id]=result; WW.storage.save();onComplete();return;}}}
      frame=requestAnimationFrame(tick);
    }
    onStep(0,actions);frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  }
  addEventListener('gamepadconnected',syncAssignments);
  addEventListener('gamepaddisconnected',syncAssignments);
  return {actions,pads,read,reset,rumble,calibrate,syncAssignments,assigned};
})();
