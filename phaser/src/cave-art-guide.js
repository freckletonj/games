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
  // Paint water first and opaque rock on top, exactly as in the PNG raster.
  // Thus a rock island always interrupts the water even at a level waterline.
  const water=level.waterBodies.map(p=>
    '<rect x="'+p.start*TILE+'" y="'+p.surface*TILE+
    '" width="'+(p.end-p.start)*TILE+'" height="'+(h-p.surface*TILE)+'"/>').join('');
  const shelves=level.platformSegments.map(p=>
    '<rect x="'+p.x*TILE+'" y="'+p.y*TILE+
    '" width="'+p.length*TILE+'" height="5"/>').join('');
  const walls=(level.climbWalls||[]).map(p=>
    '<rect x="'+(p.x*TILE-12)+'" y="'+p.top*TILE+
    '" width="24" height="'+(p.bottom-p.top)*TILE+'"/>').join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+
    '" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+
    '<title>'+level.cave.layout.id+' static world guide</title>'+
    '<desc>Smooth cave silhouette and water; no characters, enemies, items or HUD</desc>'+
    '<rect width="'+w+'" height="'+h+'" fill="#183147"/>'+
    '<g fill="#2388af">'+water+'</g>'+
    '<g fill="#645468"><polygon points="0,0 '+w+',0 '+
    pathAlong(level,level.cave.ceilingAt,true)+'"/>'+
    '<polygon points="'+bed+' '+w+','+h+' 0,'+h+'"/></g>'+
    '<g fill="#f3cc76">'+shelves+'</g>'+ 
    '<g fill="#ff9d63">'+walls+'</g></svg>';
}

export function caveArtManifest(level){
  const skywell=level.cave.layout.id==='skywell-ascent';
  return {
    schema:'wonderwood-single-image-cave-v1',
    world:{width:level.width*TILE,height:level.height*TILE},
    guide:'world-physical-rock.png',
    painting:skywell?'phaser/assets/generated/skywell-ascent.png':
      'phaser/assets/generated/luminous-grotto-single.png',
    paintingStatus:skywell?'awaiting-model-generation':'approved-prototype',
    illustratedPreview:skywell?'world-painted-reference.svg':null,
    wallMaterial:'#ff9d63',
    imageGeneration:{
      resolution:'maximum available native pixels at the matching aspect ratio',
      alignment:'no crops, stretching or hallucinated collision surfaces',
      staticOnly:true
    },
    referenceAspectRatio:level.width/level.height,
    recommendedPainting:{
      width:level.width*TILE,height:level.height*TILE
    },
    dynamicExcluded:true,
    geometrySource:'phaser/src/cave-layout.js',
    prompt:skywell?
      'Paint one exquisite, high-resolution 2D side-view vertical moonlit skywell cavern. The color-filled reference is authoritative: rock is solid, blue is navigable air, cyan is filled water, amber is a climbable physical wall and gold indicates landing shelves. Preserve every boundary and especially all wall-jump shafts. Detailed crystalline limestone, bioluminescence and atmospheric shafts of light. Static background only; NO characters, creatures, items, key, gate, UI, writing or invented platforms. Use the maximum available output resolution.':
      'Hand-painted 2D side-view magical water cavern. Follow the supplied smooth rock silhouettes, filled pools and ledges precisely. Detailed mossy limestone, luminous crystals, sunlit openings and waterfalls. Static scenery only; no characters, animals, collectible objects, text or UI. Use maximum native resolution.'
  };
}
