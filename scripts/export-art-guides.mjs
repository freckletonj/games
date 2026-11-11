// Diffusion conditioning material for the AI level-authoring pipeline.
// Outputs camera-matched geometry masks, annotated composition guides and
// machine-readable art jobs. No third-party dependencies or API requests.
// Usage: node scripts/export-art-guides.mjs [candidate-design.json]
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import vm from 'node:vm';

const sandbox={};
sandbox.window=sandbox;
vm.createContext(sandbox);
vm.runInContext(readFileSync('src/platform/world-compiler.js','utf8'),sandbox);
const compiler=sandbox.WW.worldCompiler;
const input=process.argv[2] || 'src/games/animal-adventure/designs.json';
const parsed=JSON.parse(readFileSync(input,'utf8'));
const designs=parsed.version===1 && parsed.id ? {[parsed.id]:parsed} : parsed;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('"','&quot;');
const path='dist/art-guides';
mkdirSync(path,{recursive:true});
const jobs=[];
const W=480,H=270,TILE=16;
const palette={
  meadow:{sky:'#aedcd1',land:'#4f785f',water:'#429ac2',platform:'#e2bd82'},
  coast:{sky:'#acd9ee',land:'#547d8b',water:'#2f9abc',platform:'#efd39d'},
  summit:{sky:'#a9b5e8',land:'#666e91',water:'#5eadd0',platform:'#f4d9aa'}
};

for(const [id,design] of Object.entries(designs)){
  const level=compiler.compile(design);
  const colors=palette[design.biome];
  for(const section of design.sections){
    const a=section.range[0]*TILE,b=section.range[1]*TILE;
    const firstX=clamp(a,0,Math.max(0,level.width*TILE-W));
    const lastX=clamp(Math.max(a,b-W),0,Math.max(0,level.width*TILE-W));
    const count=Math.max(1,Math.ceil((lastX-firstX)/400)+1);
    for(let n=0;n<count;n++){
      const cameraX=Math.round(count===1?(firstX+lastX)/2:
        firstX+(lastX-firstX)*n/(count-1));
      const sampleX=clamp(Math.round((cameraX+W/2)/TILE),0,level.width);
      const ground=level.surface[sampleX]*TILE;
      const localPlatforms=level.platformSegments.filter(p=>
        p.kind==='platform' && p.x*TILE<cameraX+W &&
        (p.x+p.length)*TILE>cameraX);
      const highPlatform=localPlatforms.length?
        Math.min(...localPlatforms.map(p=>p.y*TILE)):ground;
      const goal=level.objects.find(o=>o.kind===design.relic[0] &&
        o.x*TILE>=cameraX&&o.x*TILE<=cameraX+W);
      const views=[{name:'ground',focusY:ground-78}];
      const focusHigh=goal ? goal.y*TILE : highPlatform;
      if(focusHigh<ground-170)views.push({name:'upper',focusY:focusHigh+34});
      for(const view of views){
        const cameraY=Math.round(clamp(view.focusY-H/2,0,Math.max(0,level.height*TILE-H)));
        const idPart=[id,section.id,n+1,view.name].join('-');
        const maskFile=idPart+'.mask.svg';
        const annotatedFile=idPart+'.layout.svg';
        const rect=(x,y,w,h,fill)=>
          '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'"/>';
        const terrainStart=Math.max(0,Math.floor(cameraX/TILE)-1);
        const terrainEnd=Math.min(level.width,Math.ceil((cameraX+W)/TILE)+1);
        const contour=Array.from({length:terrainEnd-terrainStart+1},(_,i)=>{
          const x=terrainStart+i;
          return x*TILE+','+level.surface[x]*TILE;
        });
        const geometry=[
          rect(cameraX,cameraY,W,H,colors.sky),
          '<polygon points="'+(terrainStart*TILE)+','+(level.height*TILE)+' '+
            contour.join(' ')+' '+(terrainEnd*TILE)+','+(level.height*TILE)+
            '" fill="'+colors.land+'"/>'
        ];
        for(const basin of level.waterBodies){
          if(basin.end*TILE<cameraX||basin.start*TILE>cameraX+W)continue;
          const waterline=basin.surface*TILE;
          const lower=Array.from({length:basin.end-basin.start+1},(_,i)=>{
            const x=basin.end-i;
            return x*TILE+','+Math.max(level.surface[x],basin.surface)*TILE;
          });
          geometry.push('<polygon points="'+basin.start*TILE+','+waterline+
            ' '+basin.end*TILE+','+waterline+' '+lower.join(' ')+
            '" fill="'+colors.water+'"/>');
        }
        for(const p of level.platformSegments){
          if((p.x+p.length)*TILE<cameraX||p.x*TILE>cameraX+W)continue;
          geometry.push(rect(p.x*TILE,p.y*TILE,p.length*TILE,
            p.kind==='thermal'?TILE:4,
            p.kind==='thermal'?'#a7fcfa':colors.platform));
        }
        const body=geometry.join('\n');
        const svg=(extra='')=>
          '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" '+
          'viewBox="'+cameraX+' '+cameraY+' '+W+' '+H+'">'+body+extra+'</svg>\n';
        writeFileSync(path+'/'+maskFile,svg());
        const anchors=level.objects.filter(o=>
          o.x*TILE>=cameraX&&o.x*TILE<cameraX+W&&
          o.y*TILE>=cameraY&&o.y*TILE<cameraY+H)
          .map(o=>({kind:o.kind,x:o.x*TILE+8,y:o.y*TILE+8}));
        const overlay=anchors.map(o=>
          '<circle cx="'+o.x+'" cy="'+o.y+'" r="6" fill="#ffe3aa" stroke="#153a51" stroke-width="2"/>'+
          '<text x="'+(o.x+9)+'" y="'+(o.y+3)+'" fill="#11293b" font-size="9" '+
          'paint-order="stroke" stroke="#fff4d5" stroke-width="3">'+
          escape(o.kind)+'</text>').join('\n');
        writeFileSync(path+'/'+annotatedFile,svg(overlay));
        const asset=idPart.replaceAll('-','_');
        jobs.push({
          id:idPart,world:id,section:section.id,challenge:section.challenge,
          goal:section.goal,requires:section.requires||null,view:view.name,
          biome:design.biome,viewport:{x:cameraX,y:cameraY,width:W,height:H},
          output:{width:960,height:540,aspectRatio:'16:9',overlapWorldUnits:80},
          mask:'art-guides/'+maskFile,annotated:'art-guides/'+annotatedFile,
          anchors,backgroundAsset:asset+'_background',foregroundAsset:asset+'_foreground',
          notes:[
            'The semantic mask is a geometry constraint, NOT a texture to copy literally',
            'Ground boundaries, bridges and waterlines must align with the supplied mask',
            'Characters, UI text, gems, enemies and checkpoints are independent game sprites',
            'Produce transparent foreground decorations; never paint a hard obstacle into open collision space'
          ],
          backgroundPrompt:'Beautiful hand-painted '+design.biome+' panorama, '+
            section.challenge+': '+section.goal+'. A sophisticated cohesive storybook world with '+
            'atmospheric depth, directional light, subtle parallax-friendly scenery and no repeated patterns. '+
            'Render only distant background: no character, foreground terrain, water columns, UI or text. '+
            'Keep the composition spatially consistent with the attached semantic mask.',
          foregroundPrompt:'High-quality transparent foreground illustration for a family-friendly '+
            design.biome+' platform adventure. The challenge is '+section.challenge+
            '. Follow the geometry mask exactly for shoreline/ground contact, ledges, '+
            'natural vegetation and small grounded details. Maintain readable walkable terrain '+
            'and unobstructed paths. No characters, collectibles, text, fake platforms or water walls.'
        });
      }
    }
  }
}
writeFileSync('dist/art-jobs.json',JSON.stringify({
  version:1,coordinateSystem:'world pixels, down-positive',
  usage:'Generate 960x540 background and transparent foreground assets from each mask. '+
    'Import named WebP/PNG files into src/assets/scenes/panels, then reference them '+
    'in the level design art.background / art.foreground metadata.',
  jobs
},null,2)+'\n');
console.log('PASS: generated '+jobs.length+
  ' geometry-locked camera art jobs for '+Object.keys(designs).length+' worlds');
