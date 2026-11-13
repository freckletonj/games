// Deterministic, fully static reference illustration. The silhouette, basins,
// walls and shelves come directly from the same compiled geometry as physics.
// This is a procedural illustration, NOT a diffusion-model output. Replace the
// texture with a model-generated maximum-resolution image after art approval.
const rnd=n=>{
  const x=Math.sin(n*12.9898+78.233)*43758.5453;
  return x-Math.floor(x);
};
const f=n=>Number(n.toFixed(2));
const points=(level,fn,reverse=false)=>{
  const max=level.width*16;
  const xs=Array.from({length:Math.ceil(max/8)+1},
    (_,i)=>Math.min(max,i*8));
  if(reverse)xs.reverse();
  return xs.map(x=>f(x)+','+f(fn(x))).join(' ');
};

export function skywellPaintingSvg(level){
  const w=level.width*16,h=level.height*16;
  const roof=points(level,level.cave.ceilingAt);
  const roofReverse=points(level,level.cave.ceilingAt,true);
  const bed=points(level,level.cave.groundAt);
  const bedReverse=points(level,level.cave.groundAt,true);
  const rockTop='0,0 '+w+',0 '+roofReverse;
  const rockBottom='0,'+h+' '+w+','+h+' '+bedReverse;
  const air=roof+' '+bedReverse;
  const paths=[];
  paths.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <title>Skywell Ascent — static geometry-aligned cavern illustration</title>
  <desc>Only scenic rock, filled water, luminous markings and stationary ledges. No characters, pickups or UI.</desc>
  <defs>
    <linearGradient id="air" x2=".17" y2="1"><stop stop-color="#061724"/><stop offset=".53" stop-color="#143446"/><stop offset="1" stop-color="#102738"/></linearGradient>
    <linearGradient id="stone" x2=".7" y2="1"><stop stop-color="#344457"/><stop offset=".45" stop-color="#404254"/><stop offset="1" stop-color="#20283e"/></linearGradient>
    <linearGradient id="floorStone" x2=".15" y2="1"><stop stop-color="#53606a"/><stop offset=".21" stop-color="#303c52"/><stop offset="1" stop-color="#161b31"/></linearGradient>
    <linearGradient id="pool" x2=".15" y2="1"><stop stop-color="#4eb5c1"/><stop offset=".1" stop-color="#246f99"/><stop offset=".75" stop-color="#123d69"/><stop offset="1" stop-color="#102f4d"/></linearGradient>
    <linearGradient id="ledge" x2="0" y2="1"><stop stop-color="#d7b885"/><stop offset=".22" stop-color="#758376"/><stop offset="1" stop-color="#273e49"/></linearGradient>
    <linearGradient id="shaft" x2="0" y2="1"><stop stop-color="#b5f1d2" stop-opacity=".55"/><stop offset="1" stop-color="#6bcbcf" stop-opacity="0"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#b6ffdc" stop-opacity=".82"/><stop offset=".28" stop-color="#55cbbd" stop-opacity=".24"/><stop offset="1" stop-color="#55cbbd" stop-opacity="0"/></radialGradient>
    <clipPath id="walkable"><polygon points="${air}"/></clipPath>
    <clipPath id="rockClip"><polygon points="${rockTop}"/><polygon points="${rockBottom}"/></clipPath>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#air)"/>
  <g clip-path="url(#walkable)">`);
  // Parallax-like scenic depth is painted into the ONE static image.
  for(let i=0;i<21;i++){
    const x=(i+.5)*w/21;
    const radius=60+rnd(i+2)*96;
    paths.push(`<ellipse cx="${f(x)}" cy="${f(h*.36+rnd(i+54)*h*.34)}"
      rx="${f(radius)}" ry="${f(radius*2.3)}" fill="#5d7180"
      opacity="${f(.055+rnd(i+8)*.085)}"/>`);
  }
  for(let i=0;i<13;i++){
    const x=(i+.18)*w/13;
    paths.push(`<path d="M${f(x)},0 l${f(75+rnd(i+12)*105)},0
      ${f(160+rnd(i+43)*160)},${f(h*.71)} -${f(380+rnd(i+43)*180)},0 Z"
      fill="url(#shaft)" opacity="${f(.11+rnd(i+39)*.18)}"/>`);
  }
  for(const p of level.waterBodies){
    paths.push(`<rect x="${p.start*16}" y="${p.surface*16}"
      width="${(p.end-p.start)*16}" height="${h-p.surface*16}" fill="url(#pool)"/>`);
    for(let i=0;i<11;i++){
      const x=p.start*16+(i+.25)*(p.end-p.start)*16/11;
      const y=p.surface*16+4+(i%3)*5;
      paths.push(`<path d="M${f(x)},${f(y)} q24,-6 51,0"
        fill="none" stroke="#b1ebdc" stroke-width="2"
        opacity="${f(.1+rnd(i+x)*.2)}"/>`);
    }
  }
  for(let i=0;i<66;i++){
    const x=rnd(i+91)*w;
    const y=level.cave.ceilingAt(x)+20+
      rnd(i+192)*(level.cave.groundAt(x)-level.cave.ceilingAt(x)-40);
    const r=9+rnd(i+133)*34;
    paths.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r*3.1)}"
       fill="url(#glow)" opacity="${f(.3+rnd(i+31)*.4)}"/>
       <circle cx="${f(x)}" cy="${f(y)}" r="${f(.8+rnd(i)*2.2)}"
       fill="#d3f8de" opacity=".5"/>`);
  }
  paths.push('</g>');
  paths.push(`<polygon points="${rockTop}" fill="url(#stone)"/>
    <polygon points="${rockBottom}" fill="url(#floorStone)"/>
    <g clip-path="url(#rockClip)">`);
  // Detailed but static striation and crystalline deposits remain *inside*
  // collision rock, never forming false traversable platforms.
  for(let i=0;i<315;i++){
    const x=rnd(i+21)*w;
    const y=rnd(i+112)*h;
    const len=19+rnd(i+91)*100;
    paths.push(`<path d="M${f(x)},${f(y)} q${f(len*.6)},${f(-len*.2)}
      ${f(len)},${f(6+rnd(i+75)*17)}" fill="none"
      stroke="${i%4===0?'#c1baa1':'#a7b9ad'}" stroke-width="${f(.7+rnd(i+13)*2.3)}"
      opacity="${f(.035+rnd(i+52)*.11)}"/>`);
  }
  for(let i=0;i<45;i++){
    const x=(i+.4)*w/45;
    const y=level.cave.groundAt(x)+2;
    const size=8+rnd(i+100)*22;
    paths.push(`<polygon points="${f(x-size)},${f(y+size)}
       ${f(x)},${f(y-size*.18)} ${f(x+size*.33)},${f(y+size*.15)}
       ${f(x+size)},${f(y+size)}" fill="${i%3===0?'#6acfc1':'#86aead'}"
       opacity="${f(.15+rnd(i+27)*.25)}"/>`);
  }
  paths.push('</g>');
  paths.push(`<polyline points="${roof}" fill="none"
    stroke="#a2b5a0" stroke-width="7" opacity=".28"/>
    <polyline points="${bed}" fill="none"
    stroke="#acd0b2" stroke-width="8" opacity=".32"/>`);
  // Golden vertical blockers and limestone shelves match the collision model.
  for(const wall of level.climbWalls||[]){
    const x=wall.x*16,y=wall.top*16,hh=(wall.bottom-wall.top)*16;
    paths.push(`<rect x="${x-12}" y="${y}" width="24" height="${hh}"
      rx="7" fill="#3b4452" stroke="#7e9183" stroke-width="2"/>
      <path d="M${x-4},${y+7} q-7,${f(hh*.29)} 1,${f(hh*.48)}
      t0,${f(hh*.43)}" fill="none" stroke="#ffbc7b"
      stroke-width="5" opacity=".8"/>`);
    for(let i=0;i<5;i++)
      paths.push(`<circle cx="${f(x+(rnd(i+x)*12-6))}"
        cy="${f(y+(i+.55)*hh/5)}" r="${f(2+rnd(i+x+87)*4)}"
        fill="#efcd8b" opacity=".58"/>`);
  }
  for(const shelf of level.platformSegments){
    const x=shelf.x*16,y=shelf.y*16,len=shelf.length*16;
    paths.push(`<path d="M${x},${y} h${len} l-12,17 q-${f(len*.36)},10
       -${f(len*.7)},3 L${x+7},${y+13} Z"
       fill="url(#ledge)" stroke="#9eb09b" stroke-width="1.5"/>
       <path d="M${x+6},${y-2} h${len-12}" stroke="#ebd5a1"
       stroke-width="4" stroke-linecap="round" opacity=".5"/>`);
  }
  // The center of the skywell feels luminous without painting any dynamic item.
  for(const [x,y,r] of [[1620,620,255],[2380,425,330],[3030,500,240]]){
    paths.push(`<circle cx="${x}" cy="${y}" r="${r}"
      fill="url(#glow)" opacity=".45"/>`);
  }
  paths.push('</svg>');
  return paths.join('');
}
