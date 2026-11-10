window.WW = window.WW || {};
// Painted-look visual props. Collision and interactions remain in the level data.
WW.props = (() => {
  const styles = {
    meadow:['#71533f','#c7a075','#8acb99','#ffdf9d'],
    coast:['#46677a','#a9d7cc','#78e2cf','#aafcff'],
    summit:['#55577c','#cbbce7','#b1acef','#f6bbf8']
  };
  const colors = biome => styles[biome] || styles.meadow;
  function polygon(ctx,points,fill,stroke,width=1) {
    ctx.beginPath();ctx.moveTo(...points[0]);
    for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);
    ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  }
  function glow(ctx,x,y,color,radius,alpha=.38) {
    const g=ctx.createRadialGradient(x,y,0,x,y,radius);
    g.addColorStop(0,color);
    g.addColorStop(.25,color+'77');
    g.addColorStop(1,color+'00');
    ctx.globalAlpha=alpha;ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }
  function sign(ctx,x,y,title,biome,time) {
    const [wood,edge,,light]=colors(biome);
    ctx.save();ctx.translate(Math.round(x),Math.round(y));
    polygon(ctx,[[-3,1],[-5,-49],[-4,-67],[3,-66],[4,-47],[4,1]],wood,'#273e44',1);
    ctx.strokeStyle=edge;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-2,-63);ctx.quadraticCurveTo(0,-25,-1,-4);ctx.stroke();
    glow(ctx,0,-68,light,20,.37+.08*Math.sin(time*2+x));
    ctx.fillStyle=light;ctx.beginPath();ctx.arc(0,-68,2.2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#53413d';ctx.fillRect(-1,-73,2,4);
    ctx.shadowColor='#162b36';ctx.shadowBlur=4;ctx.shadowOffsetY=3;
    const grain=ctx.createLinearGradient(0,-64,0,-45);
    grain.addColorStop(0,edge);grain.addColorStop(.16,wood);grain.addColorStop(1,'#2b4050');
    polygon(ctx,[[-25,-63],[-29,-60],[-28,-47],[-24,-44],[25,-44],[29,-49],[29,-60],[25,-63]],grain,'#2b424a',1.5);
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.strokeStyle=edge;ctx.lineWidth=.9;
    ctx.beginPath();ctx.moveTo(-23,-59);ctx.lineTo(23,-59);
    ctx.moveTo(-22,-47);ctx.lineTo(21,-47);ctx.stroke();
    ctx.fillStyle='#f3deb4';
    for(const a of [-25,25]){ctx.beginPath();ctx.arc(a,-54,1,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#fff3cf';ctx.globalAlpha=.2;ctx.lineWidth=.7;
    for(let i=0;i<6;i++){
      const yy=-60+i*2.4,offset=((x*17+i*19)%13)-6;
      ctx.beginPath();ctx.moveTo(offset-16,yy);ctx.quadraticCurveTo(offset,yy+.8,offset+15,yy);ctx.stroke();
    }
    ctx.globalAlpha=1;ctx.fillStyle='#fff3d5';
    ctx.textAlign='center';ctx.textBaseline='middle';
    let font=7.1;
    do{ctx.font='bold '+font+'px system-ui,sans-serif';if(ctx.measureText(title).width<=46)break;font-=.3;}while(font>4.2);
    ctx.shadowColor='#142d32';ctx.shadowBlur=2;
    ctx.fillText(title,0,-53,48);ctx.restore();
  }
  function gate(ctx,x,y,open,biome,time) {
    const [,edge,,light]=colors(biome);
    ctx.save();ctx.translate(x,y+7);
    ctx.fillStyle='#102b3e44';ctx.beginPath();ctx.ellipse(0,1,20,4,0,0,Math.PI*2);ctx.fill();
    const stone=ctx.createLinearGradient(-16,-43,16,-2);
    stone.addColorStop(0,edge);stone.addColorStop(.45,'#586b7e');stone.addColorStop(1,'#344451');
    ctx.shadowColor='#112a34';ctx.shadowBlur=6;ctx.shadowOffsetY=3;
    polygon(ctx,[[-17,0],[-17,-24],[-13,-36],[-7,-43],[7,-43],[13,-36],[17,-24],[17,0],[11,0],[11,-23],[8,-30],[3,-33],[-3,-33],[-8,-30],[-11,-23],[-11,0]],stone,'#b6c9b590',1.1);
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    const portal=ctx.createLinearGradient(-11,-30,11,0);
    portal.addColorStop(0,open?'#1e98a1':'#181c47');
    portal.addColorStop(.55,open?'#6be5be':'#353365');
    portal.addColorStop(1,open?'#a6ffd6':'#202744');
    ctx.fillStyle=portal;ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(-10,-22);
    ctx.quadraticCurveTo(-10,-37,0,-36);ctx.quadraticCurveTo(10,-37,10,-22);
    ctx.lineTo(10,0);ctx.closePath();ctx.fill();
    if(open) {
      glow(ctx,0,-19,light,25,.26+.09*Math.sin(time*3));
      ctx.strokeStyle='#d7fff5';ctx.lineWidth=.85;
      for(let i=0;i<3;i++){
        const yy=-25+i*9+Math.sin(time*2+i)*2;ctx.globalAlpha=.53;
        ctx.beginPath();ctx.moveTo(-6,yy);ctx.quadraticCurveTo(0,yy-3,6,yy);ctx.stroke();
      }ctx.globalAlpha=1;
    }else{
      polygon(ctx,[[0,-25],[5,-19],[0,-12],[-5,-19]],null,'#c4a9d6',1);
      ctx.strokeStyle='#c4a9d6';ctx.beginPath();ctx.moveTo(0,-25);ctx.lineTo(0,-12);ctx.stroke();
    }
    ctx.strokeStyle=edge;ctx.globalAlpha=.82;ctx.lineWidth=.8;
    for(const side of [-1,1])for(let i=0;i<3;i++){
      const sx=side*14,sy=-6-i*9;
      ctx.beginPath();ctx.moveTo(sx-side*2,sy);ctx.lineTo(sx,sy-3);ctx.lineTo(sx+side*2,sy);ctx.stroke();
    }
    ctx.globalAlpha=1;ctx.fillStyle=edge;ctx.fillRect(-20,-2,40,3);ctx.restore();
  }
  function checkpoint(ctx,x,y,lit,biome,time) {
    const [,edge,moss,light]=colors(biome);
    ctx.save();ctx.translate(x,y+8);
    ctx.strokeStyle='#253b49';ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(-1,1);ctx.lineTo(-1,-33);ctx.stroke();
    ctx.strokeStyle=edge;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(-2,-31);ctx.lineTo(-2,-1);ctx.stroke();
    if(lit)glow(ctx,8,-27,light,18,.35+.08*Math.sin(time*3));
    const cloth=ctx.createLinearGradient(0,-33,0,-19);
    cloth.addColorStop(0,moss);cloth.addColorStop(1,lit?'#d3be80':'#567c91');
    polygon(ctx,[[0,-33],[16,-32],[14,-26],[18,-23],[0,-23]],cloth,edge,.8);
    ctx.strokeStyle='#fff7d288';ctx.lineWidth=.75;
    ctx.beginPath();ctx.moveTo(3,-29);ctx.lineTo(12,-29);ctx.stroke();
    ctx.fillStyle=lit?'#ffe8ab':light;
    ctx.beginPath();ctx.arc(7,-27,1.3,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function light(ctx,x,y,color,time) {
    ctx.save();ctx.translate(x,y);
    glow(ctx,0,0,color,19,.42+.08*Math.sin(time*3));
    const ring=8+Math.sin(time*3)*1.5;
    ctx.strokeStyle=color;ctx.globalAlpha=.65;ctx.lineWidth=.8;
    ctx.beginPath();ctx.ellipse(0,0,ring,ring*.48,-time*.4,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=1;ctx.rotate(Math.sin(time*2)*.08);
    const glass=ctx.createLinearGradient(-5,-9,7,8);
    glass.addColorStop(0,'#fff9ec');glass.addColorStop(.38,color);glass.addColorStop(1,'#568ba9');
    polygon(ctx,[[0,-10],[6,-4],[5,5],[0,10],[-5,5],[-6,-4]],glass,'#fffce3',.8);
    polygon(ctx,[[0,-9],[0,9],[-5,5],[-6,-4]],'#ffffff35');
    polygon(ctx,[[0,-9],[6,-4],[5,5],[0,9]],'#16395a24');
    ctx.fillStyle='#fffdf8';ctx.beginPath();ctx.arc(-2,-4,1.3,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function star(ctx,x,y,time) {
    ctx.save();ctx.translate(x,y);
    glow(ctx,0,0,'#fff3b1',14,.3+.08*Math.sin(time*4));
    ctx.rotate(Math.sin(time*3)*.12);
    const g=ctx.createLinearGradient(-5,-7,5,7);
    g.addColorStop(0,'#fffff5');g.addColorStop(.45,'#ffebac');g.addColorStop(1,'#efac70');
    ctx.beginPath();
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5-Math.PI/2,r=i%2?3.4:8;
      if(i===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);
      else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
    }
    ctx.closePath();ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#fffadd';ctx.lineWidth=.75;ctx.stroke();
    ctx.restore();
  }
  return {sign,gate,checkpoint,light,star};
})();
