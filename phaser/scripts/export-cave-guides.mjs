import {mkdir,writeFile} from 'node:fs/promises';
import {compileCave} from '../src/cave-layout.js';
import {caveArtManifest,caveMaskSvg} from '../src/cave-art-guide.js';
import {caveGuidePng} from './cave-png.mjs';

const level=compileCave();
const manifest=caveArtManifest(level);
const directory=new URL('../../dist/cave-guides/',import.meta.url);
await mkdir(directory,{recursive:true});

// This master control image is the complete static level, not a gameplay
// screenshot. It can be given to an image model without actors or pickups.
await writeFile(new URL('world-physical-rock.png',directory),
  caveGuidePng(level));
await writeFile(new URL('world-physical-rock.svg',directory),
  caveMaskSvg(level,{guides:true}));

for(const chunk of manifest.chunks){
  for(const plane of manifest.planes){
    const file=chunk.id+'-'+plane.id;
    await writeFile(new URL(file+'.svg',directory),
      caveMaskSvg(level,{from:chunk.from,to:chunk.to,layer:plane.id,
        guides:plane.id==='physical-rock'}));
    // Raster controls use the identical absolute-world viewBox as the SVG.
    // The optional --hires switch produces 2x masks for all four planes.
    const scale=process.argv.includes('--hires')?2:1;
    await writeFile(new URL(file+'-guide.png',directory),
      caveGuidePng(level,{from:chunk.from,to:chunk.to,
        layer:plane.id,scale}));
  }
}
await writeFile(new URL('manifest.json',directory),
  JSON.stringify(manifest,null,2)+'\n');
console.log('Exported master cave bitmap and '+manifest.chunks.length+
  ' aligned chunks × '+manifest.planes.length+
  ' static SVG/PNG guides; collision remains code-authored.');
