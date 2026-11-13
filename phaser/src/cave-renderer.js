// The approved single-image prototype: one painting for the whole level.
// Physics and dynamic actors remain completely separate from this image.
export function paintCave(scene){
  const width=scene.level.width*16,height=scene.level.height*16;
  const painting=scene.add.image(0,0,
    scene.level.cave.layout.id==='skywell-ascent'?
      'skywell-painted-rock':'cave-painted-rock')
    .setOrigin(0).setDisplaySize(width,height).setDepth(-29);
  scene.cavePainting=painting;
}

export function paintCaveGeometryOverlay(scene){
  const level=scene.level;
  const g=scene.add.graphics().setDepth(100).setVisible(false);
  // V reveals the actual filled occupancy rather than just wireframe edges.
  // Sampling the production ground/ceiling functions avoids guide drift.
  const h=level.height*16;
  for(let x=0;x<level.width*16;x+=8){
    const cx=x+4,roof=level.cave.ceilingAt(cx);
    const floor=level.cave.groundAt(cx);
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
  for(const [points,color] of [
    [level.cave.layout.floor,0xffe4a0],
    [level.cave.layout.ceiling,0xffc6ad]
  ]){
    g.lineStyle(2,color,.95);
    g.beginPath();
    for(let x=0;x<=level.width*16;x+=8){
      const y=(points===level.cave.layout.floor?
        level.cave.groundAt(x):level.cave.ceilingAt(x));
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
  for(const s of level.platformSegments)
    g.lineBetween(s.x*16,s.y*16,(s.x+s.length)*16,s.y*16);
  for(const wall of level.climbWalls||[]){
    g.fillStyle(0xff9d63,.48);
    g.fillRect(wall.x*16-12,wall.top*16,24,
      (wall.bottom-wall.top)*16);
  }
  scene.caveGeometryOverlay=g;
}
