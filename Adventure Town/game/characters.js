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

export function modelForCharacter(id) {
  return npcModels.get(id);
}

export function characterGeometry(model, clip, time, position, angle, scale, vertices, offset=0, feet=false) {
  const posed=poseCharacter(model,clip,time % model.clips[clip].duration);
  const co=Math.cos(angle),si=Math.sin(angle);
  let lowest=0;
  if(feet){lowest=Infinity;for(let i=1;i<posed.positions.length;i+=3)lowest=Math.min(lowest,posed.positions[i]);}
  const lit=new Float32Array(model.positions.length);
  for(let i=0;i<model.positions.length/3;i++){
    const k=i*3,nx=posed.normals[k],ny=posed.normals[k+1],nz=posed.normals[k+2];
    const shade=.71+.38*Math.max(0,((co*nx+si*nz)*npcLight[0]+ny*npcLight[1]+(-si*nx+co*nz)*npcLight[2])/Math.hypot(nx,ny,nz));
    for(let c=0;c<3;c++)lit[k+c]=npcSrgb(model.colors[i*4+c]/255*shade);
  }
  for(const index of model.indices){
    const k=index*3,x=posed.positions[k],z=posed.positions[k+2];
    vertices[offset]=position[0]+scale*(co*x+si*z);
    vertices[offset+1]=position[1]+scale*(posed.positions[k+1]-lowest);
    vertices[offset+2]=position[2]+scale*(-si*x+co*z);
    for(let c=0;c<3;c++)vertices[offset+3+c]=lit[k+c];
    offset+=6;
  }
  return offset;
}

export function activeCharacters(scene) {
  return townCharacters.filter((actor) => actor.scene === scene);
}

export function npcGeometry(scene, time, friends=[]) {
  // Slow idle motion needs only 10 Hz skinning. Reuse draw storage between updates.
  const frame = Math.floor(time * 10);
  if (scene === npcScene && frame === npcFrame) return npcPacked;
  const actors = activeCharacters(scene).filter(actor=>!friends.find(friend=>friend.id===actor.id)?.captured);
  const count = actors.reduce(
    (sum, actor) => sum + npcModels.get(actor.id).indices.length * 6,
    0,
  );
  if (npcPacked.length !== count) npcPacked = new Float32Array(count);
  let offset = 0;
  for (const actor of actors) {
    const model = npcModels.get(actor.id);
    const friend=friends.find(friend=>friend.id===actor.id);
    offset=characterGeometry(model,friend?.clip??"Idle",friend?.time??time,
      friend?[friend.x,friend.y,friend.z]:actor.position,friend?.angle??actor.angle,
      actor.scale??1,npcPacked,offset);
  }
  npcScene = scene;
  npcFrame = frame;
  return npcPacked;
}
