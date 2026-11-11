window.WW = window.WW || {};
// Visuals only: the semantic grid in game.js is authoritative for collisions.
WW.scenery = (() => {
  const sources = window.WW_EMBEDDED_SCENES || {};
  const images = Object.fromEntries(Object.entries(sources).map(([name, source]) => {
    const image = new Image();
    image.src = source;
    return [name, image];
  }));

  const ready = name => images[name]?.complete && images[name].naturalWidth > 0;
  const url = name => sources[name] || '';

  function background(ctx, biome, cameraX, level=null) {
    const source={meadow:'backdrop',coast:'coastBackdrop',summit:'summitBackdrop'}[biome];
    const painted=ready('painted-biomes');
    if(!painted && (!source||!ready(source)))return false;
    ctx.save();
    ctx.imageSmoothingEnabled=true;
    // Alternating mirrored panorama panels join at identical painted edges.
    // Parallax keeps the backdrop moving throughout multi-screen chapters.
    const image=images[source];
    if(ready(source)){
    // Preserve the painter's aspect ratio; never squash the panorama to a
    // fixed arbitrary width as the camera advances.
    const span=image.naturalWidth*(292/image.naturalHeight),scroll=cameraX*.12;
    const first=Math.floor(scroll/span)-1;
    for(let i=first;i<first+4;i++){
      const x=i*span-scroll;
      ctx.save();
      if(Math.abs(i%2)===1){ctx.translate(x+span,0);ctx.scale(-1,1);ctx.drawImage(images[source],0,-8,span,292);}
      else ctx.drawImage(images[source],x,-8,span,292);
      ctx.restore();
    }
    }
    if(painted){
      const atlas=images['painted-biomes'],index={meadow:0,coast:1,summit:2}[biome];
      const span=atlas.naturalWidth*(292/(atlas.naturalHeight/3));
      const scroll=cameraX*.12,first=Math.floor(scroll/span)-1;
      let strength=.87;
      if(biome==='coast'){
        // Dry shores retain the brighter surface panorama. As the camera
        // approaches a *real* lagoon, blend in the submerged-ruins painting;
        // no fake pool is positioned independent of level geometry.
        const center=cameraX+240;
        strength=0;
        for(const basin of level?.waterBodies||[]){
          const a=basin.start*16,b=basin.end*16;
          const approach=Math.max(0,Math.min(1,(center-a+240)/300));
          const retreat=Math.max(0,Math.min(1,(b+240-center)/300));
          strength=Math.max(strength,approach*retreat);
        }
        strength*=.9;
      }
      ctx.globalAlpha=strength;
      for(let i=first;i<first+4;i++){
        const x=i*span-scroll;
        ctx.save();
        if(Math.abs(i%2)===1){
          ctx.translate(x+span,0);ctx.scale(-1,1);
          ctx.drawImage(atlas,0,index*atlas.naturalHeight/3,
            atlas.naturalWidth,atlas.naturalHeight/3,0,-8,span,292);
        }else{
          ctx.drawImage(atlas,0,index*atlas.naturalHeight/3,
            atlas.naturalWidth,atlas.naturalHeight/3,x,-8,span,292);
        }
        ctx.restore();
      }
    }
    ctx.restore();
    return true;
  }

  // Diffusion-painted world panels are optional. A JSON level may reference
  // embedded panels independent of its semantic collision grid. Backdrops use
  // parallax; foreground panels replace visible tiles without changing physics.
  function paintLayers(ctx, panels, cameraX=0, cameraY=0, parallax=false) {
    if(!Array.isArray(panels))return false;
    let drawn=false;
    for(const panel of panels){
      if(!ready(panel.asset))continue;
      const image=images[panel.asset];
      const x=panel.x-(parallax?cameraX*(panel.parallax??.15):0);
      const y=panel.y-(parallax?cameraY*(panel.parallax??.15):0);
      const w=panel.width??image.naturalWidth,h=panel.height??image.naturalHeight;
      if(parallax && (x>480||x+w<0||y>270||y+h<0))continue;
      if(!parallax && (x>cameraX+480||x+w<cameraX||y>cameraY+270||y+h<cameraY))continue;
      // World-space panel bounds are intentional, but non-uniform scaling is
      // not. Cover the requested viewport with a centered source crop.
      const sourceW=image.naturalWidth,sourceH=image.naturalHeight;
      const imageRatio=sourceW/sourceH,viewportRatio=w/h;
      let sx=0,sy=0,sw=sourceW,sh=sourceH;
      if(imageRatio>viewportRatio){
        sw=sourceH*viewportRatio;sx=(sourceW-sw)/2;
      }else{
        sh=sourceW/viewportRatio;sy=(sourceH-sh)/2;
      }
      ctx.drawImage(image,sx,sy,sw,sh,x,y,w,h);
      drawn=true;
    }
    return drawn;
  }

  // A lake is a continuous contained volume, not a wall of blue tiles.
  // Render its waterline once and use the same slope points as collision.
  function waterVolume(ctx, level, cameraX, time) {
    if (!level.surface || !level.waterBodies) return;
    for (const basin of level.waterBodies) {
      if (basin.end*16 < cameraX-16 || basin.start*16 > cameraX+496) continue;
      const threshold = basin.surface + .35;
      let start = basin.start, end = basin.end;
      while (start < end && level.surface[start] <= threshold) start++;
      while (end > start && level.surface[end] <= threshold) end--;
      if (end - start < 2) continue;
      const top = basin.surface*16;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(start*16, top);
      ctx.lineTo(end*16, top);
      for (let x=end; x>=start; x--) ctx.lineTo(x*16,level.surface[x]*16);
      ctx.closePath();
      ctx.clip();
      const glow=ctx.createLinearGradient(0,top,0,top+140);
      glow.addColorStop(0,'#9ae8dc9a');
      glow.addColorStop(.42,'#318cb4c4');
      glow.addColorStop(1,'#163f81cd');
      ctx.fillStyle=glow;
      ctx.fillRect(start*16,top,(end-start)*16,Math.max(180,basin.bottom*16-top));
      ctx.globalAlpha=.23;
      ctx.strokeStyle='#c9fff8';
      ctx.lineWidth=1;
      for (let y=top+26; y<basin.bottom*16; y+=28) {
        ctx.beginPath();
        for (let x=start*16; x<=end*16; x+=5) {
          const wave=y+Math.sin(x*.06+time*1.2+y*.03)*2;
          if (x===start*16) ctx.moveTo(x,wave); else ctx.lineTo(x,wave);
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle='#d6fff0b3';
      ctx.lineWidth=1.4;
      ctx.beginPath();
      for (let x=start*16; x<=end*16; x+=3) {
        const wave=top+Math.sin(x*.095+time*1.5)*.5;
        if (x===start*16) ctx.moveTo(x,wave); else ctx.lineTo(x,wave);
      }
      ctx.stroke();
    }
  }

  function paintBackdrop(ctx, panels, cameraX, cameraY){
    return paintLayers(ctx,panels,cameraX,cameraY,true);
  }

  function landmark(ctx, biome, type, time) {
    const types = {
      tree:['lanternTree',154,198],
      crystal:['crystal',108,126],
      reef:['reef',115,100],
      observatory:['observatory',117,145],
      island:['island',129,116],
      pond:['pond',118,71],
      lantern:['lantern',62,91],
      shells:['shells',110,78]
    };
    const asset=types[type];
    if(!asset)return false;
    ctx.save();
    ctx.translate(0,Math.sin(time*.8)*.65);
    const drawn=WW.illustrations.draw(ctx,asset[0],0,1,asset[1],asset[2],.97);
    ctx.restore();
    return drawn;
  }

  // Mirrored swatches repeat seamlessly in WORLD coordinates. Surface caps use
  // a 16-unit-high strip so their painted highlight starts at the same height
  // on every ledge, regardless of the platform's world Y position.
  function makePaint(image, column, top, x0, y0, width, height, tone) {
    const cw=image.naturalWidth/4,ch=image.naturalHeight/2;
    // A single generous painted crop with feathered *outer* wrap edges avoids
    // the centerline/kaleidoscope artifacts of mirrored 128px terrain swatches.
    // Fine-grained, native-pixel brush detail. The old 320px repeat was
    // nearly a full camera wide, making leaf/rock swatches enormous.
    const px=128,py=top?10:128;
    const canvas=document.createElement('canvas');
    canvas.width=px;canvas.height=py;
    const g=canvas.getContext('2d',{willReadFrequently:true});
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(image,column*cw+cw*x0,ch*y0,cw*width,ch*height,0,0,px,py);
    const imageData=g.getImageData(0,0,px,py);
    const pixels=imageData.data;
    const sample=new Uint8ClampedArray(pixels);
    const horizontal=Math.min(32,Math.floor(px/5));
    for(let y=0;y<py;y++)for(let i=0;i<horizontal;i++){
      const weight=.5-.5*Math.cos(Math.PI*i/horizontal);
      const left=(y*px+i)*4,right=(y*px+px-1-i)*4;
      for(let c=0;c<4;c++){
        const middle=(sample[left+c]+sample[right+c])/2;
        pixels[left+c]=middle*(1-weight)+sample[left+c]*weight;
        pixels[right+c]=middle*(1-weight)+sample[right+c]*weight;
      }
    }
    sample.set(pixels);
    const vertical=Math.min(top?4:32,Math.floor(py/5));
    for(let x=0;x<px;x++)for(let i=0;i<vertical;i++){
      const weight=.5-.5*Math.cos(Math.PI*i/vertical);
      const upper=(i*px+x)*4,lower=((py-1-i)*px+x)*4;
      for(let c=0;c<4;c++){
        const middle=(sample[upper+c]+sample[lower+c])/2;
        pixels[upper+c]=middle*(1-weight)+sample[upper+c]*weight;
        pixels[lower+c]=middle*(1-weight)+sample[lower+c]*weight;
      }
    }
    g.putImageData(imageData,0,0);
    if(tone){
      g.save();g.globalCompositeOperation='color';g.globalAlpha=.82;
      g.fillStyle=tone;g.fillRect(0,0,px,py);g.restore();
    }
    return g.createPattern(canvas,'repeat');
  }

  const materialTones = {
    meadow: {},
    coast: {
      ground: '#9c8774', groundTop: '#c0b69b',
      platform: '#9aafb6', platformTop: '#c6d5ce', water: '#3e9fbe'
    },
    summit: {
      ground: '#666386', groundTop: '#aca5c5',
      platform: '#7e81a6', platformTop: '#c9c6dd', water: '#568bb5'
    }
  };
  const edgeTones = {
    meadow: {rim:'#b4ddaf91',corner:'#173b4977',left:'#182d3a66',right:'#a6d0b13d'},
    coast: {rim:'#d7e6c091',corner:'#456c7877',left:'#273f5066',right:'#c2e5dd50'},
    summit: {rim:'#d0c8e791',corner:'#3d426677',left:'#20284366',right:'#d2c9f050'}
  };
  // Atlas crops contain translucent brushstrokes. Opaque solid terrain must
  // not inherit the backdrop's alpha where two painted cells meet.
  const materialBases = {
    meadow: {ground:'#41584c',platform:'#536b5e'},
    coast: {ground:'#746d5e',platform:'#778b90'},
    summit: {ground:'#514f69',platform:'#686984'}
  };
  const paints = {};
  function textures(biome) {
    if (!paints[biome]) {
      const image = images.tiles;
      const tones = materialTones[biome] || materialTones.meadow;
      paints[biome] = {
        ground: makePaint(image, 1, false, .17, .40, .76, .54, tones.ground),
        groundTop: makePaint(image, 0, true, .12, .19, .76, .28, tones.groundTop),
        // The painted floating-island cell has a transparent silhouette.
        // Sampling it as a repeating rectangle produces black hollow ledges.
        // Use the fully painted cliff interior, plus an opaque mossy cap.
        platform: makePaint(image, 1, false, .24, .35, .52, .45, tones.platform),
        platformTop: makePaint(image, 0, true, .20, .22, .60, .16, tones.platformTop),
        water: makePaint(image, 3, false, .19, .51, .62, .43, tones.water)
      };
    }
    return paints[biome];
  }

  // Paint a continuous terrain skin at sub-tile precision. The semantic
  // grid still identifies underground material; this fills the wedge between
  // coarse grid rows and the authored walkable heightfield.
  function slope(ctx, biome, x, y0, y1) {
    if(!ready('tiles'))return false;
    if(!Number.isFinite(y0)||!Number.isFinite(y1))return false;
    const p=textures(biome), edge=edgeTones[biome]||edgeTones.meadow;
    const bottom=Math.max(y0,y1)+16;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x,y0);ctx.lineTo(x+16,y1);
    ctx.lineTo(x+16,bottom);ctx.lineTo(x,bottom);ctx.closePath();
    ctx.clip();
    ctx.fillStyle=(materialBases[biome]||materialBases.meadow).ground;
    ctx.fillRect(x,Math.min(y0,y1),16,bottom-Math.min(y0,y1));
    ctx.fillStyle=p.ground;
    ctx.fillRect(x,Math.min(y0,y1),16,bottom-Math.min(y0,y1));
    if(Math.abs(y0-y1)>0.01){
      ctx.strokeStyle=edge.rim;
      ctx.lineWidth=2.3;
      ctx.beginPath();ctx.moveTo(x,y0+1);ctx.lineTo(x+16,y1+1);ctx.stroke();
      ctx.strokeStyle='#eff7d077';
      ctx.lineWidth=.8;
      ctx.beginPath();ctx.moveTo(x,y0);ctx.lineTo(x+16,y1);ctx.stroke();
    }else{
      ctx.fillStyle=p.groundTop;
      ctx.fillRect(x,y0,16,5);
    }
    ctx.restore();
    return true;
  }

  function sideShade(ctx, x, y, left, color) {
    const gradient = ctx.createLinearGradient(left ? x : x + 12, y, left ? x + 4 : x + 16, y);
    gradient.addColorStop(0, left ? color : 'transparent');
    gradient.addColorStop(1, left ? 'transparent' : color);
    ctx.fillStyle = gradient;
    ctx.fillRect(left ? x : x + 12, y, 4, 16);
  }

  // Neighbor flags represent same-kind cells; north is the actual terrain
  // above. Collisions always follow the untouched semantic grid.
  function tile(ctx, biome, kind, x, y, variant, neighbors = {}, time = 0) {
    if (!ready('tiles') || !['ground', 'platform', 'water'].includes(kind)) return false;
    const p = textures(biome), edge = edgeTones[biome] || edgeTones.meadow;
    const n = !!neighbors.n, e = !!neighbors.e, s = !!neighbors.s, w = !!neighbors.w;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.beginPath();
    ctx.rect(x, y, 16, 16);
    ctx.clip();
    if(kind!=='water'){
      ctx.fillStyle=(materialBases[biome]||materialBases.meadow)[kind];
      ctx.fillRect(x,y,16,16);
    }
    ctx.fillStyle = p[kind];
    ctx.fillRect(x, y, 16, 16);

    if (kind === 'ground') {
      if (!n && neighbors.north === 'water') {
        // Submerged soil is not a grassy surface beneath an inland pool.
        const silt = ctx.createLinearGradient(0, y, 0, y + 10);
        silt.addColorStop(0, '#2d9bb3a3');
        silt.addColorStop(1, '#265c7100');
        ctx.fillStyle = silt;
        ctx.fillRect(x, y, 16, 10);
      } else if (!n) {
        // The painted grass-cap source has translucent bristle edges. Give
        // every exposed cap the same ground-colored underpainting rather than
        // letting whichever rock swatch lies beneath alter its color.
        ctx.fillStyle = {meadow:'#547e69',coast:'#a29b85',summit:'#77739d'}[biome] || '#547e69';
        ctx.fillRect(x, y, 16, 7);
        ctx.fillStyle = p.groundTop;
        ctx.fillRect(x, y, 16, 7);
        const fade = ctx.createLinearGradient(0, y + 3, 0, y + 10);
        fade.addColorStop(0, '#5b997c30');
        fade.addColorStop(1, '#254c5900');
        ctx.fillStyle = fade;
        ctx.fillRect(x, y + 3, 16, 7);
      }
      if (!w) sideShade(ctx, x, y, true, edge.left);
      if (!e) sideShade(ctx, x, y, false, edge.right);
      if (!s) {ctx.fillStyle = '#1d36424d'; ctx.fillRect(x, y + 13, 16, 3);}
      ctx.strokeStyle = edge.rim;
      ctx.lineWidth = 1.5;
      if (!n && !w) {
        ctx.beginPath(); ctx.moveTo(x, y + 6);
        ctx.quadraticCurveTo(x, y, x + 6, y); ctx.stroke();
      }
      if (!n && !e) {
        ctx.beginPath(); ctx.moveTo(x + 10, y);
        ctx.quadraticCurveTo(x + 16, y, x + 16, y + 6); ctx.stroke();
      }
      ctx.strokeStyle = edge.corner;
      if (n && w && !neighbors.nw) {
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI / 2); ctx.stroke();
      }
      if (n && e && !neighbors.ne) {
        ctx.beginPath(); ctx.arc(x + 16, y, 5, Math.PI / 2, Math.PI); ctx.stroke();
      }
      if (s && w && !neighbors.sw) {
        ctx.beginPath(); ctx.arc(x, y + 16, 5, -Math.PI / 2, 0); ctx.stroke();
      }
      if (s && e && !neighbors.se) {
        ctx.beginPath(); ctx.arc(x + 16, y + 16, 5, Math.PI, 3 * Math.PI / 2); ctx.stroke();
      }
      // Bottom convex cliff shoulders are rock, never painted grass.
      if (!s && !w) {
        ctx.beginPath(); ctx.moveTo(x, y + 10);
        ctx.quadraticCurveTo(x, y + 16, x + 6, y + 16); ctx.stroke();
      }
      if (!s && !e) {
        ctx.beginPath(); ctx.moveTo(x + 10, y + 16);
        ctx.quadraticCurveTo(x + 16, y + 16, x + 16, y + 10); ctx.stroke();
      }
    } else if (kind === 'platform') {
      if (!n) {
        // A solid underpainting keeps grass from inheriting the cliff pattern
        // through translucent brush tips, just as with exposed ground caps.
        ctx.fillStyle = {meadow:'#66866f',coast:'#99b9b2',summit:'#9894b8'}[biome] || '#66866f';
        ctx.fillRect(x, y, 16, 7);
        ctx.fillStyle = p.platformTop;
        ctx.fillRect(x, y, 16, 7);
        ctx.strokeStyle = edge.rim;
        ctx.lineWidth = .8;
        ctx.beginPath();ctx.moveTo(x,y+2);ctx.lineTo(x+16,y+2);ctx.stroke();
      }
      if (!s) {
        const underside=ctx.createLinearGradient(0,y+11,0,y+16);
        underside.addColorStop(0,'#182a3900');
        underside.addColorStop(1,'#182a39a3');
        ctx.fillStyle=underside;
        ctx.fillRect(x,y+11,16,5);
      }
      if (!w) sideShade(ctx, x, y, true, edge.left);
      if (!e) sideShade(ctx, x, y, false, edge.right);
    } else {
      ctx.fillStyle = '#176a9e26';
      ctx.fillRect(x, y, 16, 16);
      if (!n) {
        const surface = ctx.createLinearGradient(0, y, 0, y + 7);
        surface.addColorStop(0, '#c7fff2af');
        surface.addColorStop(.4, '#65cfd570');
        surface.addColorStop(1, '#287eb000');
        ctx.fillStyle = surface;
        ctx.fillRect(x, y, 16, 7);
        // A single wave phase across a pool; never a new crest per cell.
        ctx.strokeStyle = '#e1fff0c7';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let dx = -1; dx <= 17; dx++) {
          const wx = x + dx, wy = y + 1.5 + Math.sin(wx * .12 + time * 1.7) * .45;
          if (dx === -1) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      }
      if (!w) sideShade(ctx, x, y, true, '#9ce9db8c');
      if (!e) sideShade(ctx, x, y, false, '#9ce9db8c');
      if (!s) {ctx.fillStyle = '#073b6580'; ctx.fillRect(x, y + 14, 16, 2);}
      ctx.fillStyle = '#d8fff4a1';
      if (!n && !w) {ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI / 2); ctx.fill();}
      if (!n && !e) {ctx.beginPath(); ctx.arc(x + 16, y, 3, Math.PI / 2, Math.PI); ctx.fill();}
      ctx.strokeStyle = '#a2e9dd8c';
      if (n && w && !neighbors.nw) {ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI / 2); ctx.stroke();}
      if (n && e && !neighbors.ne) {ctx.beginPath(); ctx.arc(x + 16, y, 4, Math.PI / 2, Math.PI); ctx.stroke();}
      if (s && w && !neighbors.sw) {ctx.beginPath(); ctx.arc(x, y + 16, 4, -Math.PI / 2, 0); ctx.stroke();}
      if (s && e && !neighbors.se) {ctx.beginPath(); ctx.arc(x + 16, y + 16, 4, Math.PI, 3 * Math.PI / 2); ctx.stroke();}
      if (!s && !w) {ctx.beginPath(); ctx.arc(x, y + 16, 3, -Math.PI / 2, 0); ctx.stroke();}
      if (!s && !e) {ctx.beginPath(); ctx.arc(x + 16, y + 16, 3, Math.PI, 3 * Math.PI / 2); ctx.stroke();}
    }
    ctx.restore();
    return true;
  }

  // A whole semantic span is illustrated as one connected object. Painting
  // independent 16px blocks made bridges look like detached little squares.
  // Exact top and horizontal bounds still correspond to real collision.
  function platformSpan(ctx, biome, segment, time=0) {
    if(segment.kind!=='platform')return false;
    const x=segment.x*16,y=segment.y*16,w=segment.length*16;
    const bridge=segment.style==='bridge';
    const shelf=segment.style==='shelf';
    const step=segment.style==='step';
    const palettes={
      meadow:{rock:'#455c55',body:'#6d8b6e',cap:'#8dbf8e',highlight:'#d6e9b1',
        low:'#304b45',accent:'#e8c7a0',root:'#476c59'},
      coast:{rock:'#426b75',body:'#849d9a',cap:'#c8cfb5',highlight:'#fff0d3',
        low:'#325767',accent:'#f4b6b1',root:'#6c9798'},
      summit:{rock:'#565779',body:'#8889ae',cap:'#b9b6d7',highlight:'#f0e3e2',
        low:'#3b4069',accent:'#d4b9fb',root:'#7886bc'}
    };
    const p=palettes[biome]||palettes.meadow;
    const phase=Math.sin(segment.x*1.7+segment.y*.93);
    ctx.save();
    if(bridge){
      // Real continuous wooden/shell/stone crossing; organic supports only
      // below the traversable top edge.
      const rail=ctx.createLinearGradient(0,y,0,y+15);
      rail.addColorStop(0,p.cap);rail.addColorStop(.3,p.body);
      rail.addColorStop(1,p.low);
      ctx.fillStyle=rail;ctx.beginPath();ctx.moveTo(x,y+2);
      ctx.lineTo(x+w,y+2);ctx.lineTo(x+w-4,y+13);
      ctx.quadraticCurveTo(x+w/2,y+17,x+4,y+13);
      ctx.closePath();ctx.fill();
      if(ready('tiles')){
        ctx.save();ctx.clip();ctx.globalAlpha=.78;
        ctx.fillStyle=textures(biome).platform;
        ctx.fillRect(x,y-2,w,35);ctx.restore();
      }
      ctx.strokeStyle=p.highlight;ctx.lineWidth=3.2;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(x+2,y+1);
      ctx.quadraticCurveTo(x+w/2,y-.3,x+w-2,y+1);ctx.stroke();
      ctx.strokeStyle=p.low+'b0';ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo(x+2,y+12);
      ctx.quadraticCurveTo(x+w/2,y+17,x+w-2,y+12);ctx.stroke();
      if(biome==='meadow'){
        ctx.strokeStyle=p.root;ctx.lineWidth=2;
        for(let t=12;t<w-10;t+=24){
          ctx.beginPath();ctx.moveTo(x+t,y+11);
          ctx.quadraticCurveTo(x+t-5,y+22,x+t+4,y+28+phase*2);ctx.stroke();
        }
      }else if(biome==='coast'){
        for(let t=11;t<w-8;t+=26){
          ctx.fillStyle=p.accent+'9c';ctx.beginPath();
          ctx.ellipse(x+t,y+4,6,2.2,.12,0,Math.PI*2);ctx.fill();
        }
      }else{
        ctx.fillStyle=p.highlight+'ac';
        for(let t=17;t<w-10;t+=35){
          ctx.beginPath();ctx.moveTo(x+t-4,y+4);
          ctx.lineTo(x+t+2,y+8);ctx.lineTo(x+t+9,y+4);ctx.closePath();ctx.fill();
        }
      }
    }else{
      // A single softly scalloped island of rock/roots/coral, not a rectangle.
      const base=ctx.createLinearGradient(0,y,0,y+30);
      base.addColorStop(0,p.cap);base.addColorStop(.32,p.body);
      base.addColorStop(1,p.rock);
      ctx.fillStyle=base;ctx.beginPath();ctx.moveTo(x,y+2);
      ctx.quadraticCurveTo(x+w/2,y-1,x+w,y+2);
      ctx.quadraticCurveTo(x+w+3,y+9,x+w-8,y+14);
      // An irregular rocky lower edge reads as a real island fragment;
      // the former symmetrical canoe-shaped ellipses looked like UI pills.
      ctx.lineTo(x+w*.84,y+18);
      ctx.lineTo(x+w*.71,y+16);
      ctx.lineTo(x+w*.59,y+25+(step?1:6));
      ctx.lineTo(x+w*.49,y+22);
      ctx.lineTo(x+w*.38,y+27+(step?0:7));
      ctx.lineTo(x+w*.2,y+16);
      ctx.lineTo(x+8,y+15);
      ctx.quadraticCurveTo(x-3,y+13,x,y+2);ctx.fill();
      if(ready('tiles')){
        ctx.save();ctx.clip();ctx.globalAlpha=.86;
        ctx.fillStyle=textures(biome).platform;
        ctx.fillRect(x,y-2,w,47);ctx.restore();
      }
      ctx.strokeStyle=p.highlight;ctx.lineWidth=2.8;
      ctx.beginPath();ctx.moveTo(x+2,y+1.6);
      ctx.quadraticCurveTo(x+w/2,y,x+w-2,y+1.6);ctx.stroke();
      const surface=ctx.createLinearGradient(0,y-2,0,y+7);
      surface.addColorStop(0,p.highlight+'ac');
      surface.addColorStop(1,p.cap+'20');
      ctx.fillStyle=surface;ctx.beginPath();
      ctx.ellipse(x+w/2,y+3,w*.48,4.5,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=p.low+'88';ctx.lineWidth=1.4;
      for(let t=15;t<w-9;t+=33){
        ctx.beginPath();ctx.moveTo(x+t,y+14);
        ctx.quadraticCurveTo(x+t-5,y+19,x+t+4,y+25);ctx.stroke();
      }
      if(!shelf){
        // Small authored mineral/foliage accents, attached to the same span.
        for(const i of [0,1]){
          const px=x+w*(i===0?.18:.82),py=y+1;
          ctx.fillStyle=i?p.accent:p.highlight;
          ctx.beginPath();ctx.ellipse(px,py-2.1,3.2,1.8,
            i?.25:-.25,0,Math.PI*2);ctx.fill();
        }
      }
    }
    ctx.restore();
    return true;
  }

  return {background, paintBackdrop, paintLayers, waterVolume, slope, landmark, tile, platformSpan, url, ready};
})();
