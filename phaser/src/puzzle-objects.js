// Positions use the horizontal center and bottom of each painted object.
export function createPuzzleObjects(specs){
  return specs.map(spec=>({
    ...spec,x:spec.home[0],bottom:spec.home[1],state:'ready',
    time:0,speed:0,angle:0,pressure:0,phase:0,hits:0
  }));
}

const left=object=>object.x-object.size[0]/2;
const right=object=>object.x+object.size[0]/2;
export function puzzleTop(object){
  const height=object.kind==='breakable-wall'&&object.hits>0?
    object.fracture[object.hits-1].remainingHeight:object.size[1];
  return object.bottom-height;
}

export function pushPuzzleObject(objects,player,actions){
  if(!player.grounded||!actions.right||
    !['gravelback','flintfist'].includes(player.form))return null;
  const contact=objects.find(object=>object.state==='ready'&&
    object.kind!=='breakable-wall'&&player.x<=left(object)&&
    left(object)-player.x<=12&&player.y>puzzleTop(object)&&player.y<=object.bottom+2);
  if(!contact)return null;
  if(contact.kind==='push-boulder'){
    if(player.form!=='gravelback'||Math.abs(player.y-contact.bottom)>12)return null;
  }else if(player.form==='flintfist'&&player.y<=contact.pushAbove){
    contact.pressure=Math.min(1,contact.pressure+.055);
    if(contact.pressure===1){
      contact.state='tipping';
      contact.startAngle=contact.angle;
    }
  }else{
    contact.pressure=Math.min(.32,contact.pressure+.04);
  }
  contact.pressed=true;
  return contact;
}

export function blockPuzzleX(objects,fromX,toX,feet){
  let x=toX;
  for(const object of objects){
    if((object.state!=='ready'&&object.state!=='tipping')||
      feet<=puzzleTop(object)||feet-27>=object.bottom)continue;
    // Keep the near edge closed during the fall, so holding push does not
    // send the explorer into the ravine before the bridge supports them.
    const center=object.state==='tipping'?object.home[0]:object.x;
    const half=object.size[0]/2+10;
    const near=center-half,far=center+half;
    if(fromX<=near&&x>near)x=near;
    if(fromX>=far&&x<far)x=far;
  }
  return x;
}

export function punchWall(objects,player){
  if(player.form!=='flintfist')return null;
  const fist=player.x+player.face*34;
  const wall=objects.find(object=>object.kind==='breakable-wall'&&
    object.state==='ready'&&Math.max(fist,player.x)>=left(object)&&
    Math.min(fist,player.x)<=right(object)&&
    player.y-18>puzzleTop(object)&&player.y-18<object.bottom);
  if(!wall)return null;
  const band=wall.hits++;
  if(wall.hits===wall.fracture.length)wall.state='broken';
  return {wall,band};
}

export function stepPuzzleObjects(objects,decks){
  const settled=[];
  for(const object of objects){
    if(object.state==='ready'&&object.kind==='push-boulder'){
      // Friction damps the roll quickly when the player stops leaning in.
      object.speed=object.pressed?Math.min(.46,object.speed+.037):object.speed*.72;
      if(object.speed<.012)object.speed=0;
      object.x=Math.min(object.dropX,object.x+object.speed);
      if(object.x===object.dropX)object.state='dropping';
    }else if(object.state==='ready'&&object.kind==='tipping-log'){
      if(!object.pressed)object.pressure=Math.max(0,object.pressure-.032);
      if(object.pressure===0){
        object.angle=0;
        object.phase=0;
      }else{
        object.phase+=.24;
        object.angle=object.pressure*.07*(.65+.35*Math.sin(object.phase));
      }
    }
    object.pressed=false;
    if(object.state==='dropping'){
      const progress=Math.min(1,++object.time/34);
      const [x,y]=object.platform;
      object.x=object.dropX+(x-object.dropX)*progress;
      object.bottom=object.home[1]+(y+object.size[1]-object.home[1])*progress**2;
      if(progress<1)continue;
    }else if(object.state==='tipping'){
      const progress=Math.min(1,++object.time/53);
      object.angle=object.startAngle+(Math.PI/2-object.startAngle)*progress**2;
      const pivot=object.platform[0]-object.size[1]/2;
      object.x=object.home[0]+(pivot-object.home[0])*progress**2;
      if(progress<1)continue;
    }else continue;

    object.state='settled';
    const size=object.kind==='tipping-log'?[object.size[1],object.size[0]]:object.size;
    decks.push({id:object.id,kind:'puzzle-bridge',position:object.platform,
      previous:object.platform,size});
    settled.push(object);
  }
  return settled;
}

export function puzzleHint(objects,player,animals){
  const [grove,log,seal]=objects;
  if(player.x<480&&grove.state==='ready'){
    if(player.form==='gravelback')return 'Move into the boulder and keep pushing.';
    return friendshipHint(player,animals,'gravelback','Gravelback','berry');
  }
  if(player.x<480)return 'Jump onto the fallen boulder, then jump to the far bank.';
  if(log.state==='tipping')return 'Let the log settle, then cross it.';
  if(player.x<1200&&log.state==='ready'){
    if(player.form==='flintfist')return 'Push the log from the high ledge.';
    if(player.y<=log.pushAbove&&!player.form&&player.grounded)
      return friendshipHint(player,animals,'flintfist','Flintfist','berry');
    if(player.form==='skyling'){
      return player.grounded&&player.y<=log.pushAbove?
        'T / Y · become an explorer to befriend Flintfist on the ledge':
        'Tap Jump to flap up to the ledge beside the log.';
    }
    if(player.form==='gravelback'&&player.x>690)
      return 'The log wobbles here. Try pushing higher up.';
    return friendshipHint(player,animals,'skyling','Moonwing','star');
  }
  if(player.x<1200)return player.y<log.platform[1]-12?
    'Drop onto the fallen log and cross.':'Jump onto the fallen log and cross.';
  if(seal.state==='ready'){
    if(player.form!=='flintfist')return 'T / Y · become Flintfist to break the cave seal.';
    const remaining=seal.fracture.length-seal.hits;
    return seal.hits===0?'Get close to the cracked wall and press F / B to punch.':
      remaining===1?'One punch left · F / B to punch.':remaining+' punches left · F / B to punch.';
  }
  return 'Find the gate key and bring it to the exit.';
}

function friendshipHint(player,animals,kind,name,food){
  if(player.form)return 'T / Y · return to explorer form to make a new friend';
  if(player.caught===kind)return 'T / Y · transform into '+name;
  if(animals.some(animal=>animal.kind===kind&&animal.distraction>0))
    return 'G / X · send a friendship orb toward '+name;
  if(player.food!==(food==='star'?2:0))return 'E / RB · select '+food+' treats for '+name;
  return 'F / B · offer '+name+' two '+food+' treats';
}
