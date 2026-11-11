window.WW = window.WW || {};
// Remove high-chroma matte remnants left by transparency extraction on the
// painted atlases. This is a one-time source cleanup, never a per-frame effect.
// Natural painted hues are preserved; only near-primary key colors and connected
// neutral-white matte regions are removed.
WW.paintCleanup = image => {
  const canvas = document.createElement('canvas');
  const w = canvas.width = image.naturalWidth;
  const h = canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', {willReadFrequently:true});
  ctx.drawImage(image,0,0);
  const frame = ctx.getImageData(0,0,w,h), data=frame.data, count=w*h;
  const white=new Uint8Array(count), removed=new Uint8Array(count);
  const queue=new Uint32Array(count);
  let tail=0;
  for(let i=0;i<count;i++){
    const p=i*4,r=data[p],g=data[p+1],b=data[p+2],a=data[p+3];
    if(a<=12)continue;
    const red=r>232&&g<100&&b<118;
    const yellow=r>232&&g>211&&b<130;
    const cyan=r<90&&g>213&&b>217;
    const neutral=r>243&&g>243&&b>243&&Math.max(r,g,b)-Math.min(r,g,b)<16;
    if(red||yellow||cyan){removed[i]=1;queue[tail++]=i;}
    else if(neutral)white[i]=1;
  }
  // True white paint glows inside the sprite; only white belonging to the
  // external cutout matte (touching transparent pixels or a key color) goes.
  for(let i=0;i<count;i++){
    if(!white[i])continue;
    const x=i%w,y=Math.floor(i/w);
    if(x===0||x===w-1||y===0||y===h-1||
      (x>0&&data[(i-1)*4+3]<=12)||
      (x<w-1&&data[(i+1)*4+3]<=12)||
      (y>0&&data[(i-w)*4+3]<=12)||
      (y<h-1&&data[(i+w)*4+3]<=12)){
      white[i]=0;removed[i]=1;queue[tail++]=i;
    }
  }
  for(let head=0;head<tail;head++){
    const i=queue[head],x=i%w;
    const adjacent=[x>0?i-1:-1,x<w-1?i+1:-1,i>=w?i-w:-1,i<count-w?i+w:-1];
    for(const n of adjacent){
      if(n<0||!white[n])continue;
      white[n]=0;removed[n]=1;queue[tail++]=n;
    }
  }
  for(let i=0;i<count;i++)if(removed[i]){
    const p=i*4;data[p]=data[p+1]=data[p+2]=data[p+3]=0;
  }
  ctx.putImageData(frame,0,0);
  return canvas;
};
