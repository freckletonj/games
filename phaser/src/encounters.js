// Metadata for composing reusable, testable encounters. These sections live
// in the SAME semantic design consumed by world-compiler.js, never in a
// separate collision map. Prefabs describe intent; the ridge/ledges/objects
// in the design remain authoritative for actual mechanics.
export const PREFABS=Object.freeze({
  'befriend-creature':{challenge:'lure-and-befriend'},
  'ability-ascent':{challenge:'vertical-traversal',requires:'springaroo'},
  'rest-and-exit':{challenge:'gentle-finale'}
});

export function encounter(prefab,id,range,{goal,recovery,reward,route}){
  const template=PREFABS[prefab];
  if(!template)throw Error('Unknown encounter prefab: '+prefab);
  return {id,prefab,range,challenge:template.challenge,
    ...(template.requires?{requires:template.requires}:{}),
    goal,recovery,reward,expectedRoute:route};
}

export function validateEncounters(design){
  const sections=design.sections;
  if(!sections?.length)throw Error('Encounter sections are required');
  let cursor=0;
  for(const section of sections){
    if(!PREFABS[section.prefab])throw Error('Unknown encounter prefab: '+section.prefab);
    const [start,end]=section.range;
    if(start!==cursor||end<=start||end>design.width)
      throw Error('Encounter '+section.id+' must cover a contiguous, valid range');
    cursor=end;
    if(!design.checkpoints.includes(section.recovery)||
      section.recovery<start||section.recovery>=end)
      throw Error('Encounter '+section.id+' needs a checkpoint within its range');
    if(section.requires&&!design.creatures.some(([kind,x])=>
      kind===section.requires&&x<start))
      throw Error('Encounter '+section.id+' needs '+section.requires+' before it begins');
    if(section.reward==='exit'){
      if(end!==design.width)throw Error('The exit must finish the chapter');
    }else if(section.reward===design.relic?.[0]){
      if(design.relic[1]<start||design.relic[1]>=end)
        throw Error('Encounter '+section.id+' reward is outside its range');
    }else if(!design.creatures.some(([kind,x])=>
      kind===section.reward&&x>=start&&x<end)){
      throw Error('Encounter '+section.id+' reward must exist inside its range');
    }
    const route=section.expectedRoute;
    if(!route?.length||route.some((x,i)=>x<start||x>=end||
      (i>0&&x<=route[i-1])))
      throw Error('Encounter '+section.id+' route must progress through its range');
  }
  if(cursor!==design.width)throw Error('Encounter sections must cover the whole chapter');
  return true;
}
