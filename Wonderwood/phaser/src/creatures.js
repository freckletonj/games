// Shared deterministic rules for the nonviolent creature-friendship loop.
// An animal can be caught only during the 12-second distracted window.
export const DISTRACTION_SECONDS=12;
export const RESPAWN_SECONDS=17;

export function feedTrust(current, favorite, food) {
  return Math.min(100,current+(favorite===food?60:36));
}
export function tickDistraction(trust, seconds, delta) {
  const remaining=Math.max(0,seconds-delta);
  return {trust:remaining===0&&trust>=100?0:trust,seconds:remaining};
}
