// Mosslight Meadow's scenic art lives behind gameplay, never inside its
// collision map. Render these illustrations at 2x their display resolution
// so fine foliage, washed watercolor edges and sun shafts remain smooth.
export function addMeadowIllustration(scene){
  if(scene.chapter.id!=='first-forest')return;

  const canvas=document.createElement('canvas');
  canvas.width=2048;canvas.height=512;
  const ctx=canvas.getContext('2d');
  let seed=61421;
  const random=()=>{
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  };
  // A broad watercolor canopy sits high above the playable ground. The
  // miniature leaves are deliberately diffuse and never imply collectibles.
  for(let clump=0;clump<20;clump++){
    const centerX=45+clump*109+(random()-.5)*65;
    const centerY=29+random()*38;
    const radius=65+random()*62;
    const colors=[
      'rgba(35,89,84,.41)','rgba(53,106,87,.35)',
      'rgba(85,133,100,.31)','rgba(130,165,112,.27)',
      'rgba(175,188,121,.22)','rgba(57,106,115,.26)'
    ];
    // Layer a blurred underpainting beneath crisp leaf-shaped brushstrokes.
    const haze=ctx.createRadialGradient(centerX,centerY,5,
      centerX,centerY,radius*1.9);
    haze.addColorStop(0,'rgba(76,130,99,.27)');
    haze.addColorStop(1,'rgba(76,130,99,0)');
    ctx.fillStyle=haze;
    ctx.fillRect(centerX-radius*2,0,radius*4,240);
    for(let n=0;n<150;n++){
      const theta=random()*Math.PI*2,spread=Math.sqrt(random());
      const x=centerX+Math.cos(theta)*radius*spread*1.35;
      const y=centerY+Math.sin(theta)*radius*spread*.63;
      if(y<0||y>186)continue;
      const length=4+random()*14,width=1.4+random()*4.5;
      ctx.fillStyle=colors[Math.floor(random()*colors.length)];
      ctx.beginPath();
      ctx.ellipse(x,y,length,width,theta*.37+(random()-.5)*.5,0,Math.PI*2);
      ctx.fill();
      if(n%17===0){
        ctx.strokeStyle='rgba(209,217,158,.17)';
        ctx.lineWidth=.9;
        ctx.beginPath();
        ctx.moveTo(x-length*.6,y+width);
        ctx.quadraticCurveTo(x,y-1,x+length*.75,y-width);
        ctx.stroke();
      }
    }
  }
  // Long tapered branch strokes make the canopy read as foliage attached
  // to the landscape, not freestanding hoverable objects.
  ctx.lineCap='round';
  for(let n=0;n<16;n++){
    const x=65+n*137+(random()-.5)*45;
    const tip=47+random()*115;
    ctx.strokeStyle='rgba(35,82,83,.31)';
    ctx.lineWidth=2+random()*3;
    ctx.beginPath();
    ctx.moveTo(x,-4);
    ctx.bezierCurveTo(x+14,32,x-24,tip-32,x+15,tip);
    ctx.stroke();
  }

  const key='mosslight-illustrated-canopy';
  if(scene.textures.exists(key))scene.textures.remove(key);
  scene.textures.addCanvas(key,canvas);

  const light=document.createElement('canvas');
  light.width=2048;light.height=512;
  const rays=light.getContext('2d');
  for(let i=0;i<10;i++){
    const x=88+i*212+(random()-.5)*85;
    const sway=(random()-.5)*150;
    const beam=rays.createLinearGradient(x,20,x+sway,470);
    beam.addColorStop(0,'rgba(255,247,190,.38)');
    beam.addColorStop(.5,'rgba(255,235,178,.16)');
    beam.addColorStop(1,'rgba(255,242,208,0)');
    rays.fillStyle=beam;
    rays.beginPath();
    rays.moveTo(x-9,0);
    rays.lineTo(x+20,0);
    rays.lineTo(x+sway+100,512);
    rays.lineTo(x+sway-120,512);
    rays.closePath();
    rays.fill();
  }
  const lightKey='mosslight-dappled-light';
  if(scene.textures.exists(lightKey))scene.textures.remove(lightKey);
  scene.textures.addCanvas(lightKey,light);

  const sunbeams=scene.add.tileSprite(480,187,960,270,lightKey)
    .setScrollFactor(0).setTileScale(.5,.5).setAlpha(.33).setDepth(-91);
  const foliage=scene.add.tileSprite(480,125,960,250,key)
    .setScrollFactor(0).setTileScale(.5,.5).setAlpha(.76).setDepth(-86);
  scene.parallaxLayers.push(
    {visual:sunbeams,speed:.12,sway:2,phase:0},
    {visual:foliage,speed:.30,sway:7,phase:1.9}
  );
}
