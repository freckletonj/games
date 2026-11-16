// Geometry art for playing Cavern Ascent before its painted assets are installed.
const TILE=16;

function polygon(ctx,points){
  ctx.beginPath();
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.closePath();
}

function paintRock(ctx,points){
  const ys=points.map(([,y])=>y);
  const xs=points.map(([x])=>x);
  const top=Math.min(...ys),bottom=Math.max(...ys);
  const left=Math.min(...xs),right=Math.max(...xs);
  const face=ctx.createLinearGradient(0,top,0,bottom);
  face.addColorStop(0,top>2200?'#be9472':'#8baeb4');
  face.addColorStop(.23,top>2200?'#6c4b58':'#475366');
  face.addColorStop(1,'#23243f');
  ctx.save();
  polygon(ctx,points);
  ctx.fillStyle=face;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle='#b4ccd1';
  ctx.lineWidth=2;
  ctx.globalAlpha=.16;
  for(let x=left-48;x<right;x+=37){
    ctx.beginPath();
    ctx.moveTo(x,top);
    ctx.lineTo(x+22,top+19);
    ctx.lineTo(x+8,bottom);
    ctx.stroke();
  }
  ctx.restore();
}

export function paintCavernPreview(scene){
  const {level,textures}=scene;
  const width=level.width*TILE,height=level.height*TILE;
  const key='scene-cavern-ascent-preview';
  if(!textures.exists(key)){
    const texture=textures.createCanvas(key,width,height);
    const ctx=texture.context;
    const background=ctx.createLinearGradient(0,0,0,height);
    background.addColorStop(0,'#142c49');
    background.addColorStop(.32,'#192b49');
    background.addColorStop(.64,'#231c37');
    background.addColorStop(1,'#271b2c');
    ctx.fillStyle=background;
    ctx.fillRect(0,0,width,height);
    for(let i=0;i<22;i++){
      const x=(i*193+73)%width,y=(i*571+191)%height;
      const light=ctx.createRadialGradient(x,y,0,x,y,210);
      light.addColorStop(0,y<2000?'#55c5dd38':'#dd895b38');
      light.addColorStop(1,'#14172500');
      ctx.fillStyle=light;
      ctx.fillRect(x-210,y-210,420,420);
    }
    for(const {x,y,length} of level.platformSegments){
      const a=x*TILE,b=(x+length)*TILE,top=y*TILE;
      paintRock(ctx,[[a,top],[b,top],[b,top+13],[b-12,top+20],
        [a+12,top+20],[a,top+13]]);
    }
    for(const rock of level.rockPolygons)paintRock(ctx,rock.points);
    for(const [boundary,edge] of [[level.cave.ceilingAt,0],[level.cave.groundAt,height]]){
      const contour=Array.from({length:level.width+1},(_,i)=>{
        const x=i*TILE;
        return [x,boundary(x)];
      });
      paintRock(ctx,[[0,edge],[width,edge],...contour.reverse()]);
    }
    for(const span of level.puzzleObjects.filter(object=>object.banks)){
      const [center,y]=span.platform,half=span.size[1]/2;
      ctx.fillStyle='#c99b66';
      for(const id of span.banks){
        const bank=level.platformSegments.find(segment=>segment.id===id);
        const left=Math.max(bank.x*TILE,center-half);
        const right=Math.min((bank.x+bank.length)*TILE,center+half);
        ctx.fillRect(left,y,right-left,7);
      }
    }
    texture.refresh();
  }
  return [scene.add.image(0,0,key).setOrigin(0).setDepth(-28)];
}

export function makeCavernPreviewProps(textures,level){
  const props=[...level.machines,...level.puzzleObjects.filter(o=>o.kind!=='breakable-wall')];
  for(const prop of props){
    const key='deck-cavern-ascent-'+prop.id;
    if(textures.exists(key))continue;
    const [width,height]=prop.size;
    const texture=textures.createCanvas(key,width,height);
    const ctx=texture.context;
    ctx.save();
    if(prop.kind==='gear'){
      ctx.beginPath();
      ctx.arc(width/2,height/2,height/2,0,2*Math.PI);
      ctx.clip();
    }
    paintRock(ctx,[[0,0],[width,0],[width,height],[0,height]]);
    if(prop.banks){
      // The left edge of the upright texture becomes the walking surface.
      ctx.fillStyle='#a97752';
      ctx.fillRect(0,0,9,height);
      ctx.fillStyle='#edc38b';
      ctx.fillRect(0,0,3,height);
      for(let y=12;y<height;y+=24)ctx.fillRect(3,y,6,2);
    }else{
      ctx.fillStyle=prop.kind==='gear'?'#73bac4':'#c28f74';
      polygon(ctx,[[width*.18,height*.39],[width*.48,height*.23],
        [width*.72,height*.49],[width*.4,height*.65]]);
      ctx.globalAlpha=.66;
      ctx.fill();
    }
    ctx.restore();
    texture.refresh();
  }
}
