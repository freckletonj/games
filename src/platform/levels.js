window.WW = window.WW || {};
WW.levels = (() => {
  const colors = {
    empty: '#ffffff', ground: '#101820', platform: '#5f5b85', water: '#176ad7', p1: '#00ed31', p2: '#91fe54', exit: '#ff152b',
    springaroo: '#ffdc12', skyling: '#00eeef', tideling: '#ef851a', snack: '#ff64bb', skyKey: '#b052fc', diveKey: '#167b86', springKey: '#e83c86', checkpoint: '#aaaaaa',cloudwhisp:'#9480ed',prismtail:'#ff895d',mossback:'#6b9c42',glimmermoth:'#ce6dff',emberkit:'#fc5d3e',starShard:'#f2f28a',thermal:'#8af1f9',prismKey:'#ffa03e',mossKey:'#82e561',cloudKey:'#c9adfb',emberKey:'#f54848'
  };
  const palette = Object.entries(colors).map(([name,hex])=>({ name, rgb: [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)) }));
  const kinds = new Set(['ground','platform','water','thermal']);
  const markers = new Set(['p1','p2','exit','springaroo','skyling','tideling','cloudwhisp','prismtail','mossback','glimmermoth','emberkit','snack','skyKey','diveKey','springKey','starShard','checkpoint','prismKey','mossKey','cloudKey','emberKey']);
  function classify(r,g,b,a=255) {
    if (a<80) return {kind:'empty',confidence:1};
    const distances=palette.map(({name,rgb})=>({name,d:Math.sqrt((r-rgb[0])**2+(g-rgb[1])**2+(b-rgb[2])**2)})).sort((a,b)=>a.d-b.d);
    if(distances[0].d<105) return {kind:distances[0].name,confidence:1-distances[0].d/150};
    if(r>210&&g>210&&b>210)return {kind:'empty',confidence:.4};
    if(r<45&&g<45&&b<45)return {kind:'ground',confidence:.4};
    return {kind:'empty',confidence:0};
  }
  // For generated maps, each logical tile may span N image pixels.
  // A majority vote across the central portion of that cell suppresses JPEG-style noise and blurred edges.
  function parseCanvas(image, pixelsPerTile=1) {
    const cols=Math.floor(image.width/pixelsPerTile),rows=Math.floor(image.height/pixelsPerTile);
    if(cols<8||rows<6||cols>400||rows>80) throw Error(`Level grid must be between 8×6 and 400×80 (found ${cols}×${rows})`);
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const data=ctx.getImageData(0,0,image.width,image.height).data;
    const grid=[], objects=[], warnings=[];
    let unknown=0;
    for(let y=0;y<rows;y++){
      const row=[];
      for(let x=0;x<cols;x++){
        const votes=new Map();const tile=pixelsPerTile;
        const pad=tile>=4?Math.max(1,Math.floor(tile*.2)):0;
        const stride=Math.max(1,Math.floor(tile/8));
        for(let yy=pad;yy<tile-pad;yy+=stride)for(let xx=pad;xx<tile-pad;xx+=stride){
          const offset=((y*tile+yy)*image.width+x*tile+xx)*4;
          const sample=classify(...data.slice(offset,offset+4));
          votes.set(sample.kind,(votes.get(sample.kind)||0)+sample.confidence+.001);
          if(sample.confidence===0)unknown++;
        }
        const type=[...votes].sort((a,b)=>b[1]-a[1])[0]?.[0]||'empty';
        row.push(kinds.has(type)?type:'empty');
        if(markers.has(type))objects.push({kind:type,x,y});
      }
      grid.push(row);
    }
    if(!objects.some(o=>o.kind==='p1'))warnings.push('No green player-start marker');
    if(!objects.some(o=>o.kind==='exit'))warnings.push('No red level-exit marker');
    if(unknown>0)warnings.push(`${unknown} unrecognized image samples were treated as empty`);
    return {grid,objects,warnings,width:cols,height:rows};
  }
  function load(url,pixelsPerTile=1) {
    return new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>{try{resolve(parseCanvas(image,pixelsPerTile))}catch(e){reject(e)}};
      image.onerror=()=>reject(Error('Could not open the PNG image'));
      image.src=url;
    });
  }
  return {colors,classify,parseCanvas,load};
})();
