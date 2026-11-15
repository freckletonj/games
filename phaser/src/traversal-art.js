// Fixed-clock sprite animation for the painted traversal effects.
export const VENT_BUBBLE_FRAME=192;
const VENT_BUBBLES=[{size:18,drift:-10},{size:28,drift:8},{size:20,drift:3},{size:25,drift:-6}];

export function makeVentBubbles(scene,x,y,surface){
  return {
    top:Math.max(surface,y-110),
    bubbles:VENT_BUBBLES.map(({size,drift},index)=>({
      drift,index,visual:scene.add.image(x,y,'vent-bubbles',0)
        .setDisplaySize(size,size).setDepth(4)
    }))
  };
}

export function ventBubblePose(time,index){
  const phase=(time*.62+index*.25)%1;
  const rise=Math.min(1,phase/.88);
  const frame=phase<.88?Math.floor(time*9+index)%4:
    Math.min(7,4+Math.floor((phase-.88)/.03));
  const alpha=Math.min(1,phase/.14);
  return {rise,frame,alpha};
}

export function animateVentBubbles(piece,time){
  for(const {drift,index,visual} of piece.bubbles){
    const {rise,frame,alpha}=ventBubblePose(time+piece.x*.013,index);
    visual.setPosition(piece.x+drift+4*Math.sin(rise*5+index),
      piece.y+(piece.top-piece.y)*rise)
      .setFrame(frame).setAlpha(alpha*.85);
  }
}
