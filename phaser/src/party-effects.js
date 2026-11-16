export function makePartyTextures(textures){
  const glow=textures.createCanvas('friendship-glow',128,128);
  const light=glow.context.createRadialGradient(64,64,4,64,64,63);
  light.addColorStop(0,'#ff96a8b5');
  light.addColorStop(.45,'#ff779890');
  light.addColorStop(1,'#ff5d8e00');
  glow.context.fillStyle=light;
  glow.context.fillRect(0,0,128,128);
  glow.refresh();

  const heart=textures.createCanvas('friendship-heart',32,32);
  const ink=heart.context;
  ink.beginPath();
  ink.moveTo(16,28);
  ink.bezierCurveTo(12,23,1,17,2.5,10);
  ink.bezierCurveTo(4,2,13,2,16,9);
  ink.bezierCurveTo(19,2,28,2,29.5,10);
  ink.bezierCurveTo(31,17,20,23,16,28);
  ink.closePath();
  ink.fillStyle='#ff92ac';
  ink.strokeStyle='#ffe0d7';
  ink.lineWidth=2;
  ink.fill();
  ink.stroke();
  heart.refresh();

  const cloud=textures.createCanvas('assist-cloud',192,96);
  const puff=cloud.context;
  const gradient=puff.createLinearGradient(0,10,0,87);
  gradient.addColorStop(0,'#fffdf4');
  gradient.addColorStop(.5,'#eaf9ff');
  gradient.addColorStop(1,'#9baede');
  puff.beginPath();
  puff.moveTo(31,80);
  puff.bezierCurveTo(3,79,0,43,26,38);
  puff.bezierCurveTo(29,20,49,15,65,26);
  puff.bezierCurveTo(74,0,119,1,132,26);
  puff.bezierCurveTo(148,17,165,26,167,41);
  puff.bezierCurveTo(195,43,197,75,166,80);
  puff.bezierCurveTo(131,91,66,91,31,80);
  puff.closePath();
  puff.fillStyle=gradient;
  puff.strokeStyle='#647ba7';
  puff.lineWidth=3;
  puff.fill();
  puff.stroke();
  puff.beginPath();
  puff.ellipse(98,23,20,6,-.04,0,Math.PI*2);
  puff.ellipse(46,35,8,3,-.3,0,Math.PI*2);
  puff.fillStyle='#ffffffb3';
  puff.fill();
  cloud.refresh();
}

export function friendshipArt(scene,depth){
  return {
    glow:scene.add.image(0,0,'friendship-glow').setDepth(depth).setVisible(false),
    hearts:[0,1,2].map(()=>scene.add.image(0,0,'friendship-heart').setDepth(depth+2).setVisible(false))
  };
}

export function drawFriendship(art,x,y,time,strength,width=60){
  art.glow.setVisible(strength>0);
  if(strength>0)art.glow.setPosition(x,y-width*.28).setDisplaySize(width,width*.9)
    .setAlpha(strength*(.66+.12*Math.sin(time*4)));
  for(const [i,heart] of art.hearts.entries()){
    const phase=(time*.82+i/3)%1;
    const size=(i===1?11:8)*(1+.23*phase);
    heart.setVisible(strength>0);
    if(strength>0)heart.setPosition(x+(i-1)*width*.23+Math.sin(phase*5+i)*4,
      y-width*.46-phase*23).setDisplaySize(size,size)
      .setAlpha(strength*Math.sin(Math.PI*phase));
  }
}

export function cloudArt(scene){
  return [0,1,2].map(i=>scene.add.image(0,0,'assist-cloud')
    .setDepth(i===0?29:35).setVisible(false));
}

export function drawCloud(art,x,y,time,width,engulfed){
  const bob=1+.045*Math.sin(time*6);
  art[0].setVisible(true).setPosition(x,y+4).setDisplaySize(width*bob,width*.38);
  art[1].setVisible(engulfed).setPosition(x-width*.27,y-width*.16)
    .setDisplaySize(width*.54,width*.27).setAlpha(.84);
  art[2].setVisible(engulfed).setPosition(x+width*.27,y-width*.13)
    .setDisplaySize(width*.5,width*.24).setAlpha(.83);
}
