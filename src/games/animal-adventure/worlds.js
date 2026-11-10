window.WW = window.WW || {};
// Three authored adventures: geometry and encounter placement are data, not random noise.
// 1 tile = 16 world units. Separate foreground stages create meaningful vertical routes.
WW.worlds = (() => {
  const layouts = {
    'first-forest': {
      width: 144, height: 42, floor: 31,
      heights: [[24,46,30],[46,84,29],[84,112,31],[112,144,30]],
      water: [[98,109]], bridges: [[97,29,7],[105,29,7]],
      ledges: [[21,27,8],[32,26,9],[42,25,8],[52,26,8],[62,24,8],
        [69,21,7],[74,26,8],[83,27,8],[117,26,9]],
      relic: ['springKey',72,16],
      creatures: [
        ['springaroo',17],['glimmermoth',31],['prismtail',46],['springaroo',57],
        ['mossback',85],['emberkit',115],['glimmermoth',130]
      ],
      checkpoints: [48,110],
      snacks: [10,37,65,92,120],
      stars: [[27,24],[44,22],[69,18],[84,24],[124,23]],
      landmarks: [{x:34,type:'tree'}, {x:69,type:'tree'}, {x:103,type:'pond'}, {x:130,type:'lantern'}]
    },
    'crystal-coast': {
      width: 157, height: 44, floor: 32,
      heights: [[19,42,31],[42,83,32],[83,116,30],[116,157,31]],
      water: [[48,72],[116,139]],
      bridges: [[46,29,8],[54,29,7],[62,29,8],[70,29,6],[114,28,8],[122,28,8],[130,28,8],[138,28,7]],
      ledges: [[24,27,9],[35,25,7],[80,26,9],[91,23,8],[101,26,9],[143,26,9]],
      relic: ['diveKey',129,37],
      creatures: [
        ['tideling',26],['prismtail',39],['glimmermoth',77],['tideling',96],
        ['mossback',106],['emberkit',145]
      ],
      checkpoints: [81,113],
      snacks: [10,33,80,104,141],
      stars: [[27,24],[61,33],[94,20],[123,34],[148,22]],
      landmarks: [{x:35,type:'crystal'}, {x:59,type:'reef'}, {x:97,type:'crystal'}, {x:128,type:'reef'}]
    },
    'starfall-summit': {
      width: 166, height: 46, floor: 36,
      heights: [[28,57,34],[57,92,33],[92,121,35],[121,166,34]],
      water: [[71,83]],
      bridges: [[69,30,8],[77,30,8]],
      ledges: [[17,31,8],[28,28,8],[38,25,8],[50,24,8],
        [64,29,7],[87,29,9],[96,26,8],[106,23,8],
        [113,20,8],[122,17,8],[130,14,8],[139,11,7],[147,26,8]],
      relic: ['skyKey',143,6],
      creatures: [
        ['skyling',23],['cloudwhisp',42],['glimmermoth',53],['emberkit',64],
        ['skyling',102],['prismtail',116],['cloudwhisp',133],['mossback',154]
      ],
      checkpoints: [60,118],
      snacks: [10,32,54,92,121,150],
      stars: [[34,23],[55,19],[79,27],[112,20],[137,10]],
      landmarks: [{x:35,type:'observatory'}, {x:75,type:'island'}, {x:114,type:'observatory'}, {x:144,type:'island'}]
    }
  };

  function create(chapter) {
    const data=layouts[chapter.id],width=data.width,height=data.height;
    const floor=Array.from({length:width},(_,x)=>{
      const section=data.heights.find(([from,to])=>x>=from&&x<to);
      return section?section[2]:data.floor;
    });
    const grid=Array.from({length:height},()=>Array(width).fill('empty'));
    const objects=[];
    function stamp(kind,x,y){objects.push({kind,x,y});}
    function platform(x,y,length){
      for(let i=x;i<Math.min(width,x+length);i++)grid[y][i]='platform';
    }
    for(let x=0;x<width;x++){
      const submerged=data.water.some(([a,b])=>x>=a&&x<b);
      for(let y=submerged?floor[x]-2:floor[x];y<height;y++){
        grid[y][x]=submerged&&y<height-1?'water':'ground';
      }
    }
    for(const [x,y,length] of data.bridges)platform(x,y,length);
    for(const [x,y,length] of data.ledges)platform(x,y,length);
    for(const [from,to] of data.water)for(let x=from;x<to;x++){
      // Broken shell shelves provide platforms for passing through the pool.
      if(x%9===0)platform(x,floor[x]-4,3);
    }
    stamp('p1',4,floor[4]-1);
    stamp('p2',6,floor[6]-1);
    stamp('exit',width-5,floor[width-5]-1);
    stamp(...data.relic);
    for(const [kind,x] of data.creatures){
      const aerial=kind==='skyling'||kind==='cloudwhisp'||kind==='glimmermoth';
      stamp(kind,x,floor[x]-(aerial?4:1));
    }
    for(const x of data.checkpoints)stamp('checkpoint',x,floor[x]-1);
    for(const x of data.snacks)stamp('snack',x,floor[x]-1);
    for(const [x,y] of data.stars)stamp('starShard',x,y);
    return {width,height,grid,objects,chapter,landmarks:data.landmarks,decorSeed:chapter.id,warnings:[]};
  }
  const summary=Object.fromEntries(Object.entries(layouts).map(([id,data])=>
    [id,{width:data.width,height:data.height,relic:data.relic[0],creatures:data.creatures.length}]));
  return {create,summary};
})();