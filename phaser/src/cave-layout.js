// Luminous Grotto: a single, smoothly-authored 3200 x 1792 world.
// These coordinates are 16-pixel cells, taken from the approved HTML trial.
// One source controls the painting guide, movement and debug overlay.
export const caveLayout={
  id:'luminous-grotto',width:200,height:112,tile:16,
  ceiling:[
    [0,13.75],[18.75,11.25],[40.625,16.25],[59.375,12.5],
    [78.125,8.75],[96.875,14.375],[115.625,7.5],[137.5,16.25],
    [159.375,11.25],[181.25,18.75],[200,13.75]
  ],
  floor:[
    [0,75.625],[17.5,73.75],[35,70],[56.25,82.5],
    [76.25,74.375],[93.125,61.25],[113.125,68.75],
    [131.25,79.375],[148.75,77.5],[167.5,61.25],
    [184.375,71.25],[200,73.75]
  ],
  // Water is only simulated above the authored floor; the central island
  // remains dry even if a horizontal waterline crosses the rock silhouette.
  pools:[
    {id:'entrance-lagoon',from:43,to:90,surface:66},
    {id:'crystal-lagoon',from:105,to:161,surface:66}
  ],
  shelves:[
    {x:35,y:47.5,length:15},{x:78.75,y:41.25,length:16.25},
    {x:138.75,y:44.375,length:17.5}
  ],
  objects:[
    {kind:'p1',x:9},{kind:'p2',x:12},
    {kind:'tideling',x:24},{kind:'tideling',x:115},
    {kind:'glimmermoth',x:82,y:36},{kind:'prismtail',x:167},
    {kind:'checkpoint',x:20},{kind:'checkpoint',x:106},
    {kind:'snack',x:17},{kind:'snack',x:98},
    {kind:'starShard',x:62,y:74},{kind:'starShard',x:133,y:74},
    {kind:'diveKey',x:145,y:72},{kind:'exit',x:193}
  ]
};


/**
 * Skywell Ascent: a high-relief cavern with a physically climbable route.
 * Each amber wall is a real blocker; jump beside it, then jump again to
 * spring upward. Platforms form a vertical alternative to the lower valley.
 */
export const skywellLayout={
  id:'skywell-ascent',width:220,height:128,tile:16,
  ceiling:[
    [0,22],[26,18],[52,25],[74,17],[95,23],
    [117,13],[140,19],[163,11],[188,17],[220,15]
  ],
  floor:[
    [0,108],[18,108],[32,103],[45,97],[60,87],
    [77,83],[93,75],[110,70],[129,75],[145,64],
    [162,66],[178,72],[195,68],[220,68]
  ],
  pools:[
    {id:'moonwater-entry',from:18,to:31,surface:101},
    {id:'buried-lagoon',from:106,to:139,surface:69},
    {id:'last-reflection',from:175,to:211,surface:65}
  ],
  shelves:[
    {x:18,y:99,length:12},{x:34,y:90,length:12},
    {x:50,y:82,length:12},{x:66,y:76,length:12},
    {x:82,y:66,length:12},{x:100,y:61,length:13},
    {x:120,y:56,length:13},{x:141,y:52,length:12},
    {x:160,y:49,length:12},{x:178,y:48,length:12},
    {x:198,y:47,length:12},
    // Optional upper loop: transform to Moonwing to explore the vaulted sky.
    {x:108,y:50,length:13},{x:127,y:41,length:14},
    {x:151,y:34,length:16},{x:179,y:31,length:13}
  ],
  // Vertical rock faces rise from the lower route to the upper ledges.
  // They are collision segments, not decorations inferred from the image.
  walls:[
    {x:28,top:99,bottom:108},{x:44,top:90,bottom:101},
    {x:60,top:82,bottom:90},{x:77,top:76,bottom:86},
    {x:93,top:66,bottom:79},{x:112,top:61,bottom:74},
    {x:132,top:56,bottom:76},{x:152,top:52,bottom:69},
    {x:171,top:49,bottom:74},{x:190,top:48,bottom:72}
  ],
  objects:[
    {kind:'p1',x:7},{kind:'p2',x:9},
    {kind:'glimmermoth',x:15,y:107},
    {kind:'tideling',x:23},{kind:'prismtail',x:76},
    {kind:'springaroo',x:127},{kind:'skyling',x:104,y:59},
    {kind:'checkpoint',x:8},{kind:'checkpoint',x:114},
    {kind:'snack',x:14},{kind:'snack',x:125},
    {kind:'starShard',x:39,y:87},{kind:'starShard',x:106,y:58},
    {kind:'starShard',x:137,y:39},{kind:'starShard',x:161,y:32},
    {kind:'diveKey',x:182,y:45},{kind:'exit',x:212}
  ]
};

// Cubic Hermite interpolation with Catmull-Rom control tangents. Movement,
// raster guides and wireframe inspection all call the same evaluator.
export function contourY(points,x){
  if(x<=points[0][0])return points[0][1];
  for(let i=1;i<points.length;i++){
    const [x2,y2]=points[i];
    if(x>x2)continue;
    const [x1,y1]=points[i-1],span=x2-x1;
    const before=points[Math.max(0,i-2)];
    const after=points[Math.min(points.length-1,i+1)];
    const m1=(y2-before[1])/(x2-before[0]);
    const m2=(after[1]-y1)/(after[0]-x1);
    const t=(x-x1)/span,t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*y1+(t3-2*t2+t)*span*m1+
      (-2*t3+3*t2)*y2+(t3-t2)*span*m2;
  }
  return points.at(-1)[1];
}

export function compileCave(layout=caveLayout){
  const {width,height,tile,ceiling,floor,pools,shelves,objects,walls=[]}=layout;
  if(!Number.isInteger(width)||!Number.isInteger(height)||tile!==16||
     width<32||height<20)throw Error('Cave must use valid 16px cells');
  for(const [name,points] of [['ceiling',ceiling],['floor',floor]]){
    if(points.length<2||points[0][0]!==0||points.at(-1)[0]!==width||
      points.some(([x,y],i)=>!Number.isFinite(x)||!Number.isFinite(y)||
        y<0||y>=height||(i>0&&x<=points[i-1][0])))
      throw Error('Invalid '+name+' control points');
  }
  const surface=Array.from({length:width+1},(_,x)=>contourY(floor,x));
  const roof=Array.from({length:width+1},(_,x)=>contourY(ceiling,x));
  if(surface.some((y,x)=>y-roof[x]<13))
    throw Error('Cave requires 13 cells of clearance');
  for(const p of pools){
    if(p.from<0||p.to>width||p.to<=p.from||
      !Number.isFinite(p.surface)||p.surface<0||
      !Array.from({length:p.to-p.from+1},(_,i)=>p.from+i)
        .some(x=>contourY(floor,x)>p.surface+2&&
          contourY(ceiling,x)<p.surface-4))
      throw Error('Invalid water chamber '+p.id);
  }
  for(let i=1;i<pools.length;i++)if(pools[i].from<pools[i-1].to)
    throw Error('Overlapping water chambers');
  for(const ledge of shelves){
    if(ledge.x<0||ledge.x+ledge.length>width||ledge.length<=0||
      ledge.y>=Math.min(...surface.slice(
        Math.floor(ledge.x),Math.ceil(ledge.x+ledge.length)+1)))
      throw Error('Shelf intersects rock floor');
  }
  for(const wall of walls){
    if(!Number.isFinite(wall.x)||!Number.isFinite(wall.top)||
       !Number.isFinite(wall.bottom)||wall.x<=0||wall.x>=width||
       wall.top<=contourY(ceiling,wall.x)+3||
       wall.top>=contourY(floor,wall.x)||
       wall.bottom<=wall.top||wall.bottom>height)
      throw Error('Invalid climb wall');
  }
  const groundAt=x=>contourY(floor,Math.max(0,Math.min(width,x/tile)))*tile;
  const ceilingAt=x=>contourY(ceiling,Math.max(0,Math.min(width,x/tile)))*tile;
  const waterBodies=pools.map(p=>({id:p.id,start:p.from,end:p.to,
    surface:p.surface,bottom:Math.max(...surface.slice(p.from,p.to+1))}));
  const grid=Array.from({length:height},(_,y)=>Array.from(
    {length:width},(_,x)=>{
      if(y<roof[x]||y>=surface[x])return 'ground';
      if(waterBodies.some(p=>x>=p.start&&x<p.end&&y>=p.surface))
        return 'water';
      return 'empty';
    }));
  return {
    width,height,biome:'coast',surface,ceiling:roof,waterBodies,grid,
    platformSegments:shelves.map(p=>({...p,kind:'platform',style:'ledge'})),
    climbWalls:walls.map(w=>({...w,
      bottom:Math.min(w.bottom,contourY(floor,w.x))})),
    thermalVolumes:[],setpieces:[],vistas:[],dressing:[],landmarks:[],
    sections:[],goalRoute:[],objects:objects.map(o=>({
      ...o,y:o.y??Math.ceil(contourY(floor,o.x))-1
    })),
    cave:{layout,groundAt,ceilingAt},
    diagnostics:{metrics:{width,height,
      waterCells:grid.flat().filter(c=>c==='water').length}}
  };
}

export function caveContainsWater(level,x,y){
  return level.waterBodies.some(p=>x>=p.start*16&&x<p.end*16&&
    y>=p.surface*16&&y<=level.cave.groundAt(x));
}
export function caveCeilingHit(level,x,headY){
  return headY<level.cave.ceilingAt(x);
}
