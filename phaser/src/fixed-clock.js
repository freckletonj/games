// Gameplay runs at a fixed 60 Hz, independent of the display's refresh
// rate. Catch-up is bounded so a suspended tab cannot simulate minutes of
// physics in one frame. All time-based game mechanics advance on these ticks.
export const TICK_MS=1000/60;
export const MAX_TICKS_PER_FRAME=4;

export function simulationTicks(pendingMs,deltaMs){
  const elapsed=Math.min(MAX_TICKS_PER_FRAME*TICK_MS,
    Math.max(0,pendingMs)+Math.max(0,deltaMs));
  const ticks=Math.min(MAX_TICKS_PER_FRAME,
    Math.floor((elapsed+1e-8)/TICK_MS));
  const remaining=ticks===MAX_TICKS_PER_FRAME?0:elapsed-ticks*TICK_MS;
  return {ticks,remaining};
}

// Browser input can arrive on a 120 Hz frame without a physics tick.
// Latch button edges until the next tick; do not repeat them during catch-up.
export function queueInputEdges(previous,current){
  const actions={...current};
  for(const key of Object.keys(actions))
    if(key.endsWith('Pressed'))
      actions[key]=Boolean(current[key]||previous[key]);
  return actions;
}
export function withoutInputEdges(actions){
  const next={...actions};
  for(const key of Object.keys(next))
    if(key.endsWith('Pressed'))next[key]=false;
  return next;
}
