import {mkdir,writeFile} from 'node:fs/promises';
import {compileCave} from '../src/cave-layout.js';
import {caveArtManifest,caveMaskSvg} from '../src/cave-art-guide.js';
import {caveGuidePng} from './cave-png.mjs';

const level=compileCave();
const output=new URL('../../dist/cave-guides/',import.meta.url);
await mkdir(output,{recursive:true});
await writeFile(new URL('world-physical-rock.png',output),caveGuidePng(level));
await writeFile(new URL('world-physical-rock.svg',output),caveMaskSvg(level));
await writeFile(new URL('manifest.json',output),
  JSON.stringify(caveArtManifest(level),null,2)+'\n');
console.log('Exported one '+level.width*16+' x '+level.height*16+
  ' static cave guide, sourced from gameplay geometry.');
