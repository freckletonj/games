window.WW = window.WW || {};
WW.audio = (() => {
  let context;
  const tunes = {
    munch:[[260,340,.08,'sine'],[360,430,.09,'sine']],
    jump:[[420,550,.09,'triangle']], double:[[490,740,.17,'triangle']],
    land:[[160,92,.07,'triangle']], ready:[[510,680,.1,'sine'],[680,930,.18,'sine']],
    checkpoint:[[320,510,.13,'triangle'],[510,760,.22,'sine'],[760,1010,.29,'sine']],
    food:[[500,400,.13,'sine']], orb:[[680,400,.19,'sine']],
    catch:[[480,660,.13,'triangle'],[640,880,.22,'sine'],[920,1160,.29,'sine']],
    miss:[[280,190,.20,'triangle']], gem:[[610,820,.20,'triangle'],[800,1050,.30,'sine'],[1100,1360,.34,'sine']],
    hit:[[240,105,.22,'sawtooth']], sleep:[[350,190,.26,'sine']],
    revive:[[360,680,.23,'triangle'],[540,900,.20,'sine']],
    morph:[[350,800,.22,'triangle'],[600,1120,.27,'sine']],
    recall:[[620,430,.23,'sine'],[460,780,.35,'triangle']],
    win:[[540,720,.22,'triangle'],[670,910,.26,'sine'],[820,1170,.37,'sine']]
  };
  function play(name){
    if(!WW.storage.data.settings.sound)return;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    context ||=new Audio();
    if(context.state==='suspended')context.resume();
    const notes=tunes[name];if(!notes)return;
    for(const [from,to,length,wave] of notes){
      const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime;
      oscillator.type=wave;oscillator.frequency.setValueAtTime(from,start);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(10,to),start+length);
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(.035/notes.length,start+.016);
      gain.gain.exponentialRampToValueAtTime(.0001,start+length);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);oscillator.stop(start+length+.01);
    }
  }
  return {play};
})();
