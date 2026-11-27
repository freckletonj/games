import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Exercise the source loaders and all real rigs without a browser or network.
globalThis.location = { search: "" };
globalThis.fetch = async (url) => ({
  ok: true,
  arrayBuffer: async () => {
    const bytes = readFileSync(url);
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
  },
});
const { characterModel, poseCharacter } = await import("../game/model.js");
const { activeCharacters, npcGeometry } = await import("../game/characters.js");
const { townCharacters } = await import("../game/town-characters.js");

for (const actor of townCharacters) {
  const model = characterModel(
    new Uint8Array(
      readFileSync(new URL("../" + actor.runtime, import.meta.url)),
    ),
  );
  assert.deepEqual(Object.keys(model.clips).sort(), [
    "Idle",
    "Jump",
    "Run",
    "Walk",
  ]);
  const rig = JSON.parse(
    readFileSync(
      new URL("../assets/" + actor.id + "/rig.json", import.meta.url),
    ),
  );
  const edges = [];
  for (let i = 0; i < model.indices.length; i += 3) {
    const triangle = Array.from(model.indices.slice(i, i + 3));
    for (let k = 0; k < 3; k++) {
      const a = triangle[k] * 3,
        b = triangle[(k + 1) % 3] * 3;
      const length = Math.hypot(
        ...[0, 1, 2].map(
          (c) => model.positions[a + c] - model.positions[b + c],
        ),
      );
      edges.push([a, b, length]);
    }
  }
  let worstStretch = 0;
  const legJoints = (sign) =>
    rig.joints
      .map((joint, i) =>
        joint.name.endsWith(sign < 0 ? ".R" : ".L") &&
        /Thigh|Shin|Foot/.test(joint.name)
          ? i
          : -1,
      )
      .filter((i) => i >= 0);
  // A stride may never pull a vertex through the opposite leg's skeleton.
  for (let i = 0; i < model.positions.length / 3; i++) {
    const x = model.positions[i * 3],
      y = model.positions[i * 3 + 1];
    if (y >= rig.regions.leg_y || x === 0) continue;
    for (let a = 0; a < 4; a++)
      if (legJoints(Math.sign(x)).includes(model.joints[i * 4 + a]))
        assert.equal(model.weights[i * 4 + a], 0, "opposite-leg weight");
  }
  for (const [clip, definition] of Object.entries(model.clips)) {
    const start = Array.from(poseCharacter(model, clip, 0).positions);
    let movement = 0;
    for (let key = 0; key <= 48; key++) {
      const posed = poseCharacter(
        model,
        clip,
        (definition.duration * key) / 48,
      );
      assert.ok(posed.positions.every(Number.isFinite));
      assert.ok(posed.normals.every(Number.isFinite));
      if (key % 6 === 0)
        for (const [a, b, length] of edges) {
          const deformed = Math.hypot(
            ...[0, 1, 2].map(
              (c) => posed.positions[a + c] - posed.positions[b + c],
            ),
          );
          worstStretch = Math.max(worstStretch, deformed / length);
        }
      for (let i = 0; i < start.length; i++)
        movement = Math.max(movement, Math.abs(posed.positions[i] - start[i]));
      if (key === 48)
        assert.ok(
          posed.positions.every((v, i) => Math.abs(v - start[i]) < 1e-5),
          "clip loop closure",
        );
    }
    assert.ok(
      movement > (clip === "Idle" ? 0.001 : 0.03),
      clip + " must deform the real mesh",
    );
  }
  console.log(
    actor.id + " maximum sampled edge stretch: " + worstStretch.toFixed(3),
  );
  assert.ok(worstStretch < 3, "rig must not stretch voxel faces into spikes");
}
assert.deepEqual(activeCharacters("outdoors"), []);
assert.equal(npcGeometry("outdoors", 0).length, 0);
for (const scene of ["grocery", "potions"]) {
  assert.equal(activeCharacters(scene).length, 1);
  const first = npcGeometry(scene, 0);
  assert.ok(first.length > 0 && first.every(Number.isFinite));
  assert.strictEqual(
    first,
    npcGeometry(scene, 0.05),
    "reuse idle draw data between 10 Hz ticks",
  );
  const original = Array.from(first);
  const later = npcGeometry(scene, 0.5);
  assert.strictEqual(later, first, "reuse draw storage");
  assert.ok(
    later.some((v, i) => Math.abs(v - original[i]) > 1e-5),
    "idle pose advances",
  );
}
assert.equal(npcGeometry("cottage", 0).length, 0);
console.log(
  "Character checks passed: independent real rigs, complete clip cycles, finite skinning, same-side leg weights, idle animation, scene selection and draw-buffer reuse.",
);
