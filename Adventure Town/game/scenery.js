import { readGlb } from "./glb.js";
import { townAssets } from "./town-assets.js";
// BEGIN_SCENERY_LOAD
const sceneryMeshes = new Map();
const sceneryQuery = new URLSearchParams(location.search);
for (const asset of townAssets) {
  const path =
    sceneryQuery.get("scenery") === asset.id
      ? sceneryQuery.get("candidate")
      : asset.runtime;
  if (path === null) continue;
  const result = await fetch(new URL("../" + path, import.meta.url));
  if (!result.ok)
    throw Error(`Scenery ${asset.id} failed to load: ${result.status}`);
  sceneryMeshes.set(
    asset.id,
    readGlb(new Uint8Array(await result.arrayBuffer())),
  );
}
// END_SCENERY_LOAD
export function sceneryGeometry(id, position, angle = 0, scale = 1) {
  if (!sceneryMeshes.has(id)) return null; // Explicitly unconverted slot; its authored placeholder remains.
  const { document: doc, accessor } = sceneryMeshes.get(id);
  if (doc.skins) throw Error("Town scenery must be a static GLB");
  const primitive = doc.meshes[0].primitives[0],
    attributes = primitive.attributes;
  const p = accessor(attributes.POSITION),
    n = accessor(attributes.NORMAL),
    c = accessor(attributes.COLOR_0),
    indices = accessor(primitive.indices);
  const vertices = new Float32Array(indices.length * 6),
    co = Math.cos(angle),
    si = Math.sin(angle);
  const linearToSrgb = (x) =>
    Math.min(1, x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
  for (let i = 0; i < indices.length; i++) {
    const k = indices[i],
      v = k * 3,
      o = i * 6;
    vertices[o] = position[0] + scale * (co * p[v] + si * p[v + 2]);
    vertices[o + 1] = position[1] + scale * p[v + 1];
    vertices[o + 2] = position[2] + scale * (-si * p[v] + co * p[v + 2]);
    const nx = co * n[v] + si * n[v + 2],
      ny = n[v + 1],
      nz = -si * n[v] + co * n[v + 2];
    const shade =
      0.71 +
      0.38 *
        Math.max(0, (nx * 0.6 + ny + nz * 0.75) / Math.hypot(0.6, 1, 0.75));
    for (let channel = 0; channel < 3; channel++)
      vertices[o + 3 + channel] = linearToSrgb(
        (c[k * 4 + channel] / 255) * shade,
      );
  }
  return vertices;
}
export function activeSceneryIds() {
  return [...sceneryMeshes.keys()];
}
