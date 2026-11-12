// A deliberately shorter, paced first chapter rather than a 260-cell march.
// Uses the SAME semantic compiler and physics as the rest of Wonderwood.
// No special collision cases or painted scenery masquerading as geometry.
export function meadowDesign(source){
  return {
    ...source,
    width:148,
    ridge:[...source.ridge.filter(([x])=>x<=143),[148,36.5]],
    water:[],
    bridges:[],
    ledges:source.ledges.filter(([x,,length])=>x+length<=148),
    creatures:[
      ['springaroo',10], // First reward: transformation and double jump
      ['glimmermoth',45],// Optional aerial creature before the climb
      ['emberkit',72],   // First telegraphed dash; bypass or bounce on its head
      ['springaroo',96], // Recovery opportunity before the upper route
      ['mossback',132]   // Optional honey ability at the quiet exit garden
    ],
    checkpoints:[57,101,139],
    snacks:[10,41,90,133],
    stars:[[35,29],[73,26],[107,21],[134,28]],
    landmarks:[
      {x:38,type:'tree'},{x:105,type:'tree'},{x:139,type:'lantern'}
    ],
    sections:[
      {id:'picnic-trail',range:[0,61],challenge:'lure-and-befriend',
        goal:'Practice feeding and catching Springaroo in a safe garden'},
      {id:'canopy-ascent',range:[61,124],challenge:'vertical-traversal',
        requires:'springaroo',goal:'Read the enemy dash, find an optional star and double-jump to the light'},
      {id:'lantern-grove',range:[124,148],challenge:'gentle-finale',
        goal:'Rest at the lantern, meet Mossback and step through the glowing gate'}
    ],
    motifs:[],
    terrainFeatures:source.terrainFeatures.filter(f=>f.center<148),
    setpieces:[
      source.setpieces[0],
      {id:'lantern-bounce-bloom',kind:'bounceBloom',section:'lantern-grove',
        x:132,target:[138,26]}
    ],
    vistas:[
      source.vistas[0],source.vistas[1],
      {id:'lantern-clearing',section:'lantern-grove',kind:'firefly-ruins',
        role:'reward',x:137,span:19}
    ],
    dressing:[
      ...source.dressing.filter(d=>d.x<148),
      {x:136,asset:'flowers',scale:1.2}
    ]
  };
}
