window.WW = window.WW || {};
WW.chapters = [
  {
    id:'first-forest', name:'Mosslight Meadow', biome:'meadow', difficulty:'Discover',
    tagline:'Follow the lanterns. Win a Springaroo’s trust. Reach the canopy.',
    intro:'The old tree keeps one light. Leave berries for Springaroo, then jump to the highest branch.',
    events:[], key:'springKey',
    goals:[{kind:'springKey',name:'Canopy Light',form:'springaroo',
      hint:'Set out Blushberries. Catch a distracted Springaroo, then double-jump to the tree top.'}],
    signs:[{x:12,title:'THE PICNIC',hint:'Throw food and leave it on the ground. Creatures approach when they feel safe.'},
      {x:42,title:'THE HIGH PATH',hint:'Springaroo can jump a second time while airborne.'},
      {x:69,title:'THE CANOPY',hint:'The Canopy Light waits above. You need a second jump.'},
      {x:122,title:'THE HOMEWARD GATE',hint:'Bring back the Canopy Light to awaken the gate.'}]
  },
  {
    id:'crystal-coast', name:'Crystal Coast', biome:'coast', difficulty:'Explore',
    tagline:'Walk the shell bridges and dive beneath the shining reef.',
    intro:'Tidefox loves Nectar fruit. Lure one to the bank, make friends, and find the light underwater.',
    events:[],key:'diveKey',
    goals:[{kind:'diveKey',name:'Pearl Light',form:'tideling',
      hint:'Leave Nectar fruit for Tidefox. Transform to dive through the second lagoon.'}],
    signs:[{x:21,title:'THE TIDELINE',hint:'Tidefox follows fruit along the shore. Give it room to eat.'},
      {x:48,title:'SHELL BRIDGES',hint:'Walk on the bridge or transform into Tidefox to swim beneath.'},
      {x:113,title:'THE BLUE DEEP',hint:'The Pearl Light rests beneath the reef. Dive down to collect it.'}]
  },
  {
    id:'starfall-summit', name:'Starfall Summit', biome:'summit', difficulty:'Soar',
    tagline:'Climb the floating gardens and borrow a Moonwing’s flight.',
    intro:'Leave Stardrops near the mountain roost. A friendly Moonwing can carry you into the stars.',
    events:[],key:'skyKey',
    goals:[{kind:'skyKey',name:'Aurora Light',form:'skyling',
      hint:'Distract a Moonwing with Stardrops. Hold Jump while transformed to fly.'}],
    signs:[{x:19,title:'THE ROOST',hint:'Moonwings follow Stardrops. Keep some distance and let them eat.'},
      {x:76,title:'THE SKY PATH',hint:'Cloudwhisps are harmless. Look for the stepping stones and warm lights.'},
      {x:122,title:'THE AURORA',hint:'Keep holding Jump as Moonwing to rise through the upper gardens.'}]
  }
];