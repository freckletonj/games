import designs from '../../src/games/animal-adventure/designs.json' with {type:'json'};
import meadow from '../levels/first-forest.json' with {type:'json'};
import orchard from '../levels/clockwork-orchard.json' with {type:'json'};
import sealPlan from '../levels/stonewake-seal.json' with {type:'json'};
import stonewake from '../levels/stonewake-hollow.json' with {type:'json'};
import brassworks from '../levels/brassworks.json' with {type:'json'};
import {grottoChapter} from './cave-chapter.js';
import {skywellChapter} from './skywell-chapter.js';
import {caveLayout,compileCave,skywellLayout} from './cave-layout.js';
import {validateEncounters} from './encounters.js';
import {compileRockPolygons,rockContains} from './cave-solids.js';
import {surfaceMaterialColumn} from './surface-geometry.js';

export const surfaceDesigns={...designs,[meadow.id]:meadow,[orchard.id]:orchard,[brassworks.id]:brassworks,[stonewake.id]:stonewake};
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
const stonewakeChapter={
  id:stonewake.id,biome:stonewake.biome,name:'Stonewake Hollow',difficulty:'Puzzle',
  tagline:'Befriend three creatures and use their powers to open a path through the hollow.',
  key:'springKey',goals:[{kind:'springKey',name:'Hollow Light',form:null}],
  signs:[],events:[]
};
const caves={
  [grottoChapter.id]:caveLayout,
  [skywellChapter.id]:skywellLayout
};

export function campaign(surfaceChapters){
  return [...surfaceChapters,grottoChapter,skywellChapter,orchardChapter,brassworksChapter,stonewakeChapter];
}

export function compileChapter(chapter,compiler){
  const cave=caves[chapter.id];
  if(cave)return compileCave(cave);
  const design=surfaceDesigns[chapter.id];
  if(chapter.id===meadow.id)validateEncounters(design);
  const level=compiler.compile(design,chapter);
  level.rockPolygons=compileRockPolygons(design.rockPolygons,level.width,level.height);
  level.materialColumn=x=>{
    const base=surfaceMaterialColumn(level,x);
    const rocks=level.rockPolygons.filter(rock=>x>=rock.left&&x<=rock.right);
    return y=>rockContains(rocks,x,y)?'rock':base(y);
  };
  level.puzzleObjects=(design.puzzleObjects??[]).map(object=>
    object.kind==='breakable-wall'?
      {...object,size:sealPlan.size,fracture:sealPlan.bands}:object);
  level.movingPlatforms=design.movingPlatforms??[];
  level.machines=design.machines??[];
  level.sceneFeatures=design.sceneFeatures??[];
  level.recallBelow=design.recallBelow??Infinity;
  return level;
}
