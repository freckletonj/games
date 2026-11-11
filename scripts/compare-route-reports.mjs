// Compare two real-physics evaluation runs to guide focused AI revisions.
// Usage: node scripts/compare-route-reports.mjs before.json after.json
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';

if(process.argv.length!==4){
  throw Error('Usage: node scripts/compare-route-reports.mjs before.json after.json');
}
const before=JSON.parse(readFileSync(process.argv[2],'utf8'));
const after=JSON.parse(readFileSync(process.argv[3],'utf8'));
const key=(world,section)=>world+'/'+section;
const index=report=>new Map(report.worlds.flatMap(world=>
  world.sections.map(section=>[key(world.id,section.id),section])));
const earlier=index(before),later=index(after);
const changes=[],summary={improved:0,regressed:0,unchanged:0,added:0,removed:0};
for(const name of new Set([...earlier.keys(),...later.keys()])){
  const previous=earlier.get(name),current=later.get(name);
  let verdict='unchanged',delta=null;
  if(!previous)verdict='added';
  else if(!current)verdict='removed';
  else{
    const oldProgress=previous.furthestProgress;
    const newProgress=current.furthestProgress;
    delta=Number((newProgress-oldProgress).toFixed(3));
    if((!previous.crossed&&current.crossed) || delta>=.12)verdict='improved';
    if((previous.crossed&&!current.crossed) || delta<=-.12)verdict='regressed';
  }
  summary[verdict]++;
  changes.push({
    section:name,verdict,
    before:previous ? {crossed:previous.crossed,progress:previous.furthestProgress} : null,
    after:current ? {crossed:current.crossed,progress:current.furthestProgress} : null,
    delta,notes:current?.notes||[]
  });
}
const result={
  note:'Comparison of repeatable scripted movement probes, NOT proof of human playability',
  summary,changes
};
mkdirSync('dist',{recursive:true});
writeFileSync('dist/route-comparison.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(summary));
for(const change of changes.filter(c=>c.verdict==='regressed')){
  console.log('REGRESSION '+change.section+': '+change.delta);
}
