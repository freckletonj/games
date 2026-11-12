// One action vocabulary for two keyboard layouts and standard gamepads.
// All edge detection happens here, so holding a button cannot repeat a capture,
// a flap or a menu action every animation frame.
export const bindings = [
  {left:['A','LEFT'],right:['D','RIGHT'],down:['S','DOWN'],jump:['W','SPACE'],
   food:['F'],capture:['G'],transform:['T'],next:['E'],recall:['C'],pause:['ESC']},
  {left:['J'],right:['L'],down:['K'],jump:['I'],
   food:['O'],capture:['P'],transform:['U'],next:['M'],recall:['N'],pause:['ESC']}
];

export function readActions(keys, pad, previous = {}) {
  const pressed = name => (keys[name] || []).some(key => !!key.isDown);
  const button = index => !!pad?.buttons?.[index]?.pressed;
  const axis = pad?.leftStick?.x ?? pad?.axes?.[0]?.getValue?.() ?? 0;
  const vertical = pad?.leftStick?.y ?? pad?.axes?.[1]?.getValue?.() ?? 0;
  const actions = {
    left:pressed('left') || !!pad?.left || button(14) || axis < -0.32,
    right:pressed('right') || !!pad?.right || button(15) || axis > 0.32,
    down:pressed('down') || !!pad?.down || button(13) || vertical > 0.45,
    jump:pressed('jump') || button(0),
    food:pressed('food') || button(1),
    capture:pressed('capture') || button(2),
    transform:pressed('transform') || button(3),
    next:pressed('next') || button(6) || button(7),
    recall:pressed('recall') || button(8),
    pause:pressed('pause') || button(9)
  };
  for (const name of ['jump','food','capture','transform','next','recall','pause','left','right']) {
    actions[name+'Pressed'] = actions[name] && !previous[name];
  }
  return actions;
}
