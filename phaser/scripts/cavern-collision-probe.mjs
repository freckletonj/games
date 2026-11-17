import layout from '../levels/cavern-ascent.json' with {type:'json'};
import {compileCave} from '../src/cave-layout.js';
import {bodyHitsRock,rockContains,sweepRockBody} from '../src/cave-solids.js';
import {stepPlayerMotion} from '../src/player-motion.js';
const level=compileCave(layout);
const world={width:1280,height:3200,tile:16,groundAt:level.cave.groundAt,ceilingAt:level.cave.ceilingAt,
 inWater:()=>false,waterBodies:[],thermalVolumes:level.thermalVolumes,
 platformSegments:level.platformSegments,rockPolygons:level.rockPolygons};
const samples=[];
for(const shelf of layout.shelves)for(const direction of [-1,1]){
 const startX=(shelf.x+shelf.length/2)*16,startY=shelf.y*16;
 const p={x:startX,y:startY,vx:0,vy:0,face:direction,grounded:true,form:null,
  coyote:5,jumpBuffer:0,jumps:0,flaps:0,flapWait:0,powers:0,hover:0,breach:0,bloomWindow:0};
 const initial=bodyHitsRock(level.rockPolygons,p.x,p.y);
 for(let i=0;i<40;i++)stepPlayerMotion(p,{left:direction<0,right:direction>0},1,world);
 samples.push({shelf:shelf.id,dir:direction,dx:Math.round(p.x-startX),dy:Math.round(p.y-startY),
   grounded:p.grounded,initial,blocked:bodyHitsRock(level.rockPolygons,p.x,p.y)});
}
console.log('CAVE_SHELF_WALKERS '+JSON.stringify(samples));
for(const [x,y] of [[88,3040],[500,3040],[1030,3040],[200,2880],[560,2880],[620,2560],
 [840,2240],[950,2080],[300,1760],[200,1456]]){
 const p={x,y,vx:0,vy:0,face:1,grounded:true,form:null,
 coyote:5,jumpBuffer:0,jumps:0,flaps:0,flapWait:0,powers:0,hover:0,breach:0,bloomWindow:0};
 const from=p.x;
 for(let i=0;i<60;i++)stepPlayerMotion(p,{left:false,right:true},1,world);
 console.log('CAVE_PATH '+JSON.stringify({x,y,from,to:p.x,dy:p.y-y,ground:p.grounded,initialHit:bodyHitsRock(level.rockPolygons,x,y)}));
}
