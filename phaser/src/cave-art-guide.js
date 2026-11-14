// One authoritative full-world material guide for a coherent static painting.
// World-locked solid/water alpha planes are derived from the same geometry.
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
    '" width="'+p.length*TILE+'" height="20"/>').join('');
  const walls=(level.climbWalls||[]).map(p=>
    '<rect x="'+(p.x*TILE-12)+'" y="'+p.top*TILE+
    '" width="24" height="'+(p.bottom-p.top)*TILE+'"/>').join('');
  const rocks=(level.rockPolygons||[]).map(p=>
    '<polygon points="'+p.points.map(v=>v.join(',')).join(' ')+'"/>').join('');
  const traversable=roof+' '+pathAlong(level,level.cave.groundAt,true);
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+
    '" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+
    '<title>'+level.cave.layout.id+' static world guide</title>'+
    '<desc>One coherent complete scene: physical rock, climb walls, filled water, and landing platforms; never characters, items or UI</desc>'+
    '<defs><clipPath id="traversable"><polygon points="'+traversable+
    '"/></clipPath></defs>'+
    '<rect width="'+w+'" height="'+h+'" fill="#183147"/>'+
    '<g fill="#2388af">'+water+'</g>'+
    '<g fill="#645468"><polygon points="0,0 '+w+',0 '+
    pathAlong(level,level.cave.ceilingAt,true)+'"/>'+
    '<polygon points="'+bed+' '+w+','+h+' 0,'+h+'"/></g>'+
    '<g fill="#f3cc76">'+shelves+'</g>'+
    '<g fill="#ff9d63" clip-path="url(#traversable)">'+walls+'</g>'+
    '<g fill="#645468">'+rocks+'</g></svg>';
}

export function caveArtManifest(level){
  const study=level.cave.layout.id==='skywell-vault-study';
  const skywell=level.cave.layout.id==='skywell-ascent'||study;
  return {
    schema:'wonderwood-physics-painted-cave-v2',
    world:{width:level.width*TILE,height:level.height*TILE},
    guide:'world-physical-rock.png',
    // One full-scene conditioning guide and two matching pixel-accurate
    // alpha masks. The model must paint the whole interactive environment
    // together, not independently invent platform-shaped texture patches.
    rasterLayers:{
      staticSolid:{mask:'world-static-solid.png',worldLocked:true,
        collisionFromCode:true,paintTogether:true},
      water:{mask:'world-static-water.png',worldLocked:true,
        collisionFromCode:true},
      backdrop:{mask:null,parallaxAllowed:true,collisionFromCode:false}
    },
    painting:study?null:skywell?'phaser/assets/generated/skywell-ancient/painted-solid.webp':
      'phaser/assets/generated/luminous-grotto-single.png',
    paintingStatus:study?'awaiting-coherent-high-resolution-art':
      skywell?'user-selected-layered-preview':'approved-prototype',
    illustratedPreview:null,
    modelSource:study?null:skywell?
      '1644x957 Ancient Sanctuary painting, enlarged to 3520x2048 for alignment; not native full-resolution detail':null,
    wallMaterial:'#ff9d63',
    imageGeneration:{
      resolution:'maximum available native pixels at the matching aspect ratio',
      alignment:'Global composition first; overlapping authoring crops must keep exact geometry, without stretching or invented surfaces',
      staticOnly:true
    },
    referenceAspectRatio:level.width/level.height,
    recommendedPainting:{
      width:level.width*TILE,height:level.height*TILE
    },
    dynamicExcluded:true,
    geometrySource:'phaser/src/cave-layout.js',
    prompt:study?
      'Paint a coherent side-view magical cave using the ENTIRE supplied filled physics reference. Natural ceiling-connected rock arches, irregular massive formations, realistic water chambers, and stone landing ledges must follow each exact colored boundary. No isolated wedges or generic vector platforms. All rock, wall, and ledge structure belongs to ONE scene. Static world only; no characters, collectible items, UI, labels, or invented surfaces. First establish one global composition, then refine crops at their actual world resolution with shared references.':skywell?
      'Paint one exquisite, high-resolution 2D side-view vertical moonlit skywell cavern. The color-filled reference is authoritative: rock is solid, blue is navigable air, cyan is filled water, amber is a climbable physical wall and gold indicates landing shelves. Preserve every boundary and especially all wall-jump shafts. Detailed crystalline limestone, bioluminescence and atmospheric shafts of light. Static background only; NO characters, creatures, items, key, gate, UI, writing or invented platforms. Use the maximum available output resolution.':
      'Hand-painted 2D side-view magical water cavern. Follow the supplied smooth rock silhouettes, filled pools and ledges precisely. Detailed mossy limestone, luminous crystals, sunlit openings and waterfalls. Static scenery only; no characters, animals, collectible objects, text or UI. Use maximum native resolution.'
  };
}
