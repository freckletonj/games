import designs from '../../src/games/animal-adventure/designs.json' with {type:'json'};
import meadow from '../levels/first-forest.json' with {type:'json'};
import {grottoChapter} from './cave-chapter.js';
import {skywellChapter} from './skywell-chapter.js';
import {caveLayout,compileCave,skywellLayout} from './cave-layout.js';
import {validateEncounters} from './encounters.js';
import {surfaceMaterialColumn} from './surface-geometry.js';

export const surfaceDesigns={...designs,[meadow.id]:meadow};
const caves={
  [grottoChapter.id]:caveLayout,
  [skywellChapter.id]:skywellLayout
};

export function campaign(surfaceChapters){
  return [...surfaceChapters,grottoChapter,skywellChapter];
}

export function compileChapter(chapter,compiler){
  const cave=caves[chapter.id];
  if(cave)return compileCave(cave);
  const design=surfaceDesigns[chapter.id];
  if(chapter.id===meadow.id)validateEncounters(design);
  const level=compiler.compile(design,chapter);
  level.materialColumn=x=>surfaceMaterialColumn(level,x);
  return level;
}
