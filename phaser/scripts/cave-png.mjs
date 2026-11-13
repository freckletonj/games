// Lossless, dependency-free PNG structural guide generator.
// Only the authored static geometry is rasterized; actors/items are excluded.
import {deflateSync} from 'node:zlib';

const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const table=Uint32Array.from({length:256},(_,i)=>{
  let crc=i;
  for(let bit=0;bit<8;bit++)
    crc=(crc&1)?(0xedb88320^(crc>>>1)):(crc>>>1);
  return crc>>>0;
});

function pngChunk(type,data){
  const name=Buffer.from(type,'ascii');
  const content=Buffer.concat([name,data]);
  let crc=0xffffffff;
  for(const byte of content)crc=table[(crc^byte)&255]^(crc>>>8);
  const result=Buffer.alloc(12+data.length);
  result.writeUInt32BE(data.length,0);
  name.copy(result,4);
  data.copy(result,8);
  result.writeUInt32BE((crc^0xffffffff)>>>0,8+data.length);
  return result;
}

const color={
  air:[24,45,64,255],
  rock:[128,92,119,255],
  water:[35,136,175,255],
  shelf:[246,196,118,255],
  wall:[255,157,99,255],
  distant:[37,68,93,255],
  mist:[53,89,116,255],
  foreground:[86,66,93,220],
  clear:[0,0,0,0]
};

export function caveGuidePng(level,{
  from=0,to=level.width,layer='physical-rock',scale=1
}={}){
  if(!['physical-rock','static-solid','static-water'].includes(layer)||
     from<0||to>level.width||from>=to||
     !Number.isInteger(scale)||scale<1||scale>3)
    throw Error('Invalid cave guide raster dimensions or layer');
  const worldX=from*16;
  const width=(to-from)*16*scale,height=level.height*16*scale;
  const rows=Buffer.alloc((width*4+1)*height);
  const roof=new Float64Array(width),floor=new Float64Array(width);
  const water=new Float64Array(width).fill(Infinity);
  const ledges=level.platformSegments;
  const walls=level.climbWalls||[];
  for(let x=0;x<width;x++){
    const absoluteX=worldX+(x+.5)/scale;
    roof[x]=level.cave.ceilingAt(absoluteX);
    floor[x]=level.cave.groundAt(absoluteX);
    const basin=level.waterBodies.find(p=>
      absoluteX>=p.start*16&&absoluteX<p.end*16);
    if(basin)water[x]=basin.surface*16;
  }
  for(let y=0;y<height;y++){
    const offset=y*(width*4+1);
    rows[offset]=0; // PNG filter: None
    const absoluteY=(y+.5)/scale;
    for(let x=0;x<width;x++){
      let paint;
      const solid=absoluteY<roof[x]||absoluteY>=floor[x];
      const absoluteX=worldX+(x+.5)/scale;
      const shelf=!solid&&ledges.some(p=>
        absoluteX>=p.x*16&&absoluteX<(p.x+p.length)*16&&
        absoluteY>=p.y*16&&absoluteY<p.y*16+20);
      const wall=!solid&&walls.some(w=>
        Math.abs(absoluteX-w.x*16)<12&&
        absoluteY>=w.top*16&&absoluteY<w.bottom*16);
      // All static interaction geometry belongs to ONE full-world layer.
      // Unlike the former compositor, these masks do not invent stone,
      // paint vector lines, tint model pixels, or rescale source artwork.
      const solidMaterial=solid||shelf||wall;
      if(layer==='static-solid'){
        paint=solid?color.rock:shelf?color.shelf:wall?color.wall:color.clear;
      }else if(layer==='static-water'){
        paint=!solidMaterial&&absoluteY>=water[x]?color.water:color.clear;
      }else{
        paint=solid?color.rock:shelf?color.shelf:wall?color.wall:
          absoluteY>=water[x]?color.water:color.air;
      }
      const pixel=offset+1+x*4;
      rows[pixel]=paint[0];rows[pixel+1]=paint[1];
      rows[pixel+2]=paint[2];rows[pixel+3]=paint[3];
    }
  }
  const header=Buffer.alloc(13);
  header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);
  header[8]=8;header[9]=6; // 8-bit RGBA
  return Buffer.concat([
    signature,pngChunk('IHDR',header),
    pngChunk('IDAT',deflateSync(rows,{level:6})),
    pngChunk('IEND',Buffer.alloc(0))
  ]);
}
