import {deckTopAt,movingLanding} from './moving-platforms.js';
import {landingY,platformTopAt,safeHorizontalX} from './physics.js';
import {tryBloomBoost} from './springboard.js';
import {sweepRockBody} from './cave-solids.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Mutates only simulation data. Phaser displays animations and effects from
// returned semantic events. Uses the same world geometry and movement values
// as the previous Scene.movePlayer body.
export function stepPlayerMotion(p,actions,step,world){
  const events=[];
  const decks=world.movingPlatforms??[];
  const support=p.grounded?decks.find(deck=>deck.id===p.onPlatform):null;
  if(support){
    const [x,y]=support.position;
    const [previousX,previousY]=support.previous;
    const carriedX=clamp(p.x+x-previousX+(support.beltSpeed??0),10,world.width-10);
    p.x=safeHorizontalX(p.x,carriedX,y,world.groundAt);
    p.y=deckTopAt(support,p.x)??p.y+y-previousY;
    if(support.fire){
      p.launchSpeed=support.boost;p.vy=-support.rise;
      p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.jumps=1;
      events.push('piston');
    }
  }
  const fromX=p.x;
    p.powers=Math.max(0,p.powers-step/60);
    p.flapWait=Math.max(0,p.flapWait-step);
    p.wallJumpCooldown=Math.max(0,(p.wallJumpCooldown||0)-step);
    p.hover=Math.max(0,p.hover-step/60);
    p.breach=Math.max(0,p.breach-step/60);
    p.bloomWindow=Math.max(0,p.bloomWindow-step);
    p.creatureBounceWindow=Math.max(0,(p.creatureBounceWindow||0)-step);
    p.coyote=p.grounded?5:Math.max(0,p.coyote-step);
    p.jumpBuffer=actions.jumpPressed?6:Math.max(0,p.jumpBuffer-step);
    const inWater=world.inWater(p.x,p.y-8);
    const swimmer=p.form==='tideling'&&inWater;
    const direction=Number(actions.right)-Number(actions.left);
    const wallContact=(world.climbWalls||[]).find(w=>
      Math.abs(p.x-w.x*world.tile)<=21&&
      p.y>w.top*world.tile+3&&p.y-27<w.bottom*world.tile);
    if(direction)p.face=direction;
    // Emberkit gets a modest sprint, not a game-breaking traversal power.
    const desired=direction*(swimmer?2.15:
      p.form==='springaroo'?2.65:p.form==='emberkit'?2.6:2.3);
    const traction=p.grounded ? .22 : .14;
    p.vx+=(desired-p.vx)*Math.min(1,traction*step);
    if(swimmer){
      p.vy+=((actions.jump?-.23:actions.down?.24:.046)-p.vy*.035)*step;
      p.vy=clamp(p.vy,-2.3,2.6);
      const basin=world.waterBodies.find(b=>
        p.x>=b.start*world.tile&&p.x<=b.end*world.tile);
      if(actions.jumpPressed&&basin&&p.breach===0&&
        p.y-basin.surface*world.tile<30){
        p.vy=-5.1;p.breach=.48;
        events.push('breach');
      }
    }else{
      if(actions.jumpPressed&&p.creatureBounceWindow>0){
        // A deliberate second press after a head-stomp, not an unlimited
        // midair jump. Consume the window and normal double-jump budget.
        p.vy=-8.0;p.grounded=false;p.coyote=0;p.jumpBuffer=0;
        p.creatureBounceWindow=0;p.jumps=2;
        p.creatureBounceBoosts=(p.creatureBounceBoosts||0)+1;
        events.push('creatureBounceBoost');
      }else if(actions.jumpPressed&&wallContact&&
        p.coyote===0&&p.wallJumpCooldown===0){
        // A forgiving high spring lets explorers gain a full ledge tier.
        p.vy=-10.4;
        p.vx=p.x<wallContact.x*world.tile?-3.3:3.3;
        p.grounded=false;p.jumpBuffer=0;p.jumps=1;
        p.wallJumpCooldown=11;
        p.wallJumps=(p.wallJumps||0)+1;
        events.push('wallJump');
      }else if(tryBloomBoost(p,actions.jumpPressed)){
        events.push('bloomBoost');
      }else if(p.jumpBuffer>0&&p.coyote>0){
        p.vy=-5.4;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.jumps=1;
      }else if(actions.jumpPressed&&p.form==='springaroo'&&p.jumps===1){
        p.vy=-6.6;p.jumps=2;p.jumpBuffer=0;
        events.push('doubleJump');
      }else if(actions.jumpPressed&&p.form==='skyling'&&p.flaps<4&&p.flapWait<=0){
        p.vy=-5.65;p.flaps++;p.flapWait=8;p.jumpBuffer=0;
        events.push('flap');
      }
      if(!p.launchSpeed&&!actions.jump&&p.vy<-2.3&&p.form!=='skyling')p.vy+=.28*step;
      const hover=p.form==='glimmermoth'&&p.hover>0&&p.vy>0;
      p.vy+=(p.vy>=0 ? (hover ? .12 : .52) : .34)*step;
      // Hover must remain a real slow descent for its entire duration.
      if(hover)p.vy=Math.min(p.vy,.9);
      if(world.inWater(p.x,p.y-6))p.vy=Math.min(p.vy,1.4);
    }
    const updraft=world.thermalVolumes.some(c=>
      p.x>=c.x*world.tile&&p.x<=(c.x+c.width)*world.tile&&
      p.y>c.y*world.tile&&p.y<(c.y+c.height)*world.tile);
    if(updraft){
      p.vy-=.48*step;
      if(p.form==='skyling')p.flaps=0;
    }
    p.vy=clamp(p.vy,-11,7.5);
    // Scale horizontal speed only when the feet follow the heightfield.
    // At a flush ledge edge the terrain below can slope away sharply.
    const onTerrain=p.grounded&&!support&&p.y===world.groundAt(p.x)&&
      platformTopAt(p.x,p.y,p.y,world.platformSegments,world.tile)===null;
    const slope=onTerrain?(world.groundAt(p.x+2)-world.groundAt(p.x-2))/4:0;
    const surfaceVx=p.vx/Math.hypot(1,slope);
    const nextX=clamp(p.x+(surfaceVx+(p.launchSpeed??0))*step,10,world.width-10);
    let safeX=safeHorizontalX(p.x,nextX,p.y,
      x=>world.groundAt(x),swimmer);
    // Authored climbing faces are real solid obstacles. Jump over a wall's
    // top, or use a second jump while adjacent to spring off its face.
    for(const wall of world.climbWalls||[]){
      const wallX=wall.x*world.tile;
      if(p.y<=wall.top*world.tile+3||
         p.y-27>=wall.bottom*world.tile)continue;
      if(p.x<=wallX-12&&safeX>wallX-12)
        safeX=wallX-12;
      if(p.x>=wallX+12&&safeX<wallX+12)
        safeX=wallX+12;
    }
    if(world.rockPolygons?.length)
      safeX=sweepRockBody(world.rockPolygons,p.x,p.y,safeX,'x').value;
    if(world.blockHorizontal) safeX=world.blockHorizontal(p.x,safeX,p.y);
    if(Math.abs(safeX-nextX)>.2)p.vx=0;
    p.x=safeX;
    const priorY=p.y,wasGrounded=p.grounded,impactSpeed=p.vy;
    const vertical=world.rockPolygons?.length?
      sweepRockBody(world.rockPolygons,p.x,p.y,p.y+p.vy*step,'y'):
      {value:p.y+p.vy*step,blocked:false};
    const rockLanding=vertical.blocked&&p.vy>0;
    p.y=vertical.value;
    if(vertical.blocked)p.vy=0;
    let landing=landingY(priorY,p.y,p.vy,p.grounded,
      p.x,world.groundAt(p.x),world.platformSegments,world.tile);
    // The top of a climbable rock face is solid too: players can stand
    // there after a wall jump instead of falling through the illustrated cap.
    if(p.vy>=0){
      for(const wall of world.climbWalls||[]){
        const top=wall.top*world.tile;
        if(Math.abs(p.x-wall.x*world.tile)<=12&&
          priorY<=top+2&&p.y>=top&&
          (landing===null||top<landing))landing=top;
      }
    }
    const moving=p.vy>=0?movingLanding(decks,p.grounded?support?.id:null,
      fromX,priorY,p.x,p.y):null;
    const movingTop=moving?deckTopAt(moving,p.x):null;
    const onDeck=moving&&(landing===null||movingTop<landing||
      (moving.kind==='conveyor'&&movingTop===landing));
    p.onPlatform=onDeck?moving.id:null;
    if(onDeck)landing=movingTop;
    if(landing!==null){
      p.y=landing;p.vy=0;p.launchSpeed=0;p.grounded=true;p.jumps=0;p.flaps=0;p.coyote=5;
      if(!wasGrounded&&impactSpeed>1.3){
        events.push('land');
        if(impactSpeed>3.8)events.push('hardLand');
      }
    }else if(rockLanding){
      p.grounded=true;p.coyote=5;p.jumps=0;p.flaps=0;
      if(impactSpeed>1.3)events.push('land');
    }else p.grounded=false;
    // Safety against upward-facing underwater banks: a wall cannot
    // convert a horizontal swim into a fall through the heightfield.
    const ground=world.groundAt(p.x);
    if(world.ceilingAt){
      const roof=world.ceilingAt(p.x);
      if(p.y-27<roof){
        p.y=roof+27;
        if(p.vy<0)p.vy=0;
      }
    }
    if(p.y>ground+3){
      p.y=ground;p.vy=Math.min(p.vy,0);p.grounded=true;p.onPlatform=null;
    }
    if(p.grounded)p.launchSpeed=0;
    if(p.y>world.height-10)events.push('recall');
    const action=swimmer?'swim':p.grounded?(Math.abs(p.vx)>.3?'run':'idle'):
      p.form==='skyling'||(p.form==='glimmermoth'&&p.hover>0&&p.vy>=0)?
        'glide':p.vy<0?'jump':'fall';
    return {action,events};

}
