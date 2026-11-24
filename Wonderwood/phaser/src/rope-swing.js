// Rope angles start at vertical and increase toward the right bank.
const HAND_HEIGHT=23;
const MIN_GRIP=42;
const GRAB_RADIUS=22;
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));

export function createRopes(specs){
  return specs.map(spec=>({...spec,angle:spec.restAngle,omega:0,time:0}));
}

export function ropePoint(rope,length=rope.length,angle=rope.angle){
  return [rope.anchor[0]+length*Math.sin(angle),rope.anchor[1]+length*Math.cos(angle)];
}

export function stepRopes(ropes,players,groundAt,dt){
  for(const rope of ropes){
    rope.time+=dt;
    const riders=players.filter(player=>player.rope===rope);
    if(!riders.length){
      const target=rope.restAngle*Math.cos(rope.time*.035);
      rope.omega=(target-rope.angle)*.14;
      rope.angle+=rope.omega*dt;
      continue;
    }
    rope.omega=(rope.omega-.00165*Math.sin(rope.angle)*dt)*.998;
    const angle=clamp(rope.angle+rope.omega*dt,-.98,.98);
    if(riders.some(player=>{
      const [x,y]=ropePoint(rope,player.ropeGrip,angle);
      return y+HAND_HEIGHT>groundAt(x)+4;
    })){
      rope.omega*=-.6;
      continue;
    }
    if(Math.abs(angle)===.98)rope.omega*=-.62;
    rope.angle=angle;
  }
}

export function stepRopePlayer(player,actions,ropes,groundAt,dt){
  player.ropeLock=Math.max(0,(player.ropeLock??0)-dt);
  if(!player.rope&&actions.up&&player.ropeLock===0){
    for(const rope of ropes){
      const [ax,ay]=rope.anchor;
      const handY=player.y-HAND_HEIGHT;
      const sin=Math.sin(rope.angle),cos=Math.cos(rope.angle);
      const clearance=(groundAt(player.x)-ay-HAND_HEIGHT-6)/cos;
      const grip=clamp((player.x-ax)*sin+(handY-ay)*cos,MIN_GRIP,
        Math.min(rope.length,clearance));
      const [x,y]=ropePoint(rope,grip);
      if(Math.hypot(player.x-x,handY-y)>GRAB_RADIUS||y+HAND_HEIGHT>groundAt(x)+4)continue;
      player.rope=rope;
      player.ropeGrip=grip;
      break;
    }
  }
  const rope=player.rope;
  if(!rope)return null;

  const direction=Number(Boolean(actions.right))-Number(Boolean(actions.left));
  if(actions.jumpPressed){
    const tangent=rope.omega*player.ropeGrip;
    const onward=direction||Math.sign(tangent)||player.face;
    player.vx=onward*2.6;
    player.launchSpeed=clamp(tangent*Math.cos(rope.angle)*.62,-4.2,4.2);
    player.vy=Math.min(-4.8,-4.8-tangent*Math.sin(rope.angle)*.45);
    player.rope=null;player.ropeLock=20;player.jumps=Math.max(1,player.jumps);
    player.grounded=false;player.onPlatform=null;player.coyote=0;player.jumpBuffer=0;
    return 'release';
  }
  const pump=Number(Boolean(actions.rightPressed))-Number(Boolean(actions.leftPressed));
  const boosted=pump&&Math.abs(rope.angle)<.32&&pump*rope.omega>0;
  if(boosted)rope.omega=clamp(rope.omega+pump*.014,-.046,.046);
  const climb=Number(Boolean(actions.down))-Number(Boolean(actions.up));
  const grip=clamp(player.ropeGrip+climb*1.6*dt,MIN_GRIP,rope.length);
  const [nextX,nextY]=ropePoint(rope,grip);
  if(nextY+HAND_HEIGHT<=groundAt(nextX)+4)player.ropeGrip=grip;
  const [x,y]=ropePoint(rope,player.ropeGrip);
  player.x=x;player.y=y+HAND_HEIGHT;player.vx=0;player.vy=0;
  player.grounded=false;player.onPlatform=null;player.coyote=0;
  player.jumpBuffer=0;player.launchSpeed=0;player.floating=false;
  if(direction)player.face=direction;
  return boosted?'pump':'hold';
}
