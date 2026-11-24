// The browser may release a screen lock when the tab is hidden.
export function screenWake() {
  let active=false, pending=false, lock=null;
  const request=async()=>{
    if(!active||pending||lock||document.hidden||!navigator.wakeLock)return;
    pending=true;
    try {
      const acquired=await navigator.wakeLock.request('screen');
      if(active&&!document.hidden&&!acquired.released){
        lock=acquired;
        acquired.addEventListener('release',()=>{
          if(lock===acquired)lock=null;
        },{once:true});
      }else if(!acquired.released)await acquired.release();
    } catch {
      // The device or embedding page can decline the lock.
    } finally {
      pending=false;
    }
  };
  document.addEventListener('visibilitychange',request);
  window.addEventListener('focus',request);
  window.addEventListener('pointerdown',request);
  window.addEventListener('keydown',request);
  window.addEventListener('gamepadconnected',request);
  return enabled=>{
    active=enabled;
    if(enabled)void request();
    else if(lock){
      void lock.release();
      lock=null;
    }
  };
}
