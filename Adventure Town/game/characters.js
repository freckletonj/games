import { characterModel, poseCharacter, norm } from "./model.js";
import { townCharacters } from "./town-characters.js";

// BEGIN_CHARACTERS_LOAD
const npcModels = new Map(
  await Promise.all(
    townCharacters.map(async (actor) => {
      const response = await fetch(
        new URL("../" + actor.runtime, import.meta.url),
      );
      if (!response.ok)
        throw Error(`Character ${actor.id} failed to load: ${response.status}`);
      return [
        actor.id,
        characterModel(new Uint8Array(await response.arrayBuffer())),
      ];
    }),
  ),
);
// END_CHARACTERS_LOAD

const npcLight = norm([0.6, 1, 0.75]);
const npcSrgb = (x) =>
  Math.min(1, x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
let npcScene,
  npcFrame,
  npcPacked = new Float32Array();

export function activeCharacters(scene) {
  return townCharacters.filter((actor) => actor.scene === scene);
}

export function npcGeometry(scene, time) {
  // Slow idle motion needs only 10 Hz skinning. Reuse draw storage between updates.
  const frame = Math.floor(time * 10);
  if (scene === npcScene && frame === npcFrame) return npcPacked;
  const actors = activeCharacters(scene);
  const count = actors.reduce(
    (sum, actor) => sum + npcModels.get(actor.id).indices.length * 6,
    0,
  );
  if (npcPacked.length !== count) npcPacked = new Float32Array(count);
  let offset = 0;
  for (const actor of actors) {
    const model = npcModels.get(actor.id);
    const posed = poseCharacter(
      model,
      "Idle",
      time % model.clips.Idle.duration,
    );
    const co = Math.cos(actor.angle),
      si = Math.sin(actor.angle);
    const lit = new Float32Array(model.positions.length);
    for (let i = 0; i < model.positions.length / 3; i++) {
      const k = i * 3,
        nx = posed.normals[k],
        ny = posed.normals[k + 1],
        nz = posed.normals[k + 2];
      const shade =
        0.71 +
        0.38 *
          Math.max(
            0,
            ((co * nx + si * nz) * npcLight[0] +
              ny * npcLight[1] +
              (-si * nx + co * nz) * npcLight[2]) /
              Math.hypot(nx, ny, nz),
          );
      for (let c = 0; c < 3; c++)
        lit[k + c] = npcSrgb((model.colors[i * 4 + c] / 255) * shade);
    }
    for (const index of model.indices) {
      const k = index * 3,
        x = posed.positions[k],
        z = posed.positions[k + 2];
      npcPacked[offset] = actor.position[0] + co * x + si * z;
      npcPacked[offset + 1] = actor.position[1] + posed.positions[k + 1];
      npcPacked[offset + 2] = actor.position[2] - si * x + co * z;
      for (let c = 0; c < 3; c++) npcPacked[offset + 3 + c] = lit[k + c];
      offset += 6;
    }
  }
  npcScene = scene;
  npcFrame = frame;
  return npcPacked;
}
