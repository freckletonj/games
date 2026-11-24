// Lossless, dependency-free PNG structural guide generator.
// Only the authored static geometry is rasterized; actors/items are excluded.
import {rgbaPng} from './guide-png.mjs';

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

export function materialGuidePng(level,{
  from=0,to=level.width,top=0,bottom=level.height,
  layer='physical-rock',scale=1,palette=color
}={}){
  if(!['physical-rock','static-solid','static-water'].includes(layer)||
     from<0||to>level.width||from>=to||
     top<0||bottom>level.height||top>=bottom||
     !Number.isInteger(scale)||scale<1||scale>3)
    throw Error('Invalid material guide raster dimensions or layer');
  const worldX=from*16,worldY=top*16;
  const width=(to-from)*16*scale,height=(bottom-top)*16*scale;
  const rows=Buffer.alloc((width*4+1)*height);
  const columns=Array.from({length:width},(_,x)=>
    level.materialColumn(worldX+(x+.5)/scale));
  for(let y=0;y<height;y++){
    const offset=y*(width*4+1);
    rows[offset]=0; // PNG filter: None
    const absoluteY=worldY+(y+.5)/scale;
    for(let x=0;x<width;x++){
      const material=columns[x](absoluteY);
      const paint=layer==='physical-rock'?palette[material]:
        layer==='static-solid'?
          (material==='rock'||material==='wall'||material==='shelf'?
            color[material]:color.clear):
          (material==='water'?color.water:color.clear);
      const pixel=offset+1+x*4;
      rows[pixel]=paint[0];rows[pixel+1]=paint[1];
      rows[pixel+2]=paint[2];rows[pixel+3]=paint[3];
    }
  }
  return rgbaPng(width,height,rows);
}
