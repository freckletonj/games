window.WW = window.WW || {};
// Three companions have distinct traversal powers. Other creatures belong to the world.
WW.catalog = {
  forms: {
    springaroo: {name:'Springaroo',power:'Double jump',color:'#ff98bc',favorite:'berry'},
    tideling: {name:'Tidefox',power:'Dive and swim',color:'#75eddf',favorite:'nectar'},
    skyling: {name:'Moonwing',power:'Fly upward',color:'#a4e9ff',favorite:'star'}
  },
  creatures: {
    springaroo: {name:'Springaroo',role:'gentle hopper',favorite:'berry',color:'#ff98bc',capturable:true},
    tideling: {name:'Tidefox',role:'curious swimmer',favorite:'nectar',color:'#75eddf',capturable:true},
    skyling: {name:'Moonwing',role:'moonlit flier',favorite:'star',color:'#a4e9ff',capturable:true},
    mossback: {name:'Mossback',role:'slow wanderer',favorite:'berry',color:'#b0e18b',capturable:false},
    glimmermoth: {name:'Glimmermoth',role:'skittish flutterer',favorite:'star',color:'#f9adfa',capturable:false},
    prismtail: {name:'Prismtail',role:'swift runner',favorite:'berry',color:'#ffc18b',capturable:false},
    cloudwhisp: {name:'Cloudwhisp',role:'gentle drifter',favorite:'nectar',color:'#d5c7ff',capturable:false},
    emberkit: {name:'Emberkit',role:'territorial chaser',favorite:'berry',color:'#ffad79',capturable:false}
  },
  foods: {
    berry: {name:'Blushberry',method:'lob',affection:1,color:'#fa73aa',speed:3.2},
    nectar: {name:'Nectar fruit',method:'lob',affection:1,color:'#82f9e5',speed:3.0},
    star: {name:'Stardrop',method:'float',affection:1,color:'#fff0a1',speed:2.9}
  }
};