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

function deckAt(platform,x){
  return Math.abs(x-platform.position[0])<=platform.size[0]/2;
}

// Cross the top in the moving frame. An ascending deck can catch a falling
// explorer, and explorers jumping up through the deck pass through it.
export function movingLanding(platforms,rider,fromX,fromY,toX,toY){
  let landing=null;
  for(const deck of platforms){
    const [x,y]=deck.position;
    if(rider===deck.id&&deckAt(deck,toX)){
      if(!landing||y<landing.position[1])landing=deck;
      continue;
    }
    const [previousX,previousY]=deck.previous;
    const above=fromY-previousY,below=toY-y;
    if(below<0||above>0||below<=above||toY<fromY)continue;
    const t=-above/(below-above);
    const crossingX=fromX+(toX-fromX)*t;
    const deckX=previousX+(x-previousX)*t;
    if(Math.abs(crossingX-deckX)<=deck.size[0]/2&&deckAt(deck,toX)&&
      (!landing||y<landing.position[1]))landing=deck;
  }
  return landing;
}
