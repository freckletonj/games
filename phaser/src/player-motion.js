import {deckTopAt,movingLanding} from './moving-platforms.js';
import {landingY,platformTopAt,safeHorizontalX} from './physics.js';
import {tryBloomBoost} from './springboard.js';
import {stepRopePlayer} from './rope-swing.js';
import {rockEdges,rockSupportAt,sweepRockEdges,sweepContourX} from './rock-edges.js';
import {DANDELION_BOOST} from './pickups.js';

const FLAPPING_FORMS=new Set(['skyling','glimmermoth','cloudwhisp']);
const FLAP_LIMIT=4;

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Mutates only simulation data. Phaser displays animations and effects from
// returned semantic events. Uses the same world geometry and movement values
// as the previous Scene.movePlayer body.
export function stepPlayerMotion(p,actions,step,world){
  const events=[];
  const decks=world.movingPlatforms??[];
  const terrainX=(from,to,feet,swimming=false)=>world.floorSegments?
    sweepContourX(world.floorSegments,from,to,feet,swimming?7:11):
    safeHorizontalX(from,to,feet,world.groundAt,swimming);
  const support=p.grounded?decks.find(deck=>
    deck.id===p.onPlatform&&deck.enabled!==false):null;
  if(support){
    const [x,y]=support.position;
    const [previousX,previousY]=support.previous;
    const carriedX=clamp(p.x+x-previousX+(support.beltSpeed??0),10,world.width-10);
    p.x=terrainX(p.x,carriedX,y);
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
    if(world.ropes?.length&&!p.sleep){
      const rope=stepRopePlayer(p,actions,world.ropes,world.groundAt,step);
      if(rope==='release'){
        events.push('ropeJump');
        actions={...actions,jumpPressed:false};
      }else if(rope){
        if(rope==='pump')events.push('ropePump');
        return {action:'hang',events};
      }
    }
    const inWater=world.inWater(p.x,p.y-8);
    const boost=p.dandelion>0?DANDELION_BOOST:1;
    const swimmer=p.form==='tideling'&&inWater;
    const canFlap=FLAPPING_FORMS.has(p.form);
    p.floatTime=(p.floatTime??0)+step;
    const basin=world.waterBodies?.find(b=>
      p.x>=b.start*world.tile&&p.x<=b.end*world.tile);
    const waterline=basin?basin.surface*world.tile:null;
    const floating=p.form!=='tideling'&&basin&&
      p.y>=waterline+9&&(inWater||p.floating&&world.inWater(p.x,waterline+1));
    p.floating=Boolean(floating);
    let floatJump=false;
    const direction=Number(actions.right)-Number(actions.left);
    const wallContact=(world.climbWalls||[]).find(w=>
      Math.abs(p.x-w.x*world.tile)<=21&&
      p.y>w.top*world.tile+3&&p.y-27<w.bottom*world.tile);
    const desired=direction*(world.pushSpeed??(swimmer?2.15:
      p.form==='springaroo'?2.65:p.form==='emberkit'?3.15:2.3));
    const icy=p.iceWater>0&&p.grounded&&!inWater&&world.pushSpeed==null;
    const traction=icy?(direction?.055:.025):p.grounded?.22:.14;
    p.vx+=(desired-p.vx)*Math.min(1,traction*step);
    // A chapter may provide a deterministic water current. Its force is
    // applied on the same simulation tick as steering and collision.
    if(inWater&&world.currentAt)p.vx+=world.currentAt(p.x,p.y-8)*step;
    if(!direction&&Math.abs(p.vx)<.06)p.vx=0;
    if(swimmer){
      p.vy+=((actions.jump?-.23:actions.down?.24:.046)-p.vy*.035)*step;
      p.vy=clamp(p.vy,-2.3,2.6);
      if(actions.jumpPressed&&basin&&p.breach===0&&
        p.y-basin.surface*world.tile<30){
        p.vy=-5.1;p.breach=.48;
        events.push('breach');
      }
    }else if(floating){
      p.grounded=false;p.coyote=0;p.jumps=0;p.flaps=0;
      if(p.jumpBuffer>0){
        p.vy=-5.7*boost;p.jumpBuffer=0;p.jumps=1;floatJump=true;p.floating=false;
        events.push('waterJump');
      }else{
        const target=waterline+11+1.6*Math.sin(p.floatTime*.085);
        p.vy=clamp((p.vy+(target-p.y)*.085)*.72,-2.9,2.8);
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
        const speed=p.form==='emberkit'?7.15:p.form?5.4:5.75;
        p.vy=-speed*boost;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.jumps=1;
        events.push('jump');
      }else if(actions.jumpPressed&&p.form==='springaroo'&&p.jumps===1){
        p.vy=-6.6*boost;p.jumps=2;p.jumpBuffer=0;
        events.push('doubleJump');
      }else if(actions.jumpPressed&&canFlap&&p.flaps<FLAP_LIMIT&&p.flapWait<=0){
        p.vy=-5.65;p.flaps++;p.flapWait=8;p.jumpBuffer=0;
        events.push('flap');
      }
      if(!p.launchSpeed&&!actions.jump&&p.vy<-2.3&&!canFlap)p.vy+=.28*step;
      const hover=p.form==='glimmermoth'&&p.hover>0&&p.vy>0;
      const drifting=p.dandelion>0&&!p.grounded;
      p.vy+=(p.vy>=0?(hover?.12:drifting?.22:.52):.34)*step;
      if(hover)p.vy=Math.min(p.vy,.9);
      else if(drifting)p.vy=Math.min(p.vy,2.1);
      if(world.inWater(p.x,p.y-6))p.vy=Math.min(p.vy,1.4);
    }
    const updraft=world.thermalVolumes.some(c=>
      p.x>=c.x*world.tile&&p.x<=(c.x+c.width)*world.tile&&
      p.y>c.y*world.tile&&p.y<(c.y+c.height)*world.tile);
    if(updraft){
      p.vy-=.48*step;
      if(canFlap)p.flaps=0;
    }
    p.vy=clamp(p.vy,-11,7.5);
    // Scale horizontal speed only when the feet follow the heightfield.
    // At a flush ledge edge the terrain below can slope away sharply.
    const onTerrain=p.grounded&&!support&&p.y===world.groundAt(p.x)&&
      platformTopAt(p.x,p.y,p.y,world.platformSegments,world.tile)===null;
    const slope=onTerrain?(world.groundAt(p.x+2)-world.groundAt(p.x-2))/4:0;
    const surfaceVx=p.vx/Math.hypot(1,slope);
    const nextX=clamp(p.x+(surfaceVx+(p.launchSpeed??0))*step,10,world.width-10);
    let safeX=terrainX(p.x,nextX,p.y,swimmer);
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
    const edges=world.rockPolygons?.length?rockEdges(world.rockPolygons):[];
    // Walk the authored rock's top edges directly. A slope changes the
    // player's foot height analytically, without repeated upward probes.
    const onLedge=platformTopAt(p.x,p.y-.5,p.y+.5,
      world.platformSegments,world.tile)!==null;
    const supportEdge=p.grounded&&!support&&!onLedge&&p.vy>=0?
      rockSupportAt(edges,p.x,p.y,9,9):null;
    const nextEdge=supportEdge?
      rockSupportAt(edges,safeX,supportEdge.y,9,9):null;
    let rockWalk=false;
    if(nextEdge){
      // The supporting edges define the walking path, not obstacles to
      // that very path. Sweep walls and undersides along the slope instead.
      const footY=Math.min(supportEdge.y,nextEdge.y);
      const obstacles=edges.filter(edge=>edge.ny>=-.5&&
        Math.min(edge.a[1],edge.b[1])<footY-.02);
      const contact=sweepRockEdges(obstacles,p.x,supportEdge.y,safeX,nextEdge.y);
      safeX=contact.x;
      p.y=contact.blocked?supportEdge.y:nextEdge.y;
      p.vy=0;
      rockWalk=!contact.blocked;
    }else if(edges.length){
      safeX=sweepRockEdges(edges,p.x,p.y,safeX,p.y).x;
    }
    if(world.blockHorizontal) safeX=world.blockHorizontal(p.x,safeX,p.y);
    if(Math.abs(safeX-nextX)>.2)p.vx=0;
    const dx=safeX-p.x;
    if(dx||direction)p.face=Math.sign(dx||direction);
    p.x=safeX;
    const priorY=p.y,wasGrounded=p.grounded,impactSpeed=p.vy;
    const vertical=edges.length&&!rockWalk?
      sweepRockEdges(edges,p.x,p.y,p.x,p.y+p.vy*step):
      {y:rockWalk?p.y:p.y+p.vy*step,blocked:false,normal:null};
    const rockLanding=vertical.blocked&&impactSpeed>0&&
      vertical.normal[1]<0;
    p.y=vertical.y;
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
      ((moving.kind==='conveyor'||moving.kind==='puzzle-bridge')&&movingTop===landing));
    p.onPlatform=onDeck?moving.id:null;
    if(onDeck)landing=movingTop;
    if(landing!==null){
      p.y=landing;p.vy=0;p.launchSpeed=0;p.grounded=true;p.jumps=0;p.flaps=0;p.coyote=5;
      if(!wasGrounded&&impactSpeed>1.3){
        events.push('land');
        if(impactSpeed>3.8)events.push('hardLand');
      }
    }else if(rockLanding||rockWalk){
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
    const action=swimmer?'swim':floating&&!floatJump?'float':p.grounded?(dx?'run':'idle'):
      p.form==='skyling'||(p.form==='glimmermoth'&&p.hover>0&&p.vy>=0)?
        'glide':p.vy<0?'jump':'fall';
    return {action,events};

}
