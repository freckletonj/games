// This reader intentionally supports our documented GLB subset; it is not a general glTF loader.
// BEGIN_MODEL_LOAD
const defaultModelPath = "assets/emberbrook-adventurer/runtime/asset.glb";
const modelPath =
  new URLSearchParams(location.search).get("model") ?? defaultModelPath;
const response = await fetch(new URL("../" + modelPath, import.meta.url));
if (!response.ok) throw Error(`Model failed to load: ${response.status}`);
const bytes = new Uint8Array(await response.arrayBuffer());
// END_MODEL_LOAD
const dv = new DataView(bytes.buffer);
if (dv.getUint32(0, true) !== 0x46546c67 || dv.getUint32(4, true) !== 2)
  throw Error("Expected a glTF 2.0 GLB");
const jsonLen = dv.getUint32(12, true);
const doc = JSON.parse(new TextDecoder().decode(bytes.slice(20, 20 + jsonLen)));
const bin = 28 + jsonLen;
const accessor = (i) => {
  const a = doc.accessors[i],
    v = doc.bufferViews[a.bufferView];
  const n = { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const C = {
    5126: Float32Array,
    5123: Uint16Array,
    5121: Uint8Array,
    5125: Uint32Array,
  }[a.componentType];
  return new C(
    bytes.buffer,
    bin + (v.byteOffset || 0) + (a.byteOffset || 0),
    a.count * n,
  );
};
const prim = doc.meshes[0].primitives[0],
  atts = prim.attributes;
const positions = accessor(atts.POSITION),
  normals = accessor(atts.NORMAL),
  colors = accessor(atts.COLOR_0),
  joints = accessor(atts.JOINTS_0),
  weights = accessor(atts.WEIGHTS_0),
  indices = accessor(prim.indices);
const parents = Array(doc.skins[0].joints.length).fill(-1);
doc.nodes
  .slice(0, doc.skins[0].joints.length)
  .forEach((n, i) => (n.children || []).forEach((c) => (parents[c] = i)));
const bind = accessor(doc.skins[0].inverseBindMatrices);
const clips = Object.fromEntries(
  doc.animations.map((a) => {
    let tracks = a.channels.map((c) => {
      let s = a.samplers[c.sampler];
      return {
        node: c.target.node,
        path: c.target.path,
        t: accessor(s.input),
        v: accessor(s.output),
      };
    });
    return [a.name, { tracks, duration: tracks[0].t.at(-1) }];
  }),
);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
  norm = (a) => {
    let l = Math.hypot(...a);
    return a.map((v) => v / l);
  };
function mul(a, b) {
  let r = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let i = 0; i < 4; i++)
      for (let k = 0; k < 4; k++) r[c * 4 + i] += a[k * 4 + i] * b[c * 4 + k];
  return r;
}
function mat(q, t) {
  let [x, y, z, w] = q;
  return new Float32Array([
    1 - 2 * (y * y + z * z),
    2 * (x * y + z * w),
    2 * (x * z - y * w),
    0,
    2 * (x * y - z * w),
    1 - 2 * (x * x + z * z),
    2 * (y * z + x * w),
    0,
    2 * (x * z + y * w),
    2 * (y * z - x * w),
    1 - 2 * (x * x + y * y),
    0,
    ...t,
    1,
  ]);
}
function sample(track, time) {
  let count = track.t.length,
    k = Math.min(count - 2, Math.floor((time / track.t.at(-1)) * (count - 1))),
    u = (time - track.t[k]) / (track.t[k + 1] - track.t[k]),
    dim = track.path === "rotation" ? 4 : 3;
  let a = Array.from(track.v.slice(k * dim, k * dim + dim)),
    b = Array.from(track.v.slice((k + 1) * dim, (k + 2) * dim));
  if (dim === 4 && dot(a, b) < 0) b = b.map((x) => -x);
  if (dim === 4) {
    let d = Math.min(1, Math.max(-1, dot(a, b)));
    if (d < 0.9995) {
      let th = Math.acos(d),
        s = Math.sin(th);
      return a.map(
        (x, i) => (Math.sin((1 - u) * th) * x + Math.sin(u * th) * b[i]) / s,
      );
    }
  }
  let v = a.map((x, i) => x + (b[i] - x) * u);
  return dim === 4 ? norm(v) : v;
}
function skeleton(name, time) {
  let ts = doc.nodes.slice(0, 15).map((n) => n.translation),
    qs = ts.map(() => [0, 0, 0, 1]);
  for (let tr of clips[name].tracks) {
    (tr.path === "rotation" ? qs : ts)[tr.node] = sample(tr, time);
  }
  let g = [],
    bones = new Float32Array(parents.length * 16);
  for (let i = 0; i < parents.length; i++) {
    let m = mat(qs[i], ts[i]);
    g[i] = parents[i] < 0 ? m : mul(g[parents[i]], m);
    bones.set(mul(g[i], bind.slice(i * 16, i * 16 + 16)), i * 16);
  }
  return { g, bones };
}

export {
  positions,
  normals,
  colors,
  joints,
  weights,
  indices,
  clips,
  skeleton,
  norm,
};
