// One code-authored source for physics, painted guide masks and parallax.
// Cell coordinates use 16 world pixels; y grows downward.
export const caveLayout={
  id:'luminous-grotto',width:160,height:62,tile:16,
  // Non-overlapping rock roof and floor contours, in world-cell coordinates.
  ceiling:[[0,25],[15,22],[30,25],[45,29],[59,28],[77,23],[92,29],[109,26],[127,30],[143,25],[160,26]],
  floor:[[0,41],[14,41],[29,44],[42,45],[59,48],[74,46],[90,51],[104,50],[119,47],[134,46],[148,42],[160,41]],
  // Immersed chambers have a flat physical waterline and a varying rock floor.
  pools:[{id:'tidal-entrance',from:29,to:69,surface:36},
    {id:'deep-sanctuary',from:82,to:137,surface:34}],
  shelves:[{x:17,y:37,length:8},{x:69,y:39,length:9},
    {x:117,y:39,length:8},{x:142,y:37,length:9}],
  // Artistic planes never modify collision, and dynamic actors are not guides.
  strata:[
    {id:'distant-arches',depth:-84,parallax:.16},
    {id:'mist-and-crystals',depth:-64,parallax:.34},
    {id:'physical-rock',depth:-29,parallax:1},
    {id:'foreground-occlusion',depth:35,parallax:1}
  ],
  objects:[
    {kind:'p1',x:4},{kind:'p2',x:6},
    {kind:'tideling',x:19},{kind:'tideling',x:75},
    {kind:'glimmermoth',x:54,y:29},{kind:'prismtail',x:119},
    {kind:'checkpoint',x:22},{kind:'checkpoint',x:82},
    {kind:'snack',x:13},{kind:'snack',x:88},
    {kind:'starShard',x:49,y:39},{kind:'starShard',x:105,y:42},
    {kind:'diveKey',x:110,y:44},{kind:'exit',x:154}
  ]
};

export function contourY(points,x){
  for(let i=1;i<points.length;i++)if(x<=points[i][0]){
    const [ax,ay]=points[i-1],[bx,by]=points[i];
    return ay+(by-ay)*(x-ax)/(bx-ax);
  }
  return points.at(-1)[1];
}

export function compileCave(layout=caveLayout){
  const {width,height,tile,ceiling,floor,pools,shelves,objects}=layout;
  if(!Number.isInteger(width)||width<32||!Number.isInteger(height)||height<20||tile!==16)
    throw Error('Cave size must be valid 16px cells');
  for(const [name,points] of [['ceiling',ceiling],['floor',floor]]){
    if(!Array.isArray(points)||points.length<2||points[0][0]!==0||
      points.at(-1)[0]!==width||points.some(([x,y],i)=>
        !Number.isFinite(x)||!Number.isFinite(y)||y<0||y>=height||
        (i>0&&x<=points[i-1][0])))throw Error('Invalid '+name+' contour');
  }
  const surface=Array.from({length:width+1},(_,x)=>contourY(floor,x));
  const roof=Array.from({length:width+1},(_,x)=>contourY(ceiling,x));
  if(surface.some((y,x)=>y-roof[x]<13))throw Error('Cave requires 13 cells of open clearance');
  for(const pool of pools){
    if(!Number.isInteger(pool.from)||!Number.isInteger(pool.to)||
      pool.from<0||pool.to>width||pool.to<=pool.from||
      !Number.isFinite(pool.surface)||pool.surface<=Math.max(
        roof[pool.from],roof[pool.to])+4||
      pool.surface>=Math.min(...surface.slice(pool.from,pool.to+1))-2)
      throw Error('Invalid water chamber '+pool.id);
  }
  for(let i=1;i<pools.length;i++)if(pools[i].from<pools[i-1].to)
    throw Error('Overlapping water chambers');
  for(const ledge of shelves)if(ledge.x<0||ledge.x+ledge.length>width||
    ledge.y>=Math.min(...surface.slice(ledge.x,ledge.x+ledge.length+1)))
    throw Error('Shelf intersects rock floor');
  const groundAt=x=>contourY(floor,Math.max(0,Math.min(width,x/tile)))*tile;
  const ceilingAt=x=>contourY(ceiling,Math.max(0,Math.min(width,x/tile)))*tile;
  const waterBodies=pools.map(pool=>({
    id:pool.id,start:pool.from,end:pool.to,surface:pool.surface,
    bottom:Math.max(...surface.slice(pool.from,pool.to+1))
  }));
  const grid=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>{
    if(y<roof[x])return 'ground';
    if(y>=surface[x])return 'ground';
    if(waterBodies.some(b=>x>=b.start&&x<b.end&&y>=b.surface))return 'water';
    return 'empty';
  }));
  return {
    width,height,biome:'coast',surface,ceiling:roof,waterBodies,grid,
    platformSegments:shelves.map(p=>({...p,kind:'platform',style:'ledge'})),
    thermalVolumes:[],setpieces:[],vistas:[],dressing:[],landmarks:[],
    sections:[],goalRoute:[],objects:objects.map(o=>({
      kind:o.kind,x:o.x,y:o.y??Math.ceil(surface[o.x])-1
    })),
    cave:{layout,groundAt,ceilingAt},
    diagnostics:{metrics:{width,height,waterCells:grid.flat().filter(c=>c==='water').length}}
  };
}

export function caveContainsWater(level,x,y){
  return level.waterBodies.some(pool=>x>=pool.start*16&&x<pool.end*16&&
    y>=pool.surface*16&&y<=level.cave.groundAt(x));
}

export function caveCeilingHit(level,x,headY){
  return headY<level.cave.ceilingAt(x);
}
