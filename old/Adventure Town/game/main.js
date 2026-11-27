import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import characterUrl from '../characters/adventurer/generated/character_animated.glb?url';
import catUrl from '../characters/cat/generated/character_animated.glb?url';

const status = document.querySelector('#status');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x314347);
scene.fog = new THREE.Fog(0x314347, 18, 35);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.querySelector('#game').append(renderer.domElement);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
const cameraOffset = new THREE.Vector3(5, 5, 8);
const player = new THREE.Group();
scene.add(player);
const cat = new THREE.Group();
cat.position.set(-1.1, 0, -0.8);
scene.add(cat);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshBasicMaterial({color: 0x53695e}));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.015;
scene.add(floor);
const grid = new THREE.GridHelper(24, 24, 0x77897c, 0x62786b);
scene.add(grid);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({color: 0x263d35, transparent: true, opacity: 0.5, depthWrite: false}));
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.005;
player.add(shadow);
const catShadow = shadow.clone();
catShadow.scale.setScalar(0.55);
cat.add(catShadow);

const keys = new Set();
const controls = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
let mixer, actions, current, attacking = false;
let catMixer, catActions, catCurrent, catFollowing = false;
const catDirection = new THREE.Vector3();
const clock = new THREE.Clock();
const direction = new THREE.Vector3();
const forward = new THREE.Vector3(-cameraOffset.x, 0, -cameraOffset.z).normalize();
const right = new THREE.Vector3(-forward.z, 0, forward.x);

function play(name) {
  if (current === name) return;
  const next = actions[name];
  next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  if (current) actions[current].crossFadeTo(next, 0.15, false);
  current = name;
  status.textContent = name[0].toUpperCase() + name.slice(1);
}

window.addEventListener('keydown', event => {
  if (!controls.has(event.code)) return;
  event.preventDefault();
  keys.add(event.code);
  if (event.code === 'Space' && !event.repeat && actions && !attacking) {
    attacking = true;
    play('attack');
  }
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('resize', resize);
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
resize();

new GLTFLoader().load(characterUrl, gltf => {
  // The compiler exports +Y up, +Z forward, approximately 2 units tall.
  player.add(gltf.scene);
  mixer = new THREE.AnimationMixer(gltf.scene);
  actions = Object.fromEntries(gltf.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  actions.attack.setLoop(THREE.LoopOnce, 1);
  actions.attack.clampWhenFinished = true;
  mixer.addEventListener('finished', event => {
    if (event.action === actions.attack) {
      attacking = false;
      play('idle');
    }
  });
  play('idle');
}, undefined, error => {
  status.textContent = 'Character failed to load. Check the browser console.';
  console.error(error);
});

new GLTFLoader().load(catUrl, gltf => {
  gltf.scene.scale.setScalar(0.45);
  cat.add(gltf.scene);
  catMixer = new THREE.AnimationMixer(gltf.scene);
  catActions = Object.fromEntries(gltf.animations.map(clip => [clip.name, catMixer.clipAction(clip)]));
  playCat('idle');
  document.querySelector('#companion-status').textContent = 'Ginger Cat · your little sidekick';
}, undefined, error => {
  document.querySelector('#companion-status').textContent = 'Cat failed to load. Check the browser console.';
  console.error(error);
});

function playCat(name) {
  if (catCurrent === name) return;
  const next = catActions[name];
  next.reset().play();
  if (catCurrent) catActions[catCurrent].crossFadeTo(next, 0.18, false);
  catCurrent = name;
}

function updateCat(dt) {
  catDirection.subVectors(player.position, cat.position);
  const distance = catDirection.length();
  // Separate start/stop distances let the cat rest without jittering.
  if (distance > 1.5) catFollowing = true;
  if (distance <= 1.1) catFollowing = false;
  if (catFollowing) {
    catDirection.normalize();
    const speed = Math.min(3.2, 1.6 + distance - 1.1);
    const travel = Math.min(speed * dt, distance - 1.1);
    cat.position.addScaledVector(catDirection, travel);
    catFollowing = travel < distance - 1.1;
    const facing = Math.atan2(catDirection.x, catDirection.z);
    const turn = Math.atan2(Math.sin(facing - cat.rotation.y), Math.cos(facing - cat.rotation.y));
    cat.rotation.y += turn * (1 - Math.exp(-10 * dt));
    playCat('walk');
    catActions.walk.setEffectiveTimeScale(speed / 2.2);
  } else {
    playCat('idle');
  }
  catMixer.update(dt);
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (actions) {
    const x = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    const z = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
    direction.copy(right).multiplyScalar(x).addScaledVector(forward, z);
    if (!attacking && direction.lengthSq() > 0) {
      direction.normalize();
      player.position.addScaledVector(direction, 2.2 * dt);
      player.position.x = THREE.MathUtils.clamp(player.position.x, -11, 11);
      player.position.z = THREE.MathUtils.clamp(player.position.z, -11, 11);
      player.rotation.y = Math.atan2(direction.x, direction.z);
      play('walk');
    } else if (!attacking) {
      play('idle');
    }
    mixer.update(dt);
    if (catActions) updateCat(dt);
  }
  camera.position.copy(player.position).add(cameraOffset);
  camera.lookAt(player.position.x, 1, player.position.z);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(tick);
