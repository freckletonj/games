// Optional authored rock polygons shared by collision, swimming, and
// static-art masks. Coordinates in the authoring spec are 16px cells.
// Unlike a heightfield, these shapes can have overhangs and undersides.
function pointInRock(polygon,x,y){
  if(x<polygon.left||x>polygon.right||y<polygon.top||y>polygon.bottom)
    return false;
  const points=polygon.points;
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    if((a[1]>y)!==(b[1]>y)&&
      x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])
      inside=!inside;
  }
  return inside;
}

function cross(a,b,c){
  return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
}
function onSegment(a,b,p){
  return Math.abs(cross(a,b,p))<1e-7&&
    p[0]>=Math.min(a[0],b[0])&&p[0]<=Math.max(a[0],b[0])&&
    p[1]>=Math.min(a[1],b[1])&&p[1]<=Math.max(a[1],b[1]);
}
function intersect(a,b,c,d){
  const abC=cross(a,b,c),abD=cross(a,b,d);
  const cdA=cross(c,d,a),cdB=cross(c,d,b);
  if(abC*abD<0&&cdA*cdB<0)return true;
  return onSegment(a,b,c)||onSegment(a,b,d)||
    onSegment(c,d,a)||onSegment(c,d,b);
}
export function compileRockPolygons(spec=[],width,height,tile=16){
  return spec.map((rock,i)=>{
    const pts=rock.points;
    if(!rock.id||!Array.isArray(pts)||pts.length<3||
      pts.some(p=>!Array.isArray(p)||p.length!==2||
        !Number.isFinite(p[0])||!Number.isFinite(p[1])||
        p[0]<0||p[0]>width||p[1]<0||p[1]>height))
      throw Error('Invalid rock polygon '+i);
    const signedArea=pts.reduce((sum,p,j)=>{
      const q=pts[(j+1)%pts.length];
      return sum+p[0]*q[1]-q[0]*p[1];
    },0);
    if(Math.abs(signedArea)<.001)throw Error('Degenerate rock polygon '+rock.id);
    // Reject self-crossing boundaries; these would render with ambiguous fill.
    for(let a=0;a<pts.length;a++)for(let b=a+1;b<pts.length;b++){
      if(b===a+1||(a===0&&b===pts.length-1))continue;
      if(intersect(pts[a],pts[(a+1)%pts.length],
        pts[b],pts[(b+1)%pts.length]))
        throw Error('Self-intersecting rock polygon '+rock.id);
    }
    const points=pts.map(([x,y])=>[x*tile,y*tile]);
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    return {id:rock.id,points,
      left:Math.min(...xs),right:Math.max(...xs),
      top:Math.min(...ys),bottom:Math.max(...ys)};
  });
}

export function rockContains(polygons,x,y){
  return polygons.some(p=>pointInRock(p,x,y));
}

// Actor body is a 20px-wide rectangle with feet at y. AABB/polygon testing
// includes edge intersections, so thin diagonals cannot be walked through.
export function bodyHitsRock(polygons,x,y,halfWidth=10,height=27){
  const left=x-halfWidth,right=x+halfWidth,top=y-height,bottom=y;
  const corners=[[left,top],[right,top],[right,bottom],[left,bottom]];
  return polygons.some(p=>{
    if(right<p.left||left>p.right||bottom<p.top||top>p.bottom)
      return false;
    if(corners.some(([cx,cy])=>pointInRock(p,cx,cy)))return true;
    if(p.points.some(([px,py])=>
      px>=left&&px<=right&&py>=top&&py<=bottom))return true;
    for(let i=0;i<p.points.length;i++){
      const a=p.points[i],b=p.points[(i+1)%p.points.length];
      for(let j=0;j<4;j++)
        if(intersect(a,b,corners[j],corners[(j+1)%4]))return true;
    }
    return false;
  });
}

export function sweepRockBody(polygons,x,y,to,axis){
  if(!polygons.length)return {value:to,blocked:false};
  const from=axis==='x'?x:y,delta=to-from;
  const steps=Math.ceil(Math.abs(delta)/2);
  for(let i=1;i<=steps;i++){
    const candidate=from+delta*i/steps;
    if(bodyHitsRock(polygons,axis==='x'?candidate:x,
      axis==='y'?candidate:y))
      return {value:from+delta*(i-1)/steps,blocked:true};
  }
  return {value:to,blocked:false};
}
