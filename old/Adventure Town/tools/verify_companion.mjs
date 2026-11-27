// Exercise the real runtime and GLBs without a browser/WebGL context.
// Only DOM, rendering and the frame clock are replaced.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const root = new URL('../', import.meta.url);

test('cat loads, follows, settles, turns, and preserves player controls', async () => {
  const elements = Object.fromEntries(['#status', '#companion-status', '#game'].map(id => [id, { textContent: '', append() {} }]));
  const listeners = {};
  const loads = [];
  let frame;
  const renderer = {
    domElement: {}, setPixelRatio() {}, setSize() {}, render() {},
    setAnimationLoop(callback) { frame = callback; },
  };
  function Loader() {
    return { load(path, loaded) {
      const bytes = readFileSync(path);
      loads.push(new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '').then(loaded));
    } };
  }
  const source = readFileSync(new URL('game/main.js', root), 'utf8').replace(/^import .*;\n/gm, '');
  const runtime = vm.runInNewContext(source + '\n({ player, cat, updateCat, state: () => ({ current, catCurrent, catFollowing, attacking, catActions }) });', {
    THREE: { ...THREE, WebGLRenderer: function () { return renderer; }, Clock: function () { return { getDelta: () => 1 / 60 }; } },
    GLTFLoader: Loader,
    characterUrl: fileURLToPath(new URL('characters/adventurer/generated/character_animated.glb', root)),
    catUrl: fileURLToPath(new URL('characters/cat/generated/character_animated.glb', root)),
    document: { querySelector: id => elements[id] },
    window: { addEventListener: (name, callback) => { listeners[name] = callback; } },
    devicePixelRatio: 1, innerWidth: 1400, innerHeight: 900, console,
  });
  await Promise.all(loads);
  const step = count => { for (let i = 0; i < count; i++) frame(); };
  const press = code => listeners.keydown({ code, repeat: false, preventDefault() {} });
  const release = code => listeners.keyup({ code });
  assert.equal(runtime.state().current, 'idle');
  assert.equal(runtime.state().catCurrent, 'idle');
  assert.match(elements['#companion-status'].textContent, /Ginger Cat/);
  assert.equal(runtime.cat.children[1].scale.x, .45);
  assert.deepEqual(Object.keys(runtime.state().catActions), ['idle', 'walk']);

  press('KeyW'); step(180); release('KeyW');
  assert.equal(runtime.state().current, 'walk');
  assert.equal(runtime.state().catCurrent, 'walk');
  step(240);
  assert.equal(runtime.state().catCurrent, 'idle');
  assert.equal(runtime.state().catFollowing, false);
  assert.ok(Math.abs(runtime.cat.position.distanceTo(runtime.player.position) - 1.1) < 1e-6);
  const resting = runtime.cat.position.clone(); step(180);
  assert.equal(runtime.cat.position.distanceTo(resting), 0);

  press('Space'); step(10);
  assert.equal(runtime.state().current, 'attack');
  assert.equal(runtime.state().attacking, true);
  step(100); release('Space');
  assert.equal(runtime.state().current, 'idle');
  assert.equal(runtime.state().attacking, false);

  for (const [x, z] of [[11, 11], [-11, -11], [11, -11], [-11, 11]]) {
    runtime.player.position.set(x, 0, z);
    for (let i = 0; i < 900; i++) runtime.updateCat(1 / 60);
    assert.equal(runtime.state().catCurrent, 'idle');
    assert.ok(runtime.cat.position.toArray().every(Number.isFinite));
    assert.ok(Math.abs(runtime.cat.position.x) <= 11 && Math.abs(runtime.cat.position.z) <= 11);
    assert.ok(Math.abs(runtime.cat.position.distanceTo(runtime.player.position) - 1.1) < 1e-6);
  }
  press('KeyD'); step(60); listeners.blur(); step(1);
  assert.equal(runtime.state().current, 'idle');
  assert.ok(Math.abs(runtime.player.position.x) <= 11 && Math.abs(runtime.player.position.z) <= 11);
});
