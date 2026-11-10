window.WW = window.WW || {};
WW.art = (() => {
  const sprites={
    hero:[
      '....HHHH....','...HFFFFH...','..HHFFFFHH..','..HFWFFWFH..','..HFFFFFFH..','...HMMMMH...','....HHHH....','...TTTTTT...','..TTTTTTTT..','..T.TTTT.T..','..A.TTTT.A..','....PPPP....','....P..P....','...PP..PP...','...SS..SS...', '............'
    ],
    rabbit:[
      '...E....E...','...EE..EE...','...EE..EE...','..RRRRRRRR..','..RWRRRWRR..','..RRRNNRRR..','...RRRRRR...','..RRRRRRRR..','..RRRRRRRR..','...RRRRRR...','..RR.RR.RR..','..RR.RR.RR..','...S....S...','............','............','............'
    ],
    bird:[
      '............','.....BBB....','....BBBBB...','...BWBWBB...','...BBBBBC...','....BBBB....','..BBBBBBBB..','BBBBBBBBBBBB','..BBBBBBBB..','....BBBB....','....B..B....','...Y....Y...','............','............','............','............'
    ],
    otter:[
      '............','............','...OOOOOO...','..OOOOOOOO..','..OWOOOWOO..','..OOOOOOOO..','...OONNO....','...OOOOOO...','..OOOOOOOO..','..OOOOOOOOOO','..OOOOOOOOOO','...O....O...','..OO....OO..','............','............','............'
    ],
    snack:[
      '............','.....GG.....','....GGG.....','...PPPPP....','..PPPPPPP...','..PPPPPPP...','..PPPPPPP...','...PPPPP....','....PPP.....','............','............','............','............','............','............','............'
    ]
  };
  const palette={H:'#46344e',F:'#f8c79b',W:'#ffffff',M:'#70424b',T:'#de5e7c',A:'#f5b87d',P:'#4c75c4',S:'#2a4557',E:'#e4a0b6',R:'#d8c6ad',N:'#513e47',B:'#63bfe5',C:'#ffd05e',Y:'#e99e47',O:'#ad7953',G:'#5cae66'};
  const sheet=document.createElement('canvas');sheet.width=16*5*4;sheet.height=20;const s=sheet.getContext('2d');s.imageSmoothingEnabled=false;
  Object.entries(sprites).forEach(([name,rows],index)=>{
    for(let f=0;f<4;f++)rows.forEach((row,y)=>[...row].forEach((ch,x)=>{
      if(ch==='.')return;
      let dy=y;
      if((name==='hero'||name==='rabbit')&&y>10&&f%2===1)dy+=f===1?1:-1;
      if(name==='bird'&&y>5&&f%2===1)dy-=2;
      s.fillStyle=palette[ch];s.fillRect(index*64+f*16+x+2,dy+2,1,1);
    }));
  });
  const indexes={hero:0,rabbit:1,bird:2,otter:3,snack:4};
  function draw(ctx,name,x,y,frame=0,flip=false,tint) {
    const idx=indexes[name]??0;ctx.save();ctx.translate(Math.round(x),Math.round(y));if(flip)ctx.scale(-1,1);
    ctx.drawImage(sheet,idx*64+(Math.floor(frame)%4)*16,0,16,20,-8,-17,16,20);
    if(tint){ctx.globalAlpha=.2;ctx.fillStyle=tint;ctx.fillRect(-7,-15,14,17);}
    ctx.restore();
  }
  return {draw};
})();
