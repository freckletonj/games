import { townCharacters } from "./town-characters.js";

export const creatureForms = Object.fromEntries(
  townCharacters.filter(actor => actor.friend).map(actor => [actor.id, actor]),
);
export const friends = Object.values(creatureForms).map(actor => ({
  id: actor.id, x: actor.position[0], y: actor.position[1], z: actor.position[2],
  angle: actor.angle, trust: 0, friendship: 0, hearts: 0, captured: 0,
  lure: null, clip: "Idle", time: 0,
}));

export function offerBerry(friend, point) {
  if (friend.lure || friend.captured) return false;
  friend.lure = { ...point };
  return true;
}

export function stepFriends(dt, walkable) {
  const events = [];
  for (const friend of friends) {
    const definition = creatureForms[friend.id];
    friend.hearts = Math.max(0, friend.hearts-dt);
    friend.friendship = Math.max(0, friend.friendship-dt);
    if (!friend.friendship && friend.trust === 100) friend.trust = 0;
    if (friend.captured > 0) {
      friend.captured = Math.max(0, friend.captured-dt);
      if (!friend.captured) {
        [friend.x, friend.y, friend.z] = definition.position;
        friend.angle = definition.angle;
      }
      continue;
    }
    friend.clip = "Idle";
    if (friend.lure) {
      const dx=friend.lure.x-friend.x, dz=friend.lure.z-friend.z;
      const distance=Math.hypot(dx,dz), amount=Math.min(distance,.65*dt);
      if (distance < .12) {
        friend.lure = null;
        friend.trust = Math.min(100, friend.trust+60);
        friend.hearts = 2;
        if (friend.trust === 100) friend.friendship = 12;
        events.push({ id: friend.id, ready: friend.trust === 100 });
      } else {
        const next={x:friend.x+dx/distance*amount,y:friend.y,z:friend.z+dz/distance*amount};
        if (walkable(friend,next,definition)) {
          Object.assign(friend,next);
          friend.angle = Math.atan2(dx,dz);
          friend.clip = "Walk";
        } else friend.lure = null;
      }
    }
    friend.time += dt;
  }
  return events;
}

export function catchFriend(friend) {
  if (friend.captured || friend.friendship <= 0) return null;
  friend.captured = 17;
  friend.trust = friend.friendship = 0;
  friend.lure = null;
  return friend.id;
}
