const MIN_ZOOM_RATIO=.74;
const STRAGGLER_TICKS=18;

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function partyFraming(lead,partner,width,height,defaultZoom,lookUp){
  const minZoom=defaultZoom*MIN_ZOOM_RATIO;
  const fit=partner?Math.min(
    width/(Math.abs(lead.x-partner.x)+140),
    height/(Math.abs(lead.y-partner.y)+128)
  ):defaultZoom;
  return {
    x:partner?(lead.x+partner.x)/2:lead.x,
    y:(partner?(lead.y+partner.y)/2:lead.y)-lookUp,
    zoom:clamp(fit,minZoom,defaultZoom),
    beyond:fit<minZoom
  };
}

export function stragglerReady(partner,beyond){
  partner.bubbleDelay=beyond?partner.bubbleDelay+1:0;
  return partner.bubbleDelay>=STRAGGLER_TICKS;
}

export function driftBubble(player,target,time){
  const bubble=player.bubble;
  const dx=target.x-player.x+6*Math.sin(time*2.1);
  const dy=target.y-player.y+5*Math.sin(time*3.5);
  const speed=Math.min(.065,6/Math.max(1,Math.hypot(dx,dy)));
  bubble.vx+=(dx*speed-bubble.vx)*.14;
  bubble.vy+=(dy*speed-bubble.vy)*.14;
  player.x+=bubble.vx;
  player.y+=bubble.vy;
}
