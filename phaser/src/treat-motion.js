import {deckTopAt,movingLanding} from './moving-platforms.js';

// Treats follow a short, readable arc on the same fixed clock as creatures.
export const TREAT_FLIGHT_TICKS=34;
export const TREAT_ARC_HEIGHT=48;

export function treatLanding(from,to,segments,decks,groundAt,tile){
  if(to.y<=from.y)return null;
  const atY=y=>from.x+(to.x-from.x)*(y-from.y)/(to.y-from.y);
  let landing=null;
  const floor=groundAt(to.x);
  if(from.y<=groundAt(from.x)&&to.y>=floor)landing={x:to.x,y:floor};
  for(const segment of segments){
    if(segment.kind!=='platform')continue;
    const y=segment.y*tile;
    if(y<from.y||y>to.y||(landing&&y>=landing.y))continue;
    const x=atY(y);
    if(x>=segment.x*tile&&x<=(segment.x+segment.length)*tile)landing={x,y};
  }
  const deck=movingLanding(decks,null,from.x,from.y,to.x,to.y);
  if(deck){
    const y=deckTopAt(deck,to.x);
    if(!landing||y<landing.y)landing={x:to.x,y,deck};
  }
  return landing;
}

export function advanceTreatFlight(lure,step=1,findLanding){
  const poseAt=fraction=>({
    x:lure.startX+(lure.x-lure.startX)*fraction,
    y:lure.startY+(lure.y-lure.startY)*(lure.drop?fraction**2:fraction)-
      (lure.drop?0:TREAT_ARC_HEIGHT*Math.sin(Math.PI*fraction))
  });
  const from=poseAt((lure.age||0)/TREAT_FLIGHT_TICKS);
  lure.age=Math.min(TREAT_FLIGHT_TICKS,(lure.age||0)+step);
  const fraction=lure.age/TREAT_FLIGHT_TICKS;
  const to=poseAt(fraction);
  const hit=findLanding?.(from,to);
  if(hit)Object.assign(lure,hit);
  lure.landed=Boolean(hit)||fraction>=1;
  return {
    x:lure.landed?lure.x:to.x,
    y:lure.landed?lure.y:to.y,
    rotation:lure.landed?0:lure.face*5*fraction,
    landed:lure.landed
  };
}
