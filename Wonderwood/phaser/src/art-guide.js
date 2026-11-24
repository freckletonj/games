// Editable semantic masks for layered, LLM-assisted landscape painting.
// The compiler owns all physical geometry; these coordinates are read-only.
export const ART_TILE=16;

export function artGuide(level,chapter){
  const width=level.width*ART_TILE,height=level.height*ART_TILE;
  const terrain=[`M0 ${height}`,
    ...level.surface.map((y,x)=>`L${x*ART_TILE} ${(y*ART_TILE).toFixed(2)}`),
    `L${width} ${height}Z`].join(' ');
  const water=level.waterBodies.map(pool=>{
    const points=[`${pool.start*ART_TILE},${pool.surface*ART_TILE}`,
      `${pool.end*ART_TILE},${pool.surface*ART_TILE}`];
    for(let x=pool.end;x>=pool.start;x--)
      points.push(`${x*ART_TILE},${(level.surface[x]*ART_TILE).toFixed(2)}`);
    return `<polygon points="${points.join(' ')}"/>`;
  }).join('');
  const ledges=level.platformSegments.filter(p=>p.kind==='platform')
    .map(p=>`<rect x="${p.x*ART_TILE}" y="${p.y*ART_TILE}"
       width="${p.length*ART_TILE}" height="3"/>`).join('');
  const anchors=level.objects.map(object=>{
    const x=(object.x+.5)*ART_TILE,y=(object.y+.5)*ART_TILE;
    return `<circle data-kind="${object.kind}" cx="${x}" cy="${y}" r="5"/>`;
  }).join('');
  const route=(level.goalRoute||[]).map(([x,y])=>
    `${x*ART_TILE+8},${y*ART_TILE}`).join(' ');
  const routeLine=route?`<polyline points="${route}"/>`:'';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>${chapter.name} · collision-registered art mask</title>
  <desc>White is solid terrain, cyan is swim water, amber is a physical
  one-way ledge, magenta is a semantic object anchor, green is the goal route.
  All values are exact compiled pixel coordinates at 16px per world cell.</desc>
  <g id="solid-terrain" fill="#f6f4ef"><path d="${terrain}"/></g>
  <g id="swim-water" fill="#20adc6" opacity=".83">${water}</g>
  <g id="collision-platform-tops" fill="#f8b546">${ledges}</g>
  <g id="authored-object-anchors" fill="#ee3b8d">${anchors}</g>
  <g id="required-route" fill="none" stroke="#53e7a5"
     stroke-width="4" stroke-dasharray="10 5">${routeLine}</g>
</svg>`;
  const anchorsJson=level.objects.map(o=>({
    kind:o.kind,cell:[o.x,o.y],pixel:[(o.x+.5)*ART_TILE,(o.y+.5)*ART_TILE]
  }));
  const data={
    schema:'wonderwood-art-guide-v1',
    chapter:chapter.id,biome:level.biome,
    tileSize:ART_TILE,width,height,
    masks:['solid-terrain','swim-water','collision-platform-tops',
      'authored-object-anchors','required-route'],
    platforms:level.platformSegments.filter(p=>p.kind==='platform').map(p=>({
      x:p.x*ART_TILE,y:p.y*ART_TILE,width:p.length*ART_TILE
    })),
    water:level.waterBodies.map(p=>({
      x:p.start*ART_TILE,toX:p.end*ART_TILE,surface:p.surface*ART_TILE
    })),
    anchors:anchorsJson,goalRoute:level.goalRoute||[],
    vistas:level.vistas||[],sections:level.sections||[]
  };
  return {svg,data};
}
