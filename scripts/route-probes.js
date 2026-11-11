// Physics-aware, deterministic level probes for the AI authoring pipeline.
// Loaded into Chromium by scripts/evaluate-routes.py; never adds work to the
// distributed game. Drives the ACTUAL WW.games.animals.start/update code.
// These are local traversal probes, not proofs of full campaign completion.
window.WW_ROUTE_PROBES = (() => {
  const dt = 1 / 60;
  const tile = 16;
  const strategies = [
    {id: 'walk', form: null, rhythm: 'walk'},
    {id: 'jump', form: null, rhythm: 'jump'},
    {id: 'transformed', form: 'intended', rhythm: 'power'}
  ];
  const intendedForms = {
    springKey: 'springaroo', diveKey: 'tideling', skyKey: 'skyling'
  };
  const actionNames = WW.input.actions;
  function controls(right, jump, down, previousJump) {
    const current = {left: false, right, down, jump,
      snack: false, orb: false, transform: false, revive: false,
      foodCycle: false, recall: false};
    const pressed = Object.fromEntries(actionNames.map(action =>
      [action, action === 'jump' && jump && !previousJump]));
    const released = Object.fromEntries(actionNames.map(action =>
      [action, action === 'jump' && !jump && previousJump]));
    return {...current, pressed, released};
  }
  function surfaceFoot(level, x) {
    const cell = Math.max(0, Math.min(level.width-1, Math.floor(x / tile)));
    const t = Math.max(0, Math.min(1, x / tile-cell));
    return ((1-t)*level.surface[cell]+t*level.surface[cell+1])*tile;
  }
  function run(level, section, strategy, options = {}) {
    const {start, end} = {
      start: section.range[0] + 2,
      end: Math.min(level.width - 4, section.range[1] - 2)
    };
    const goalX = end * tile;
    const form = strategy.form === 'intended'
      ? intendedForms[level.chapter.goals[0].kind] : strategy.form;
    const game = WW.games.animals.start(level);
    const state = game.state, player = state.players[0];
    // The probe isolates traversability from wildlife combat and food puzzle
    // execution. It starts locally, on the real compiled ground surface.
    state.animals.forEach(animal => {animal.alive=false;animal.respawn=99999;});
    player.x = (start + .5) * tile;
    player.y = surfaceFoot(level, player.x);
    player.previousX=player.x;player.previousY=player.y;
    player.lastSafe={x:player.x,y:player.y};
    player.vx=0;player.vy=0;player.grounded=true;
    player.coyote=.105;player.jumpsUsed=0;player.jumpBuffer=0;
    player.health=3;player.sleep=false;player.invincible=9999;player.waterTime=0;
    player.form=form;player.caught=form;
    if(form)player.unlocked[form]=true;
    const before=player.x;
    const peakSteps = options.frames ?? Math.min(1400,
      Math.max(240, Math.ceil((goalX-before)/1.7)+140));
    const oldRead=WW.input.read;
    const trace=[],relic=state.items.find(item=>item.kind.endsWith('Key'));
    let previousJump=false,furthestX=before,stalledFrames=0;
    let touchedGoal=false,frames=0,usedJump=0,minimumHealth=3;
    WW.input.read=slot => {
      if(slot>0)return controls(false,false,false,false);
      const swimming=form==='tideling' &&
        (level.grid[Math.floor((player.y-8)/tile)]?.[Math.floor(player.x/tile)]==='water');
      const jump = strategy.rhythm==='jump' ? frames%43 < 15 :
        strategy.rhythm==='power' ? (form==='skyling' ? frames%11 === 0
          : form==='springaroo' ? frames%39 < 13 || frames%39 === 19
            : form==='tideling' ? !swimming && frames%48 < 12
              : frames%43 < 15) : false;
      const down = form==='tideling' && swimming && section.requires==='tideling'
        && !!relic && player.y < relic.y+8;
      const input=controls(true,jump,down,previousJump);
      if(input.pressed.jump)usedJump++;
      previousJump=jump;
      return input;
    };
    for(frames=0;frames<peakSteps;frames++){
      game.update(dt);
      minimumHealth=Math.min(minimumHealth,player.health);
      if(player.x>furthestX+.25){furthestX=player.x;stalledFrames=0;}
      else stalledFrames++;
      if(frames%30===0)trace.push([
        Number((player.x/tile).toFixed(1)),
        Number((player.y/tile).toFixed(1))
      ]);
      if(relic?.used)touchedGoal=true;
      if(player.x>=goalX-8||stalledFrames>=160||player.sleep||state.shared.won)break;
    }
    WW.input.read=oldRead;
    game.stop();
    return {
      strategy:strategy.id, form:form||'explorer', startTile:start,
      targetTile:end, furthestTile:Number((furthestX/tile).toFixed(1)),
      reached:furthestX>=goalX-8, frames:frames+1, jumps:usedJump,
      minimumHealth, relicCollected:touchedGoal,
      trace, stallTile:furthestX<goalX-8?Number((furthestX/tile).toFixed(1)):null
    };
  }
  function inspect(level, options = {}) {
    return level.sections.map(section => {
      const attempts=strategies.map(strategy=>run(level,section,strategy,options));
      const reached=attempts.some(a=>a.reached);
      const best=[...attempts].sort((a,b)=>b.furthestTile-a.furthestTile)[0];
      const distance=section.range[1]-section.range[0]-4;
      const notes=[];
      if(!reached)notes.push('No basic movement probe crossed this section; inspect around tile '+best.stallTile);
      if(section.requires && attempts.filter(a=>a.form==='explorer').some(a=>a.reached)) {
        notes.push('Explorer can follow the section horizontally; verify that the key or challenge actually requires '+section.requires);
      }
      if(reached && attempts.every(a=>!a.relicCollected) &&
          level.chapter.goals.some(goal=>level.objects.some(o=>o.kind===goal.kind &&
          o.x>=section.range[0]&&o.x<section.range[1]))) {
        notes.push('Movement passed the section, but no scripted traversal collected its relic');
      }
      return {
        id:section.id, challenge:section.challenge, requires:section.requires||null,
        range:section.range, crossed:reached, furthestProgress:
          Number((Math.max(0,best.furthestTile-section.range[0])/distance).toFixed(2)),
        attempts, notes
      };
    });
  }
  return {run,inspect,strategies};
})();
