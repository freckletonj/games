// One action vocabulary for two keyboard layouts and standard gamepads.
// All edge detection happens here, so holding a button cannot repeat a capture,
// a flap or a menu action every animation frame.
export const bindings = [
  {left:['A','LEFT'],right:['D','RIGHT'],up:['UP'],down:['S','DOWN'],jump:['W','SPACE'],
   food:['F'],capture:['G'],transform:['T'],next:['E'],recall:['C'],revive:['R'],pause:['ESC']},
  {left:['J'],right:['L'],up:['EIGHT'],down:['K'],jump:['I'],
   food:['O'],capture:['P'],transform:['U'],next:['M'],recall:['N'],revive:['Y'],cloud:['B'],pause:['ESC']}
];

const buttons={jump:0,food:1,capture:2,transform:3,revive:4,cloud:5,recall:8,pause:9};
const keyNames={LEFT:'←',RIGHT:'→',UP:'↑',DOWN:'↓',ESC:'Esc',SPACE:'Space',EIGHT:'8'};

export function controlGuide(keyboard,pad,assist){
  const keys=bindings[keyboard];
  const key=(...actions)=>actions.flatMap(action=>keys[action].map(code=>keyNames[code]??code)).join(' / ');
  const rows=[
    [assist?'Steer cloud':'Move',assist?key('left','right','up','jump','down'):key('left','right'),'Left stick / D-pad'],
    [assist?'Drop berry':'Treat / creature power',key('food'),'B / Circle'],
    ['Capture creature',key('capture'),'X / Square'],
    [assist?'Transform / revert':'Transform / ride',key('transform'),'Y / Triangle']
  ];
  if(assist)rows.push(['Send homing cloud',key('cloud'),'RB / R1']);
  else rows.push(
    ['Jump / flap / swim up',key('jump'),'A / Cross'],
    ['Climb / dive',key('up','down'),'Up / Down'],
    ['Change treat',key('next'),'LT or RT / L2 or R2'],
    ['Revive',key('revive'),'LB / L1'],
    ['Recall to camp',key('recall'),'View / Share']
  );
  rows.push(['Resume',key('pause'),'Start / Options']);
  return rows.map(([action,keyLabel,padLabel])=>[action,pad?padLabel:keyLabel]);
}

export function readActions(keys, pad, previous = {}) {
  const pressed = name => (keys[name] || []).some(key => !!key.isDown);
  const button = index => !!pad?.buttons?.[index]?.pressed;
  const axis = pad?.leftStick?.x ?? pad?.axes?.[0]?.getValue?.() ?? 0;
  const vertical = pad?.leftStick?.y ?? pad?.axes?.[1]?.getValue?.() ?? 0;
  const actions = {
    left:pressed('left') || !!pad?.left || button(14) || axis < -0.32,
    right:pressed('right') || !!pad?.right || button(15) || axis > 0.32,
    up:pressed('up') || !!pad?.up || button(12) || vertical < -0.45,
    down:pressed('down') || !!pad?.down || button(13) || vertical > 0.45,
    next:pressed('next') || button(6) || button(7)
  };
  for(const [name,index] of Object.entries(buttons))
    actions[name]=pressed(name)||button(index);
  for (const name of Object.keys(actions)) {
    actions[name+'Pressed'] = actions[name] && !previous[name];
  }
  return actions;
}
