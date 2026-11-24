const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const headY=player=>player.y-(player.form?25:34);
const active=player=>!player.sleep&&!player.bubble&&!player.rope&&!player.assist&&!player.clouded;

export function createMonkeys(specs,tile,groundAt){
  return specs.map(({x,range},index)=>{
    const home=(x+.5)*tile;
    return {id:index,home,x:home,y:groundAt(home),range:range.map(cell=>cell*tile),
      vx:0,vy:0,face:index%2?-1:1,state:'idle',time:0,
      wait:24+index*12,target:null,perchedOn:null};
  });
}

export function stepMonkeys(monkeys,players,actions,groundAt,recallBelow,step){
  for(const monkey of monkeys){
    if(monkey.clouded)continue;
    const [left,right]=monkey.range;
    monkey.time+=step;
    monkey.wait=Math.max(0,monkey.wait-step);
    if(monkey.perchedOn!==null){
      const player=players.find(p=>p.id===monkey.perchedOn);
      if(player&&active(player)&&player.x>=left-10&&player.x<=right+10&&
        monkey.time<65&&!actions[player.id]?.jumpPressed){
        monkey.x=player.x;
        monkey.y=headY(player);
        monkey.face=player.face;
        continue;
      }
      monkey.perchedOn=null;monkey.target=null;monkey.wait=100;
      monkey.vy=-2.8;monkey.vx=Math.sign(monkey.home-monkey.x)*2;
      monkey.state='leap';monkey.time=0;
    }
    if(monkey.state==='leap'){
      const fromY=monkey.y;
      const target=players.find(p=>p.id===monkey.target&&active(p));
      if(target){
        const desired=clamp((target.x-monkey.x)*.12,-3.2,3.2);
        monkey.vx+=clamp(desired-monkey.vx,-.055,.055)*step;
      }
      monkey.vy+=.34*step;
      monkey.x=clamp(monkey.x+monkey.vx*step,left,right);
      monkey.y+=monkey.vy*step;
      const floor=groundAt(monkey.x);
      if(target&&monkey.vy>0&&Math.abs(monkey.x-target.x)<10&&
        fromY<=headY(target)+4&&monkey.y>=headY(target)-2&&
        !monkeys.some(other=>other.perchedOn===target.id)){
        monkey.perchedOn=target.id;monkey.state='perch';monkey.time=0;
        monkey.x=target.x;monkey.y=headY(target);monkey.face=target.face;
        continue;
      }
      if(monkey.y>=floor){
        monkey.y=floor;monkey.vx=0;monkey.vy=0;monkey.state='idle';monkey.time=0;
        monkey.target=null;monkey.wait=Math.max(monkey.wait,56);
      }
      if(monkey.y>=recallBelow){
        monkey.x=monkey.home;monkey.y=groundAt(monkey.x);
        monkey.vx=0;monkey.vy=0;monkey.state='idle';monkey.time=0;
        monkey.target=null;monkey.wait=56;
      }
      continue;
    }
    const target=players.filter(p=>active(p)&&p.x>=left-6&&p.x<=right+6&&
      Math.abs(p.x-monkey.x)<100&&Math.abs(p.y-monkey.y)<38)
      .sort((a,b)=>Math.abs(a.x-monkey.x)-Math.abs(b.x-monkey.x))[0];
    if(monkey.state==='crouch'){
      if(!target){
        monkey.state='idle';monkey.time=0;
      }else if(monkey.time>=15){
        const aim=clamp(target.x+target.vx*9,left,right);
        monkey.vx=clamp((aim-monkey.x)/23,-3.2,3.2);
        monkey.vy=-5.55;monkey.face=Math.sign(monkey.vx)||monkey.face;
        monkey.target=target.id;monkey.state='leap';monkey.time=0;
      }
      continue;
    }
    if(target&&monkey.wait===0&&Math.abs(target.x-monkey.x)<51){
      monkey.face=Math.sign(target.x-monkey.x)||monkey.face;
      monkey.state='crouch';monkey.time=0;
      continue;
    }
    const pace=target?1.85:.85;
    const nextX=target?monkey.x+clamp(target.x-monkey.x,-pace*step,pace*step):
      monkey.x+monkey.face*pace*step;
    const x=clamp(nextX,left,right);
    const moved=x-monkey.x;
    if(!target&&x!==nextX)monkey.face*=-1;
    else if(moved)monkey.face=Math.sign(moved);
    monkey.x=x;monkey.y=groundAt(x);monkey.state=moved?'run':'idle';
  }
}

export function monkeyFrame(monkey){
  if(monkey.state==='run')return 1+Math.floor(monkey.time/5)%3;
  if(monkey.state==='crouch')return 4;
  if(monkey.state==='leap')return monkey.vy<0?5:6;
  return monkey.state==='perch'?7:0;
}
