import {writeFile,mkdir} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {artGuide} from '../src/art-guide.js';
import {artGuidePng} from './art-guide-png.mjs';
import {materialGuidePng} from './material-png.mjs';
import {compileChapter} from '../src/campaign.js';

const root=new URL('../../',import.meta.url);
const scope={};
scope.window=scope;
vm.createContext(scope);
for(const path of ['src/platform/world-compiler.js',
  'src/games/animal-adventure/chapters.js'])
  vm.runInContext(readFileSync(new URL(path,root),'utf8'),scope);

const destination=new URL('dist/art-guides/',root);
await mkdir(destination,{recursive:true});

for(const chapter of scope.WW.chapters){
  const level=compileChapter(chapter,scope.WW.worldCompiler);
  const guide=artGuide(level,chapter);
  const output=new URL(chapter.id+'/',destination);
  await mkdir(output,{recursive:true});
  await writeFile(new URL('world-physical-rock.png',output),materialGuidePng(level));
  for(const material of ['solid','water'])
    await writeFile(new URL('world-static-'+material+'.png',output),
      materialGuidePng(level,{layer:'static-'+material}));

  await writeFile(new URL(chapter.id+'.svg',destination),guide.svg);
  await writeFile(new URL(chapter.id+'.png',destination),artGuidePng(level,guide.data));
  await writeFile(new URL(chapter.id+'.json',destination),
    JSON.stringify(guide.data,null,2)+'\n');
}
console.log('Exported geometry-registered art guides for '+scope.WW.chapters.length+' chapters');
