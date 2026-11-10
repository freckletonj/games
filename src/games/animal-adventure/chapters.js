window.WW = window.WW || {};
WW.chapters = [
  {
    id:'first-forest', name:'Mosslight Meadow', biome:'meadow', difficulty:'Gentle',
    events:[],
    tagline:'The ancient tree, the moonlit flight and the hidden river',
    intro:'Three trails wind through the glade. Meet a Springaroo, soar with a Moonwing and dive with a Tidefox.',
    goals:[
      {kind:'springKey',name:'Canopy Gem',form:'springaroo',hint:'Springaroo: jump again in midair to reach the old tree.'},
      {kind:'skyKey',name:'Moon Gem',form:'skyling',hint:'Moonwing: hold Jump to fly into the high branches.'},
      {kind:'diveKey',name:'River Gem',form:'tideling',hint:'Tidefox: enter water, then hold Down to dive.'},
    ],
    signs:[{x:16,title:'BOUNCING GLADE',hint:'Befriend a Springaroo for a second jump.'},
      {x:100,title:'THE MYSTIC RIVER',hint:'Tidefox swims. Everyone else can use the stepping stones.'},
      {x:145,title:'MOONLIGHT GROVE',hint:'Moonwing can fly higher than any jump.'},
      {x:225,title:'THE LAST PATH',hint:'All three gems open the mossy gate.'}],
  },
  {
    id:'crystal-coast', name:'Crystal Coast', biome:'coast', difficulty:'Brisk',
    events:[{type:'sprint',start:88,finish:112,seconds:2.6,goal:'prismKey'}],
    tagline:'Luminous reefs, rushing runs and the crystal guardians',
    intro:'Dash across the tidal stones, befriend the moss guardian, then explore the submerged crystal vault.',
    goals:[
      {kind:'prismKey',name:'Prism Gem',form:'prismtail',hint:'Run the Crystal Coast speed trial from the starting arch to the finish in 2.6 seconds. Prismtail helps!'},
      {kind:'mossKey',name:'Guardian Gem',form:'mossback',hint:'Mossback armor blocks hostile magic near the crystal perch.'},
      {kind:'diveKey',name:'Pearl Gem',form:'tideling',hint:'Tidefox can swim to the deep reef vault.'},
    ],
    signs:[{x:23,title:'THE TIDEWAY',hint:'Prismtail can sprint. You can also use the floating stepping stones.'},
      {x:88,title:'THE SPEED TRIAL',hint:'Dash from this arch to the finish before the clock runs out!'},
      {x:126,title:'THE BLUE REEF',hint:'Secrets are below the ripples. Catch a Tidefox.'},
      {x:180,title:'CRYSTAL SENTINELS',hint:'A Mossback can absorb enemy spells.'},
      {x:233,title:'THE SUNKEN VAULT',hint:'Dive below the waves for the Pearl Gem.'}],
  },
  {
    id:'starfall-summit', name:'Starfall Summit', biome:'summit', difficulty:'Wondrous',
    events:[{type:'befriend',kind:'emberkit',count:2,goal:'emberKey'}],
    tagline:'Floating islands, warmhearted guardians and the aurora',
    intro:'Glide on the mountain breeze, calm Emberkits at the observatory and soar into the stars.',
    goals:[
      {kind:'cloudKey',name:'Zephyr Gem',form:'cloudwhisp',hint:'Cloudwhisp glides when you hold Jump while falling.'},
      {kind:'emberKey',name:'Hearth Gem',form:'emberkit',hint:'Befriend two Emberkits to awaken the hearth. Press Down as Emberkit to release a calming burst.'},
      {kind:'skyKey',name:'Aurora Gem',form:'skyling',hint:'Moonwing: fly up through the drifting sky gardens.'},
    ],
    signs:[{x:23,title:'THE WIND STAIRS',hint:'Cloudwhisp floats gently. Hold Jump while falling.'},
      {x:133,title:'THE STAR OBSERVATORY',hint:'Emberkit can calm a whole group with Down.'},
      {x:229,title:'ABOVE THE CLOUDS',hint:'Catch a Moonwing to reach the aurora.'},
      {x:295,title:'THE COSMIC GATE',hint:'Every gem found? The final star gate is ahead.'}],
  },
];
