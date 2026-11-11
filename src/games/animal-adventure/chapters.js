window.WW = window.WW || {};
WW.chapters = [
  {
    id:'first-forest', name:'Mosslight Meadow', biome:'meadow', difficulty:'Discover',
    tagline:'Climb the mossy hills, cross the creek, and discover the canopy.',
    intro:'The old tree keeps one light. Leave berries for Springaroo, then jump to the highest branch.',
    events:[{type:'trail',name:'Canopy Rings',seconds:13,nodes:[[97,26],[108,23],[117,25],[134,29]]}], key:'springKey',
    goals:[{kind:'springKey',name:'Canopy Light',form:'springaroo',
      hint:'Set out Blushberries. Catch a distracted Springaroo, then double-jump to the tree top.'}],
    signs:[{x:12,title:'THE PICNIC',hint:'Throw food and leave it on the ground. Creatures approach when they feel safe.'},
      {x:42,title:'THE HIGH PATH',hint:'Springaroo can jump a second time while airborne.'},
      {x:69,title:'THE CANOPY',hint:'The Canopy Light waits above. You need a second jump.'},
      {x:122,title:'THE HOMEWARD GATE',hint:'Bring back the Canopy Light to awaken the gate.'}]
  },
  {
    id:'crystal-coast', name:'Crystal Coast', biome:'coast', difficulty:'Explore',
    tagline:'Cross the shell bridges and explore the deep reef.',
    intro:'Tidefox loves Nectar fruit. Lure one to the bank, make friends, and find the light underwater.',
    events:[{type:'trail',name:'Reef Rings',seconds:15,nodes:[[165,42],[180,46],[196,49],[211,45]]}],key:'diveKey',
    goals:[{kind:'diveKey',name:'Pearl Light',form:'tideling',
      hint:'Leave Nectar fruit for Tidefox. Transform to dive through the second lagoon.'}],
    signs:[{x:21,title:'THE TIDELINE',hint:'Tidefox follows fruit along the shore. Give it room to eat.'},
      {x:48,title:'SHELL BRIDGES',hint:'Walk on the bridge or transform into Tidefox to swim beneath.'},
      {x:113,title:'THE BLUE DEEP',hint:'The Pearl Light rests beneath the reef. Dive down to collect it.'}]
  },
  {
    id:'starfall-summit', name:'Starfall Summit', biome:'summit', difficulty:'Soar',
    tagline:'Scale the wind-carved mountain and flap between sky islands.',
    intro:'Leave Stardrops near the mountain roost. A friendly Moonwing can carry you into the stars.',
    events:[{type:'trail',name:'Starlight Rings',seconds:16,nodes:[[190,27],[206,23],[222,19],[238,16]]}],key:'skyKey',
    goals:[{kind:'skyKey',name:'Aurora Light',form:'skyling',
      hint:'Distract a Moonwing with Stardrops. Tap Jump repeatedly for wingbeats.'}],
    signs:[{x:19,title:'THE ROOST',hint:'Moonwings follow Stardrops. Keep some distance and let them eat.'},
      {x:76,title:'THE SKY PATH',hint:'Cloudwhisps are harmless. Look for the stepping stones and warm lights.'},
      {x:122,title:'THE AURORA',hint:'Tap Jump for each wingbeat. Release and tap again to gain height.'}]
  },
  {
    id:'willow-wetlands', name:'Willow Wetlands', biome:'coast', difficulty:'Dive',
    tagline:'Two expansive lagoons, hidden shelves, and a pearl below the reeds.',
    intro:'Follow the river beyond the weeping willows. A Tidefox can swim below the floating shell bridges.',
    events:[{type:'trail',name:'River Rings',seconds:17,nodes:[[198,43],[215,48],[235,51],[252,46]]}],key:'diveKey',
    goals:[{kind:'diveKey',name:'River Pearl',form:'tideling',
      hint:'Befriend a Tidefox and swim down through the second deep lagoon.'}],
    signs:[{x:28,title:'THE WILLOWS',hint:'Tidefox enjoys Nectar. Give a treat and wait nearby.'},
      {x:94,title:'THE SUNKEN PATH',hint:'Swim beneath the shell bridges; the river has two routes.'},
      {x:203,title:'THE DEEP POOL',hint:'Dive with Down as Tidefox to reach the riverbed.'}]
  },
  {
    id:'cloud-gardens', name:'Cloud Gardens', biome:'summit', difficulty:'Fly',
    tagline:'A long aerial ascent above the clouds, with floating sanctuaries.',
    intro:'Find a Moonwing, then climb the gardens with well-timed wingbeats and rising air currents.',
    events:[{type:'trail',name:'Skygarden Rings',seconds:17,nodes:[[220,27],[238,23],[253,19],[268,16]]}],key:'skyKey',
    goals:[{kind:'skyKey',name:'Sky Lantern',form:'skyling',
      hint:'Borrow Moonwing wings. Tap Jump for each flap; ride the bright updrafts.'}],
    signs:[{x:22,title:'FIRST WINGBEAT',hint:'Tap Jump, release, then tap again to keep flapping.'},
      {x:146,title:'THE UPDRAFT',hint:'Shimmering columns of air help a Moonwing climb.'},
      {x:272,title:'THE SKY LANTERN',hint:'Use the high gardens to reach the lantern.'}]
  }
];