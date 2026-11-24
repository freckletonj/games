import {ART_TILE} from '../src/art-guide.js';
import {rgbaPng} from './guide-png.mjs';

const air=[24,45,64,255];
const terrain=[246,244,239,255];
const water=[32,173,198,255];
const ledge=[248,181,70,255];

export function artGuidePng(level,{width,height,platforms,water:pools}){
  const stride=width*4+1;
  const rows=Buffer.alloc(stride*height);
  for(let x=0;x<width;x++){
    const position=(x+.5)/ART_TILE;
    const cell=Math.floor(position),fraction=position-cell;
    const floor=(level.surface[cell]*(1-fraction)+level.surface[cell+1]*fraction)*ART_TILE;
    const pool=pools.find(({x:start,toX})=>x+.5>=start&&x+.5<toX);
    const ledges=platforms.filter(p=>x>=p.x&&x<p.x+p.width);
    for(let y=0;y<height;y++){
      const color=ledges.some(p=>y>=p.y&&y<p.y+3)?ledge:
        y+.5>=floor?terrain:
        pool&&y+.5>=pool.surface?water:air;
      rows.set(color,y*stride+1+x*4);
    }
  }
  return rgbaPng(width,height,rows);
}
