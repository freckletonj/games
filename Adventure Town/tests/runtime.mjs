// Execute the real offline bundle with deterministic time and a WebGL/DOM stub.
// This verifies controller, CPU skinning and draw buffers, not GPU rendering.
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const html = readFileSync(root + "dist/adventure-town.html", "utf8");
assert.ok(
  !/<(?:script|link)[^>]*(?:src|href)=/.test(html),
  "offline HTML has no external code or CSS",
);
let source = html.match(/<script>\n([\s\S]*)\n<\/script>/)[1];
if (process.argv[2]) {
  const encoded = readFileSync(process.argv[2]).toString("base64");
  source = source.replace(/atob\('[^']+'\)/, () => `atob('${encoded}')`);
}
const listeners = {}, documentListeners = {},
  elements = new Map();
let nextFrame,
  now = 0,
  draws = 0;
const gl = {
  VERTEX_SHADER: 1,
  FRAGMENT_SHADER: 2,
  COMPILE_STATUS: 3,
  LINK_STATUS: 4,
  ARRAY_BUFFER: 5,
  STATIC_DRAW: 6,
  DYNAMIC_DRAW: 7,
  TRIANGLES: 8,
  FLOAT: 9,
  DEPTH_TEST: 10,
  LEQUAL: 11,
  COLOR_BUFFER_BIT: 1,
  DEPTH_BUFFER_BIT: 2,
  createShader: () => ({}),
  shaderSource() {},
  compileShader() {},
  getShaderParameter: () => true,
  createProgram: () => ({}),
  attachShader() {},
  linkProgram() {},
  getProgramParameter: () => true,
  useProgram() {},
  getUniformLocation: () => 0,
  getAttribLocation: () => 0,
  enableVertexAttribArray() {},
  enable() {},
  depthFunc() {},
  depthMask() {},
  clearColor() {},
  createBuffer: () => ({}),
  bindBuffer() {},
  bufferData(target, values) {
    assert.ok(values.every(Number.isFinite), "finite GPU inputs");
  },
  vertexAttribPointer() {},
  drawArrays() {
    draws++;
  },
  viewport() {},
  clear() {},
  uniform3fv() {},
  uniform2f() {},
};
const mapContext = new Proxy({}, { get: () => () => {} });
function element(id) {
  if (!elements.has(id))
    elements.set(id, {
      textContent: "",
      style: {},
      width: 264,
      height: 192,
      clientWidth: 1280,
      clientHeight: 800,
      getContext: (type) => (type === "webgl" ? gl : mapContext),
      addEventListener() {},
      setPointerCapture() {},
      setAttribute() {},
      focus() {},
    });
  return elements.get(id);
}
const sandbox = {
  console,
  Uint8Array,
  Uint16Array,
  Uint32Array,
  Float32Array,
  DataView,
  TextDecoder,
  Math,
  Number,
  Array,
  Set,
  Map,
  atob,
  document: {
    querySelector: element,
    querySelectorAll: () => [],
    addEventListener: (name, fn) => (documentListeners[name] = fn),
    hidden: false,
  },
  window: { addEventListener: (name, fn) => (listeners[name] = fn) },
  performance: { now: () => now },
  navigator: { getGamepads: () => [] },
  requestAnimationFrame: (fn) => (nextFrame = fn),
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const state = () => sandbox.window.gameState();
const tick = (seconds = 1 / 60) => {
  now += seconds * 1000;
  nextFrame(now);
};
const advance = (seconds) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) tick();
};
const key = (name, down) =>
  listeners[down ? "keydown" : "keyup"]({ code: name, preventDefault() {} });
advance(0.5);
assert.equal(state().clip, "Idle");
assert.ok(state().grounded);
assert.equal(state().y, 0);
const start = state();
key("KeyS", true);
advance(0.4);
key("KeyS", false);
assert.equal(state().clip, "Walk");
const walked = Math.hypot(state().x - start.x, state().z - start.z);
assert.ok(walked > 0.45 && walked < 0.7);
element("#reset").onclick();
key("KeyS", true);
key("ShiftLeft", true);
advance(0.4);
key("KeyS", false);
key("ShiftLeft", false);
assert.equal(state().clip, "Run");
assert.ok(Math.hypot(state().x - start.x, state().z - start.z) > walked * 1.6);
element("#reset").onclick();
key("Space", true);
tick();
assert.equal(state().clip, "Jump");
assert.ok(!state().grounded);
assert.ok(state().y > 0);
key("Space", false);
advance(1.4);
assert.ok(state().grounded);
assert.equal(state().y, 0);
assert.equal(state().clip, "Idle");
// Loss of focus releases held keys.
key("KeyS", true);
listeners.blur();
const before = state();
advance(0.2);
assert.equal(state().x, before.x);
assert.equal(state().z, before.z);
assert.equal(state().paused, true);
key("Escape", true);
assert.equal(state().paused, false);
// Actual collision routines stop at the house wall and permit the bridge deck.
vm.runInContext(
  "Object.assign(player,{x:-5.5,y:0,z:-1.8,grounded:true});moveAxis('z',-.5)",
  sandbox,
);
assert.equal(state().z, -1.8);
vm.runInContext(
  "Object.assign(player,{x:0,y:.32,z:0,grounded:true,vy:0});",
  sandbox,
);
advance(0.3);
assert.ok(Math.abs(state().y - 0.32) < 0.001);
// Water becomes a traversable swimming route.
vm.runInContext(
  "Object.assign(player,{x:0,y:-.4,z:3,grounded:false,vy:0});",
  sandbox,
);
tick();
assert.equal(state().x, 0);
assert.equal(state().z, 3);
assert.ok(state().swimming);
// Buoyancy holds indefinitely; exiting either bank puts the feet on grass.
advance(2);
assert.ok(state().swimming);
assert.ok(Math.abs(state().y + 0.58) < 0.001);
for (const side of [-1, 1]) {
  vm.runInContext(
    `Object.assign(player,{x:${side * 1.48},y:-.58,z:3,grounded:false,vy:0,swimming:true});moveAxis('x',${side * 0.12})`,
    sandbox,
  );
  tick();
  assert.ok(!state().swimming);
  assert.equal(state().y, 0);
}
// Swimming onto a low boulder also lifts the feet out of the water.
vm.runInContext(
  "Object.assign(player,{x:-.7,y:-.58,z:-5.7,grounded:false,vy:0,swimming:true});moveAxis('x',.2)",
  sandbox,
);
tick();
assert.ok(!state().swimming && state().grounded);
assert.ok(Math.abs(state().y + 0.12) < 0.001);
element("#reset").onclick();
// Every building has an enterable room and returns to its own door.
for (const id of [
  "cottage",
  "grocery",
  "potions",
  "garden-cottage",
  "riverside-cottage",
]) {
  vm.runInContext(
    `{const b=buildings.find(b=>b.id==='${id}');Object.assign(player,{x:b.x,y:0,z:b.z+b.d/2+.4,grounded:true,vy:0});}`,
    sandbox,
  );
  tick();
  assert.equal(state().interaction, "enter");
  key("KeyF", true);
  key("KeyF", false);
  tick();
  assert.equal(state().building, id);
  assert.equal(
    state().scene,
    ["grocery", "potions"].includes(id) ? id : "cottage",
  );
  const current = state();
  vm.runInContext("moveAxis('x',10)", sandbox);
  assert.equal(state().x, current.x, "indoor boundary");
  if (id === "potions") {
    vm.runInContext("Object.assign(player,{x:0,z:-.65});interact()", sandbox);
    assert.ok(vm.runInContext("potionBubbles>0", sandbox));
  }
  vm.runInContext(
    "Object.assign(player,{x:0,z:2.6,grounded:true});interact()",
    sandbox,
  );
  tick();
  assert.equal(state().scene, "outdoors");
  assert.equal(
    state().x,
    vm.runInContext(`buildings.find(b=>b.id==='${id}').x`, sandbox),
  );
}
element("#reset").onclick();
// A full simulated jump can cross every stepping-stone gap.
for (
  let i = 0;
  i < vm.runInContext("steppingStones.length - 1", sandbox);
  i++
) {
  vm.runInContext(
    `{const s=steppingStones[${i}];Object.assign(player,{x:s.x,y:s.top,z:s.z,grounded:true,vy:0,swimming:false});yaw=Math.PI/2;}`,
    sandbox,
  );
  key("KeyS", true);
  key("Space", true);
  advance(0.85);
  key("KeyS", false);
  key("Space", false);
  advance(0.5);
  assert.ok(state().grounded && !state().swimming, "land on the next stone");
  assert.ok(
    Math.abs(
      state().x - vm.runInContext(`steppingStones[${i + 1}].x`, sandbox),
    ) < 0.15,
  );
  assert.ok(
    Math.abs(
      state().y - vm.runInContext(`steppingStones[${i + 1}].top`, sandbox),
    ) < 0.01,
  );
}
element("#reset").onclick();
// Every clip changes the real skinned vertices; all buffers remain finite.
for (const clip of ["Idle", "Walk", "Run", "Jump"]) {
  const motion = vm.runInContext(
    `player.clip='${clip}';player.time=clips['${clip}'].duration*.25;Array.from(skinCharacter())`,
    sandbox,
  );
  assert.ok(motion.every(Number.isFinite));
  const rest = vm.runInContext(
    `player.time=0;Array.from(skinCharacter())`,
    sandbox,
  );
  assert.ok(
    motion.some((v, i) => Math.abs(v - rest[i]) > 1e-5),
    clip + " has motion",
  );
}
// Swimming points the head along travel and keeps it above the water.
const swim = vm.runInContext(`(() => {
  Object.assign(player,{angle:0,clip:'Idle',time:0,swimming:true,y:-.58});
  skinCharacter();
  const center = (min,max) => {
    let y=0,z=0,count=0;
    for(let i=0;i<positions.length;i+=3) if(positions[i+1]>=min && positions[i+1]<=max){y+=charP[i+1]-.8;z+=charP[i+2];count++;}
    return {y:y/count,z:z/count};
  };
  return {head:center(.8,1.1),feet:center(0,.15)};
})()`,sandbox);
assert.ok(swim.head.z > swim.feet.z + .4, 'head leads feet while swimming');
assert.ok(swim.head.y > -.41, 'head remains above water');
element("#reset").onclick();
// Zoom and orbit controls update the actual camera.
element("#zoom").onclick();
assert.equal(element("#zoom").textContent, "Zoom in");
element("#orbit").onclick();
assert.ok(draws > 100);
// The connected watchtower climb is possible with the real controller.
element("#reset").onclick();
vm.runInContext("Object.assign(player,{x:4.8,y:0,z:-5.9,grounded:true,vy:0});", sandbox);
const route = vm.runInContext("[...towerSteps,{x:7.7,z:-4.7,top:2.71}]", sandbox);
for (const target of route) {
  const start = state();
  const angle = Math.atan2(target.x - start.x, target.z - start.z);
  vm.runInContext(`yaw=${angle}`, sandbox);
  key("ShiftLeft", true);
  key("KeyS", true);
  key("Space", true);
  for (let frames = 0; frames < 60; frames++) {
    tick();
    if (Math.hypot(state().x - target.x, state().z - target.z) < .1) break;
  }
  key("KeyS", false);
  key("ShiftLeft", false);
  key("Space", false);
  advance(.7);
  assert.ok(Math.hypot(state().x - target.x, state().z - target.z) < .2, "reach next tower landing");
  assert.ok(state().grounded && Math.abs(state().y - target.top) < .01, "land at authored tower height");
}
// Jumps are forgiving at ledge edges and just before a landing.
element("#reset").onclick();
vm.runInContext("Object.assign(player,{x:3.35,y:.42,z:-7.6,grounded:true,vy:0});coyote=0", sandbox);
advance(.05);
assert.ok(!state().grounded);
key("Space", true);
tick();
assert.ok(vm.runInContext("player.vy > 3", sandbox), "late jump uses coyote time");
key("Space", false);
element("#reset").onclick();
vm.runInContext("Object.assign(player,{x:3.35,y:.42,z:-7.6,grounded:true,vy:0});coyote=0", sandbox);
advance(.16);
key("Space", true);
tick();
assert.ok(vm.runInContext("player.vy < 0", sandbox), "grace expires instead of allowing double jumps");
key("Space", false);
element("#reset").onclick();
vm.runInContext("Object.assign(player,{y:.06,grounded:false,vy:-1});coyote=0", sandbox);
key("Space", true);
key("Space", false);
advance(.1);
assert.ok(vm.runInContext("player.vy > 3", sandbox), "early jump is buffered through landing");
// Pause freezes simulation AND render work; resume never retains movement.
element("#reset").onclick();
key("KeyS", true);
advance(.1);
key("Escape", true);
const frozen = state(), pausedDraws = draws;
advance(.5);
assert.equal(state().x, frozen.x);
assert.equal(state().z, frozen.z);
assert.equal(draws, pausedDraws);
key("Escape", true);
advance(.1);
assert.equal(state().x, frozen.x);
documentListeners.visibilitychange();
assert.equal(state().paused, false);
sandbox.document.hidden = true;
documentListeners.visibilitychange();
assert.equal(state().paused, true);
sandbox.document.hidden = false;
element("#resume").onclick();
// Standard controller deadzone, analog walk, run, jump, pause and disconnect.
element("#reset").onclick();
const controller = {
  connected: true, mapping: "standard", axes: [0, .1, 0, 0],
  buttons: Array.from({length:17}, () => ({pressed:false})),
};
sandbox.navigator.getGamepads = () => [null, controller];
advance(.1);
assert.equal(state().x, -4.1);
controller.axes[1] = .55;
const analogStart = state();
advance(.3);
const analogWalk = Math.hypot(state().x - analogStart.x, state().z - analogStart.z);
assert.ok(analogWalk > .15 && analogWalk < .25);
assert.equal(state().input, "gamepad");
controller.axes[1] = 1;
controller.buttons[1].pressed = true;
advance(.1);
assert.equal(state().clip, "Run");
controller.axes[1] = 0;
controller.buttons[1].pressed = false;
controller.buttons[0].pressed = true;
tick();
assert.equal(state().clip, "Jump");
advance(1);
assert.equal(state().grounded, true, "holding A does not auto-jump");
controller.buttons[9].pressed = true;
tick();
assert.equal(state().paused, true);
advance(.1);
assert.equal(state().paused, true, "holding Start does not toggle repeatedly");
controller.buttons[9].pressed = false;
tick();
controller.buttons[9].pressed = true;
tick();
assert.equal(state().paused, false);
controller.connected = false;
const unplugged = state();
advance(.2);
assert.equal(state().x, unplugged.x);
assert.equal(state().z, unplugged.z);
assert.equal(state().input, "keyboard");
// The view culler must keep geometry touching a screen edge, including tall
// objects and triangles that cross more than one cell.
const culling = vm.runInContext(`(() => {
  const cam={target:[0,0,0],right:[1,0,0],up:[0,1,0],scale:100};
  const edge={min:[.99,-.1,-1],max:[1.5,.1,1]};
  const outside={min:[1.01,-.1,-1],max:[1.5,.1,1]};
  const tall={min:[-.1,-10,-1],max:[.1,10,1]};
  const packed=sceneBatches(new Float32Array([
    -10,0,0,1,0,0, 10,0,0,1,0,0, 0,1,0,1,0,0,
    20,0,20,0,1,0, 21,0,20,0,1,0, 20,1,20,0,1,0,
  ]));
  return {edge:batchVisible(edge,cam,200,200), outside:batchVisible(outside,cam,200,200),
    tall:batchVisible(tall,cam,200,200), count:packed.batches.reduce((n,b)=>n+b.count,0),
    crosses:batchVisible(packed.batches[0],cam,200,200)};
})()`, sandbox);
assert.equal(culling.edge, true);
assert.equal(culling.outside, false);
assert.equal(culling.tall, true);
assert.equal(culling.crosses, true);
assert.equal(culling.count, 6, "batching preserves every triangle");
element("#reset").onclick();
advance(.1);
assert.ok(state().visibleTriangles < state().triangles, "offscreen scenery is culled in the real world");
if(!process.argv[2] && vm.runInContext("Object.keys(creatureForms).length",sandbox)){
  const act=code=>vm.runInContext(code,sandbox);
  const simulate=seconds=>act(`for(let tick=0;tick<${Math.ceil(seconds*120)};tick++)step(1/120)`);
  const press=code=>{key(code,true);key(code,false);};
  const encounters=[['springaroo',-5.7,1.8],['tidefox',-2.9,9],['moonwing',4.5,-5.4],['flintfist',11.5,8.4]];
  for(const [id,x,z]of encounters){
    act(`{reset(false);Object.assign(player,{x:${x},z:${z}});const encounter=friends.find(f=>f.id===${JSON.stringify(id)});encounter.captured=0;encounter.trust=encounter.friendship=0;encounter.lure=null;[encounter.x,encounter.y,encounter.z]=creatureForms[encounter.id].position;}`);
    press('KeyF');simulate(1.3);
    assert.equal(state().friends.find(f=>f.id===id).trust,60,id+' eats the first berry');
    press('KeyF');simulate(1.3);
    assert.equal(state().friends.find(f=>f.id===id).trust,100,id+' likes two berries');
    press('KeyG');simulate(.7);assert.equal(state().caught,id,'actual orb collision catches '+id);
    press('KeyT');assert.equal(state().form,id);simulate(.1);
    assert.ok(act('skinCharacter().every(Number.isFinite)'),'finite playable '+id);
    press('KeyT');assert.equal(state().form,null);
  }
  // The standard pad uses the same feed, projectile and form actions as keys.
  act("reset(false);Object.assign(player,{x:-5.7,z:1.8,caught:null});Object.assign(friends[0],{x:-6.3,y:0,z:2.4,captured:0,trust:0,friendship:0,lure:null});");
  controller.buttons.forEach(button=>button.pressed=false);
  controller.connected=true;tick();
  const padPress=index=>{controller.buttons[index].pressed=true;tick();controller.buttons[index].pressed=false;tick();};
  padPress(2);simulate(1.3);assert.equal(state().friends[0].trust,60);
  padPress(2);simulate(1.3);assert.equal(state().friends[0].trust,100);
  padPress(5);simulate(.7);assert.equal(state().caught,'springaroo');
  padPress(3);assert.equal(state().form,'springaroo');
  padPress(3);assert.equal(state().form,null);
  controller.connected=false;tick();
  // Capture opportunities and projectiles use simulation time; a wall stops an orb.
  act(`reset(false);Object.assign(player,{x:-5.7,z:1.8,caught:null,angle:-Math.PI/4});const rabbit=friends[0];Object.assign(rabbit,{x:-6.3,y:0,z:2.4,captured:0,trust:100,friendship:12,lure:null});const testWall={a:-6.12,b:-5.88,l:1.98,r:2.22,bottom:0,top:2};solids.push(testWall);`);
  press('KeyG');simulate(1);assert.equal(state().caught,null);assert.equal(state().orbCount,0);
  act('solids.splice(solids.indexOf(testWall),1);friends[0].friendship=.2;');
  press('Escape');advance(.4);assert.ok(state().friends[0].friendship>0,'pause freezes friendship');press('Escape');simulate(.3);assert.equal(state().friends[0].trust,0);
  // The second jump reaches the optional 1.35-unit garden landing.
  act("reset(false);Object.assign(player,{x:-7.2,z:7.5,caught:'springaroo'});yaw=0;toggleForm();");
  key('KeyS',true);press('Space');simulate(.3);press('Space');simulate(.4);key('KeyS',false);simulate(.8);
  assert.ok(Math.abs(state().y-1.35)<.02&&state().grounded,'Springaroo lands on the high garden rock');
  act("reset(false);player.caught='springaroo';toggleForm();");press('Space');simulate(.15);press('Space');simulate(.1);
  assert.equal(act('player.jumps'),2);const beforeThird=act('player.vy');press('Space');simulate(.01);assert.ok(act('player.vy')<beforeThird,'no third air jump');
  press('KeyT');assert.equal(state().form,'springaroo','airborne form switching cannot replenish jumps');
  // Four wingbeats are exhausted in the air and refreshed only by landing.
  act("reset(false);player.caught='moonwing';toggleForm();");press('Space');simulate(.1);
  for(let i=0;i<4;i++){press('Space');simulate(.1);}
  assert.equal(state().wingbeats,0);const beforeFlap=act('player.vy');press('Space');simulate(.01);assert.ok(act('player.vy')<beforeFlap);
  // Tidefox fits below the water and cannot turn into a human under the bridge.
  act("reset(false);Object.assign(player,{x:0,z:8,y:-.58,grounded:false,swimming:true,caught:'tidefox'});setForm('tidefox');");simulate(.05);press('KeyF');simulate(.05);
  assert.equal(state().diving,true);assert.equal(state().y,-1.02);assert.equal(state().clip,'Swim');
  press('KeyF');simulate(.05);assert.equal(state().diving,false);assert.equal(state().y,-.58);
  act('player.z=0');assert.equal(act('setForm(null)'),false);assert.equal(state().form,'tidefox');
  // Changing form is rejected if the larger form would intersect a ceiling.
  act("reset(false);player.caught='springaroo';setForm('springaroo');const ceiling={a:player.x-.5,b:player.x+.5,l:player.z-.5,r:player.z+.5,bottom:.8,top:1.2};solids.push(ceiling);");
  assert.equal(act('setForm(null)'),false);act('solids.splice(solids.indexOf(ceiling),1)');
  // Physical obstacle states change their real colliders, including after a room visit.
  act("reset(false);Object.assign(player,{x:friendPuzzles.boulder.a-.49,z:6.8,caught:'flintfist'});setForm('flintfist');");
  const pushStart=state().x;press('KeyF');simulate(1.4);
  assert.ok(Math.abs(state().puzzles.boulder-1.8)<1e-5);assert.ok(state().x>pushStart+1.7,'pusher follows the boulder');
  act('Object.assign(player,{x:11.9,z:7.3,y:0,grounded:true});');press('KeyF');simulate(1.1);
  assert.equal(state().puzzles.sealOpen,true);const sealStart=state().z;act("moveAxis('z',-.3)");assert.ok(state().z<sealStart-.25,'opened seal no longer blocks the body');
  act("changeScene('grocery');changeScene('outdoors');");assert.equal(act('friendPuzzles.seal.disabled'),true);
  element('#reset').onclick();assert.equal(state().form,null);assert.equal(state().caught,'flintfist','respawn retains the caught form');
  console.log('Friendship checks passed: all four real encounters, berries, orb collision/walls, pause/expiry, safe transformations, second-jump landing, finite wingbeats, diving, and physical push/punch colliders.');
}
console.log(`Spawn view submits ${state().visibleTriangles} of ${state().triangles} scene/player triangles.`);
console.log(
  "Runtime checks passed: movement, buffered/late jumps, grace expiry, pause/focus release, analog gamepad/disconnect, collisions, swimming, all interiors, stepping stones, complete watchtower climb, skinning, finite buffers and conservative view culling.",
);
