import {surfaceGroundAt} from './surface-geometry.js';

const MATERIAL_DEPTHS=[['background',-32],['water',-29],['solid',-28]];

export function sceneTextures(id,art){
  if(art.scene)return art.scene.map((url,index)=>({
    key:'scene-'+id+'-scene-'+index,url,depth:-28,scrollFactor:1
  }));
  return MATERIAL_DEPTHS.filter(([material])=>art[material]).map(([material,depth])=>({
    key:'scene-'+id+'-'+material,url:art[material],depth,
    scrollFactor:material==='background'?art.backgroundScrollFactor??1:1
  }));
}

export function paintScene(scene,art){
  const width=scene.level.width*16,height=scene.level.height*16;
  const strips=art.scene?.length>1;
  let left=0;
  return sceneTextures(scene.chapter.id,art).map(({key,depth,scrollFactor})=>{
    const image=scene.add.image(left,0,key).setOrigin(0)
      .setDepth(depth).setScrollFactor(scrollFactor);
    if(strips)left+=image.width;
    else image.setDisplaySize(width,height);
    return image;
  });
}

// Thermals are active traversal aids and stay separate from the scene painting.
export function paintThermals(scene){
  const winds=scene.add.graphics().setDepth(-21);
  for(const column of scene.level.thermalVolumes){
    const x=column.x*16,y=column.y*16,w=column.width*16,h=column.height*16;
    winds.fillStyle(0xdbfafa,.09);
    winds.fillRoundedRect(x,y,w,h,24);
    winds.lineStyle(1,0xcffafa,.29);
    for(let offset=12;offset<w;offset+=20)
      winds.lineBetween(x+offset,y+h-8,x+offset+8,y+10);
  }
}

export function makeGeometryOverlay(scene){
  const level=scene.level;
  const g=scene.add.graphics().setDepth(100).setVisible(false);
  // V reveals the actual filled occupancy rather than just wireframe edges.
  // Sampling the production ground/ceiling functions avoids guide drift.
  const h=level.height*16;
  const groundAt=level.cave?.groundAt??(x=>surfaceGroundAt(level,x));
  const ceilingAt=level.cave?.ceilingAt??(()=>0);
  for(let x=0;x<level.width*16;x+=8){
    const cx=x+4,roof=ceilingAt(cx);
    const floor=groundAt(cx);
    g.fillStyle(0x946987,.27);
    g.fillRect(x,0,8,roof);
    g.fillRect(x,floor,8,h-floor);
    const water=level.waterBodies.find(p=>
      cx>=p.start*16&&cx<p.end*16);
    if(water&&water.surface*16<floor){
      g.fillStyle(0x25b6d2,.31);
      g.fillRect(x,water.surface*16,8,floor-water.surface*16);
    }
  }
  const contours=[[groundAt,0xffe4a0]];
  if(level.cave)contours.push([ceilingAt,0xffc6ad]);
  for(const [contour,color] of contours){
    g.lineStyle(2,color,.95);
    g.beginPath();
    for(let x=0;x<=level.width*16;x+=8){
      const y=contour(x);
      if(x===0)g.moveTo(x,y);else g.lineTo(x,y);
    }
    g.strokePath();
  }
  for(const pool of level.waterBodies){
    g.lineStyle(2,0x5bf5e8,.95);
    g.lineBetween(pool.start*16,pool.surface*16,
      pool.end*16,pool.surface*16);
  }
  g.lineStyle(2,0xffd28d,1);
  for(const s of level.platformSegments){
    if(s.kind==='platform')g.lineBetween(s.x*16,s.y*16,(s.x+s.length)*16,s.y*16);
  }
  for(const rock of level.rockPolygons||[]){
    g.fillStyle(0x946987,.42);
    g.fillPoints(rock.points.map(([x,y])=>({x,y})),true);
  }
  for(const wall of level.climbWalls||[]){
    g.fillStyle(0xff9d63,.48);
    g.fillRect(wall.x*16-12,wall.top*16,24,
      (wall.bottom-wall.top)*16);
  }
  return g;
}
