import {mkdir,writeFile} from 'node:fs/promises';
import {compileCave} from '../src/cave-layout.js';
import {caveArtManifest,caveMaskSvg} from '../src/cave-art-guide.js';

const level=compileCave();
const manifest=caveArtManifest(level);
const directory=new URL('../../dist/cave-guides/',import.meta.url);
await mkdir(directory,{recursive:true});
for(const chunk of manifest.chunks){
  for(const plane of manifest.planes){
    const file=chunk.id+'-'+plane.id+'.svg';
    await writeFile(new URL(file,directory),
      caveMaskSvg(level,{from:chunk.from,to:chunk.to,layer:plane.id,
        guides:plane.id==='physical-rock'}));
  }
}
await writeFile(new URL('manifest.json',directory),
  JSON.stringify(manifest,null,2)+'\n');
console.log('Exported '+manifest.chunks.length+' cave chunks × '+
  manifest.planes.length+' static layers; collision remains code-authored.');
