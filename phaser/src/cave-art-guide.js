// One static guide for one painted image. No chunks, planes or object sprites.
const TILE=16;
function pathAlong(level,sample,reverse=false){
  const xs=Array.from({length:Math.ceil(level.width*TILE/8)+1},
    (_,i)=>Math.min(level.width*TILE,i*8));
  if(reverse)xs.reverse();
  return xs.map(x=>x+','+sample(x).toFixed(2)).join(' ');
}

export function caveMaskSvg(level){
  const w=level.width*TILE,h=level.height*TILE;
  const roof=pathAlong(level,level.cave.ceilingAt);
  const bed=pathAlong(level,level.cave.groundAt);
  const water=level.waterBodies.map(p=>{
    const left=p.start*TILE,right=p.end*TILE,y=p.surface*TILE;
    const xs=Array.from({length:Math.ceil((right-left)/8)+1},
      (_,i)=>Math.min(right,left+i*8)).reverse();
    const bottom=xs.map(x=>x+','+level.cave.groundAt(x).toFixed(2)).join(' ');
    return '<polygon points="'+left+','+y+' '+right+','+y+' '+bottom+'"/>';
  }).join('');
  const shelves=level.platformSegments.map(p=>
    '<rect x="'+p.x*TILE+'" y="'+p.y*TILE+
    '" width="'+p.length*TILE+'" height="5"/>').join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+
    '" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+
    '<title>Luminous Grotto static world guide</title>'+
    '<desc>Smooth cave silhouette and water; no characters, enemies, items or HUD</desc>'+
    '<rect width="'+w+'" height="'+h+'" fill="#183147"/>'+
    '<g fill="#645468"><polygon points="0,0 '+w+',0 '+
    pathAlong(level,level.cave.ceilingAt,true)+'"/>'+
    '<polygon points="'+bed+' '+w+','+h+' 0,'+h+'"/></g>'+
    '<g fill="#2388af">'+water+'</g>'+
    '<g fill="#f3cc76">'+shelves+'</g></svg>';
}

export function caveArtManifest(level){
  return {
    schema:'wonderwood-single-image-cave-v1',
    world:{width:level.width*TILE,height:level.height*TILE},
    guide:'world-physical-rock.png',
    painting:'phaser/assets/generated/luminous-grotto-single.png',
    referenceAspectRatio:level.width/level.height,
    recommendedPainting:{
      width:level.width*TILE,height:level.height*TILE
    },
    dynamicExcluded:true,
    geometrySource:'phaser/src/cave-layout.js',
    prompt:'Hand-painted 2D side-view magical water cavern. Follow the supplied smooth rock silhouettes, pool boundaries and ledges. Detailed mossy limestone, luminous crystals, sunlit openings and waterfalls. Static scenery only; no characters, animals, collectible objects, text or UI.'
  };
}
