import { sceneryGeometry } from "./scenery.js";
import { townCharacters } from "./town-characters.js";
const clampColor = (x, a, b) => Math.max(a, Math.min(b, x));
const solids = [],
  staticData = [],
  dynamicData = [];
let dest = staticData;
let seed = 1493;
const rand = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
function color(hex, shade = 1) {
  let v = parseInt(hex.slice(1), 16);
  return [
    (((v >> 16) & 255) * shade) / 255,
    (((v >> 8) & 255) * shade) / 255,
    ((v & 255) * shade) / 255,
  ].map((x) => clampColor(x, 0, 1));
}
function tri(a, b, c, col) {
  dest.push(...a, ...col, ...b, ...col, ...c, ...col);
}
function quad(a, b, c, d, col) {
  tri(a, b, c, col);
  tri(a, c, d, col);
}
function box(x, y, z, w, h, d, c, collide = false, shade = 1) {
  let a = x - w / 2,
    b = x + w / 2,
    l = z - d / 2,
    r = z + d / 2,
    t = y + h;
  let p = [
    [a, y, l],
    [b, y, l],
    [b, y, r],
    [a, y, r],
    [a, t, l],
    [b, t, l],
    [b, t, r],
    [a, t, r],
  ];
  for (let [ids, s] of [
    [[4, 7, 6, 5], 1.06],
    [[0, 4, 5, 1], 0.81],
    [[1, 5, 6, 2], 0.88],
    [[2, 6, 7, 3], 0.96],
    [[3, 7, 4, 0], 0.7],
  ])
    quad(...ids.map((i) => p[i]), color(c, s * shade));
  if (collide) solids.push({ a, b, l, r, bottom: y, top: t });
}
function tile(x, z, w, d, c, y = 0.002) {
  quad(
    [x - w / 2, y, z - d / 2],
    [x - w / 2, y, z + d / 2],
    [x + w / 2, y, z + d / 2],
    [x + w / 2, y, z - d / 2],
    color(c),
  );
}
function roof(x, y, z, w, d, h, c) {
  let a = x - w / 2,
    b = x + w / 2,
    l = z - d / 2,
    r = z + d / 2;
  let A = [a, y, l],
    B = [b, y, l],
    C = [b, y, r],
    D = [a, y, r],
    E = [x, y + h, l],
    F = [x, y + h, r];
  quad(A, D, F, E, color(c, 0.86));
  quad(E, F, C, B, color(c, 1.08));
  tri(A, E, B, color("#a27b56", 0.84));
  tri(D, C, F, color("#d0b68e", 0.96));
  for (let j = 1; j < 6; j++) {
    let k = j / 6,
      xx = (w / 2) * k,
      yy = y + h * (1 - k);
    box(x - xx, yy - 0.025, z, 0.045, 0.045, d + 0.04, "#734737");
    box(x + xx, yy - 0.025, z, 0.045, 0.045, d + 0.04, "#734737");
  }
  box(x, y + h - 0.025, z, 0.12, 0.09, d + 0.15, "#b87a55");
}
function house(x, z, w, d, h, c, roofcol) {
  box(x, 0, z, w + 0.18, 0.18, d + 0.18, "#7c7e70", true);
  box(x, 0.18, z, w, h, d, c, true);
  roof(x, h + 0.18, z, w + 0.48, d + 0.42, w * 0.38, roofcol);
  let f = z + d / 2 + 0.014;
  box(x, 0.18, f, 0.58, 1.05, 0.065, "#654534");
  box(x + 0.2, 0.64, f + 0.045, 0.06, 0.06, 0.04, "#dab363");
  for (let s of [-1, 1]) {
    let wx = x + s * w * 0.32;
    box(wx, 0.75, f, 0.5, 0.54, 0.075, "#664a35");
    box(wx, 0.81, f + 0.046, 0.36, 0.39, 0.04, "#b7c6a2");
    box(wx, 0.81, f + 0.073, 0.045, 0.39, 0.025, "#69503a");
    box(wx, 0.98, f + 0.073, 0.36, 0.043, 0.025, "#69503a");
    box(wx, 0.7, f + 0.11, 0.6, 0.08, 0.24, "#79543c");
    box(x + s * (w / 2 - 0.1), 0.16, f, 0.13, h + 0.06, 0.09, "#6d4b35");
  }
  box(x, h + 0.02, f, w, 0.12, 0.08, "#6d4b35");
  box(x, 0.2, f, w, 0.12, 0.07, "#6d4b35");
  for (let k of [-1, 1]) {
    box(
      x + k * w * 0.23,
      h * 0.62,
      z - d / 2 - 0.03,
      0.13,
      h * 0.4,
      0.08,
      "#785339",
    );
  }
  box(
    x + w * 0.29,
    h + 0.24,
    z - d * 0.22,
    0.37,
    w * 0.35 + 0.34,
    0.39,
    "#8a8376",
  );
  box(
    x + w * 0.29,
    h + 0.56 + w * 0.35,
    z - d * 0.22,
    0.49,
    0.12,
    0.49,
    "#666c63",
  );
}
function tree(x, z, s = 1) {
  box(x, 0, z, 0.28 * s, 1.55 * s, 0.28 * s, "#79553b", true);
  let h = 1.1 * s;
  box(x, h, z, 1.2 * s, 0.65 * s, 1.1 * s, "#436e45");
  box(
    x - 0.3 * s,
    h + 0.35 * s,
    z + 0.08 * s,
    0.88 * s,
    0.7 * s,
    0.9 * s,
    "#64894c",
  );
  box(
    x + 0.33 * s,
    h + 0.4 * s,
    z - 0.12 * s,
    0.9 * s,
    0.77 * s,
    0.91 * s,
    "#759b50",
  );
  box(x, h + 0.88 * s, z, 0.78 * s, 0.54 * s, 0.76 * s, "#8ba95b");
  box(
    x - 0.46 * s,
    h + 0.07 * s,
    z - 0.23 * s,
    0.56 * s,
    0.55 * s,
    0.64 * s,
    "#527a46",
  );
  box(
    x + 0.48 * s,
    h + 0.18 * s,
    z + 0.25 * s,
    0.54 * s,
    0.55 * s,
    0.58 * s,
    "#557f47",
  );
}
function bush(x, z, s = 1) {
  box(x, 0, z, 0.58 * s, 0.32 * s, 0.46 * s, "#527748");
  box(x - 0.12 * s, 0.22 * s, z, 0.38 * s, 0.24 * s, 0.36 * s, "#789b51");
  box(
    x + 0.2 * s,
    0.1 * s,
    z - 0.1 * s,
    0.35 * s,
    0.28 * s,
    0.39 * s,
    "#688a4d",
  );
}
function rock(x, z, s = 1) {
  box(x, 0, z, 0.6 * s, 0.29 * s, 0.53 * s, "#818c83");
  box(
    x - 0.07 * s,
    0.24 * s,
    z + 0.03 * s,
    0.38 * s,
    0.21 * s,
    0.35 * s,
    "#a0a79a",
  );
}
function flower(x, z, c) {
  box(x, 0, z, 0.035, 0.19, 0.035, "#557b41");
  box(x, 0.16, z, 0.13, 0.08, 0.13, c);
  box(x, 0.235, z, 0.07, 0.025, 0.07, "#e3bd66");
}
function lamp(x, z) {
  assetShape("town-lantern", [x, 0, z], () => {
    solids.push({
      a: x - 0.26, b: x + 0.26, l: z - 0.24, r: z + 0.24,
      bottom: 0, top: 1.55,
    });
    box(x, 0, z, 0.1, 1.05, 0.1, "#624b35");
    box(x, 1.0, z, 0.3, 0.08, 0.3, "#65513a");
    box(x, 1.08, z, 0.22, 0.27, 0.22, "#f1c571");
    box(x, 1.35, z, 0.32, 0.075, 0.32, "#654b34");
    box(x, 1.43, z, 0.13, 0.11, 0.13, "#654b34");
  });
}

function fence(x, z, axis, n) {
  for (let i = 0; i <= n; i++)
    box(
      x + (axis === "x" ? i * 0.62 : 0),
      0,
      z + (axis === "z" ? i * 0.62 : 0),
      0.12,
      0.65,
      0.12,
      "#806344",
      true,
    );
  for (let y of [0.24, 0.48])
    box(
      x + (axis === "x" ? n * 0.31 : 0),
      y,
      z + (axis === "z" ? n * 0.31 : 0),
      axis === "x" ? n * 0.62 : 0.09,
      0.09,
      axis === "z" ? n * 0.62 : 0.09,
      "#a58252",
      true,
    );
}
function ledge(x, z, w, d, h) {
  box(x, 0, z, w, h - 0.1, d, "#7d8270", true);
  box(x, h - 0.1, z, w, 0.1, d, "#86a05d", true);
  for (let i = 0; i < Math.ceil(w / 0.48); i++) {
    let xx = x - w / 2 + 0.22 + i * 0.48;
    if (xx > x + w / 2 - 0.1) break;
    box(xx, h - 0.28, z + d / 2 - 0.025, 0.34, 0.16, 0.06, "#a2a18a");
  }
}
function assetShape(id, position, placeholder, angle = 0, scale = 1) {
  const start = dest.length;
  placeholder();
  const vertices = sceneryGeometry(id, position, angle, scale);
  if (vertices !== null) {
    dest.length = start;
    for (const value of vertices) dest.push(value);
  }
}
export const buildings = [
  {
    id: "cottage",
    name: "Willow Cottage",
    asset: "willow-cottage",
    x: -5.5,
    z: -3.45,
    w: 2.65,
    d: 2.6,
    h: 1.67,
    color: "#e4ca9e",
    roof: "#a65a42",
  },
  {
    id: "grocery",
    name: "Greenbasket Grocery",
    asset: "greenbasket-grocery",
    x: -10.2,
    z: -3.75,
    w: 2.95,
    d: 2.9,
    h: 1.8,
    color: "#d8bd92",
    roof: "#6c8581",
  },
  {
    id: "potions",
    name: "Moss & Ember Potions",
    asset: "moss-ember-potions",
    x: 11,
    z: -1.9,
    w: 2.45,
    d: 2.4,
    h: 1.55,
    color: "#d9cba9",
    roof: "#805e83",
  },
  {
    id: "garden-cottage",
    name: "Garden Cottage",
    asset: "willow-cottage",
    x: -8,
    z: 4.15,
    w: 2.8,
    d: 2.6,
    h: 1.65,
    color: "#e0c3a1",
    roof: "#9b6448",
  },
  {
    id: "riverside-cottage",
    name: "Riverside Cottage",
    asset: "willow-cottage",
    x: -12.2,
    z: 3.6,
    w: 2.45,
    d: 2.6,
    h: 1.5,
    color: "#d5c29e",
    roof: "#78855d",
  },
];
export const steppingStones = [-1.3, 0, 1.3].map((x) => ({
  x,
  z: -5.7,
  w: 0.78,
  d: 0.65,
  top: -0.12,
}));
// Terrain and river: ground is two solid banks, with a lower riverbed.
box(-8.85, -0.58, 0, 14.3, 0.58, 24, "#756247", true);
box(8.85, -0.58, 0, 14.3, 0.58, 24, "#756247", true);
for (let side of [-1, 1])
  for (let i = 0; i < 14; i++)
    for (let j = 0; j < 24; j++) {
      let x = side * (2.2 + i),
        z = -11.5 + j;
      let greens = ["#819d59", "#7c9855", "#829e5b", "#779452", "#85a05d"];
      tile(x, z, 1.002, 1.002, greens[Math.floor(rand() * greens.length)]);
    }
// A deeper riverbed leaves room for the Tidefox's authored dive depth.
box(0, -1.25, 0, 3.4, 0.1, 24, "#617d72", true);
for (let j = 0; j < 24; j++)
  tile(
    0,
    -11.5 + j,
    3.42,
    1.01,
    j % 3 === 0 ? "#579f9d" : j % 3 === 1 ? "#539998" : "#509494",
    -0.41,
  );
for (let s of [-1, 1])
  for (let j = 0; j < 24; j++) {
    let z = -11.5 + j;
    box(
      s * 1.72,
      -0.33,
      z,
      0.14,
      0.3,
      1.0,
      j % 3 === 0 ? "#a3a58a" : "#858d79",
    );
    if (j % 3 === 0) box(s * 1.48, -0.4, z + 0.11, 0.28, 0.1, 0.42, "#829c89");
  }
for (let i = 0; i < 90; i++) {
  let x = (rand() - 0.5) * 2.75,
    z = (rand() - 0.5) * 23;
  tile(
    x,
    z,
    0.15 + rand() * 0.46,
    0.032 + rand() * 0.08,
    rand() > 0.5 ? "#83bab2" : "#66aca8",
    -0.4 + rand() * 0.002,
  );
}
// Main crossing and winding footpaths.
for (let i = 0; i < 27; i++) {
  let x = -13 + i;
  if (Math.abs(x) > 1.75) tile(x, 0, 1.03, 1.45, "#bcac82", 0.012);
}
for (let j = 0; j < 11; j++) {
  let z = 1 + j * 0.7;
  tile(-5.2 + 0.3 * Math.sin(j * 0.7), z, 1.12, 0.78, "#b9aa80", 0.013);
  tile(
    6.2 + 0.35 * Math.sin(j * 0.65),
    -1 - j * 0.73,
    1.07,
    0.8,
    "#b9aa80",
    0.013,
  );
}
for (let j = 0; j < 10; j++)
  tile(-8.8 + 0.3 * Math.sin(j), -1 - j * 0.72, 1.0, 0.77, "#b9aa80", 0.014);
for (let s of [-1, 1]) {
  box(s * 2.32, 0, 0, 0.46, 0.14, 1.65, "#9b7751", true);
  box(s * 2.05, 0, 0, 0.35, 0.27, 1.65, "#9b7751", true);
}
box(0, 0.06, 0, 3.95, 0.26, 1.65, "#8c623e", true);
for (let i = 0; i < 19; i++) {
  let x = -1.9 + i * 0.211;
  box(x, 0.31, 0, 0.196, 0.025, 1.68, i % 3 === 0 ? "#b48b59" : "#a57b4d");
}
for (let s of [-1, 1]) {
  for (let i = 0; i < 6; i++)
    box(-1.9 + i * 0.76, 0.32, s * 0.83, 0.11, 0.56, 0.11, "#73513a", true);
  box(0, 0.76, s * 0.83, 4.02, 0.1, 0.12, "#957049", true);
}
lamp(-2.7, -1);
lamp(2.7, 1);
// Village west bank. Courtyard and cottage gardens.

for (const b of buildings) {
  assetShape(b.asset, [b.x, 0, b.z], () =>
    house(b.x, b.z, b.w, b.d, b.h, b.color, b.roof),
  );
  // The original grocery splat has an open lower rear. This authored infill
  // closes its shell without modifying or claiming to recover source geometry.
  if (b.asset === "greenbasket-grocery") {
    const x = b.x + 0.25, z = b.z - 1.48;
    box(x, 0, z, 3.0, 0.18, 0.16, "#929080");
    box(x, 0.18, z, 2.9, 1.8, 0.12, "#d6bd94");
    for (const dx of [-1.4, 0, 1.4])
      box(x+dx, 0.18, z-0.07, 0.12, 1.8, 0.08, "#795338");
    tri([x-1.5, 1.98, z-0.09], [x+1.5, 1.98, z-0.09],
      [x, 2.65, z-0.09], color("#d6bd94", 0.81));
    box(x, 1.98, z-0.1, 0.12, 0.65, 0.08, "#795338");
    for (const y of [0.18, 1.9])
      box(x, y, z-0.07, 3.0, 0.12, 0.08, "#795338");
  }
  const front = b.z + b.d / 2;
  tile(
    b.x,
    front + 0.28,
    0.7,
    0.5,
    b.id === "grocery" ? "#91ad65" : b.id === "potions" ? "#a484af" : "#81aaa0",
    0.014,
  );
}
// A second river crossing rewards jumping, with swimming as an alternate route.
for (const stone of steppingStones) {
  assetShape("river-boulder", [stone.x, -0.42, stone.z], () => {
    box(
      stone.x,
      -0.42,
      stone.z,
      stone.w,
      stone.top + 0.42,
      stone.d,
      "#869486",
      true,
    );
    box(
      stone.x,
      stone.top - 0.035,
      stone.z,
      stone.w * 0.85,
      0.04,
      stone.d * 0.82,
      "#9dac89",
    );
  });
}
// Sandy banks make swim entry and exit easy to spot.
for (const side of [-1, 1]) tile(side * 2.15, 7.8, 0.95, 2.2, "#c5ba8f", 0.015);

// Inn sign and outdoor table.
box(-4.13, 0.78, -2.21, 0.1, 0.1, 0.44, "#745236");
box(-4.13, 0.47, -1.99, 0.46, 0.35, 0.085, "#84603c");
box(-4.13, 0.57, -1.936, 0.2, 0.15, 0.025, "#d8b76e");
box(-4.0, 0, 3.35, 0.12, 0.48, 0.12, "#725137", true);
box(-4.0, 0.48, 3.35, 0.88, 0.1, 0.65, "#a98152", true);
for (let s of [-1, 1]) {
  box(-4.0 + s * 0.64, 0, 3.35, 0.14, 0.3, 0.14, "#795438");
  box(-4.0 + s * 0.64, 0.3, 3.35, 0.29, 0.08, 0.45, "#a48150");
}
// Well in west plaza. Preserve the authored basin collision.
assetShape("plaza-well", [-8, 0, 1.65], () => {
  for (let i = 0; i < 8; i++) {
    let a = (i * Math.PI) / 4;
    box(
      -8.0 + 0.43 * Math.cos(a),
      0,
      1.65 + 0.43 * Math.sin(a),
      0.37,
      0.48,
      0.37,
      "#8e978d",
      true,
    );
  }
  box(-8, 0.025, 1.65, 0.62, 0.06, 0.62, "#436e70");
  for (let s of [-1, 1]) box(-8 + s * 0.48, 0.4, 1.65, 0.1, 0.85, 0.1, "#6d5138");
  roof(-8, 1.22, 1.65, 1.25, 1.05, 0.4, "#9b5c42");
});
fence(-12.9, -1.65, "x", 3);
fence(-10.3, 5.7, "x", 4);
lamp(-6.7, 0.85);
lamp(-9.8, -0.85);
lamp(-5.3, 5.7);
for (const [x, z, angle] of [[-8.7, 8.7, .2], [6, 8.8, -.3]]) {
  assetShape("town-bench", [x, 0, z], () => {
    box(x, 0, z, 1.5, .8, .7, "#976637", true);
  }, angle);
}
for (const [x, z] of [[-5.3, 2.4], [-3.5, 8.3], [3.3, -6.2], [9.6, 8.0]])
  assetShape("blushberry-bush", [x, 0, z], () => bush(x, z));
// A small optional garden overlook rewards Springaroo's second jump.
ledge(-7.2, 8.7, 1.6, 1.4, 1.35);
for (const [x,z] of [[-7.65,8.6],[-6.75,8.8]]) {
  const start=dest.length;flower(x,z,"#e5b8b9");
  for(let i=start+1;i<dest.length;i+=6)dest[i]+=1.35;
}
export const friendPuzzles = {
  boulder: { a: 8.1, b: 8.9, l: 6.4, r: 7.2, bottom: 0, top: 1.15, progress: 0, travel: 1.8 },
  seal: { a: 11.3, b: 12.5, l: 6.5, r: 6.8, bottom: 0, top: 1.1, disabled: false },
};
solids.push(friendPuzzles.boulder, friendPuzzles.seal);
// Short optional ruin passages give the stone actions a physical purpose.
for(const z of [6,7.6])box(8.3,0,z,1.3,1.5,.22,"#8c9786",true);
for(const x of [11.15,12.65])box(x,0,6.5,.25,1.4,1.4,"#929c89",true);
box(11.9,0,6.15,1.2,.4,.6,"#a2ac91",true);
for(const actor of townCharacters.filter(actor=>actor.scene==="outdoors"&&!actor.friend)){
  const [x,y,z]=actor.position;
  solids.push({a:x-.2,b:x+.2,l:z-.2,r:z+.2,bottom:y,top:y+1});
}
// East bank: old watchtower, garden and climbable ruins.
box(7.7, 0, -4.7, 2.05, 2.6, 2.05, "#879188", true);
box(7.7, 2.53, -4.7, 2.28, 0.18, 2.28, "#abb0a0", true);
for (let a of [-1, 1])
  for (let b of [-1, 1])
    box(
      7.7 + a * 0.86,
      2.7,
      -4.7 + b * 0.86,
      0.48,
      0.53,
      0.48,
      "#8f9a90",
      true,
    );
box(7.7, 0.03, -3.65, 0.62, 1.03, 0.075, "#614e3b");
box(7.7, 1.62, -3.65, 0.23, 0.55, 0.08, "#455b56");
box(7.7, 2.8, -4.7, 0.09, 1.24, 0.09, "#76603f");
box(8.04, 3.65, -4.7, 0.68, 0.4, 0.055, "#b97a51");
// The moss stair rises in deliberately jumpable increments.
ledge(5.5, 3.65, 1.6, 1.55, 0.4);
ledge(7.1, 3.65, 1.6, 1.55, 0.86);
ledge(8.7, 3.65, 1.6, 1.55, 1.3);
ledge(10.05, 4.8, 2.55, 2.25, 1.72);
ledge(11.9, 4.8, 1.28, 2.25, 1.16);
ledge(13.0, 4.8, 1.0, 2.25, 0.56);
// Ruined arch, shrine and small stone fragments on upper terrace.
for (let s of [-1, 1]) {
  box(10.0 + s * 0.66, 1.72, 5.05, 0.41, 0.92, 0.45, "#a1a896", true);
  box(10.0 + s * 0.66, 2.54, 5.05, 0.5, 0.15, 0.55, "#b2b5a0");
}
box(10.0, 2.63, 5.05, 1.75, 0.3, 0.52, "#a7ad99", true);
box(10, 2.93, 5.05, 0.49, 0.18, 0.55, "#b5b7a2");
box(10, 1.72, 4.15, 0.4, 0.19, 0.4, "#8a9c8a");
box(10, 1.91, 4.15, 0.22, 0.39, 0.22, "#78c7b4");
// A connected jump route climbs around the watchtower to its viewing deck.
// Each rise is below the standing jump apex; broad landings keep it forgiving.
export const towerSteps = [
  { x: 4.8, z: -7.6, w: 2.4, d: 1.8, top: 0.42 },
  { x: 5.25, z: -9.05, w: 2.5, d: 1.1, top: 0.86 },
  { x: 7.2, z: -9.05, w: 1.4, d: 1.2, top: 1.28 },
  { x: 8.7, z: -8.6, w: 1.35, d: 1.3, top: 1.7 },
  { x: 9.5, z: -6.85, w: 1.35, d: 1.5, top: 2.12 },
  { x: 9.5, z: -4.7, w: 1.3, d: 1.5, top: 2.55 },
];
for (const s of towerSteps) ledge(s.x, s.z, s.w, s.d, s.top);

lamp(5.1, -2.4);
lamp(4.6, 2.4);
lamp(9.7, 1.0);
// Trees, bushes, flowers, scattered stones. Hand-placed clear routes.
for (let [x, z, s] of [
  [-3.6, -6.2, 1.2],
  [-7.4, -6.8, 1.1],
  [-11.1, -7.1, 1.25],
  [-13.5, -4.8, 1.2],
  [-14, 1.4, 1],
  [-10, 7.2, 1.1],
  [-5.4, 7.7, 1.2],
  [-3.5, 5.5, 0.85],
  [-13.3, 8.7, 1.3],
  [-3.6, -9.4, 1.1],
  [3.9, -4.5, 1.1],
  [10.5, -5.6, 1.15],
  [13.3, -6.8, 1.2],
  [13.6, 1.8, 1.1],
  [4.1, 7.1, 1.25],
  [7.4, 7.7, 1.1],
  [10.5, 8.6, 1.2],
  [13.9, 8.5, 1.2],
  [3.9, 10.2, 1.15],
  [8.9, -10.4, 1.1],
  [12.7, -10, 1.2],
])
  tree(x, z, s);
for (let i = 0; i < 44; i++) {
  let s = rand() < 0.5 ? -1 : 1,
    x = s * (2.1 + rand() * 1.05),
    z = (rand() - 0.5) * 22;
  if (Math.abs(z) < 1.9) continue;
  rand() > 0.4
    ? bush(x, z, 0.65 + rand() * 0.45)
    : rock(x, z, 0.5 + rand() * 0.55);
}
for (let [x, z] of [
  [-3.6, 1.5],
  [-6.4, 2.4],
  [-10, 1.4],
  [-12, -1],
  [-4, -4.8],
  [3.6, 2.1],
  [5.7, 1.7],
  [7.7, 2.1],
  [12, 2.1],
  [9.8, -1],
  [4.1, -6.4],
])
  for (let i = 0; i < 9; i++)
    flower(
      x + (rand() - 0.5) * 0.65,
      z + (rand() - 0.5) * 0.75,
      ["#dbb45e", "#dd9d92", "#e5e0b3", "#a0a4ce"][i % 4],
    );
// Low perimeter stones make the edges of the map legible.
for (let s of [-1, 1])
  for (let i = 0; i < 12; i++) {
    rock(s * 15.2, -11 + i * 2, 1.1 + rand() * 0.7);
    rock(s * (2.7 + i * 1.05), s * 11.25, 0.8 + rand() * 0.6);
  }
// Blocky contact shading near large objects; drawn above grass, below path details.
for (let s of solids) {
  let w = s.b - s.a,
    d = s.r - s.l,
    h = s.top;
  if (
    s.bottom !== 0 ||
    h < 0.8 ||
    w > 4 ||
    d > 4 ||
    Math.min(Math.abs(s.a), Math.abs(s.b)) < 2.2
  )
    continue;
  let x = (s.a + s.b) / 2 - 0.13,
    z = (s.l + s.r) / 2 - 0.14;
  tile(x, z, w + 0.23, d + 0.23, "#6c854d", 0.006);
}
const outdoors = {
  vertices: new Float32Array(staticData),
  colliders: [...solids],
};
export let staticVerts = outdoors.vertices;
const roomScenes = new Map();
function interior(kind) {
  const saved = dest,
    savedSolids = solids.splice(0);
  dest = [];
  box(0, -0.18, 0, 6.4, 0.18, 6.4, "#6c513c", true);
  if(kind==="grocery") {
    // Authored oak boards follow the floor reference; their top stays flat.
    for(let row=0;row<18;row++){
      const z=-3+(row+.5)/3;
      for(let board=-1;board<7;board++){
        const left=Math.max(-3,-3+board+row%2*.5),right=Math.min(3,-2+board+row%2*.5);
        if(right<=left)continue;
        const x=(left+right)/2, width=right-left;
        tile(x,z,width-.012,.32,["#b98a50","#c2965a","#b1844d"][(row+board+3)%3],.003);
        if(width>.4)tile(x+.08,z+.065,width*.42,.012,"#a87945",.004);
      }
    }
  } else for (let x = -3; x < 3; x += 0.5)
    for (let z = -3; z < 3; z += 0.5)
      tile(
        x + 0.25,
        z + 0.25,
        0.49,
        0.49,
        kind === "potions"
          ? ((Math.round(x*2)+Math.round(z*2))%2 ? "#b1a6b5" : "#91869c")
          : kind === "grocery"
            ? "#b3a580"
            : "#b99c74",
        0.003,
      );
  // Cutaway walls leave the entire walking space visible from the game camera.
  for (const side of [-1, 1]) {
    box(side * 3.1, 0, 0, 0.2, 0.48, 6.2, "#dfcba6", true);
    box(0, 0, side * 3.1, 6.2, 0.48, 0.2, "#dfcba6", true);
  }
  if(kind==="grocery"||kind==="potions"){
    // Splat panels decorate the authored cutaway boundary; collision stays put.
    for(const x of [-2.4,-.8,.8,2.4])
      assetShape("shop-wall-panel",[x,0,-3.175],()=>{});
    for(const side of [-1,1])for(const z of [-1.6,1.6])
      assetShape("shop-wall-panel",[side*3.175,0,z],()=>{},side*Math.PI/2);
    for(const side of [-1,1]){
      box(side*3,.48,0,.055,.045,6.1,"#9c703d");
      box(0,.48,side*3,6.1,.045,.055,"#9c703d");
    }
  }
  tile(0, 2.65, 0.95, 0.65, "#7daca1", 0.012);
  tile(0, 0, 1.5, 1.4, kind === "potions" ? "#6d8c91" : "#96725b", 0.009);
  if (kind === "grocery") {
    for (const x of [-2, 2])
      assetShape("produce-shelf", [x, 0, -1.5], () => {
        box(x, 0, -1.5, 1.45, 1.4, 1.1, "#8d623c", true);
        for (const y of [0.55, 1.05])
          for (let k = 0; k < 3; k++)
            box(
              x - 0.35 + k * 0.35,
              y,
              -1.25,
              0.27,
              0.22,
              0.3,
              ["#be6248", "#83a05a", "#d5af65"][k],
            );
      });
    assetShape("grocery-counter", [-1.65, 0, 1], () => {
      box(-1.65, 0, 1, 1.62, 0.73, 1.2, "#8d6746", true);
    });
  } else if (kind === "potions") {
    assetShape("potion-workbench", [0, 0, -1.6], () => {
      box(0, 0, -1.6, 1.2, 0.8, 1.05, "#7b5741", true);
      box(0, 0.8, -1.6, 2.2, 0.09, 0.95, "#aa845e");
      for (const [x, c] of [
        [-0.75, "#78b5a4"],
        [0.75, "#bc98c1"],
      ]) {
        box(x, 0.89, -1.65, 0.22, 0.34, 0.22, c);
        box(x, 1.23, -1.65, 0.14, 0.1, 0.14, "#b38d59");
      }
      box(0, 0.89, -1.48, 0.5, 0.36, 0.45, "#424e50");
      tile(0, -1.48, 0.37, 0.3, "#84c7af", 1.25);
    });
    assetShape("apothecary-cabinet", [-2.35, 0, -1.8], () => {
      box(-2.35, 0, -1.8, 1.02, 1.4, 0.98, "#8b694c", true);
    }, Math.PI / 2);
  } else {
    box(-2, 0, -0.5, 1.05, 0.4, 1.8, "#816145", true);
    box(-2, 0.4, -0.5, 1.08, 0.12, 1.8, "#cfbd9c");
    box(-2, 0.52, -0.2, 1.1, 0.08, 1.15, "#6d9591");
    assetShape("cottage-table", [1.25, 0, 0.25], () => {
      for (const x of [0.85, 1.65])
        for (const z of [-0.15, 0.65]) box(x, 0, z, 0.1, 0.6, 0.1, "#7c5639");
      box(1.25, 0.6, 0.25, 0.76, 0.08, 0.76, "#ac8253", true);
    });
    assetShape("cottage-hearth", [0, 0, -2.5], () => {
      box(0, 0, -2.5, 1.3, 1.55, 1.0, "#90998b", true);
      box(0, 0.1, -2.14, 0.65, 0.65, 0.025, "#453d35");
      box(0, 0.13, -2.1, 0.42, 0.15, 0.08, "#d99b51");
    });
  }
  for (const actor of townCharacters.filter((actor) => actor.scene === kind)) {
    const [x, y, z] = actor.position;
    solids.push({ a: x - 0.2, b: x + 0.2, l: z - 0.2, r: z + 0.2, bottom: y, top: y + 1 });
  }
  const result = {
    vertices: new Float32Array(dest),
    colliders: solids.splice(0),
  };
  solids.push(...savedSolids);
  dest = saved;
  return result;
}
roomScenes.set("cottage", interior("cottage"));
roomScenes.set("grocery", interior("grocery"));
roomScenes.set("potions", interior("potions"));
export function selectWorld(id) {
  const scene = id === "outdoors" ? outdoors : roomScenes.get(id);
  solids.splice(0, solids.length, ...scene.colliders);
  staticVerts = scene.vertices;
  return staticVerts;
}
export { solids, color, tri, tile, box, dynamicData };
export function effectGeometry(draw) {
  dynamicData.length = 0;
  dest = dynamicData;
  draw();
  dest = staticData;
  return new Float32Array(dynamicData);
}
