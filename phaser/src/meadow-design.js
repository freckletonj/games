import {encounter} from './encounters.js';

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
      encounter('befriend-creature','picnic-trail',[0,61],{
        goal:'Practice feeding and catching Springaroo in a safe garden',
        recovery:57,reward:'springaroo',route:[10,45,57]
      }),
      encounter('ability-ascent','canopy-ascent',[61,124],{
        goal:'Read the enemy dash, then double-jump toward the light',
        recovery:101,reward:'springKey',route:[72,101,106,112]
      }),
      encounter('rest-and-exit','lantern-grove',[124,148],{
        goal:'Rest at the lantern, meet Mossback and pass through the gate',
        recovery:139,reward:'exit',route:[132,139,147]
      })
    ],
    motifs:[],
    // The upper route ends at a generous double-jump height rather than an
    // exact theoretical apex that is frustrating on controllers.
    relic:['springKey',112,19],
    goalRoute:[[106,24],[109,22],[112,19]],
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
