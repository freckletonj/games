import {contourY} from './cave-layout.js';

const TILE=16;
const point=(x,y)=>`${(x*TILE).toFixed(1)},${(y*TILE).toFixed(1)}`;
export function caveMaskSvg(level,{from=0,to=level.width,layer='physical-rock',guides=false}={}){
  const {ceiling,floor,pools,strata}=level.cave.layout;
  if(!strata.some(s=>s.id===layer)||from<0||to>level.width||from>=to)
    throw Error('Invalid cave art-guide chunk');
  const w=(to-from)*TILE,h=level.height*TILE;
  const xs=Array.from({length:to-from+1},(_,i)=>from+i);
  const roof=xs.map(x=>point(x,contourY(ceiling,x)));
  const bed=xs.map(x=>point(x,contourY(floor,x)));
  const water=pools.filter(p=>p.to>from&&p.from<to).map(p=>{
    const a=Math.max(from,p.from),b=Math.min(to,p.to);
    const coords=[point(a,p.surface),point(b,p.surface),
      ...Array.from({length:b-a+1},(_,i)=>point(b-i,contourY(floor,b-i)))];
    return `<polygon points="${coords.join(' ')}"/>`;
  }).join('');
  const roofPolygon=[point(from,0),point(to,0),...roof.slice().reverse()].join(' ');
  const floorPolygon=[...bed,point(to,level.height),point(from,level.height)].join(' ');
  const rocks=`<polygon points="${roofPolygon}"/><polygon points="${floorPolygon}"/>`;
  const guidesMarkup=guides?`<g stroke="#ffe7a6" stroke-width="2" fill="none">${level.platformSegments.filter(s=>
    s.x+s.length>from&&s.x<to).map(s=>
      `<path d="M ${s.x*TILE} ${s.y*TILE} h ${s.length*TILE}"/>`).join('')}</g>`:'';
  // Each image model receives only static anatomy. No actor, collectible, gate or HUD.
  const content=layer==='physical-rock'?
    `<rect x="${from*TILE}" y="0" width="${w}" height="${h}" fill="#182d40"/><g fill="#805c77">${rocks}</g><g fill="#2388af" opacity=".9">${water}</g>${guidesMarkup}`:
    layer==='foreground-occlusion'?
      `<g fill="#56425d" opacity=".8">${roofPolygon?<polygon-placeholder/>:''}</g>`:
      `<rect x="${from*TILE}" y="0" width="${w}" height="${h}" fill="${layer==='distant-arches'?'#25445d':'#355974'}"/>`;
  const foreground=layer==='foreground-occlusion'?
    `<g fill="#56425d" opacity=".85"><polygon points="${roofPolygon}"/></g>`:content;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"
    viewBox="${from*TILE} 0 ${w} ${h}">
<title>Luminous Grotto ${layer} chunk ${from}-${to}</title>
<desc>Static colored structural art guide. All coordinates are canonical 16px world cells;
physical rock is purple, swimmable water cyan, and ledges amber.</desc>${foreground}</svg>`;
}

export function caveArtManifest(level,{chunkCells=48,overlapCells=4}={}){
  if(!Number.isInteger(chunkCells)||!Number.isInteger(overlapCells)||
    chunkCells<=overlapCells||overlapCells<0)throw Error('Invalid chunk dimensions');
  const chunks=[];
  for(let from=0,index=0;from<level.width;from+=chunkCells-overlapCells,index++){
    const to=Math.min(level.width,from+chunkCells);
    chunks.push({id:`chunk-${String(index).padStart(2,'0')}`,from,to,
      pixelBounds:{x:from*16,y:0,width:(to-from)*16,height:level.height*16},
      overlapPixels:overlapCells*16});
    if(to===level.width)break;
  }
  return {schema:'wonderwood-painted-cave-v1',tileSize:16,
    world:{width:level.width*16,height:level.height*16},chunks,
    planes:level.cave.layout.strata,
    staticMasks:['physical-rock','foreground-occlusion','distant-arches','mist-and-crystals'],
    dynamicExcluded:true,
    collision:'phaser/src/cave-layout.js',
    prompts:{
      'physical-rock':'Hand-painted bioluminescent sea cave, expressive wet limestone, luminous mineral veins, organic sculpted rock. Strictly preserve the supplied purple rock and cyan water boundaries; no characters, props, text, or floating islands.',
      'distant-arches':'Distant subterranean limestone arches, shimmering aquamarine caverns, deep atmospheric perspective, no characters, foreground terrain or objects.',
      'mist-and-crystals':'Subtle distant crystal glow and watery light shafts; ethereal soft parallax, no solid-looking foreground walls.',
      'foreground-occlusion':'Thin dark foreground hanging rock silhouette, sparse carved stalactites; keep navigation readable and do not cover pickups.'
    }
  };
}
