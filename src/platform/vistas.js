window.WW = window.WW || {};
// Composed midground scenery: architecture, foliage and light are authored by
// named section beats. This layer is deliberately non-colliding and sits
// behind terrain, players, creatures, collectibles and interactive landmarks.
WW.vistas = (() => {
  const TAU=Math.PI*2, T=16;
  const colors={
    meadow:{dark:'#294f52',middle:'#54746b',light:'#b3c7a1',rim:'#dce7b7',
      leaf:'#8abf9d',flower:'#f3b5bd',glow:'#f8dfac',water:'#91d8c6'},
    coast:{dark:'#2d556f',middle:'#4e8394',light:'#a6c6b9',rim:'#e6eed9',
      leaf:'#74b8b3',flower:'#f5b3b2',glow:'#f9e5bc',water:'#8bdfe6'},
    summit:{dark:'#3c446f',middle:'#6c78aa',light:'#b3aed6',rim:'#f2e6d5',
      leaf:'#b3a9d6',flower:'#e9acd1',glow:'#eee6c4',water:'#aad9eb'}
  };
  const tint={
    'root-arch':['#537f71','#b7d7a6'],
    'elder-tree':['#457b70','#a7d6a6'],
    'lily-garden':['#4e9e90','#edd6bd'],
    'firefly-ruins':['#7e8a78','#dfd3aa'],
    'shell-cove':['#b99094','#f0d8bf'],
    'reef-arch':['#548ca0','#a4e8da'],
    'tide-temple':['#648c94','#d6ded0'],
    'sunken-ruin':['#456e82','#b2d9cf'],
    'pearl-shrine':['#8a9fad','#ffe7c7'],
    'willow-arch':['#568278','#a8d0a1'],
    'moon-gate':['#777bad','#e9dcce'],
    'wind-temple':['#8984ae','#d8e8ed'],
    'floating-garden':['#8995a9','#d5d3c5'],
    'aurora-spire':['#8988bd','#ecceec']
  };
  function ellipse(g,x,y,rx,ry,color,angle=0){
    g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,angle,0,TAU);g.fill();
  }
  function path(g,coords,fill,stroke,width=1){
    g.beginPath();g.moveTo(coords[0],coords[1]);
    for(let i=2;i<coords.length;i+=2)g.lineTo(coords[i],coords[i+1]);
    g.closePath();if(fill){g.fillStyle=fill;g.fill();}
    if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}
  }
  function light(g,x,y,size,color,opacity=.65){
    g.save();g.globalAlpha=opacity;
    const h=g.createRadialGradient(x,y,0,x,y,size);
    h.addColorStop(0,color);h.addColorStop(.27,color+'88');
    h.addColorStop(1,color+'00');
    g.fillStyle=h;g.fillRect(x-size,y-size,size*2,size*2);g.restore();
  }
  function stroke(g,from,via,to,color,width){
    g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';
    g.beginPath();g.moveTo(...from);g.quadraticCurveTo(...via,...to);g.stroke();
  }
  function prism(g,x,y,w,h,primary,lit){
    path(g,[x,y-h,x+w*.54,y-h*1.18,x+w,y-h*.18,x+w*.33,y],
      primary,lit,1.2);
    path(g,[x,y-h,x+w*.54,y-h*1.18,x+w*.34,y],
      '#ffffff19',null);
    stroke(g,[x+w*.34,y],[x+w*.43,y-h*.6],[x+w*.54,y-h*1.18],
      lit,1);
  }
  function lanterns(g,range,top,color,time){
    for(let i=0;i<9;i++){
      const x=-range+i*range/4,y=-top+7+Math.sin(i*2.7)*20;
      const sway=Math.sin(time*.85+i*1.9)*3;
      stroke(g,[x,-top+3],[x+1,y-6],[x+sway,y-2],'#becdb082',.8);
      ellipse(g,x+sway,y,2.7,3.8,color);
      light(g,x+sway,y,12,color,.33);
    }
  }
  function columns(g,c,t,underwater=false){
    for(const x of [-93,-57,57,93]){
      const h=x===-93||x===93?108:141;
      g.fillStyle=c.dark+'cc';g.fillRect(x-10,-h,20,h+7);
      const side=g.createLinearGradient(x-10,0,x+12,0);
      side.addColorStop(0,c.dark);side.addColorStop(.55,t[0]);
      side.addColorStop(1,c.light);
      g.fillStyle=side;g.fillRect(x-7,-h,14,h);
      g.fillStyle=t[1]+'aa';g.fillRect(x-12,-h-6,24,8);
      g.fillStyle=c.dark+'99';g.fillRect(x-11,-17,22,7);
      for(let j=0;j<3;j++)stroke(g,[x-4,-h+14+j*18],
        [x,-h+16+j*18],[x+5,-h+14+j*18],c.rim+'66',.7);
      if(underwater){
        for(let j=0;j<3;j++)ellipse(g,x+Math.sin(j*3+x)*11,-h*.32-j*14,
          2.4,4.5,c.water+'99',-.3);
      }
    }
  }
  function gate(g,c,t,style,time){
    // A real architectural opening with visible far scenery in its center.
    const outer=g.createLinearGradient(0,-190,0,0);
    outer.addColorStop(0,t[1]);outer.addColorStop(.55,t[0]);outer.addColorStop(1,c.dark);
    g.strokeStyle=c.dark;g.lineWidth=28;g.lineCap='butt';
    g.beginPath();g.moveTo(-109,7);g.lineTo(-109,-105);
    g.bezierCurveTo(-108,-229,108,-229,109,-105);g.lineTo(109,7);g.stroke();
    g.strokeStyle=outer;g.lineWidth=19;g.stroke();
    g.strokeStyle=c.rim+'b2';g.lineWidth=2.4;
    g.beginPath();g.moveTo(-100,-5);g.lineTo(-100,-104);
    g.bezierCurveTo(-100,-217,100,-217,100,-104);g.lineTo(100,-5);g.stroke();
    for(const x of [-108,108])for(let i=0;i<5;i++){
      stroke(g,[x-9,-18-i*23],[x,-13-i*23],[x+10,-18-i*23],
        c.rim+'66',1);
    }
    if(style==='shell'){
      for(let i=0;i<7;i++){
        const a=Math.PI*1.08+(i/6)*Math.PI*.84;
        prism(g,Math.cos(a)*109,Math.sin(a)*81-98,13,24,
          i%2?c.flower:t[1],c.rim);
      }
    }
    if(style==='moon'){
      light(g,0,-134,68,c.glow,.35);
      g.strokeStyle=t[1];g.lineWidth=6;g.beginPath();
      g.arc(0,-121,62,-Math.PI*.05,Math.PI*1.1);g.stroke();
      for(let i=0;i<11;i++){
        const a=i*TAU/11+time*.08;
        ellipse(g,Math.cos(a)*75,Math.sin(a)*54-130,2.5,2.5,c.rim);
      }
    }
  }
  function wooded(g,c,t,kind,time){
    const willow=kind==='willow-arch',elder=kind==='elder-tree';
    const trunk=g.createLinearGradient(-45,0,42,0);
    trunk.addColorStop(0,c.dark);trunk.addColorStop(.46,t[0]);trunk.addColorStop(1,c.dark);
    if(elder){
      g.strokeStyle=trunk;g.lineWidth=48;g.lineCap='round';
      g.beginPath();g.moveTo(0,12);g.bezierCurveTo(-8,-65,17,-135,0,-207);g.stroke();
      stroke(g,[0,-135],[-68,-188],[-119,-181],t[0],19);
      stroke(g,[5,-175],[57,-236],[110,-201],t[0],16);
      stroke(g,[-4,-79],[-71,-116],[-94,-108],t[0],12);
    }else{
      for(const side of [-1,1]){
        g.strokeStyle=trunk;g.lineWidth=29;g.lineCap='round';
        g.beginPath();g.moveTo(side*103,15);
        g.bezierCurveTo(side*129,-94,side*64,-191,0,-202);g.stroke();
        stroke(g,[side*85,-105],[side*54,-156],[side*12,-168],
          c.rim+'65',2);
      }
    }
    const crown=elder?[[0,-222,76,37],[-93,-190,56,34],[93,-203,53,33],
      [-41,-247,51,33],[49,-251,58,31]]:
      [[-85,-187,55,32],[86,-188,57,32],[-32,-226,66,38],[39,-227,66,38]];
    for(const [x,y,rx,ry] of crown){
      ellipse(g,x,y+7,rx+5,ry+4,c.dark+'8b');
      ellipse(g,x,y,rx,ry,c.leaf+'c4');
      ellipse(g,x-rx*.15,y-ry*.35,rx*.67,ry*.42,t[1]+'9a',-.2);
    }
    for(const side of [-1,1]){
      for(let k=0;k<4;k++)
        stroke(g,[side*(50+k*9),-183],[side*(53+k*9),-142],
          [side*(47+k*8)+Math.sin(time*.7+k)*2,-83+k*7],
          c.leaf+'ad',willow?3:1.6);
      path(g,[side*80,0,side*92,10,side*125,18,side*116,9,side*92,-10],
        c.dark+'b5',null);
    }
    lanterns(g,110,191,c.glow,time);
    if(elder){
      light(g,0,-190,67,c.glow,.43);
      WW.illustrations.draw(g,'lanternTree',0,7,102,135,.74);
    }
  }
  function reef(g,c,t,kind,time){
    const shore=kind==='shell-cove',lily=kind==='lily-garden';
    if(lily){
      for(const side of [-1,1]){
        for(let i=0;i<5;i++){
          const x=side*(48+i*16), h=60+i%3*19;
          stroke(g,[x,10],[x+side*7,-h*.63],[x+side*6,-h],
            c.leaf+'d0',3+i%2);
          ellipse(g,x+side*6,-h,6,12,i%2?t[1]:c.flower,.35);
        }
      }
      for(let i=-2;i<=2;i++){
        ellipse(g,i*26,1,24,6,c.leaf+'b5');
        ellipse(g,i*26-3,-1,8,3,c.rim+'b0');
      }
      light(g,0,-81,77,c.glow,.35);
      return;
    }
    for(const side of [-1,1]){
      g.strokeStyle=t[0];g.lineWidth=26;g.lineCap='round';
      g.beginPath();g.moveTo(side*112,13);
      g.bezierCurveTo(side*94,-110,side*65,-165,side*1,-160);g.stroke();
      stroke(g,[side*107,2],[side*89,-97],[side*4,-153],
        t[1],5);
      for(let i=0;i<8;i++){
        const x=side*(89-i*10), y=-35-i*14;
        stroke(g,[x,y],[x-side*12,y-13],[x-side*10,y-27],
          i%2?c.flower:t[1],3.5);
        ellipse(g,x-side*10,y-26,4,6,c.rim+'c9');
      }
    }
    if(shore){
      for(let i=0;i<9;i++){
        const angle=Math.PI+i*Math.PI/8;
        path(g,[0,-144,Math.cos(angle)*76,-116+Math.sin(angle)*41,
          Math.cos(angle+.06)*81,-113+Math.sin(angle+.06)*45],
          c.rim+'66',null);
      }
      ellipse(g,0,-143,14,17,t[1]);
    }else{
      for(let i=0;i<15;i++){
        const x=(i*37)%220-110, y=-35-(i*41)%129;
        ellipse(g,x+Math.sin(time*.36+i)*2,y,2.1+(i%3),3.4,c.water+'8b');
      }
      light(g,0,-135,85,c.water,.4);
    }
  }
  function monument(g,c,t,kind,time){
    const underwater=kind==='sunken-ruin';
    const shrine=kind==='pearl-shrine';
    const ruined=kind==='firefly-ruins';
    columns(g,c,t,underwater);
    if(ruined){
      path(g,[-122,-136,-79,-165,-22,-174,20,-161,73,-166,122,-138,
        104,-129,61,-145,13,-139,-32,-150,-94,-135],
        t[0],c.rim+'85',2);
      lanterns(g,98,163,c.glow,time);
    }else{
      gate(g,c,t,shrine?'shell':'plain',time);
      if(shrine){
        light(g,0,-150,80,c.glow,.6);
        ellipse(g,0,-153,20,20,c.rim+'ac');
        ellipse(g,-5,-159,8,8,'#ffffffaa');
      }else{
        path(g,[-125,-143,0,-188,125,-143,115,-130,0,-172,-115,-130],
          t[1]+'b7',c.rim+'8a',2);
      }
    }
    for(const x of [-118,-76,76,118]){
      prism(g,x,0,17,24,t[0],c.rim);
    }
    if(underwater){
      for(let i=0;i<7;i++){
        const x=-117+i*39;
        stroke(g,[x,5],[x+7,-16],[x+Math.sin(i*2+time*.5)*6,-41],
          c.leaf+'af',2);
      }
    }
  }
  function sky(g,c,t,kind,time){
    const floating=kind==='floating-garden',spire=kind==='aurora-spire';
    if(floating){
      // Far-background islands stay translucent: never a fake walkable ledge.
      path(g,[-137,-67,-83,-83,5,-80,74,-90,135,-69,92,-45,
        44,9,-24,34,-72,-17,-106,-46],t[0]+'bd',c.rim+'99',2);
      path(g,[-130,-68,-72,-93,26,-89,121,-74,71,-61,-57,-65],
        c.leaf+'b0',null);
      for(const x of [-70,67])
        stroke(g,[x,-69],[x+10,-35],[x-13,6],c.leaf+'7b',2.5);
      columns(g,c,t);
      g.save();g.translate(0,-76);g.scale(.73,.7);
      gate(g,c,t,'moon',time);g.restore();
    }else if(spire){
      light(g,0,-157,104,c.glow,.55);
      for(let side of [-1,1])for(let i=0;i<3;i++){
        const x=side*(39+i*35);
        prism(g,x,4,25,89+i*16,i%2?t[0]:c.dark,c.rim);
      }
      prism(g,-29,7,60,240,t[0],t[1]);
      path(g,[-9,-222,3,-246,15,-220,6,-199],c.rim,c.flower,1.2);
      for(let i=0;i<16;i++){
        const a=i*TAU/16;
        ellipse(g,Math.cos(a)*79,Math.sin(a)*69-155,
          2.4,2.4,i%2?c.glow:c.rim);
      }
    }else{
      gate(g,c,t,'moon',time);
      for(let i=0;i<4;i++){
        const s=i%2?-1:1,x=s*(40+i*23);
        stroke(g,[x,-18],[x+s*14,-46],[x+s*17,-100-i*13],
          c.water+'b5',2.2);
      }
      if(kind==='wind-temple'){
        for(let i=0;i<4;i++){
          g.strokeStyle=c.water+'95';g.lineWidth=2.1;
          g.beginPath();g.ellipse(0,-109+i*11,55+i*8,13,-.25,0,TAU);g.stroke();
        }
      }
    }
  }
  function paintOne(g,v,biome,time){
    const c=colors[biome]||colors.meadow,t=tint[v.kind];
    // Grand silhouettes must fit the 270-unit camera as compositions, not
    // crop into unrecognizable fragments when a player walks beneath them.
    const scale=Math.min(1.08,v.span*16/340);
    g.save();g.translate((v.x+.5)*T,v.y*T);g.scale(scale,scale);
    g.globalAlpha=.93;
    // Composite existing painted atlases into each architectural arrangement:
    // procedural geometry makes the pieces connect, while hand-painted
    // foliage, stone and coral give the scene an organic tactile surface.
    const painted={
      'root-arch':[['lanternTree',-98,12,112,143,.65],
        ['lanternTree',101,13,108,139,.61]],
      'lily-garden':[['pond',0,14,167,79,.78],
        ['flowers',-93,2,63,48,.87],['flowers',94,1,61,51,.87]],
      'firefly-ruins':[['lantern',-105,3,62,100,.84],
        ['stones',77,4,77,63,.76]],
      'shell-cove':[['shells',-104,16,94,74,.86],
        ['shells',104,14,94,69,.81]],
      'reef-arch':[['reef',-94,8,113,105,.82],
        ['reef',99,11,107,100,.78]],
      'tide-temple':[['shells',-108,13,92,61,.73],
        ['reef',96,11,91,100,.65]],
      'sunken-ruin':[['reef',-112,12,116,105,.8],
        ['shells',105,13,103,72,.79]],
      'pearl-shrine':[['crystal',-99,14,89,114,.67],
        ['shells',101,11,99,76,.72]],
      'willow-arch':[['lanternTree',-103,13,117,148,.65],
        ['lanternTree',101,11,115,145,.57]],
      'moon-gate':[['observatory',-80,14,97,122,.55],
        ['moonStone',99,5,65,71,.83]],
      'wind-temple':[['observatory',-106,14,99,125,.66],
        ['moonStone',110,7,87,91,.68]],
      'floating-garden':[['island',0,26,226,159,.89],
        ['moonStone',-92,1,75,81,.75]],
      'aurora-spire':[['crystal',-87,8,117,147,.72],
        ['crystal',99,11,90,118,.63]]
    }[v.kind]||[];
    for(const [asset,x,y,w,h,opacity] of painted)
      WW.illustrations.draw(g,asset,x,y,w,h,opacity);
    // Connected silhouette geometry gives the individual paintings purpose.
    light(g,0,-120,170,v.kind.includes('reef')?c.water:c.glow,.19);
    if(['root-arch','elder-tree','willow-arch'].includes(v.kind))
      wooded(g,c,t,v.kind,time);
    else if(['lily-garden','shell-cove','reef-arch'].includes(v.kind))
      reef(g,c,t,v.kind,time);
    else if(['moon-gate','wind-temple','floating-garden','aurora-spire'].includes(v.kind))
      sky(g,c,t,v.kind,time);
    else monument(g,c,t,v.kind,time);
    // Slow, site-specific motes: not a uniform layer of randomly scattered dots.
    for(let i=0;i<13;i++){
      const x=((i*89+v.x*11)%254)-127;
      const y=-25-((i*47+v.x*3)%198);
      const twinkle=.35+.4*(.5+.5*Math.sin(time*1.1+i*2.4));
      g.globalAlpha=twinkle;
      ellipse(g,x+Math.sin(time*.4+i)*1.5,y,1.5+(i%3)*.55,1.3,
        i%3===0?c.glow:c.rim);
    }
    g.restore();
  }
  function draw(g,level,cameraX,cameraY,time){
    if(!Array.isArray(level.vistas))return;
    const biome=level.biome||level.chapter?.biome||'meadow';
    for(const v of level.vistas){
      const x=(v.x+.5)*T,y=v.y*T,r=v.span*T*.65;
      if(x+r<cameraX-65||x-r>cameraX+545||
         y+80<cameraY-65||y-v.span*T>cameraY+335)continue;
      paintOne(g,v,biome,time);
    }
  }
  function atmosphere(g,level,cameraX,time){
    if(!Array.isArray(level.vistas)||!level.vistas.length)return;
    // Distinct lighting per scene, blended naturally as the player travels.
    for(const v of level.vistas){
      const x=(v.x+.5)*T-cameraX;
      if(x < -500||x>980)continue;
      const palette=colors[level.biome]||colors.meadow;
      const rayX=240+(x-240)*.23;
      const halo=g.createRadialGradient(rayX,80,4,rayX,80,250);
      halo.addColorStop(0,palette.glow+'33');
      halo.addColorStop(.65,palette.flower+'12');
      halo.addColorStop(1,palette.glow+'00');
      g.save();g.fillStyle=halo;g.fillRect(0,0,480,270);g.restore();
    }
  }
  return {draw,atmosphere};
})();
