import {writeFile,mkdir} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {artGuide} from '../src/art-guide.js';
import {artGuidePng} from './art-guide-png.mjs';
import {materialGuidePng} from './material-png.mjs';
import {campaign,compileChapter,surfaceDesigns} from '../src/campaign.js';

const root=new URL('../../',import.meta.url);
const scope={};
scope.window=scope;
vm.createContext(scope);
for(const path of ['src/platform/world-compiler.js',
  'src/games/animal-adventure/chapters.js'])
  vm.runInContext(readFileSync(new URL(path,root),'utf8'),scope);

const destination=new URL('dist/art-guides/',root);
await mkdir(destination,{recursive:true});

const chapters=campaign(scope.WW.chapters).filter(chapter=>surfaceDesigns[chapter.id]);
for(const chapter of chapters){
  const level=compileChapter(chapter,scope.WW.worldCompiler);
  const guide=artGuide(level,chapter);
  const output=new URL(chapter.id+'/',destination);
  await mkdir(output,{recursive:true});
  await writeFile(new URL('world-physical-rock.png',output),materialGuidePng(level));
  for(const material of ['solid','water'])
    await writeFile(new URL('world-static-'+material+'.png',output),
      materialGuidePng(level,{layer:'static-'+material}));

  if(level.movingPlatforms.length||level.machines.length||level.puzzleObjects.length){
    const paints=[...level.sceneFeatures,...[...level.movingPlatforms,...level.machines].map(deck=>{
      const [x,y]=deck.home,[width,height]=deck.size;
      const left=x-width/2,right=x+width/2;
      if(deck.kind==='gear')return {...deck,material:deck.id,
        polygon:Array.from({length:48},(_,i)=>{
          const angle=i*Math.PI/24;
          return [x+Math.cos(angle)*width/2,y+Math.sin(angle)*height/2];
        })
      };
      return {...deck,material:deck.id,polygon:[
        [left,y],[right,y],[right,y+height],[left,y+height]
      ]};
    })];
    for(const object of level.puzzleObjects){
      const [x,bottom]=object.home,[width,height]=object.size;
      const left=x-width/2,right=x+width/2,top=bottom-height;
      const polygon=object.kind!=='push-boulder'?
        [[left,top],[right,top],[right,bottom],[left,bottom]]:
        [[left,bottom],[left,top+height*.46],[x-width*.25,top],
          [x+width*.25,top],[right,top+height*.42],[right,bottom]];
      paints.push({...object,material:object.id,polygon});
    }
    const palette={
      air:[164,185,168,255],rock:[113,100,82,255],shelf:[180,160,140,255],
      water:[35,136,175,255]
    };
    for(const {material,color} of paints){
      const rgb=Number.parseInt(color.slice(1),16);
      palette[material]=[rgb>>16,(rgb>>8)&255,rgb&255,255];
    }
    const proposal={...level,materialColumn(x){
      const base=level.materialColumn(x);
      const spans=paints.map(({material,polygon})=>({
        material,edges:polygon.flatMap(([a,b],i)=>{
          const [c,d]=polygon[(i+1)%polygon.length];
          return (a>x)===(c>x)?[]:[b+(x-a)*(d-b)/(c-a)];
        }).sort((a,b)=>a-b)
      }));
      return y=>{
        const authored=spans.findLast(({edges})=>
          edges.some((top,i)=>i%2===0&&y>=top&&y<edges[i+1]));
        return authored?.material??base(y);
      };
    }};
    await writeFile(new URL('painted-scene-context.png',output),
      materialGuidePng(proposal,{palette}));
  }

  await writeFile(new URL(chapter.id+'.svg',destination),guide.svg);
  await writeFile(new URL(chapter.id+'.png',destination),artGuidePng(level,guide.data));
  await writeFile(new URL(chapter.id+'.json',destination),
    JSON.stringify(guide.data,null,2)+'\n');
}
console.log('Exported geometry-registered art guides for '+chapters.length+' surface chapters');
