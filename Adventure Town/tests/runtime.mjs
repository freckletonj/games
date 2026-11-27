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
// Deep water triggers the same respawn path as player input.
vm.runInContext(
  "Object.assign(player,{x:0,y:-.4,z:3,grounded:false,vy:0});",
  sandbox,
);
tick();
assert.equal(state().x, start.x);
assert.equal(state().z, start.z);
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
// Zoom and orbit controls update the actual camera.
assert.equal(element("#zoom").textContent, "");
element("#zoom").onclick();
assert.equal(element("#zoom").textContent, "Zoom in");
element("#orbit").onclick();
assert.ok(draws > 100);
console.log(
  "Runtime checks passed: boot, idle/walk/run/jump, landing, focus release, wall collision, bridge, river respawn, all clip skinning, finite draw buffers, camera controls.",
);
