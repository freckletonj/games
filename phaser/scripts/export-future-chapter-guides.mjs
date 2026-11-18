// Geometry-first reference images for the three *unregistered* chapters.
// No generated image in this folder is used as collision or shipped artwork.
import {readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
import templeSpec from '../levels/sunken-temple.json' with {type:'json'};
import palaceSpec from '../levels/mirror-palace.json' with {type:'json'};
import raceSpec from '../levels/skybound-stampede.json' with {type:'json'};
import {surfaceMaterialColumn} from '../src/surface-geometry.js';
import {materialGuidePng} from './material-png.mjs';
import {validateFutureChapter} from '../src/future-chapter-validation.js';
import {createTempleState,stepTemple,setTempleValve,
  buoyantPosition} from '../src/temple-rules.js';
import {createPalaceState,stepPalace,setMirrorDetent,setPalaceShutter,
  tracePalaceBeams} from '../src/palace-rules.js';
import {createRaceState,stepRace,raceHazardPose} from '../src/race-rules.js';

const root=new URL('../../',import.meta.url);
const scope={};scope.window=scope;vm.createContext(scope);
vm.runInContext(readFileSync(new URL('src/platform/world-compiler.js',root),'utf8'),scope);
const selected=process.argv[2];
const specs=[templeSpec,palaceSpec,raceSpec].filter(spec=>
  !selected||spec.id===selected);
if(!specs.length)throw Error('Unknown chapter: '+selected);
const palette={
  air:[24,45,64,255],rock:[128,92,119,255],
  shelf:[246,196,118,255],water:[35,136,175,255],
  hazard:[242,104,85,255],moving:[130,210,125,255],
  ghost:[90,93,132,255],lit:[255,223,133,255],
  beam:[255,242,178,255],gate:[220,113,128,255],
  mount:[178,147,232,255]
};
const outputRoot=new URL('dist/future-chapter-guides/',root);
await mkdir(outputRoot,{recursive:true});

const box=(x,y,width,height,material)=>({left:x-width/2,right:x+width/2,
  top:y,bottom:y+height,material});
function contextColumn(level,water=[],objects=[],rays=[]){
  return x=>{
    const staticColumn=surfaceMaterialColumn(level,x);
    const pool=water.find(p=>x>=p.from*16&&x<p.to*16);
    const shapes=objects.filter(o=>x>=o.left&&x<o.right);
    const lines=rays.filter(r=>x>=Math.min(r.from[0],r.to[0])-3&&
      x<=Math.max(r.from[0],r.to[0])+3);
    return y=>{
      const base=staticColumn(y);
      const object=shapes.findLast(o=>y>=o.top&&y<o.bottom);
      if(object)return object.material;
      if(lines.some(r=>{
        const [x1,y1]=r.from,[x2,y2]=r.to;
        const dx=x2-x1,dy=y2-y1;
        const t=Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)));
        return Math.hypot(x-x1-t*dx,y-y1-t*dy)<3;
      }))return 'beam';
      return base==='air'&&pool&&y>=pool.surface*16&&
        y<pool.groundBottom*16?'water':base;
    };
  };
}
async function sample(directory,level,name,water,objects,rays,details){
  const materialColumn=contextColumn(level,water,objects,rays);
  await writeFile(new URL(name+'.png',directory),
    materialGuidePng({...level,materialColumn},{palette}));
  return {name,file:name+'.png',...details};
}
function repeat(state,count,step){
  for(let i=0;i<count;i++)state=step(state);
  return state;
}

for(const spec of specs){
  validateFutureChapter(spec);
  const level=scope.WW.worldCompiler.compile(spec);
  const directory=new URL(spec.id+'/',outputRoot);
  await mkdir(directory,{recursive:true});
  const staticLevel={...level,materialColumn:x=>surfaceMaterialColumn(level,x)};
  for(const [filename,layer] of [
    ['world-physical-rock.png','physical-rock'],
    ['world-static-solid.png','static-solid'],
    ['world-static-water.png','static-water']
  ])await writeFile(new URL(filename,directory),
    materialGuidePng(staticLevel,{layer}));
  const frames=[];
  if(spec.id==='sunken-temple'){
    const initial=createTempleState(spec);
    let high=repeat(initial,360,s=>stepTemple(spec,s));
    let valve=setTempleValve(spec,high,'sluice-handle','fill');
    valve=repeat(valve,400,s=>stepTemple(spec,s));
    let finale=setTempleValve(spec,valve,'cascade-handle','fill');
    finale=repeat(finale,600,s=>stepTemple(spec,s));
    for(const [name,state] of [['low-tide',initial],['high-tide',high],
      ['valve-fill',valve],['wheel-finale',finale]]){
      const water=spec.waterVolumes.map(v=>({...v,surface:state.surfaces[v.id]}));
      const buoyant=spec.buoyantObjects.map(b=>{
        const position=buoyantPosition(spec,state,b.id);
        return box(position.x,position.y,...b.size,'moving');
      });
      const gates=spec.gates.filter(g=>!state.gates[g.id])
        .map(g=>box(g.at[0]*16,g.at[1]*16,...g.size,'gate'));
      const walkway=state.wheelActive?spec.linkedPlatforms.map(p=>
        box(p.home[0]*16,p.home[1]*16,...p.size,'moving')):[];
      const objects=[...buoyant,...gates,...walkway];
      frames.push(await sample(directory,level,name,water,objects,[],{
        tick:state.tick,surfaces:state.surfaces,modes:state.modes,
        buoyantObjects:spec.buoyantObjects.map(b=>({
          id:b.id,position:buoyantPosition(spec,state,b.id),size:b.size
        })),wheelActive:state.wheelActive,gates:state.gates,
        gatePivots:spec.gates.map(g=>({id:g.id,at:g.at.map(v=>v*16),
          size:g.size})),
        valvePivots:spec.valves.map(v=>({id:v.id,at:v.at.map(n=>n*16),
          mode:state.modes[v.controller]})),
        waterwheel:{id:spec.waterwheel.id,
          at:spec.waterwheel.at.map(v=>v*16),
          radius:spec.waterwheel.radius},
        linkedPlatforms:spec.linkedPlatforms.map(p=>({id:p.id,
          position:p.home.map(v=>v*16),size:p.size,
          enabled:state.wheelActive}))
      }));
    }
  }else if(spec.id==='mirror-palace'){
    const initial=createPalaceState(spec);
    const solidAt=(x,y)=>['rock','shelf'].includes(
      surfaceMaterialColumn(level,x)(y));
    let atrium=setMirrorDetent(spec,initial,'atrium-mirror',-45);
    atrium=repeat(atrium,60,s=>stepPalace(spec,s,{solidAt}));
    let gallery=setMirrorDetent(spec,atrium,'gallery-mirror-a',-45);
    gallery=setMirrorDetent(spec,gallery,'gallery-mirror-b',-45);
    gallery=repeat(gallery,60,s=>stepPalace(spec,s,{solidAt}));
    let eclipse=setMirrorDetent(spec,gallery,'observatory-prism',-45);
    eclipse=setPalaceShutter(spec,eclipse,'eclipse-shutter','open');
    eclipse=repeat(eclipse,150,s=>stepPalace(spec,s,{solidAt}));
    for(const [name,state] of [['initial-shadow',initial],
      ['lit-atrium',atrium],['gallery-redirect',gallery],
      ['eclipse-observatory',eclipse]]){
      const light=tracePalaceBeams(spec,state,{solidAt});
      const phase=spec.phasePlatforms.map(p=>box(p.home[0]*16,
        p.home[1]*16,...p.size,state.platforms[p.id].solid?'lit':'ghost'));
      const gates=spec.beamGates.filter(g=>!state.gates[g.id])
        .map(g=>box(g.at[0]*16,g.at[1]*16,...g.size,'gate'));
      frames.push(await sample(directory,level,name,[],[...phase,...gates],
        light.segments,{
          tick:state.tick,mirrors:state.mirrors,shutters:state.shutters,
          phasePlatforms:state.platforms,gates:state.gates,
          gatePivots:spec.beamGates.map(g=>({id:g.id,
            at:g.at.map(v=>v*16),size:g.size,target:g.target})),
          controlPivots:[...spec.mirrors,...spec.shutters].map(c=>({
            id:c.id,at:c.controlAt.map(v=>v*16)})),
          beams:light.segments,litTargets:light.lit
        }));
    }
  }else{
    const p1={id:0,mount:{kind:'unicorn'}};
    const p2={id:1,mount:{kind:'unicorn'}};
    let state=createRaceState(spec);
    const snapshots=[['corral-stop',state]];
    state=stepRace(spec,state,[p1,p2]);
    state=repeat(state,360,s=>stepRace(spec,s,[p1,p2]));
    snapshots.push(['woodland-obstacles',state]);
    state=repeat(state,1000,s=>stepRace(spec,s,[p1,p2]));
    state=stepRace(spec,state,[p1,p2]);
    snapshots.push(['pegasus-sanctuary-stop',state]);
    p1.mount={kind:'pegasus'};p2.mount={kind:'pegasus'};
    state=stepRace(spec,state,[p1,p2]);
    state=repeat(state,240,s=>stepRace(spec,s,[p1,p2]));
    snapshots.push(['early-storm-flight',state]);
    state=repeat(state,370,s=>stepRace(spec,s,[p1,p2]));
    snapshots.push(['flight-climax',state]);
    for(const [name,frame] of snapshots){
      const active=frame.phase==='groundScroll'||frame.phase==='flightScroll';
      const hazards=active?spec.hazards.filter(h=>h.stage===frame.phase):[];
      const poses=hazards.map(h=>({id:h.id,
        ...raceHazardPose(h,frame.tick),size:h.size}));
      const objects=hazards.map((h,i)=>box(poses[i].x,poses[i].y,
        ...h.size,'hazard'));
      frames.push(await sample(directory,level,name,[],objects,[],{
        phase:frame.phase,tick:frame.tick,anchor:frame.anchor,
        camera:spec.camera,hazards:poses
      }));
    }
  }
  await writeFile(new URL('manifest.json',directory),JSON.stringify({
    chapter:spec.id,authoritativeSource:'phaser/levels/'+spec.id+'.json',
    physicsSource:'src/platform/world-compiler.js',
    width:level.width*16,height:level.height*16,tile:16,
    contract:'Code-authored static geometry and fixed-tick state. Not approved scene art.',
    staticLayers:['world-physical-rock.png','world-static-solid.png',
      'world-static-water.png'],
    frames
  },null,2)+'\n');
  console.log(spec.id+': '+frames.length+' deterministic geometry/context frames');
}
