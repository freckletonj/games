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
const listeners = {},
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
    addEventListener() {},
    hidden: false,
  },
  window: { addEventListener: (name, fn) => (listeners[name] = fn) },
  performance: { now: () => now },
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
console.log(
  "Runtime checks passed: boot, idle/walk/run/jump, landing, focus release, wall collision, bridge, swimming/shore exits, enter/leave all buildings, stepping-stone jumps, all clip skinning, finite draw buffers, camera controls.",
);
