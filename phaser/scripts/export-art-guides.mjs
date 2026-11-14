import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {artGuide} from '../src/art-guide.js';
import {artGuidePng} from './art-guide-png.mjs';
import {meadowDesign} from '../src/meadow-design.js';

const root=new URL('../../',import.meta.url);
const scope={};
scope.window=scope;
vm.createContext(scope);
for(const path of ['src/platform/world-compiler.js',
  'src/games/animal-adventure/chapters.js'])
  vm.runInContext(readFileSync(new URL(path,root),'utf8'),scope);

const designs=JSON.parse(await readFile(
  new URL('src/games/animal-adventure/designs.json',root),'utf8'));
const destination=new URL('dist/art-guides/',root);
await mkdir(destination,{recursive:true});

for(const chapter of scope.WW.chapters){
  const design=chapter.id==='first-forest'?
    meadowDesign(designs[chapter.id]):designs[chapter.id];
  const level=scope.WW.worldCompiler.compile(design,chapter);
  const guide=artGuide(level,chapter);
  await writeFile(new URL(chapter.id+'.svg',destination),guide.svg);
  await writeFile(new URL(chapter.id+'.png',destination),artGuidePng(level,guide.data));
  await writeFile(new URL(chapter.id+'.json',destination),
    JSON.stringify(guide.data,null,2)+'\n');
}
console.log('Exported geometry-registered art guides for '+scope.WW.chapters.length+' chapters');
