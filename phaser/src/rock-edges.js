// Continuous player collision against edges derived from authored cave polygons.
// Body: 20px wide, 27px high; (x,y) is the center of the feet.
const HALF_WIDTH=10, HEIGHT=27, EPSILON=1e-7;
const edgeCache=new WeakMap();

export function rockEdges(polygons){
  const cached=edgeCache.get(polygons);
  if(cached)return cached;
  const edges=polygons.flatMap(rock=>{
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
  edgeCache.set(polygons,edges);
  return edges;
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
    if(!support||y<support.y)
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
  // A tiny contact skin keeps the next tick from treating a wall-side
  // touch as penetration into the adjacent underside at a shared vertex.
  const distance=Math.hypot(dx,dy);
  const fraction=normal?Math.max(0,earliest-.02/distance):1;
  return {x:x+dx*fraction,y:y+dy*fraction,
    blocked:normal!==null,normal};
}


// A sampled Hermite contour becomes a connected, world-space polyline.
// All collision and painted-material queries interpolate those same edges.
export function contourAt(points,x){
  const spacing=points[1][0]-points[0][0];
  const position=Math.max(0,Math.min(points.length-1,
    (x-points[0][0])/spacing));
  const index=Math.min(points.length-2,Math.floor(position));
  const t=position-index;
  return points[index][1]+(points[index+1][1]-points[index][1])*t;
}

// Find the first exact intersection with a rising terrain segment instead
// of sampling every 4px while walking/swimming toward an uphill bank.
export function sweepContourX(points,fromX,toX,feet,allowance=11){
  if(toX===fromX)return fromX;
  const direction=Math.sign(toX-fromX);
  const first=Math.min(fromX,toX),last=Math.max(fromX,toX);
  for(let i=direction>0?0:points.length-2;
    i>=0&&i<points.length-1;i+=direction){
    const a=points[i],b=points[i+1];
    const left=Math.max(first,a[0]),right=Math.min(last,b[0]);
    if(right<left)continue;
    const enter=direction>0?left:right,exit=direction>0?right:left;
    const slope=(b[1]-a[1])/(b[0]-a[0]);
    const y=a[1]+(enter-a[0])*slope;
    const next=y+(exit-enter)*slope;
    if(feet>y+allowance)return enter;
    if(feet>next+allowance)
      return enter+(feet-allowance-y)/slope;
  }
  return toX;
}
