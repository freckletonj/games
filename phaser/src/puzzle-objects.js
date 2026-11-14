// Positions use the horizontal center and bottom of each painted object.
export function createPuzzleObjects(specs){
  return specs.map(spec=>({
    ...spec,x:spec.home[0],bottom:spec.home[1],state:'ready',time:0
  }));
}

const left=object=>object.x-object.size[0]/2;
const right=object=>object.x+object.size[0]/2;
const top=object=>object.bottom-object.size[1];

export function pushBoulder(objects,player,actions){
  if(player.form!=='gravelback'||!player.grounded||!actions.right)return;
  const boulder=objects.find(object=>object.kind==='push-boulder'&&
    object.state==='ready'&&player.x<=left(object)&&
    left(object)-player.x<13&&Math.abs(player.y-object.bottom)<12);
  if(!boulder)return;
  boulder.x=Math.min(boulder.dropX,boulder.x+1.15);
  if(boulder.x===boulder.dropX)boulder.state='dropping';
}

export function blockPuzzleX(objects,fromX,toX,feet){
  let x=toX;
  for(const object of objects){
    if(object.state!=='ready'||object.kind==='gust-boulder'||
      feet<=top(object)||feet-27>=object.bottom)continue;
    const near=left(object)-10,far=right(object)+10;
    if(fromX<=near&&x>near)x=near;
    if(fromX>=far&&x<far)x=far;
  }
  return x;
}

export function gustBoulder(objects,shot,fromX){
  if(shot.kind!=='skyling'||shot.vx<=0)return null;
  const boulder=objects.find(object=>object.kind==='gust-boulder'&&
    object.state==='ready'&&fromX<=right(object)&&shot.x>=left(object)&&
    shot.y>=top(object)&&shot.y<=object.bottom);
  if(boulder)boulder.state='dropping';
  return boulder;
}

export function punchWall(objects,player){
  if(player.form!=='flintfist')return null;
  const fist=player.x+player.face*34;
  const wall=objects.find(object=>object.kind==='breakable-wall'&&
    object.state==='ready'&&Math.max(fist,player.x)>=left(object)&&
    Math.min(fist,player.x)<=right(object)&&
    player.y-18>top(object)&&player.y-18<object.bottom);
  if(wall)wall.state='broken';
  return wall;
}

export function stepPuzzleObjects(objects,decks){
  const settled=[];
  for(const object of objects){
    if(object.state!=='dropping')continue;
    const duration=object.kind==='gust-boulder'?74:34;
    const progress=Math.min(1,++object.time/duration);
    const [x,y]=object.platform;
    const start=object.dropX??object.home[0];
    object.x=start+(x-start)*progress;
    object.bottom=object.home[1]+(y+object.size[1]-object.home[1])*progress**2;
    if(progress<1)continue;
    object.state='settled';
    // Register the new foothold only once the boulder has come to rest.
    decks.push({id:object.id,kind:'boulder',position:object.platform,
      previous:object.platform,size:object.size});
    settled.push(object);
  }
  return settled;
}

export function puzzleHint(objects,player,animals){
  const [grove,perch,seal]=objects;
  if(player.x<480&&grove.state==='ready'){
    if(player.form==='gravelback')return 'Walk into the boulder to push it toward the split.';
    return friendshipHint(player,animals,'gravelback','Gravelback','berry');
  }
  if(player.x<480)return 'Jump onto the fallen boulder, then jump to the far bank.';
  if(player.x<1200&&perch.state==='ready'){
    if(player.form==='skyling')return 'Tap Jump to flap up. Face the perched boulder and press F / B for a gust.';
    return friendshipHint(player,animals,'skyling','Moonwing','star');
  }
  if(player.x<1200)return 'Use the fallen boulder as a landing spot for a second flight.';
  if(seal.state==='ready'){
    if(player.form==='flintfist')return 'Get close to the cracked wall and press F / B to punch.';
    return friendshipHint(player,animals,'flintfist','Flintfist','berry');
  }
  return 'Bring the Hollow Light to the gate.';
}

function friendshipHint(player,animals,kind,name,food){
  if(player.form)return 'T / Y · return to explorer form to make a new friend';
  if(player.caught===kind)return 'T / Y · transform into '+name;
  if(animals.some(animal=>animal.kind===kind&&animal.distraction>0))
    return 'G / X · send a friendship orb toward '+name;
  if(player.food!==(food==='star'?2:0))return 'E / RB · select '+food+' treats for '+name;
  return 'F / B · offer '+name+' two '+food+' treats';
}
