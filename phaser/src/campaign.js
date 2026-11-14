import designs from '../../src/games/animal-adventure/designs.json' with {type:'json'};
import meadow from '../levels/first-forest.json' with {type:'json'};
import orchard from '../levels/clockwork-orchard.json' with {type:'json'};
import brassworks from '../levels/brassworks.json' with {type:'json'};
import {grottoChapter} from './cave-chapter.js';
import {skywellChapter} from './skywell-chapter.js';
import {caveLayout,compileCave,skywellLayout} from './cave-layout.js';
import {validateEncounters} from './encounters.js';
import {surfaceMaterialColumn} from './surface-geometry.js';

export const surfaceDesigns={...designs,[meadow.id]:meadow,[orchard.id]:orchard,[brassworks.id]:brassworks};
const orchardChapter={
  id:orchard.id,biome:orchard.biome,name:'Clockwork Orchard',difficulty:'Ride',
  tagline:'Ride a harvest lift, a ravine ferry, and a wheel gondola to the roof garden.',
  key:'springKey',goals:[{kind:'springKey',name:'Orchard Light',form:null}],
  signs:[],events:[]
};
const brassworksChapter={
  id:brassworks.id,biome:brassworks.biome,name:'The Brassworks',difficulty:'Timing',
  tagline:'Run with the conveyor, climb the turning gear train, and ride a steam launch.',
  key:'springKey',goals:[{kind:'springKey',name:'Foundry Light',form:null}],
  signs:[],events:[]
};
const caves={
  [grottoChapter.id]:caveLayout,
  [skywellChapter.id]:skywellLayout
};

export function campaign(surfaceChapters){
  return [...surfaceChapters,grottoChapter,skywellChapter,orchardChapter,brassworksChapter];
}

export function compileChapter(chapter,compiler){
  const cave=caves[chapter.id];
  if(cave)return compileCave(cave);
  const design=surfaceDesigns[chapter.id];
  if(chapter.id===meadow.id)validateEncounters(design);
  const level=compiler.compile(design,chapter);
  level.materialColumn=x=>surfaceMaterialColumn(level,x);
  level.movingPlatforms=design.movingPlatforms??[];
  level.machines=design.machines??[];
  level.sceneFeatures=design.sceneFeatures??[];
  level.recallBelow=design.recallBelow??Infinity;
  return level;
}
