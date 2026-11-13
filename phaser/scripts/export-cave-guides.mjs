import {mkdir,writeFile} from 'node:fs/promises';
import {compileCave,skywellLayout,vaultLayout} from '../src/cave-layout.js';
import {caveArtManifest,caveMaskSvg} from '../src/cave-art-guide.js';
import {caveGuidePng} from './cave-png.mjs';

const level=compileCave();
const output=new URL('../../dist/cave-guides/',import.meta.url);
await mkdir(output,{recursive:true});
await writeFile(new URL('world-physical-rock.png',output),caveGuidePng(level));
await writeFile(new URL('world-physical-rock.svg',output),caveMaskSvg(level));
for(const material of ['solid','water'])
  await writeFile(new URL('world-static-'+material+'.png',output),
    caveGuidePng(level,{layer:'static-'+material}));
await writeFile(new URL('manifest.json',output),
  JSON.stringify(caveArtManifest(level),null,2)+'\n');
console.log('Exported one '+level.width*16+' x '+level.height*16+
  ' static cave guide, sourced from gameplay geometry.');

const skywell=compileCave(skywellLayout);
const skywellOutput=new URL('skywell-ascent/',output);
await mkdir(skywellOutput,{recursive:true});
await writeFile(new URL('world-physical-rock.png',skywellOutput),
  caveGuidePng(skywell));
await writeFile(new URL('world-physical-rock.svg',skywellOutput),
  caveMaskSvg(skywell));
for(const material of ['solid','water'])
  await writeFile(new URL('world-static-'+material+'.png',skywellOutput),
    caveGuidePng(skywell,{layer:'static-'+material}));
await writeFile(new URL('manifest.json',skywellOutput),
  JSON.stringify(caveArtManifest(skywell),null,2)+'\n');
console.log('Exported Skywell Ascent '+skywell.width*16+' x '+
  skywell.height*16+' color-filled guide and resolution-independent painted reference.');

const vault=compileCave(vaultLayout);
const vaultOutput=new URL('skywell-vault-study/',output);
await mkdir(vaultOutput,{recursive:true});
for(const [name,options] of [
  ['world-physical-rock.png',{}],
  ['world-static-solid.png',{layer:'static-solid'}],
  ['world-static-water.png',{layer:'static-water'}]
])await writeFile(new URL(name,vaultOutput),caveGuidePng(vault,options));
await writeFile(new URL('world-physical-rock.svg',vaultOutput),
  caveMaskSvg(vault));
await writeFile(new URL('manifest.json',vaultOutput),
  JSON.stringify(caveArtManifest(vault),null,2)+'\n');

// These crops are IMAGE AUTHORING references, never run-time game tiles.
// Every crop is sampled at its real full-world pixel coordinates and overlaps
// neighbors. Give the model the complete guide first for global consistency.
const xs=[[0,80],[70,150],[140,220]],ys=[[0,72],[56,128]];
const patches=[];
const cropOutput=new URL('refinement/',vaultOutput);
await mkdir(cropOutput,{recursive:true});
for(const [x0,x1] of xs)for(const [y0,y1] of ys){
  const id='x'+x0+'-y'+y0,file=id+'-guide.png';
  const patch={id,x:x0*16,y:y0*16,width:(x1-x0)*16,
    height:(y1-y0)*16,guide:file,painting:id+'-painting.png'};
  await writeFile(new URL(file,cropOutput),
    caveGuidePng(vault,{from:x0,to:x1,top:y0,bottom:y1}));
  patches.push(patch);
}
await writeFile(new URL('plan.json',cropOutput),JSON.stringify({
  level:vault.cave.layout.id,world:{width:vault.width*16,height:vault.height*16},
  globalGuide:'../world-physical-rock.png',
  source:'One approved global composition conditioned on the full guide',
  cropPolicy:'Refine overlapping native-resolution patches, never upscale the global source',
  overlap:{horizontal:160,vertical:256},
  patches
},null,2)+'\n');
console.log('Exported organic Skywell vault authoring study, full-scene RGBA masks, '+
  patches.length+' coherent high-resolution crop guides. Not yet a playable painting.');
