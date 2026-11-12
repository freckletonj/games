window.WW = window.WW || {};
// Every species can be befriended. Three grant essential traversal powers; the rest offer small encounter tools.
WW.catalog = {
  forms: {
    springaroo: {name:'Springaroo',power:'Double jump',color:'#ff98bc',favorite:'berry'},
    tideling: {name:'Tidefox',power:'Dive and swim',color:'#75eddf',favorite:'nectar'},
    skyling: {name:'Moonwing',power:'Fly upward and cast feather gusts',color:'#a4e9ff',favorite:'star'},
    mossback: {name:'Mossback',power:'Sticky honey glob',color:'#b0e18b',favorite:'berry'},
    glimmermoth: {name:'Glimmermoth',power:'Short feather-hover',color:'#f9adfa',favorite:'star'},
    prismtail: {name:'Prismtail',power:'Floating bubble',color:'#ffc18b',favorite:'berry'},
    cloudwhisp: {name:'Cloudwhisp',power:'Stunning wind blast',color:'#d5c7ff',favorite:'nectar'},
    emberkit: {name:'Emberkit',power:'Gentle spark stun',color:'#ffad79',favorite:'berry'}
  },
  creatures: {
    springaroo: {name:'Springaroo',role:'gentle hopper',favorite:'berry',color:'#ff98bc',capturable:true,tactic:'Hops in a steady rhythm. Jump over, stomp from above, or feed berries.'},
    tideling: {name:'Tidefox',role:'curious swimmer',favorite:'nectar',color:'#75eddf',capturable:true,tactic:'Patrols the shore. Lure with nectar; transformed Tidefox can dive.'},
    skyling: {name:'Moonwing',role:'moonlit flier',favorite:'star',color:'#a4e9ff',capturable:true,tactic:'Drifts in predictable arcs. Offer Stardrops to slow it for an orb.'},
    mossback: {name:'Mossback',role:'slow wanderer',favorite:'berry',color:'#b0e18b',capturable:true,tactic:'Slow grounded wanderer. Run past, hop over, or distract with berries.'},
    glimmermoth: {name:'Glimmermoth',role:'skittish flutterer',favorite:'star',color:'#f9adfa',capturable:true,tactic:'Flees from close explorers. Set out Stardrops and stay back.'},
    prismtail: {name:'Prismtail',role:'swift runner',favorite:'berry',color:'#ffc18b',capturable:true,tactic:'Pauses, then dashes in a straight line when threatened. Jump above the dash or distract it.'},
    cloudwhisp: {name:'Cloudwhisp',role:'gentle drifter',favorite:'nectar',color:'#d5c7ff',capturable:true,tactic:'Flashes a warning line, then blows a gust. Move behind it or stun it.'},
    emberkit: {name:'Emberkit',role:'territorial chaser',favorite:'berry',color:'#ffad79',capturable:true,tactic:'Approaches and telegraphs a damaging dash. Jump, head-stomp, feed, or stun it.'}
  },
  // Rideable friends are separate from the eight capturable transformations.
  // Two favorite treats (or three other treats) earn permission to mount.
  mounts: {
    unicorn: {name:'Unicorn',favorite:'berry',color:'#eec0ff',capturable:false,
      speed:5.2,jump:8.1,role:'swift land mount'},
    pegasus: {name:'Pegasus',favorite:'star',color:'#d9e9ff',capturable:false,
      speed:4.25,jump:7.3,role:'unlimited flying mount'}
  },
  foods: {
    berry: {name:'Blushberry',method:'lob',affection:1,color:'#fa73aa',speed:3.2},
    nectar: {name:'Nectar fruit',method:'lob',affection:1,color:'#82f9e5',speed:3.0},
    star: {name:'Stardrop',method:'float',affection:1,color:'#fff0a1',speed:2.9}
  }
};