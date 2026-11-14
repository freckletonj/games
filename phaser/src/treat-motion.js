// Treats follow a short, readable arc on the same fixed clock as creatures.
// The gameplay target is the authored landing position, not a tween callback.
export const TREAT_FLIGHT_TICKS=34;
export const TREAT_ARC_HEIGHT=48;

export function advanceTreatFlight(lure,step=1){
  lure.age=Math.min(TREAT_FLIGHT_TICKS,(lure.age||0)+step);
  const fraction=lure.age/TREAT_FLIGHT_TICKS;
  if(fraction>=1)lure.landed=true;
  return {
    x:lure.startX+(lure.x-lure.startX)*fraction,
    y:lure.startY+(lure.y-lure.startY)*fraction-
      TREAT_ARC_HEIGHT*Math.sin(Math.PI*fraction),
    rotation:lure.landed?0:lure.face*5*fraction,
    landed:lure.landed
  };
}
