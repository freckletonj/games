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
  Object.assign(player, spawn, {
    vy: 0,
    grounded: true,
    clip: "Idle",
    time: 0,
    air: 0,
    land: 0,
    angle: 0.58,
  });
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
    if (s.top <= maxY && s.top > top && overlaps(s, x, z, 0.12)) top = s.top;
  return top;
}
function moveAxis(axis, d) {
  if (!d) return;
  let x = player.x + (axis === "x" ? d : 0),
    z = player.z + (axis === "z" ? d : 0);
  if (Math.abs(x) > 15.6 || Math.abs(z) > 11.6) return;
  let lift = 0;
  for (let s of solids) {
    if (
      !overlaps(s, x, z) ||
      s.top <= player.y + 0.025 ||
      s.bottom >= player.y + height - 0.015
    )
      continue;
    let step = s.top - player.y;
    if (player.grounded && step <= 0.19) {
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
  if (jumpQueued && player.grounded) {
    player.vy = jumpSpeed;
    player.grounded = false;
    player.air = 0;
    player.land = 0;
  }
  jumpQueued = false;
  let speed = run ? 2.75 : 1.45;
  if (moving) {
    moveAxis("x", sx * speed * dt);
    moveAxis("z", sz * speed * dt);
  }
  let floor = groundAt(player.x, player.z, player.y + 0.025);
  if (player.grounded && player.y - floor > 0.035) {
    player.grounded = false;
    player.vy = 0;
    player.air = 0;
  }
  if (!player.grounded) {
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
  if (player.y < -0.37) {
    reset(false);
    message("The stream is too deep. Try the bridge!");
  }
  let clip = !player.grounded
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
  let k = 1 - Math.exp(-dt * 7);
  camX = mix(camX, player.x, k);
  camZ = mix(camZ, player.z, k);
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
  $("#area").textContent = area + (player.grounded ? "" : " · airborne");
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
  "KeyQ",
  "KeyE",
]);
window.addEventListener("keydown", (e) => {
  if (!movementKeys.has(e.code)) return;
  e.preventDefault();
  if (e.code === "Space" && !keys.has("Space")) jumpQueued = true;
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
    for (let i = 0; i < 25; i++) {
      let z = ((((i * 2.47 + t * 0.37) % 23) + 23) % 23) - 11.5,
        x = Math.sin(i * 3.37) * 1.22;
      tile(x, z, 0.18 + 0.16 * Math.sin(i * 2) ** 2, 0.035, "#9cc8bd", -0.393);
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
  mc.fillStyle = "#c7b595";
  for (let [x, z, w, d] of [
    [-5.5, -3.45, 2.65, 2.15],
    [-10.2, -3.75, 2.95, 2.45],
    [-8, 4.15, 2.8, 2.3],
    [-12.2, 3.6, 2.45, 2.15],
    [7.7, -4.7, 2.05, 2.05],
    [11, -1.9, 2.45, 2.1],
  ]) {
    let [px, pz] = mapPoint(x, z);
    mc.fillRect(px - w * 3.85, pz - d * 3.75, w * 7.7, d * 7.5);
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
});
requestAnimationFrame(frame);
