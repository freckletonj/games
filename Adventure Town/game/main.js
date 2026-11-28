import { activeSceneryIds, sceneryGeometry } from "./scenery.js";
import { activeCharacters, npcGeometry, modelForCharacter, characterGeometry } from "./characters.js";
import { creatureForms, friends, offerBerry, stepFriends, catchFriend } from "./creatures.js";
import { playerModel, poseCharacter, norm } from "./model.js";
const { positions, normals, colors, joints, weights, indices, clips, skeleton } =
  playerModel;
import {
  solids,
  staticVerts,
  color,
  tri,
  tile,
  effectGeometry,
  dynamicData,
  buildings,
  steppingStones,
  towerSteps,
  selectWorld,
  box,
  friendPuzzles,
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
    form: null, caught: null, jumps: 0, wingbeats: 4, diving: false,
    action: null, actionTime: 0,
  };
const orbs = [], friendshipBursts = [];
let formVertices = new Float32Array();
const keys = new Set();
let jumpQueued = false,
  jumpBuffer = 0,
  coyote = 0,
  paused = false,
  inputMode = "keyboard",
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
const pad = { x: 0, z: 0, run: false, buttons: [] };
function releaseInput() {
  keys.clear();
  jumpQueued = false;
  jumpBuffer = 0;
  pad.x = pad.z = 0;
  pad.run = false;
  drag = null;
}
function setPaused(value) {
  paused = value;
  releaseInput();
  $("#pause-panel").hidden = !value;
  $("#pause").textContent = value ? "Resume" : "Pause";
  $("#pause").setAttribute("aria-expanded", String(value));
  $("#interact").hidden = true;
  $("#friend-buttons").hidden = value;
  (value ? $("#resume") : canvas).focus();
}
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
  coyote = 0;
  releaseInput();
}
function changeScene(id) {
  sceneId = id;
  renderer.setScene(selectWorld(id));
  $("#map").style.display = id === "outdoors" ? "block" : "none";
}
function interactionTarget() {
  if(sceneId==="outdoors"&&player.form==="tidefox"&&player.swimming)
    return {action:"dive",label:player.diving?"Surface":"Dive"};
  if (!player.grounded || player.swimming) return null;
  if (sceneId === "outdoors") {
    const building = buildings.find(
      (b) =>
        Math.hypot(player.x - b.x, player.z - (b.z + b.d / 2 + 0.4)) < 0.95,
    );
    if(building)return { action: "enter", building, label: "Enter " + building.name };
    if(!player.form){
      const friend=nearbyFriend();
      if(friend)return {action:friend.friendship>0?"orb":"feed",friend,
        label:friend.friendship>0?"Catch "+creatureForms[friend.id].name:
          "Offer berry to "+creatureForms[friend.id].name+(friend.trust?" · one more!":"")};
    }
    if(player.form==="flintfist"){
      const {boulder,seal}=friendPuzzles;
      if(boulder.progress<boulder.travel&&player.x<boulder.a&&boulder.a-player.x<.55&&Math.abs(player.z-(boulder.l+boulder.r)/2)<.55&&player.y<.1)
        return {action:"push",label:"Push the boulder"};
      if(!seal.disabled&&Math.hypot(player.x-(seal.a+seal.b)/2,player.z-(seal.l+seal.r)/2)<1.05&&player.y<.1)
        return {action:"punch",label:"Punch the cracked stone"};
    }
    return null;
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
  if (paused) return;
  const target = interactionTarget();
  if (!target) return;
  if (target.action === "enter") {
    if(player.form&&!setForm(null))return;
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
  else if(target.action==="warm") message("A warm hearth. Outside, the stream keeps flowing.");
  else if(target.action==="feed") {
    const friend=target.friend;
    const point={x:friend.x+(player.x-friend.x)*.35,y:friend.y,z:friend.z+(player.z-friend.z)*.35};
    if(!friendWalkable(friend,point,creatureForms[friend.id])){message("Offer berries on open, level ground.");return;}
    if(offerBerry(friend,point))message(creatureForms[friend.id].name+" is coming for a berry!");
  } else if(target.action==="orb")launchOrb();
  else if(target.action==="dive")player.diving=!player.diving;
  else if(target.action==="push"||target.action==="punch"){
    if(player.action)return;
    player.action=target.action==="push"?"Push":"Punch";
    player.actionTime=0;
    player.angle=target.action==="push"?Math.PI/2:Math.atan2((friendPuzzles.seal.a+friendPuzzles.seal.b)/2-player.x,(friendPuzzles.seal.l+friendPuzzles.seal.r)/2-player.z);
  }
}
function updateInteraction() {
  const target = interactionTarget();
  $("#interact").hidden = paused || target === null;
  if (target) $("#interact").textContent =
    (inputMode === "gamepad" ? "X · " : inputMode === "touch" ? "" : "F · ") + target.label;
}
const gravity = 10.5, jumpSpeed = 4.35;
let radius = 0.21, height = 0.95;
function message(text) {
  $("#message").textContent = text;
  $("#message").style.opacity = 1;
  notice = 2.4;
}
function lineClear(a,b,padding=0) {
  const samples=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.08));
  for(let i=1;i<=samples;i++){
    const t=i/samples,x=mix(a.x,b.x,t),y=mix(a.y,b.y,t),z=mix(a.z,b.z,t);
    if(solids.some(s=>!s.disabled&&x+padding>s.a&&x-padding<s.b&&z+padding>s.l&&z-padding<s.r&&y+padding>s.bottom&&y-padding<s.top))return false;
  }
  return true;
}
function nearbyFriend(ready=false,range=1.8) {
  const eye={x:player.x,y:player.y+height*.55,z:player.z};
  return friends.filter(friend=>!friend.captured&&(!ready||friend.friendship>0)&&Math.abs(friend.y-player.y)<.8&&
    Math.hypot(friend.x-player.x,friend.z-player.z)<range&&
    lineClear(eye,{x:friend.x,y:friend.y+creatureForms[friend.id].height*.5,z:friend.z}))
    .sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
}
function friendWalkable(from,to,definition) {
  const distance=Math.hypot(to.x-from.x,to.z-from.z),samples=Math.max(1,Math.ceil(distance/.12));
  for(let i=1;i<=samples;i++){
    const x=mix(from.x,to.x,i/samples),z=mix(from.z,to.z,i/samples);
    const floor=groundAt(x,z,from.y+.18);
    if(!Number.isFinite(floor)||Math.abs(floor-from.y)>.18)return false;
    const r=definition.radius*.7;
    if(solids.some(s=>!s.disabled&&overlaps(s,x,z,r)&&s.top>from.y+.08&&s.bottom<from.y+definition.height*.8))return false;
  }
  return true;
}
function setForm(id) {
  const definition=id?creatureForms[id]:null,r=definition?.radius??.21,h=definition?.height??.95;
  const y=player.swimming?-.58:player.y;
  if(solids.some(s=>!s.disabled&&overlaps(s,player.x,player.z,r)&&s.top>y+.025&&s.bottom<y+h-.015)){
    message("Find a little more room before changing form.");return false;
  }
  player.form=id;radius=r;height=h;player.y=y;
  player.diving=false;player.action=null;player.clip="Idle";player.time=0;
  player.jumps=player.grounded?0:1;player.wingbeats=player.grounded?4:0;
  formVertices=new Float32Array(id?modelForCharacter(id).indices.length*6:0);
  return true;
}
function toggleForm() {
  if(paused)return;
  if(sceneId!=="outdoors"){message("Try animal forms outside in the town.");return;}
  if(!player.grounded&&!player.swimming){message("Land before changing form.");return;}
  if(!player.caught){message("Offer two berries, then send a friendship orb!");return;}
  if(setForm(player.form?null:player.caught))message(player.form?creatureForms[player.form].name+" · "+creatureForms[player.form].power:"Back to explorer form");
}
function launchOrb() {
  if(paused||sceneId!=="outdoors"||player.form||orbs.length)return;
  const friend=nearbyFriend(true,2.6);
  const origin={x:player.x,y:player.y+.5,z:player.z};
  const target=friend?{x:friend.x,y:friend.y+creatureForms[friend.id].height*.5,z:friend.z}:
    {x:origin.x+Math.sin(player.angle)*3,y:origin.y,z:origin.z+Math.cos(player.angle)*3};
  const distance=Math.hypot(target.x-origin.x,target.y-origin.y,target.z-origin.z);
  const vx=(target.x-origin.x)/distance*5,vy=(target.y-origin.y)/distance*5,vz=(target.z-origin.z)/distance*5;
  player.angle=Math.atan2(vx,vz);
  orbs.push({...origin,vx,vy,vz,age:0});
}
function stepFriendship(dt) {
  if(sceneId!=="outdoors")return;
  for(const event of stepFriends(dt,friendWalkable))message(creatureForms[event.id].name+(event.ready?" loves you! Send an orb with G / RB.":" enjoyed the berry · offer one more!"));
  for(let i=orbs.length-1;i>=0;i--){
    const orb=orbs[i],next={x:orb.x+orb.vx*dt,y:orb.y+orb.vy*dt,z:orb.z+orb.vz*dt};
    orb.age+=dt;
    if(orb.age>.8||!lineClear(orb,next,.07)){orbs.splice(i,1);continue;}
    Object.assign(orb,next);
    const friend=friends.find(f=>!f.captured&&f.friendship>0&&Math.hypot(f.x-orb.x,f.y+creatureForms[f.id].height*.5-orb.y,f.z-orb.z)<.23);
    if(friend){
      player.caught=catchFriend(friend);
      friendshipBursts.push({x:friend.x,y:friend.y+creatureForms[friend.id].height*.55,z:friend.z,age:0});
      orbs.splice(i,1);message(creatureForms[player.caught].name+" caught! T / Y to transform.");
    }
  }
  for(let i=friendshipBursts.length-1;i>=0;i--){friendshipBursts[i].age+=dt;if(friendshipBursts[i].age>.8)friendshipBursts.splice(i,1);}
}
function reset(notify = true) {
  releaseInput();
  coyote = 0;
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
  player.form=null;radius=.21;height=.95;player.diving=false;player.action=null;
  player.jumps=0;player.wingbeats=4;orbs.length=0;
  camX = spawn.x;
  camY = 0.2;
  camZ = spawn.z;
  yaw = 0.58;
  pitch = 0.7;
  zoom = 1;
  $("#zoom").textContent = "Zoom out";
  if (notify) message("Back in Emberbrook · Willowbank village");
}
function overlaps(s, x, z, r = radius) {
  return x + r > s.a && x - r < s.b && z + r > s.l && z - r < s.r;
}
function groundAt(x, z, maxY) {
  let top = -Infinity;
  for (let s of solids)
    if (!s.disabled && s.top <= maxY && s.top > top && overlaps(s, x, z)) top = s.top;
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
      s.disabled ||
      !overlaps(s, x, z) ||
      s.top <= player.y + 0.025 ||
      s.bottom >= player.y + height - 0.015
    )
      continue;
    let step = s.top - player.y;
    if (
      (player.grounded && step <= 0.19) ||
      (player.swimming && !player.diving && s.top <= 0.08 && step <= 0.7)
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
  stepFriendship(dt);
  if(player.grounded){player.jumps=0;player.wingbeats=4;}
  if(player.action){
    const before=player.actionTime;player.actionTime+=dt;
    if(player.action==="Push"){
      const boulder=friendPuzzles.boulder,amount=Math.min(boulder.travel-boulder.progress,dt*1.5);
      boulder.a+=amount;boulder.b+=amount;boulder.progress+=amount;moveAxis("x",amount);
      if(boulder.progress>=boulder.travel){player.action=null;message("A new way through the stones!");}
    }else if(before<.4&&player.actionTime>=.4){
      const seal=friendPuzzles.seal;
      if(Math.hypot(player.x-(seal.a+seal.b)/2,player.z-(seal.l+seal.r)/2)<1.05){
        seal.disabled=true;message("Flintfist opened the cracked stone!");
        friendshipBursts.push({x:(seal.a+seal.b)/2,y:.6,z:(seal.l+seal.r)/2,age:0});
      }
    }
    if(player.action!=="Push"&&player.actionTime>=1)player.action=null;
  }
  let left = keys.has("KeyA") || keys.has("ArrowLeft"),
    right = keys.has("KeyD") || keys.has("ArrowRight"),
    up = keys.has("KeyW") || keys.has("ArrowUp"),
    down = keys.has("KeyS") || keys.has("ArrowDown"),
    dx = clamp(Number(right) - Number(left) + pad.x, -1, 1),
    dz = clamp(Number(down) - Number(up) + pad.z, -1, 1),
    moving = !!(dx || dz),
    run = keys.has("ShiftLeft") || keys.has("ShiftRight") || pad.run;
  if(player.action){dx=dz=0;moving=false;jumpQueued=false;}
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
  if(!player.swimming)player.diving=false;
  coyote = player.grounded ? 0.1 : Math.max(0, coyote - dt);
  jumpBuffer = jumpQueued ? 0.12 : Math.max(0, jumpBuffer - dt);
  jumpQueued = false;
  if (jumpBuffer > 0 && (player.grounded || player.swimming || coyote > 0)) {
    player.vy = player.swimming ? 3.2 : jumpSpeed;
    player.swimming = false;
    player.grounded = false;
    player.air = 0;
    player.land = 0;
    jumpBuffer = coyote = 0;
    player.jumps=1;player.diving=false;
  } else if(jumpBuffer>0&&player.form==="springaroo"&&player.jumps<2){
    player.vy=4.5;player.jumps++;player.air=0;player.land=0;jumpBuffer=0;
  } else if(jumpBuffer>0&&player.form==="moonwing"&&player.wingbeats>0){
    player.vy=3.5;player.wingbeats--;player.air=0;player.land=0;jumpBuffer=0;
  }
  let speed = player.swimming ? 1.15 : run ? 2.75 : 1.45;
  if(player.form==="tidefox"&&player.swimming)speed=2.4;
  if (moving) {
    const amount = Math.min(1, len);
    moveAxis("x", sx * speed * amount * dt);
    moveAxis("z", sz * speed * amount * dt);
  }
  if (player.swimming && !player.diving && groundAt(player.x, player.z, 0.08) > -0.3) {
    player.swimming = false;
    player.grounded = true;
    player.y = groundAt(player.x, player.z, 0.08);
  }
  let floor = groundAt(player.x, player.z, player.y + 0.025);
  if (player.grounded && player.y - floor > 0.035) {
    player.grounded = false;
    player.vy = 0;
    player.air = 0;
    player.jumps=Math.max(1,player.jumps);
  }
  if (player.swimming) {
    player.y = player.diving ? -1.02 : -0.58;
    player.vy = 0;
    player.grounded = false;
  } else if (!player.grounded) {
    let prev = player.y;
    player.air += dt;
    player.vy -= (player.form==="moonwing"?5.5:gravity) * dt;
    let next = prev + player.vy * dt;
    if (player.vy > 0) {
      for (let s of solids)
        if (
          !s.disabled &&
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
  if(player.form==="tidefox"&&player.swimming)clip="Swim";
  if(player.form==="moonwing"&&!player.grounded)clip="Fly";
  if(player.action)clip=player.action;
  const currentClips=player.form?modelForCharacter(player.form).clips:clips;
  if (clip !== player.clip) {
    player.clip = clip;
    player.time = 0;
  }
  if (clip === "Jump") {
    player.time = player.grounded
      ? currentClips.Jump.duration * (1 - (player.land / 0.12) * 0.17)
      : currentClips.Jump.duration *
        (player.vy >= 0
          ? mix(0.3, 0.63, clamp(1 - player.vy / jumpSpeed, 0, 1))
          : mix(0.63, 0.78, clamp(-player.vy / jumpSpeed, 0, 1)));
    player.time = clamp(player.time, 0, currentClips.Jump.duration);
  } else
    player.time =
      (player.time + dt * (clip === "Run" ? 1.3 : clip === "Walk" ? 1.05 : 1)) %
      currentClips[clip].duration;
  if(player.action)player.time=player.actionTime%currentClips[clip].duration;
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
}
function updateHud() {
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
  const definition=player.form?creatureForms[player.form]:null;
  $("#friend-state").textContent=sceneId!=="outdoors"?"":definition?
    definition.name+" · "+definition.power+(player.form==="moonwing"?" ("+player.wingbeats+" left)":""):
    player.caught?creatureForms[player.caught].name+" is your friend · T / Y to transform":"F / X · offer berries to a new friend";
  $("#friend-buttons").hidden=paused||sceneId!=="outdoors";
  $("#orb").hidden=!!player.form||!nearbyFriend();
  $("#form").hidden=!player.caught;
  $("#form").textContent=player.form?"Return to explorer":"Become "+(player.caught?creatureForms[player.caught].name:"");
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
  "KeyG",
  "KeyT",
]);
window.addEventListener("keydown", (e) => {
  if (paused && e.code === "Tab") {
    e.preventDefault();
    $("#resume").focus();
    return;
  }
  if (e.code === "Escape" && !e.repeat) {
    e.preventDefault();
    setPaused(!paused);
    return;
  }
  // Space/Enter on a focused button should activate that button.
  if (e.target?.tagName === "BUTTON" && e.code === "Space") return;
  if (!movementKeys.has(e.code)) return;
  e.preventDefault();
  if (paused) return;
  if (e.repeat && !keys.has(e.code)) return;
  inputMode = "keyboard";
  if (e.code === "Space" && !keys.has("Space")) jumpQueued = true;
  if (e.code === "KeyF" && !keys.has("KeyF")) interact();
  if (e.code === "KeyG" && !keys.has("KeyG")) launchOrb();
  if (e.code === "KeyT" && !keys.has("KeyT")) toggleForm();
  keys.add(e.code);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  setPaused(true);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    setPaused(true);
  }
});
for (let b of document.querySelectorAll("[data-key]")) {
  let key = b.dataset.key;
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (paused) return;
    inputMode = "touch";
    b.setPointerCapture(e.pointerId);
    keys.add(key);
    if (key === "Space") jumpQueued = true;
  });
  for (let ev of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(ev, () => keys.delete(key));
}
$("#interact").onclick = () => { interact(); canvas.focus(); };
$("#orb").onclick=()=>{inputMode="touch";launchOrb();canvas.focus();};
$("#form").onclick=()=>{inputMode="touch";toggleForm();canvas.focus();};
$("#reset").onclick = () => { reset(); canvas.focus(); };
$("#pause").onclick = () => setPaused(!paused);
$("#resume").onclick = () => setPaused(false);
$("#orbit").onclick = () => {
  yaw += Math.PI / 2;
  canvas.focus();
};
$("#zoom").onclick = () => {
  zoom = zoom < 1.2 ? 1.48 : 1;
  $("#zoom").textContent = zoom < 1.2 ? "Zoom out" : "Zoom in";
  canvas.focus();
};
let drag = null;
canvas.addEventListener("pointerdown", (e) => {
  if (paused || drag) return;
  canvas.focus();
  drag = [e.clientX, e.clientY, e.pointerId];
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (drag && drag[2] === e.pointerId) {
    yaw -= (e.clientX - drag[0]) * 0.008;
    pitch = clamp(pitch + (e.clientY - drag[1]) * 0.004, 0.44, 1.05);
    drag = [e.clientX, e.clientY, e.pointerId];
  }
});
for (let ev of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(ev, (e) => { if (drag?.[2] === e.pointerId) drag = null; });
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    zoom = clamp(zoom * Math.exp(e.deltaY * 0.0007), 0.72, 1.8);
  },
  { passive: false },
);
// Standard-mapped gamepads only; all buttons are edge-triggered.
function pollGamepad(dt) {
  const connected = Array.from(navigator.getGamepads()).find(
    (p) => p?.connected && p.mapping === "standard",
  );
  if (!connected) {
    pad.x = pad.z = 0;
    pad.run = false;
    pad.buttons = [];
    if (inputMode === "gamepad") inputMode = "keyboard";
    $("#pad-help").hidden = true;
    return;
  }
  const buttons = connected.buttons.map((b) => b.pressed);
  const pressed = (i) => buttons[i] && !pad.buttons[i];
  const axis = (v) => Math.abs(v) < 0.18 ? 0 : Math.sign(v) * (Math.abs(v) - 0.18) / 0.82;
  const x = axis(connected.axes[0]), z = axis(connected.axes[1]);
  if (x || z || buttons.some(Boolean)) inputMode = "gamepad";
  if (pressed(9)) setPaused(!paused);
  if (!paused) {
    pad.x = x + Number(buttons[15]) - Number(buttons[14]);
    pad.z = z + Number(buttons[13]) - Number(buttons[12]);
    pad.run = buttons[1] || buttons[7];
    if (pressed(0)) jumpQueued = true;
    if (pressed(2)) interact();
    if (pressed(5)) launchOrb();
    if (pressed(3)) toggleForm();
    yaw += axis(connected.axes[2]) * dt * 1.8;
    pitch = clamp(pitch + axis(connected.axes[3]) * dt, 0.44, 1.05);
  }
  pad.buttons = buttons;
  $("#pad-help").hidden = inputMode !== "gamepad";
}
// Skin the exact embedded GLB. Remove baked jump elevation so world physics is authoritative.
const charP = new Float32Array(positions.length),
  charN = new Float32Array(normals.length),
  charLit = new Float32Array(positions.length),
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
  if(player.form){
    const definition=creatureForms[player.form];
    characterGeometry(modelForCharacter(player.form),player.clip,player.time,
      [player.x,player.y,player.z],player.angle,definition.scale,formVertices,0,true);
    return formVertices;
  }
  const posed = poseCharacter(playerModel, player.clip, player.time);
  let lowest = Infinity,
    ca = Math.cos(player.angle),
    sa = Math.sin(player.angle);
  for (let i = 0; i < positions.length / 3; i++) {
    let k = i * 3,
      X = posed.positions[k],
      Y = posed.positions[k + 1],
      Z = posed.positions[k + 2],
      NX = posed.normals[k],
      NY = posed.normals[k + 1],
      NZ = posed.normals[k + 2];
    if (player.swimming) {
      const tilt = 1.35,
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
    const nl = Math.hypot(charN[k], charN[k + 1], charN[k + 2]) || 1;
    const lighting = 0.71 + 0.38 * Math.max(0,
      (charN[k] * light[0] + charN[k + 1] * light[1] + charN[k + 2] * light[2]) / nl);
    for (let c = 0; c < 3; c++) charLit[k + c] = srgb(charBase[k + c] * lighting);
    lowest = Math.min(lowest, Y);
  }
  let offset = player.y - (player.swimming ? 0.22 : player.clip === "Jump" ? lowest : 0);
  for (let i = 0; i < indices.length; i++) {
    let k = indices[i] * 3,
      o = i * 6;
    charData[o] = charP[k];
    charData[o + 1] = charP[k + 1] + offset;
    charData[o + 2] = charP[k + 2];
    for (let c = 0; c < 3; c++)
      charData[o + 3 + c] = charLit[k + c];
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
function friendHeart(x,y,z,size){
  box(x-size*.45,y+size*.35,z,size*.8,size*.75,size*.45,"#ed91a5");
  box(x+size*.45,y+size*.35,z,size*.8,size*.75,size*.45,"#ed91a5");
  box(x,y,z,size*1.6,size*.6,size*.45,"#e67c98");
  box(x,y-size*.55,z,size*.7,size*.6,size*.45,"#e67c98");
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
    if(sceneId==="outdoors"){
      for(const friend of friends){
        if(friend.captured)continue;
        if(friend.lure){
          box(friend.lure.x,friend.lure.y+.025,friend.lure.z,.09,.09,.09,"#e97d99");
          box(friend.lure.x+.02,friend.lure.y+.11,friend.lure.z,.04,.02,.05,"#7a9e55");
        }
        if(friend.hearts>0||friend.friendship>0)for(let i=0;i<3;i++){
          const angle=i*Math.PI*2/3+t*.8;
          friendHeart(friend.x+Math.cos(angle)*.3,friend.y+creatureForms[friend.id].height+.15+.07*Math.sin(t*3+i),friend.z+Math.sin(angle)*.3,.065);
        }
      }
      for(const orb of orbs){
        const vertices=sceneryGeometry("friendship-orb",[orb.x,orb.y-.11,orb.z],Math.atan2(orb.vx,orb.vz));
        for(const value of vertices)dynamicData.push(value);
      }
      for(const burst of friendshipBursts)for(let i=0;i<6;i++){
        const angle=i*Math.PI/3,reach=burst.age*.7;
        friendHeart(burst.x+Math.cos(angle)*reach,burst.y+burst.age*.4,burst.z+Math.sin(angle)*reach,.07*(1-burst.age/.8));
      }
      const {boulder,seal}=friendPuzzles;
      const bx=(boulder.a+boulder.b)/2,bz=(boulder.l+boulder.r)/2;
      box(bx,0,bz,.8,.75,.8,"#8d9784");box(bx,.75,bz,.6,.4,.6,"#a0ac8b");
      box(bx-.405,.25,bz,.025,.07,.35,"#d3be82");
      if(!seal.disabled){
        const x=(seal.a+seal.b)/2,z=(seal.l+seal.r)/2;
        box(x,0,z,1.2,1.1,.3,"#8b958b");
        for(let i=0;i<4;i++)box(x+(i%2?.07:-.07),.15+i*.2,z+.16,.045,.22,.025,"#d9c6a0");
      }
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
  preserveDrawingBuffer: false,
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
  mc.fillStyle = "#e9cf8d";
  for (const step of towerSteps) {
    const [x, z] = mapPoint(step.x, step.z);
    mc.fillRect(x - 2, z - 2, 4, 4);
  }
  mc.font = "bold 14px system-ui";
  mc.textAlign = "center";
  for (const [label, x, z] of [["T", 7.7, -4.7], ["R", 10, 4.8]]) {
    const [px, pz] = mapPoint(x, z);
    mc.fillStyle = "#253c32";
    mc.fillText(label, px + 1, pz + 1);
    mc.fillStyle = "#fff3bd";
    mc.fillText(label, px, pz);
  }
  mc.fillText("N ↑", 241, 22);
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
  hudTime = 0.1,
  worldTime = 0,
  sim = 0;
function frame(now) {
  let dt = Math.min(0.06, (now - last) / 1000);
  last = now;
  pollGamepad(dt);
  if (paused) {
    sim = 0;
    frameCount = 0;
    fpsStart = now;
    requestAnimationFrame(frame);
    return;
  }
  sim += dt;
  while (sim >= 1 / 120) {
    step(1 / 120);
    sim -= 1 / 120;
  }
  worldTime += dt;
  let h = Math.min(400, Math.max(220, Math.round(canvas.clientHeight * 0.47))),
    w = Math.round((h * canvas.clientWidth) / canvas.clientHeight);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderer.draw(camera(), skinCharacter(), effects(worldTime), npcGeometry(sceneId, worldTime, friends));
  hudTime += dt;
  if (hudTime >= 0.1) {
    updateHud();
    if (sceneId === "outdoors") drawMap();
    hudTime = 0;
  }
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
  form:player.form,caught:player.caught,diving:player.diving,wingbeats:player.wingbeats,
  friends:friends.map(({id,x,y,z,trust,friendship,captured})=>({id,x,y,z,trust,friendship,captured})),
  orbCount:orbs.length,
  puzzles:{boulder:friendPuzzles.boulder.progress,sealOpen:friendPuzzles.seal.disabled},
  renderer: renderer.name,
  triangles: staticVerts.length / 18 + (player.form?modelForCharacter(player.form).indices.length:indices.length) / 3 + npcGeometry(sceneId, worldTime, friends).length / 18,
  visibleTriangles: renderer.visibleTriangles() + (player.form?modelForCharacter(player.form).indices.length:indices.length) / 3,
  fps: measured,
  scene: sceneId,
  paused,
  input: inputMode,
  cameraYaw: yaw,
  building: currentBuilding?.id ?? null,
  swimming: player.swimming,
  interaction: interactionTarget()?.action ?? null,
  scenery: activeSceneryIds(),
  characters: activeCharacters(sceneId).map((actor) => actor.id),
});
requestAnimationFrame(frame);
