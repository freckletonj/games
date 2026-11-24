// Deterministic, geometry-conditioned art studies for the Sunken Temple.
// Visual references only: do not register in approved-scene-art.json.
import {mkdir,writeFile} from 'node:fs/promises';
import {surfaceGroundAt} from '../src/surface-geometry.js';
import {templeShoreBounds,templeWaterMaskBounds} from '../src/temple-shoreline.js';

export async function exportTempleArtStudy(spec,level,frames,directory){
  const W=level.width*16,H=level.height*16;
  const n=v=>Number(v.toFixed(2));
  const ground=x=>surfaceGroundAt(level,x);
  const contour=[];
  for(let x=0;x<=W;x+=4)contour.push(`${x},${n(ground(x))}`);
  const rockPath=`M${contour.join('L')}L${W},${H}L0,${H}Z`;
  const shelves=spec.ledges.map(([x,y,w])=>`<rect x="${x*16}" y="${y*16}" width="${w*16}" height="20" fill="url(#shelf)"/><path d="M${x*16} ${y*16}h${w*16}" stroke="#f3d3a5" stroke-width="3"/>`).join('');
  const obstacles=(spec.obstacles||[]).map(o=>`<rect x="${o.left*16}" y="${o.top*16}" width="${(o.right-o.left)*16}" height="${(o.bottom-o.top)*16}" fill="url(#stone)"/>`).join('');
  const definitions=`<defs>
    <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#102e4c"/><stop offset=".58" stop-color="#265a69"/><stop offset="1" stop-color="#387977"/></linearGradient>
    <linearGradient id="stone" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#b49883"/><stop offset=".18" stop-color="#777e79"/><stop offset="1" stop-color="#2f4c55"/></linearGradient>
    <linearGradient id="shelf" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#e6c994"/><stop offset="1" stop-color="#597276"/></linearGradient>
    <linearGradient id="water" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#69e1c9" stop-opacity=".65"/><stop offset="1" stop-color="#0b648e" stop-opacity=".85"/></linearGradient>
    <radialGradient id="sun"><stop stop-color="#fce0aa" stop-opacity=".42"/><stop offset="1" stop-color="#fce0aa" stop-opacity="0"/></radialGradient>
    <clipPath id="rock"><path d="${rockPath}"/></clipPath>
    ${spec.waterVolumes.map(v=>{
      const b=templeWaterMaskBounds(v,ground),floor=[];
      for(let x=b.right;x>=b.left;x-=4)floor.push(`${n(x)},${n(Math.max(b.y,ground(x)))}`);
      floor.push(`${n(b.left)},${n(Math.max(b.y,ground(b.left)))}`);
      return `<clipPath id="basin-${v.id}"><path d="M${n(b.left)},${n(b.y)}L${n(b.right)},${n(b.y)}L${floor.join('L')}Z"/></clipPath>`;
    }).join('')}
  </defs>`;
  const arches=[16,63,115,164,212].map((c,i)=>{
    const x=c*16,y=310+(i%2)*54;
    return `<path d="M${x-140} 600V${y+70}Q${x} ${y-110} ${x+140} ${y+70}V600M${x-111} 600V${y+74}Q${x} ${y-38} ${x+111} ${y+74}V600" fill="none" stroke="#a6bfb2" stroke-width="10" opacity=".24"/>`;
  }).join('');
  const vines=Array.from({length:54},(_,i)=>{
    const x=n((i*177.3)%W), y=48+i%4*19;
    return `<path d="M${x} 0Q${x-34} ${y} ${x+6} ${y+110}" stroke="${i%3===0?'#9db48b':'#3c836f'}" stroke-width="${2+i%4}" opacity=".47" fill="none"/>`;
  }).join('');
  const engravings=Array.from({length:950},(_,i)=>{
    const x=n((i*313.71+18)%W),y=n((i*73.27+406)%H),len=6+i%12;
    return `<path d="M${x} ${y}l${len} ${i%3-1}" stroke="${i%4===0?'#e2b990':'#355461'}" stroke-width="1.6" opacity=".48"/>`;
  }).join('');
  const staticArt=`<rect width="${W}" height="${H}" fill="url(#sky)"/>
    ${[42,90,146,198].map(c=>`<ellipse cx="${c*16}" cy="300" rx="400" ry="460" fill="url(#sun)"/>`).join('')}
    ${arches}${vines}<path d="${rockPath}" fill="url(#stone)"/>
    <g clip-path="url(#rock)">${engravings}</g>
    <path d="M${contour.join('L')}" fill="none" stroke="#e2b68f" stroke-width="4"/>
    ${shelves}${obstacles}`;
  const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">${definitions}${body}</svg>\n`;
  await writeFile(new URL('composition-study.svg',directory),svg(staticArt));
  const waterFor=frame=>spec.waterVolumes.map(v=>{
    const y=frame.surfaces[v.id]*16, edge=templeShoreBounds({start:v.from,end:v.to,surface:frame.surfaces[v.id]},ground);
    return `<g clip-path="url(#basin-${v.id})"><rect x="0" y="${n(y)}" width="${W}" height="${n(H-y)}" fill="url(#water)"/></g>
      <path d="M${n(edge.left)} ${n(edge.y)}H${n(edge.right)}" fill="none" stroke="#91efdc" stroke-width="3"/>`;
  }).join('');
  const raft=(w,h)=>`<rect x="1" y="2" width="${w-2}" height="${h-4}" rx="4" fill="#8c5c41" stroke="#f3ce92" stroke-width="2"/>${Array.from({length:Math.floor(w/16)},(_,i)=>`<path d="M${8+i*16} 4v${h-8}" stroke="#c79764" stroke-width="2"/>`).join('')}`;
  const crate=(w,h)=>`<rect x="2" y="2" width="${w-4}" height="${h-4}" fill="#9a6947" stroke="#e9bd83" stroke-width="3"/><path d="M3 3L${w-3} ${h-3}M${w-3} 3L3 ${h-3}" stroke="#493c37" stroke-width="3"/>`;
  const valve=s=>`<circle cx="${s/2}" cy="${s/2}" r="${s*.36}" fill="#3d7678" stroke="#e3c18a" stroke-width="4"/><path d="M${s*.23} ${s/2}H${s*.77}M${s/2} ${s*.23}V${s*.77}" stroke="#f7dfac" stroke-width="4"/>`;
  const wheel=r=>`<circle cx="${r}" cy="${r}" r="${r-5}" fill="none" stroke="#e0c390" stroke-width="8"/>${Array.from({length:8},(_,i)=>{
    const a=i*Math.PI/4;
    return `<path d="M${r} ${r}L${n(r+Math.cos(a)*(r-8))} ${n(r+Math.sin(a)*(r-8))}" stroke="#8aaca2" stroke-width="6"/>`;
  }).join('')}<circle cx="${r}" cy="${r}" r="12" fill="#ebcea0" stroke="#50777b" stroke-width="5"/>`;
  const props=[
    ...spec.buoyantObjects.map(b=>({id:b.id,size:b.size,origin:[.5,0],paint:b.kind==='crate'?crate(...b.size):raft(...b.size)})),
    ...spec.valves.map(v=>({id:v.id,size:[36,36],origin:[.5,.5],paint:valve(36)})),
    ...spec.releases.map(v=>({id:v.id,size:[38,38],origin:[.5,.5],paint:valve(38)})),
    ...spec.gates.map(g=>{
      const h=n(Math.max(0,Math.min(g.size[1],ground(g.at[0]*16)-g.at[1]*16)));
      return {id:g.id,size:[g.size[0],h],origin:[.5,0],
        paint:`<rect x="1" y="1" width="${g.size[0]-2}" height="${Math.max(0,h-2)}" fill="#97a7a0" stroke="#f0c58f" stroke-width="2"/>`};
    }),
    {id:spec.waterwheel.id,size:[spec.waterwheel.radius*2,spec.waterwheel.radius*2],origin:[.5,.5],paint:wheel(spec.waterwheel.radius)},
    ...spec.linkedPlatforms.map(b=>({id:b.id,size:b.size,origin:[.5,0],paint:raft(...b.size)}))
  ];
  await mkdir(new URL('object-studies/',directory),{recursive:true});
  for(const prop of props){
    const [w,h]=prop.size;
    await writeFile(new URL(`object-studies/${prop.id}.svg`,directory),
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${prop.paint}</svg>\n`);
  }
  for(const frame of frames){
    const buoyant=frame.buoyantObjects.map(o=>{
      const def=props.find(p=>p.id===o.id),[w]=o.size;
      return `<g transform="translate(${n(o.position.x-w/2)} ${n(o.position.y)})">${def.paint}</g>`;
    }).join('');
    const gates=spec.gates.filter(g=>!frame.gates[g.id]).map(g=>{
      const def=props.find(p=>p.id===g.id);
      return `<g transform="translate(${g.at[0]*16-g.size[0]/2} ${g.at[1]*16})">${def.paint}</g>`;
    }).join('');
    const mechanisms=[...spec.valves,...spec.releases].map(v=>{
      const active=frame.releases?.some(r=>r.id===v.id&&r.released);
      const angle=spec.releases.some(r=>r.id===v.id)?(active?38:-38):
        ({drain:-28,hold:0,fill:28}[frame.modes[v.controller]]||0);
      return `<g transform="translate(${v.at[0]*16} ${v.at[1]*16}) rotate(${angle}) translate(-18 -18)">${valve(36)}</g>`;
    }).join('');
    const wheelPos=spec.waterwheel.at.map(v=>v*16),r=spec.waterwheel.radius;
    const waterwheel=`<g transform="translate(${wheelPos[0]} ${wheelPos[1]}) rotate(${frame.wheelActive?22:0}) translate(${-r} ${-r})">${wheel(r)}</g>`;
    const bridges=spec.linkedPlatforms.filter(b=>frame.wheelActive&&
      (!b.readyWhenSurface||frame.surfaces[b.readyWhenSurface.volume]<=b.readyWhenSurface.atMost))
      .map(b=>`<g transform="translate(${b.home[0]*16-b.size[0]/2} ${b.home[1]*16})">${raft(...b.size)}</g>`).join('');
    const label=`<rect x="20" y="18" width="920" height="60" rx="10" fill="#092737" opacity=".86"/>
      <text x="38" y="57" font-family="sans-serif" font-size="26" font-weight="bold" fill="#fff0cc">${frame.name.toUpperCase()} · TICK ${frame.tick} · ${frame.wheelActive?'WHEEL ON':'WHEEL OFF'}</text>`;
    await writeFile(new URL(`context-${frame.name}.svg`,directory),
      svg(staticArt+waterFor(frame)+buoyant+gates+mechanisms+waterwheel+bridges+label));
  }
  await writeFile(new URL('imagegen-handoff.json',directory),JSON.stringify({
    source:'phaser/levels/sunken-temple.json',
    dimensions:{width:W,height:H,tile:16},
    status:'Vector art-direction and geometry registration studies only; NOT AI-generated or approved runtime art',
    conditioning:['world-physical-rock.png','world-static-solid.png','world-static-water.png'],
    panorama:'composition-study.svg',
    stateFrames:frames.map(f=>({name:f.name,file:`context-${f.name}.svg`,tick:f.tick,surfaces:f.surfaces,wheelActive:f.wheelActive,gates:f.gates})),
    crops:[0,1024,2048].map(x=>({x,y:0,width:1536,height:1024})),
    alphaCutouts:props.map(p=>({id:p.id,file:`object-studies/${p.id}.svg`,size:p.size,origin:p.origin}))
  },null,2)+'\n');
  console.log('sunken-temple: composition, four state studies and '+props.length+' alpha object studies');
}
