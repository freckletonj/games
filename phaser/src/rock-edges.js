// Continuous player collision against edges derived from authored cave polygons.
// Body: 20px wide, 27px high; (x,y) is the center of the feet.
const HALF_WIDTH=10, HEIGHT=27, EPSILON=1e-7;

export function rockEdges(polygons){
  return polygons.flatMap(rock=>{
    const winding=Math.sign(rock.points.reduce((sum,a,i)=>{
      const b=rock.points[(i+1)%rock.points.length];
      return sum+a[0]*b[1]-b[0]*a[1];
    },0));
    return rock.points.map((a,i)=>{
      const b=rock.points[(i+1)%rock.points.length];
      const dx=b[0]-a[0],dy=b[1]-a[1];
      const length=Math.hypot(dx,dy);
      return {a,b,nx:winding*dy/length,ny:-winding*dx/length};
    });
  });
}

// Height of a walkable upward-facing edge under the player's 20px footprint.
// Querying the segment formula gives continuous contact even on shallow slopes.
export function rockSupportAt(edges,x,feet,maxUp=9,maxDown=9){
  let support=null;
  for(const edge of edges){
    if(edge.ny>=-.5)continue;
    const [ax,ay]=edge.a,[bx,by]=edge.b;
    const left=Math.max(Math.min(ax,bx),x-HALF_WIDTH);
    const right=Math.min(Math.max(ax,bx),x+HALF_WIDTH);
    if(left>right||ax===bx)continue;
    const slope=(by-ay)/(bx-ax);
    const y=Math.min(ay+(left-ax)*slope,ay+(right-ax)*slope);
    if(y<feet-maxUp||y>feet+maxDown)continue;
    if(!support||Math.abs(y-feet)<Math.abs(support.y-feet))
      support={y,edge};
  }
  return support;
}

// Swept AABB versus each oriented line segment via continuous SAT. Each edge
// supplies three separating axes: horizontal, vertical and its normal.
// No fixed spatial steps, raster samples or binary-search collision probes.
export function sweepRockEdges(edges,x,y,toX,toY){
  const dx=toX-x,dy=toY-y;
  let earliest=1,normal=null;
  for(const edge of edges){
    if(dx*edge.nx+dy*edge.ny>=-EPSILON)continue;
    const cx=x,cy=y-HEIGHT/2;
    let enter=0,exit=1,miss=false;
    for(const [ax,ay] of [[1,0],[0,1],[edge.nx,edge.ny]]){
      const start=cx*ax+cy*ay;
      const radius=HALF_WIDTH*Math.abs(ax)+HEIGHT/2*Math.abs(ay);
      const a=edge.a[0]*ax+edge.a[1]*ay;
      const b=edge.b[0]*ax+edge.b[1]*ay;
      const min=Math.min(a,b),max=Math.max(a,b);
      const speed=dx*ax+dy*ay;
      if(Math.abs(speed)<EPSILON){
        if(start+radius<min-EPSILON||start-radius>max+EPSILON){miss=true;break;}
      }else{
        const near=Math.min((min-start-radius)/speed,(max-start+radius)/speed);
        const far=Math.max((min-start-radius)/speed,(max-start+radius)/speed);
        enter=Math.max(enter,near);
        exit=Math.min(exit,far);
        if(enter>exit+EPSILON){miss=true;break;}
      }
    }
    if(!miss&&enter<earliest&&exit>=0){
      earliest=Math.max(0,enter);
      normal=[edge.nx,edge.ny];
    }
  }
  return {x:x+dx*earliest,y:y+dy*earliest,blocked:normal!==null,normal};
}
