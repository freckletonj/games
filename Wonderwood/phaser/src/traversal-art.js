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

export const WIND_FRAME={width:192,height:576};

export function makeWindSprite(scene,x,y,width,height,depth){
  return scene.add.image(x,y,'wind-column',0).setDisplaySize(width,height)
    .setDepth(depth);
}

export function makeThermals(scene,volumes,tile){
  return volumes.flatMap(({x,y,width,height})=>{
    const w=width*tile,h=height*tile;
    const count=Math.max(1,Math.ceil(w/58));
    return Array.from({length:count},(_,index)=>makeWindSprite(scene,
      x*tile+(index+.5)*w/count,y*tile+h/2,w/count*1.1,h,-21));
  });
}

export function animateWind(visual,time){
  const phase=time+visual.x*.016;
  visual.setFrame(Math.floor(phase*7)%4)
    .setAlpha(.68+.16*Math.sin(phase*4));
}
