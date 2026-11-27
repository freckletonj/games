import { activeSceneryIds } from "./scenery.js";
import {
  positions,
  normals,
  colors,
  joints,
  weights,
  indices,
  clips,
  skeleton,
  norm,
} from "./model.js";
import {
  solids,
  staticVerts,
  color,
  tri,
  tile,
  effectGeometry,
  buildings,
  steppingStones,
  selectWorld,
  box,
} from "./world.js";
import { webRenderer } from "./renderer.js";
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const $ = (s) => document.querySelector(s);
const canvas = $("#view");
// Player controller. World units are character heights. AABBs are independent of visual mesh.
const spawn = { x: -4.1, y: 0, z: 1.1 },
  player = {
    ...spawn,
    vy: 0,
    angle: 0.58,
    grounded: true,
    clip: "Idle",
    time: 0,
    air: 0,
    land: 0,
    swimming: false,
  };
const keys = new Set();
let jumpQueued = false,
  yaw = 0.58,
  pitch = 0.7,
  zoom = 1,
  camX = spawn.x,
  camY = 0.2,
  camZ = spawn.z,
  notice = 0,
  frameCount = 0,
  measured = 0;
let sceneId = "outdoors",
  currentBuilding = null,
  returnPoint = null,
  returnView = null,
  potionBubbles = 0;
function teleport(point) {
  Object.assign(player, point, {
    vy: 0,
    grounded: true,
    swimming: false,
    clip: "Idle",
    time: 0,
    land: 0,
  });
  const follow = sceneId === "outdoors" ? 1 : 0.25;
  camX = player.x * follow;
  camY = player.y * 0.72 + 0.2;
  camZ = player.z * follow;
  keys.clear();
  jumpQueued = false;
}
function changeScene(id) {
  sceneId = id;
  renderer.setScene(selectWorld(id));
  $("#map").style.display = id === "outdoors" ? "block" : "none";
}
function interactionTarget() {
  if (!player.grounded || player.swimming) return null;
  if (sceneId === "outdoors") {
    const building = buildings.find(
      (b) =>
        Math.hypot(player.x - b.x, player.z - (b.z + b.d / 2 + 0.4)) < 0.95,
    );
    return building
      ? { action: "enter", building, label: "Enter " + building.name }
      : null;
  }
  if (Math.hypot(player.x, player.z - 2.65) < 0.85)
    return { action: "leave", label: "Return to town" };
  if (sceneId === "grocery" && Math.hypot(player.x - 2, player.z + 0.65) < 1.05)
    return { action: "apple", label: "Taste an apple" };
  if (sceneId === "potions" && Math.hypot(player.x, player.z + 0.65) < 1.05)
    return { action: "brew", label: "Stir the cauldron" };
  if (sceneId === "cottage" && Math.hypot(player.x, player.z + 1.55) < 0.9)
    return { action: "warm", label: "Rest by the hearth" };
  return null;
}
function interact() {
  const target = interactionTarget();
  if (!target) return;
  if (target.action === "enter") {
    currentBuilding = target.building;
    returnView = { yaw, pitch, zoom };
    returnPoint = {
      x: currentBuilding.x,
      y: 0,
      z: currentBuilding.z + currentBuilding.d / 2 + 0.55,
    };
    changeScene(
      ["grocery", "potions"].includes(currentBuilding.id)
        ? currentBuilding.id
        : "cottage",
    );
    teleport({ x: 0, y: 0, z: 2.05, angle: Math.PI });
    yaw = 0.35;
    pitch = 0.75;
    zoom = Math.max(1, (0.9 * canvas.clientHeight) / canvas.clientWidth);
    $("#zoom").textContent = zoom < 1.2 ? "Zoom out" : "Zoom in";
    message(currentBuilding.name + " · F at the door to leave");
  } else if (target.action === "leave") {
    changeScene("outdoors");
    teleport({ ...returnPoint, angle: 0 });
    currentBuilding = null;
    ({ yaw, pitch, zoom } = returnView);
    $("#zoom").textContent = zoom < 1.2 ? "Zoom out" : "Zoom in";
    message("Back in Emberbrook");
  } else if (target.action === "brew") {
    potionBubbles = 3;
    message("A little river mint… a very bubbly result!");
  } else if (target.action === "apple")
    message("Crisp, sweet, and perfect for a riverside walk.");
  else message("A warm hearth. Outside, the stream keeps flowing.");
}
function updateInteraction() {
  const target = interactionTarget();
  $("#interact").hidden = target === null;
  if (target) $("#interact").textContent = "F · " + target.label;
}
const gravity = 10.5,
  jumpSpeed = 4.35,
  radius = 0.21,
  height = 0.95;
function message(text) {
  $("#message").textContent = text;
  $("#message").style.opacity = 1;
  notice = 2.4;
}
function reset(notify = true) {
  changeScene("outdoors");
  currentBuilding = null;
  potionBubbles = 0;
  Object.assign(player, spawn, {
    vy: 0,
    grounded: true,
    clip: "Idle",
    time: 0,
    air: 0,
    land: 0,
    angle: 0.58,
  });
  player.swimming = false;
  camX = spawn.x;
  camY = 0.2;
  camZ = spawn.z;
  if (notify) message("Back at Willowbank village");
}
function overlaps(s, x, z, r = radius) {
  return x + r > s.a && x - r < s.b && z + r > s.l && z - r < s.r;
}
function groundAt(x, z, maxY) {
  let top = -Infinity;
  for (let s of solids)
    if (s.top <= maxY && s.top > top && overlaps(s, x, z)) top = s.top;
  return top;
}
function moveAxis(axis, d) {
  if (!d) return;
  let x = player.x + (axis === "x" ? d : 0),
    z = player.z + (axis === "z" ? d : 0);
  const limitX = sceneId === "outdoors" ? 15.6 : 2.85,
    limitZ = sceneId === "outdoors" ? 11.6 : 2.85;
  if (Math.abs(x) > limitX || Math.abs(z) > limitZ) return;
  let lift = 0;
  for (let s of solids) {
    if (
      !overlaps(s, x, z) ||
      s.top <= player.y + 0.025 ||
      s.bottom >= player.y + height - 0.015
    )
      continue;
    let step = s.top - player.y;
    if (
      (player.grounded && step <= 0.19) ||
      (player.swimming && s.top <= 0.08 && step <= 0.7)
    ) {
      lift = Math.max(lift, step);
      continue;
    }
    return;
  }
  player[axis] += d;
  if (lift) player.y += lift;
}
function step(dt) {
  let left = keys.has("KeyA") || keys.has("ArrowLeft"),
    right = keys.has("KeyD") || keys.has("ArrowRight"),
    up = keys.has("KeyW") || keys.has("ArrowUp"),
    down = keys.has("KeyS") || keys.has("ArrowDown"),
    dx = Number(right) - Number(left),
    dz = Number(down) - Number(up),
    moving = !!(dx || dz),
    run = keys.has("ShiftLeft") || keys.has("ShiftRight");
  if (keys.has("KeyQ")) yaw -= dt * 1.4;
  if (keys.has("KeyE")) yaw += dt * 1.4;
  let sx = dx * Math.cos(yaw) + dz * Math.sin(yaw),
    sz = -dx * Math.sin(yaw) + dz * Math.cos(yaw),
    len = Math.hypot(sx, sz);
  if (len) {
    sx /= len;
    sz /= len;
    let a = Math.atan2(sx, sz),
      delta = Math.atan2(
        Math.sin(a - player.angle),
        Math.cos(a - player.angle),
      );
    player.angle += delta * Math.min(1, dt * 14);
  }
  player.swimming =
    sceneId === "outdoors" &&
    Math.abs(player.x) < 1.7 &&
    player.y < -0.18 &&
    player.vy <= 0 &&
    groundAt(player.x, player.z, 0.4) < -0.3;
  if (jumpQueued && (player.grounded || player.swimming)) {
    player.vy = player.swimming ? 3.2 : jumpSpeed;
    player.swimming = false;
    player.grounded = false;
    player.air = 0;
    player.land = 0;
  }
  jumpQueued = false;
  let speed = player.swimming ? 1.15 : run ? 2.75 : 1.45;
  if (moving) {
    moveAxis("x", sx * speed * dt);
    moveAxis("z", sz * speed * dt);
  }
  if (player.swimming && groundAt(player.x, player.z, 0.08) > -0.3) {
    player.swimming = false;
    player.grounded = true;
    player.y = groundAt(player.x, player.z, 0.08);
  }
  let floor = groundAt(player.x, player.z, player.y + 0.025);
  if (player.grounded && player.y - floor > 0.035) {
    player.grounded = false;
    player.vy = 0;
    player.air = 0;
  }
  if (player.swimming) {
    player.y = -0.58;
    player.vy = 0;
    player.grounded = false;
  } else if (!player.grounded) {
    let prev = player.y;
    player.air += dt;
    player.vy -= gravity * dt;
    let next = prev + player.vy * dt;
    if (player.vy > 0) {
      for (let s of solids)
        if (
          overlaps(s, player.x, player.z) &&
          prev + height <= s.bottom + 0.02 &&
          next + height >= s.bottom
        ) {
          next = s.bottom - height;
          player.vy = 0;
          break;
        }
    } else {
      let target = groundAt(player.x, player.z, prev + 0.025);
      if (next <= target) {
        next = target;
        player.grounded = true;
        player.vy = 0;
        player.land = 0.12;
      }
    }
    player.y = next;
  } else player.y = floor;
  if (player.y < -4) reset();
  let clip = player.swimming
    ? moving
      ? "Walk"
      : "Idle"
    : !player.grounded
      ? "Jump"
      : player.land > 0
        ? "Jump"
        : moving
          ? run
            ? "Run"
            : "Walk"
          : "Idle";
  if (clip !== player.clip) {
    player.clip = clip;
    player.time = 0;
  }
  if (clip === "Jump") {
    player.time = player.grounded
      ? clips.Jump.duration * (1 - (player.land / 0.12) * 0.17)
      : clips.Jump.duration *
        (player.vy >= 0
          ? mix(0.3, 0.63, clamp(1 - player.vy / jumpSpeed, 0, 1))
          : mix(0.63, 0.78, clamp(-player.vy / jumpSpeed, 0, 1)));
    player.time = clamp(player.time, 0, clips.Jump.duration);
  } else
    player.time =
      (player.time + dt * (clip === "Run" ? 1.3 : clip === "Walk" ? 1.05 : 1)) %
      clips[clip].duration;
  player.land = Math.max(0, player.land - dt);
  potionBubbles = Math.max(0, potionBubbles - dt);
  let k = 1 - Math.exp(-dt * 7);
  const follow = sceneId === "outdoors" ? 1 : 0.25;
  camX = mix(camX, player.x * follow, k);
  camZ = mix(camZ, player.z * follow, k);
  camY = mix(camY, player.y * 0.72 + 0.2, k);
  if (notice > 0) {
    notice -= dt;
    if (notice <= 0) $("#message").style.opacity = 0;
  }
  let area =
    Math.abs(player.x) < 2.3
      ? "Emberbrook crossing"
      : player.x < 0
        ? "Willowbank village"
        : player.z > 2.5
          ? "Mossgate ruins"
          : player.z < -2.5
            ? "Old watchtower"
            : "Eastbank meadow";
  $("#area").textContent =
    sceneId === "outdoors"
      ? area +
        (player.swimming ? " · swimming" : player.grounded ? "" : " · airborne")
      : currentBuilding.name;
  updateInteraction();
}
const movementKeys = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyF",
  "KeyQ",
  "KeyE",
]);
window.addEventListener("keydown", (e) => {
  if (!movementKeys.has(e.code)) return;
  e.preventDefault();
  if (e.code === "Space" && !keys.has("Space")) jumpQueued = true;
  if (e.code === "KeyF" && !keys.has("KeyF")) interact();
  keys.add(e.code);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  keys.clear();
  jumpQueued = false;
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    keys.clear();
    jumpQueued = false;
  }
});
for (let b of document.querySelectorAll("[data-key]")) {
  let key = b.dataset.key;
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    keys.add(key);
    if (key === "Space") jumpQueued = true;
  });
  for (let ev of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(ev, () => keys.delete(key));
}
$("#interact").onclick = interact;
$("#reset").onclick = () => reset();
$("#orbit").onclick = () => {
  yaw += Math.PI / 2;
};
$("#zoom").onclick = () => {
  zoom = zoom < 1.2 ? 1.48 : 1;
  $("#zoom").textContent = zoom < 1.2 ? "Zoom out" : "Zoom in";
};
let drag = null;
canvas.addEventListener("pointerdown", (e) => {
  drag = [e.clientX, e.clientY];
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (drag) {
    yaw -= (e.clientX - drag[0]) * 0.008;
    pitch = clamp(pitch + (e.clientY - drag[1]) * 0.004, 0.44, 1.05);
    drag = [e.clientX, e.clientY];
  }
});
for (let ev of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(ev, () => (drag = null));
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    zoom = clamp(zoom * Math.exp(e.deltaY * 0.0007), 0.72, 1.8);
  },
  { passive: false },
);
// Skin the exact embedded GLB. Remove baked jump elevation so world physics is authoritative.
const charP = new Float32Array(positions.length),
  charN = new Float32Array(normals.length),
  charData = new Float32Array(indices.length * 6),
  charBase = new Float32Array(positions.length);
for (let i = 0; i < positions.length / 3; i++)
  for (let c = 0; c < 3; c++) charBase[i * 3 + c] = colors[i * 4 + c] / 255;
const light = norm([0.6, 1, 0.75]);
const srgb = (x) =>
  clamp(
    x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055,
    0,
    1,
  );
function skinCharacter() {
  let bm = skeleton(player.clip, player.time).bones,
    lowest = Infinity,
    ca = Math.cos(player.angle),
    sa = Math.sin(player.angle);
  for (let i = 0; i < positions.length / 3; i++) {
    let k = i * 3,
      x = positions[k],
      y = positions[k + 1],
      z = positions[k + 2],
      nx = normals[k],
      ny = normals[k + 1],
      nz = normals[k + 2],
      X = 0,
      Y = 0,
      Z = 0,
      NX = 0,
      NY = 0,
      NZ = 0;
    for (let a = 0; a < 4; a++) {
      let w = weights[i * 4 + a] / 255;
      if (!w) continue;
      let o = joints[i * 4 + a] * 16;
      X += w * (bm[o] * x + bm[o + 4] * y + bm[o + 8] * z + bm[o + 12]);
      Y += w * (bm[o + 1] * x + bm[o + 5] * y + bm[o + 9] * z + bm[o + 13]);
      Z += w * (bm[o + 2] * x + bm[o + 6] * y + bm[o + 10] * z + bm[o + 14]);
      NX += w * (bm[o] * nx + bm[o + 4] * ny + bm[o + 8] * nz);
      NY += w * (bm[o + 1] * nx + bm[o + 5] * ny + bm[o + 9] * nz);
      NZ += w * (bm[o + 2] * nx + bm[o + 6] * ny + bm[o + 10] * nz);
    }
    if (player.swimming) {
      const tilt = -1.05,
        ct = Math.cos(tilt),
        st = Math.sin(tilt),
        yy = Y - 0.4;
      [Y, Z] = [0.4 + ct * yy - st * Z, st * yy + ct * Z];
      [NY, NZ] = [ct * NY - st * NZ, st * NY + ct * NZ];
    }
    charP[k] = ca * X + sa * Z + player.x;
    charP[k + 1] = Y;
    charP[k + 2] = -sa * X + ca * Z + player.z;
    charN[k] = ca * NX + sa * NZ;
    charN[k + 1] = NY;
    charN[k + 2] = -sa * NX + ca * NZ;
    lowest = Math.min(lowest, Y);
  }
  let offset = player.y - (player.clip === "Jump" ? lowest : 0);
  for (let i = 0; i < indices.length; i++) {
    let k = indices[i] * 3,
      o = i * 6,
      nl = Math.hypot(charN[k], charN[k + 1], charN[k + 2]) || 1,
      lighting =
        0.71 +
        0.38 *
          Math.max(
            0,
            (charN[k] * light[0] +
              charN[k + 1] * light[1] +
              charN[k + 2] * light[2]) /
              nl,
          );
    charData[o] = charP[k];
    charData[o + 1] = charP[k + 1] + offset;
    charData[o + 2] = charP[k + 2];
    for (let c = 0; c < 3; c++)
      charData[o + 3 + c] = srgb(charBase[k + c] * lighting);
  }
  return charData;
}
function camera() {
  let cy = Math.cos(yaw),
    sy = Math.sin(yaw),
    cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  return {
    right: [cy, 0, -sy],
    up: [-sy * sp, cp, -cy * sp],
    dir: [sy * cp, sp, cy * cp],
    target: [camX, camY, camZ],
    scale: canvas.height / (7.5 * zoom),
  };
}
function effects(t) {
  return effectGeometry(() => {
    let floor = groundAt(player.x, player.z, player.y + 0.03);
    if (Number.isFinite(floor) && floor >= 0) {
      let a = 0.26 * (1 + Math.min(1, player.y - floor) * 0.5),
        b = 0.18;
      let center = [player.x, floor + 0.026, player.z];
      for (let i = 0; i < 12; i++) {
        let th = (i * Math.PI) / 6,
          th2 = ((i + 1) * Math.PI) / 6;
        tri(
          center,
          [
            center[0] + a * Math.cos(th),
            center[1],
            center[2] + b * Math.sin(th),
          ],
          [
            center[0] + a * Math.cos(th2),
            center[1],
            center[2] + b * Math.sin(th2),
          ],
          color("#566846"),
        );
      }
    }
    if (sceneId === "outdoors")
      for (let i = 0; i < 25; i++) {
        let z = ((((i * 2.47 + t * 0.37) % 23) + 23) % 23) - 11.5,
          x = Math.sin(i * 3.37) * 1.22;
        tile(
          x,
          z,
          0.18 + 0.16 * Math.sin(i * 2) ** 2,
          0.035,
          "#9cc8bd",
          -0.393,
        );
      }
    if (sceneId === "outdoors")
      for (const b of buildings) {
        const y = 0.04 + 0.02 * Math.sin(t * 2);
        tile(b.x, b.z + b.d / 2 + 0.35, 0.24, 0.24, "#e1c17b", y);
      }
    if (player.swimming)
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 + t * 0.7;
        tile(
          player.x + 0.35 * Math.cos(a),
          player.z + 0.35 * Math.sin(a),
          0.08,
          0.05,
          "#c1ded2",
          -0.385,
        );
      }
    if (sceneId === "potions" && potionBubbles > 0)
      for (let i = 0; i < 7; i++) {
        const y = 0.8 + ((t * 0.5 + i * 0.17) % 1) * 0.65;
        box(
          Math.sin(i * 8 + t) * 0.22,
          y,
          -1.25,
          0.06,
          0.06,
          0.06,
          i % 2 ? "#9ad4b7" : "#c6a7d5",
        );
      }
  });
}
const gl = canvas.getContext("webgl", {
  alpha: false,
  antialias: false,
  depth: true,
  preserveDrawingBuffer: true,
});
if (!gl) {
  $("#error").style.display = "block";
  $("#error").textContent =
    "Adventure Town needs WebGL. Enable hardware acceleration and reload.";
  throw Error("WebGL unavailable");
}
const renderer = webRenderer(gl, canvas, staticVerts);
const map = $("#map"),
  mc = map.getContext("2d");
function mapPoint(x, z) {
  return [132 + x * 7.7, 96 + z * 7.5];
}
function drawMap() {
  mc.fillStyle = "#6e8f55";
  mc.fillRect(0, 0, 264, 192);
  mc.fillStyle = "#4b9598";
  mc.fillRect(119, 6, 26, 180);
  mc.fillStyle = "#c5b388";
  mc.fillRect(20, 90, 224, 12);
  mc.fillStyle = "#9c744a";
  mc.fillRect(115, 88, 34, 16);
  for (const building of buildings) {
    const [px, pz] = mapPoint(building.x, building.z);
    mc.fillStyle =
      building.id === "grocery"
        ? "#a7be79"
        : building.id === "potions"
          ? "#b49abf"
          : "#d2bb91";
    mc.fillRect(
      px - building.w * 3.85,
      pz - building.d * 3.75,
      building.w * 7.7,
      building.d * 7.5,
    );
    mc.fillStyle = "#3b5142";
    mc.font = "bold 16px system-ui";
    mc.textAlign = "center";
    mc.fillText(
      building.id === "grocery" ? "G" : building.id === "potions" ? "P" : "H",
      px,
      pz + 5,
    );
  }
  mc.fillStyle = "#a4b197";
  for (const stone of steppingStones) {
    const [px, pz] = mapPoint(stone.x, stone.z);
    mc.fillRect(px - 2, pz - 2, 4, 4);
  }
  mc.fillStyle = "#a2ae88";
  mc.fillRect(170, 117, 62, 17);
  mc.strokeStyle = "#deead15e";
  mc.strokeRect(8, 6, 248, 180);
  let [x, z] = mapPoint(player.x, player.z);
  mc.fillStyle = "#fff3bd";
  mc.strokeStyle = "#3b5142";
  mc.lineWidth = 2;
  mc.beginPath();
  mc.arc(x, z, 5, 0, Math.PI * 2);
  mc.fill();
  mc.stroke();
  mc.strokeStyle = "#fff3bd";
  mc.beginPath();
  mc.moveTo(x, z);
  mc.lineTo(x + Math.sin(player.angle) * 10, z + Math.cos(player.angle) * 10);
  mc.stroke();
}
let last = performance.now(),
  fpsStart = last,
  sim = 0;
function frame(now) {
  let dt = Math.min(0.06, (now - last) / 1000);
  last = now;
  sim += dt;
  while (sim >= 1 / 120) {
    step(1 / 120);
    sim -= 1 / 120;
  }
  let h = Math.min(400, Math.max(220, Math.round(canvas.clientHeight * 0.47))),
    w = Math.round((h * canvas.clientWidth) / canvas.clientHeight);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderer.draw(camera(), skinCharacter(), effects(now / 1000));
  drawMap();
  frameCount++;
  if (now - fpsStart > 600) {
    measured = Math.round((frameCount * 1000) / (now - fpsStart));
    $("#info").textContent =
      renderer.name + " · " + measured + " FPS · " + player.clip;
    frameCount = 0;
    fpsStart = now;
  }
  requestAnimationFrame(frame);
}
// Lightweight read-only diagnostics for development.
window.gameState = () => ({
  x: player.x,
  y: player.y,
  z: player.z,
  grounded: player.grounded,
  clip: player.clip,
  renderer: renderer.name,
  triangles: staticVerts.length / 18 + indices.length / 3,
  fps: measured,
  scene: sceneId,
  cameraYaw: yaw,
  building: currentBuilding?.id ?? null,
  swimming: player.swimming,
  interaction: interactionTarget()?.action ?? null,
  scenery: activeSceneryIds(),
});
requestAnimationFrame(frame);
