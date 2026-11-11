window.WW = window.WW || {};
// Geometry is authored separately from illustration. Ridge points describe a
// continuous, walkable surface (in tile units); water hollows cut below it.
WW.worlds = (() => {
  const layouts = {
    'first-forest': {
      width:260,height:52,
      ridge:[[0,38],[18,38],[36,35],[57,32],[76,34],[94,30],[120,32],[143,37],[167,35],[189,30],[211,33],[235,29],[260,32]],
      water:[[146,166,32,11],[214,230,30,9]],
      bridges:[[145,29,9],[154,29,8],[163,29,6],[213,27,9],[222,27,9]],
      ledges:[[27,32,9],[42,28,8],[61,28,8],[83,26,8],[97,27,8],[106,24,9],[115,26,8],
        [127,30,9],[174,30,9],[190,26,9],[199,24,7],[237,25,10]],
      relic:['springKey',112,16],
      creatures:[['springaroo',19],['glimmermoth',45],['prismtail',68],['springaroo',96],
        ['mossback',131],['emberkit',176],['springaroo',196],['glimmermoth',220],['mossback',243]],
      checkpoints:[77,174,232],snacks:[10,41,90,130,177,219,246],
      stars:[[35,29],[62,25],[107,21],[134,28],[158,34],[197,21],[239,22]],
      landmarks:[{x:38,type:'tree'},{x:105,type:'tree'},{x:154,type:'pond'},{x:204,type:'tree'},{x:246,type:'lantern'}]
    },
    'crystal-coast': {
      width:294,height:60,
      ridge:[[0,42],[32,40],[49,39],[108,40],[129,37],[150,40],[223,40],[245,38],[270,40],[294,38]],
      water:[[53,104,36,15],[155,222,34,20],[238,264,35,15]],
      bridges:[[51,33,10],[63,33,9],[76,33,9],[89,33,9],[102,33,8],
        [151,31,9],[165,31,10],[180,31,10],[196,31,10],[211,31,12],[236,32,12],[250,32,13]],
      ledges:[[24,35,9],[36,33,8],[112,34,9],[132,31,8],[143,34,8],[226,33,8],[272,34,9]],
      relic:['diveKey',187,49],
      creatures:[['tideling',27],['prismtail',43],['tideling',72,41],['glimmermoth',114],
        ['tideling',139],['tideling',187,42],['mossback',230],['emberkit',269],['tideling',280]],
      checkpoints:[112,151,228],snacks:[12,44,112,146,228,268,284],
      stars:[[40,30],[77,44],[134,28],[173,43],[210,48],[249,42],[278,30]],
      landmarks:[{x:43,type:'crystal'},{x:84,type:'reef'},{x:133,type:'crystal'},
        {x:182,type:'reef'},{x:243,type:'reef'},{x:273,type:'crystal'}]
    },
    'starfall-summit': {
      width:310,height:74,
      ridge:[[0,60],[24,59],[49,55],[79,58],[108,53],[136,57],[165,52],
        [197,57],[224,54],[260,59],[282,55],[310,58]],
      water:[[83,100,54,9]],
      bridges:[[82,50,10],[91,50,11]],
      ledges:[[19,54,8],[30,49,9],[44,45,8],[57,41,8],[73,38,8],[91,44,10],
        [107,39,8],[119,35,8],[132,31,8],[147,27,8],[160,24,8],
        [174,32,9],[190,28,9],[205,24,8],[221,20,9],[236,17,8],
        [247,14,8],[261,20,9],[274,29,9],[290,48,10]],
      thermals:[[67,38,5,14],[152,25,5,24],[229,17,6,26]],
      relic:['skyKey',252,6],
      creatures:[['skyling',25],['cloudwhisp',47],['glimmermoth',88],['emberkit',109],
        ['skyling',143,28],['prismtail',187],['cloudwhisp',214,24],['skyling',239,17],['mossback',288]],
      checkpoints:[102,177,269],snacks:[9,45,97,138,183,224,279,298],
      stars:[[37,46],[75,35],[124,31],[165,20],[209,19],[245,11],[289,43]],
      landmarks:[{x:45,type:'observatory'},{x:91,type:'island'},{x:141,type:'observatory'},
        {x:196,type:'island'},{x:253,type:'observatory'},{x:290,type:'island'}]
    },
    'willow-wetlands': {
      width:324,height:62,
      ridge:[[0,43],[31,41],[60,38],[141,39],[172,42],[278,40],[304,37],[324,40]],
      water:[[66,139,35,21],[182,278,34,23]],
      bridges:[[64,32,11],[78,32,9],[91,32,8],[105,32,10],[121,32,12],
        [180,30,12],[198,30,11],[217,30,10],[235,30,11],[252,30,12],[269,30,12]],
      ledges:[[30,35,9],[48,33,9],[144,33,9],[159,36,10],[286,33,10],[301,31,8]],
      relic:['diveKey',245,52],
      creatures:[['tideling',25],['mossback',51],['tideling',90,45],['glimmermoth',146],
        ['tideling',171],['tideling',216,46],['prismtail',284],['emberkit',304]],
      checkpoints:[60,161,282],snacks:[12,54,143,175,281,310],
      stars:[[39,32],[100,49],[132,47],[162,32],[203,49],[259,49],[303,28]],
      landmarks:[{x:49,type:'pond'},{x:110,type:'reef'},{x:158,type:'tree'},
        {x:221,type:'reef'},{x:282,type:'pond'},{x:308,type:'lantern'}]
    },
    'cloud-gardens': {
      width:338,height:80,
      ridge:[[0,64],[25,61],[55,66],[89,60],[126,64],[166,61],
        [211,66],[253,62],[292,66],[338,62]],
      water:[[104,121,60,10]],
      bridges:[[102,56,10],[113,56,10]],
      ledges:[[21,58,9],[36,53,9],[51,49,8],[66,45,9],[83,42,8],[100,47,9],
        [119,41,8],[137,36,9],[153,32,8],[170,29,9],[185,39,10],
        [201,34,8],[219,28,9],[237,24,9],[252,20,8],[267,17,8],
        [281,14,9],[296,23,10],[316,42,9]],
      thermals:[[60,46,5,17],[144,34,5,20],[225,26,6,29],[275,15,6,33]],
      relic:['skyKey',285,6],
      creatures:[['skyling',23],['cloudwhisp',53],['skyling',85,44],['glimmermoth',116],
        ['emberkit',160],['skyling',194,36],['cloudwhisp',241,24],
        ['prismtail',298],['mossback',324]],
      checkpoints:[105,190,302],snacks:[12,49,99,151,201,255,310],
      stars:[[37,50],[80,39],[137,33],[176,25],[226,24],[266,13],[299,19],[321,37]],
      landmarks:[{x:53,type:'island'},{x:106,type:'observatory'},{x:164,type:'island'},
        {x:225,type:'observatory'},{x:283,type:'island'},{x:322,type:'observatory'}]
    }
  };

  function create(chapter) {
    const data=layouts[chapter.id],width=data.width,height=data.height;
    function ridgeAt(x) {
      const points=data.ridge;
      for(let i=1;i<points.length;i++)if(x<=points[i][0]){
        const [ax,ay]=points[i-1],[bx,by]=points[i];
        return ay+(by-ay)*(x-ax)/(bx-ax);
      }
      return points[points.length-1][1];
    }
    const surface=Array.from({length:width+1},(_,x)=>ridgeAt(x));
    for(const [a,b,top,depth] of data.water)for(let x=a;x<=b;x++)
      surface[x]=Math.max(surface[x],top+depth);
    const grid=Array.from({length:height},()=>Array(width).fill('empty'));
    const objects=[];
    const floorAt=x=>Math.ceil(Math.max(surface[x],surface[x+1]));
    const waterAt=x=>data.water.find(([a,b])=>x>=a&&x<b);
    function stamp(kind,x,y){objects.push({kind,x,y});}
    function platform(x,y,length,kind='platform'){
      for(let i=x;i<Math.min(width,x+length);i++)if(y>=0&&y<height)grid[y][i]=kind;
    }
    for(let x=0;x<width;x++){
      const floor=floorAt(x),pool=waterAt(x);
      if(pool)for(let y=pool[2];y<floor;y++)grid[y][x]='water';
      for(let y=floor;y<height;y++)grid[y][x]='ground';
    }
    for(const [x,y,length] of data.bridges)platform(x,y,length);
    for(const [x,y,length] of data.ledges)platform(x,y,length);
    for(const [x,y,w,h] of data.thermals||[])for(let yy=y;yy<y+h;yy++)platform(x,yy,w,'thermal');
    // Shell ledges create optional underwater routes beneath the bridge.
    for(const [a,b,top,depth] of data.water)for(let x=a+8;x<b-7;x+=15)
      platform(x,top+Math.floor(depth*.55),5);
    stamp('p1',4,floorAt(4)-1);
    stamp('p2',6,floorAt(6)-1);
    stamp('exit',width-5,floorAt(width-5)-1);
    stamp(...data.relic);
    for(const [kind,x,explicitY] of data.creatures){
      const aerial=['skyling','cloudwhisp','glimmermoth'].includes(kind);
      stamp(kind,x,explicitY??(floorAt(x)-(aerial?4:1)));
    }
    for(const x of data.checkpoints)stamp('checkpoint',x,floorAt(x)-1);
    for(const x of data.snacks)stamp('snack',x,floorAt(x)-1);
    for(const [x,y] of data.stars)stamp('starShard',x,y);
    return {width,height,grid,objects,chapter,landmarks:data.landmarks,
      surface,waterZones:data.water,decorSeed:chapter.id,warnings:[]};
  }
  const summary=Object.fromEntries(Object.entries(layouts).map(([id,data])=>
    [id,{width:data.width,height:data.height,relic:data.relic[0],creatures:data.creatures.length}]));
  return {create,summary};
})();
