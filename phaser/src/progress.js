// Small, versioned campaign ledger. Keep chapter geometry and transient
// player physics out of storage; they must always be recreated by the compiler.
export const PROGRESS_KEY='wonderwood.phaser.progress.v1';

export function emptyProgress(chapterIds){
  return {version:1,completed:[],bestShards:{},lastPlayed:chapterIds[0]};
}

export function readProgress(storage,chapterIds){
  const raw=storage.getItem(PROGRESS_KEY);
  if(!raw)return emptyProgress(chapterIds);
  const saved=JSON.parse(raw);
  if(saved.version!==1)return emptyProgress(chapterIds);
  return {
    version:1,
    completed:chapterIds.filter(id=>saved.completed?.includes(id)),
    bestShards:Object.fromEntries(chapterIds
      .filter(id=>Number.isInteger(saved.bestShards?.[id])&&saved.bestShards[id]>=0)
      .map(id=>[id,saved.bestShards[id]])),
    lastPlayed:chapterIds.includes(saved.lastPlayed)?
      saved.lastPlayed:chapterIds[0]
  };
}

export function playChapter(progress,chapterId){
  return {...progress,lastPlayed:chapterId};
}

export function completeChapter(progress,chapterId,shards){
  return {...progress,
    completed:progress.completed.includes(chapterId)?
      progress.completed:[...progress.completed,chapterId],
    bestShards:{...progress.bestShards,
      [chapterId]:Math.max(progress.bestShards[chapterId]||0,shards)}
  };
}

export function writeProgress(storage,progress){
  storage.setItem(PROGRESS_KEY,JSON.stringify(progress));
}
