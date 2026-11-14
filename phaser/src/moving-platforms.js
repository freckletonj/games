// Layout positions use the center of the deck's walkable top, in world pixels.
export function platformPosition({home,motion},seconds){
  const turn=2*Math.PI*seconds/motion.seconds;
  const [x,y]=home;
  switch(motion.kind){
    case 'horizontal':return [x+(motion.to-x)*(1-Math.cos(turn))/2,y];
    case 'vertical':return [x,y+(motion.to-y)*(1-Math.cos(turn))/2];
    case 'orbit':return [
      motion.pivotX+(x-motion.pivotX)*Math.cos(turn),
      y-motion.radiusY*Math.sin(turn)
    ];
  }
}

export function stepPlatforms(platforms,seconds){
  for(const platform of platforms){
    const [x,y]=platformPosition(platform,seconds);
    platform.previous=platform.position;
    platform.position=[x,y];
    platform.visual?.setPosition(x,y);
  }
}

export function deckTopAt(platform,x,position=platform.position){
  const [center,top]=position;
  const offset=x-center;
  if(platform.kind==='gear'){
    const radius=platform.size[1]/2;
    if(Math.abs(offset)>Math.min(platform.treadWidth/2,radius))return null;
    return top+radius-Math.sqrt(radius**2-offset**2);
  }
  return Math.abs(offset)<=platform.size[0]/2?top:null;
}

// Cross the top in the moving frame. An ascending deck can catch a falling
// explorer, and explorers jumping up through the deck pass through it.
export function movingLanding(platforms,rider,fromX,fromY,toX,toY){
  let landing=null,landingY=Infinity;
  for(const deck of platforms){
    const y=deckTopAt(deck,toX);
    if(y===null||y>=landingY)continue;
    const walkingOntoDeck=(deck.kind==='conveyor'||deck.kind==='puzzle-bridge')&&
      fromY===y&&toY>=y;
    if(rider!==deck.id&&!walkingOntoDeck){
      const [x]=deck.position;
      const [previousX,previousY]=deck.previous;
      const oldTop=deckTopAt(deck,fromX,deck.previous);
      const previousTop=oldTop??(y-deck.position[1]+previousY);
      const above=fromY-previousTop,below=toY-y;
      if(below<0||above>0||below<=above||toY<fromY)continue;
      const t=-above/(below-above);
      const crossingX=fromX+(toX-fromX)*t;
      const center=previousX+(x-previousX)*t;
      if(deckTopAt(deck,crossingX,[center,y])===null)continue;
    }
    landing=deck;landingY=y;
  }
  return landing;
}
