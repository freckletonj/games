import {build} from 'esbuild';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '../..');
// Only explicitly approved art layers are packaged. A missing file makes the
// build fail instead of silently substituting low-resolution draft scenery.
const approvedSpec=JSON.parse(await readFile(resolve(root,
  'phaser/assets/generated/approved-scene-art.json'),'utf8'));
async function embedImage(path){
  if(typeof path!=='string'||!/\.(png|webp)$/.test(path))
    throw Error('Invalid painted scene path '+path);
  const media=path.endsWith('.png')?'image/png':'image/webp';
  const bytes=await readFile(resolve(root,path));
  return 'data:'+media+';base64,'+bytes.toString('base64');
}

const approvedSceneAssets={};
for(const [id,layers] of Object.entries(approvedSpec)){
  if(layers.scene?Boolean(layers.solid||layers.water||layers.background):!layers.solid)
    throw Error('Approved art for '+id+' requires a complete scene or registered material layers');
  approvedSceneAssets[id]={};
  if(layers.backgroundScrollFactor!==undefined){
    if(typeof layers.backgroundScrollFactor!=='number'||
       layers.backgroundScrollFactor<0||layers.backgroundScrollFactor>1)
      throw Error('Invalid background scroll factor for '+id);
    approvedSceneAssets[id].backgroundScrollFactor=layers.backgroundScrollFactor;
  }
  for(const [name,path] of Object.entries(layers)){
    if(name==='backgroundScrollFactor')continue;
    if(name==='platforms'){
      approvedSceneAssets[id].platforms=Object.fromEntries(await Promise.all(
        Object.entries(path).map(async ([key,file])=>[key,await embedImage(file)])));
      continue;
    }
    if(!['scene','solid','water','background'].includes(name))
      throw Error('Invalid painted scene layer '+id+' '+name);
    approvedSceneAssets[id][name]=name==='scene'?
      await Promise.all(path.map(embedImage)):await embedImage(path);
  }
}
const result = await build({
  entryPoints:[resolve(root,'phaser/src/game.js')],
  bundle:true,
  write:false,
  define:{__SCENE_ASSETS__:JSON.stringify(approvedSceneAssets)},
  minify:true,
  format:'iife',
  target:'es2022',
  platform:'browser',
  loader:{'.png':'dataurl','.webp':'dataurl','.avif':'dataurl'},
  logLevel:'warning'
});
const javascript = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
const thirdPartyLicense = await readFile(resolve(root,'phaser/LICENSE-THIRD-PARTY.txt'),'utf8');
const menuStyles = `
#ww-menu{position:fixed;inset:0;z-index:4;display:grid;place-items:center;padding:12px;
  background:#081c32a6;color:#fff2cf;font:15px system-ui,sans-serif}
.ww-menu-panel{width:min(740px,100%);max-height:calc(100dvh - 24px);overflow:auto;
  padding:20px clamp(12px,4vw,34px);border:1px solid #f1e4be61;border-radius:20px;
  background:linear-gradient(145deg,#19394af5,#122138f5);
  box-shadow:0 18px 65px #071321a6;backdrop-filter:blur(10px)}
.ww-menu-title{margin:0;font:normal clamp(30px,6vw,52px)/1 Georgia,serif;color:#ffecc1}
.ww-menu-panel h2{margin:8px 0 12px;font:normal clamp(19px,3vw,25px) Georgia,serif}
.ww-party{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.ww-party fieldset{min-width:0;margin:0;padding:5px;border:1px solid #b7d7c665;border-radius:10px}
.ww-party legend{color:#bce2d2;padding:0 4px;font-size:12px}
.ww-explorers,.ww-level-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
#ww-menu button{cursor:pointer;color:#fff4d9;background:#ffffff0c;border:1px solid #cadcb750;
  border-radius:8px;padding:5px;font:600 clamp(10px,1.8vw,14px) system-ui,sans-serif}
#ww-menu button:hover{background:#ffffff22}
#ww-menu button:focus-visible{outline:2px solid #beefdf;outline-offset:2px}
#ww-menu button[data-current=true]{border-color:#fce0a3;background:#d6ae452b}
#ww-menu button[aria-pressed=true]{border-color:#b7f2d3;background:#a9e4ba2c}
#ww-menu button:disabled{opacity:.5;cursor:default}
.ww-explorers canvas{display:block;height:clamp(34px,12vh,76px);max-width:100%;margin:auto;object-fit:contain}
.ww-level-grid button{min-height:42px;text-align:left}
.ww-level-grid small{display:block;color:#c3e9d8;font-size:10px}
#ww-menu-description{min-height:2.6em;margin:8px 0;color:#cce7db;font-size:13px}
.ww-menu-actions{display:flex;align-items:center;gap:10px;margin-top:10px}
#ww-menu .ww-menu-primary{padding:7px 15px;background:#ffe2a1;color:#142c37;border-color:#fce0a3}
.ww-menu-controls{margin:8px 0 0;color:#c0d6d7;font-size:11px}
@media(max-width:480px){.ww-party{grid-template-columns:1fr;gap:7px}}
@media(max-height:420px){
  .ww-menu-panel{padding-block:12px}
  .ww-menu-panel h2{margin:5px 0 7px}
  .ww-level-grid button{min-height:31px}
  #ww-menu-description{min-height:1.3em;margin:6px 0}
  .ww-menu-actions,.ww-menu-controls{margin-top:6px}
}
`;
const menuMarkup = `
<div id="ww-menu" hidden>
  <main class="ww-menu-panel">
    <h1 class="ww-menu-title">Wonderwood</h1>
    <section id="ww-character-select" aria-labelledby="ww-character-heading">
      <h2 id="ww-character-heading">Choose your explorer</h2>
      <div id="ww-party" class="ww-party"></div>
      <div class="ww-menu-actions"><button class="ww-menu-primary" id="ww-menu-continue" disabled>Continue</button></div>
      <p class="ww-menu-controls">Stick + A · P1 ← / → + Space · P2 J / L + I</p>
    </section>
    <section id="ww-level-select" aria-labelledby="ww-level-heading" hidden>
      <h2 id="ww-level-heading">Choose a level</h2>
      <div id="ww-level-grid" class="ww-level-grid"></div>
      <p id="ww-menu-description" aria-live="polite"></p>
      <div class="ww-menu-actions">
        <button id="ww-menu-back">Back</button>
        <button class="ww-menu-primary" id="ww-menu-play">Play level</button>
      </div>
      <p class="ww-menu-controls">Stick or arrow keys · A or Space to play</p>
    </section>
  </main>
</div>`;
const startup='<div id="ww-startup" role="status" aria-live="polite">'+
  'Loading Wonderwood…</div>';
const bootErrors='<script>(function(){'+
  'const status=document.getElementById("ww-startup");'+
  'window.addEventListener("error",event=>{status.textContent='+
    '"Game failed to start: "+event.message;});'+
  'window.addEventListener("unhandledrejection",event=>{status.textContent='+
    '"Game failed to start: "+String(event.reason);});'+
  'setTimeout(()=>{if(!status.hidden)status.textContent='+
    '"Still loading. Check Firefox WebGL support or the browser console.";},15000);'+
  '})();</script>';
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Wonderwood · Phaser</title>' +
  '<!-- '+thirdPartyLicense.replaceAll('--','—')+' -->' +
  '<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#101b31;color:#f9eacf;font-family:Georgia,serif}' +
  'body{display:grid;place-items:center;overflow:hidden}#game{width:100vw;height:100vh}' +
  'canvas{display:block}#credits{position:fixed;bottom:6px;right:10px;font:10px system-ui;color:#b1b8b7;pointer-events:none}' +
  '#ww-ui{position:fixed;left:50%;top:50%;width:min(100vw,177.7778vh);height:min(100vh,56.25vw);transform:translate(-50%,-50%);pointer-events:none;font-family:Arial,sans-serif;text-shadow:0 1px 3px #152233}' +
  '#ww-status{position:absolute;left:12px;top:11px;max-width:calc(100% - 24px);padding:7px 12px;border-radius:11px;font-size:14px;color:#fff7d4;background:#142a3dcc;box-shadow:0 2px 10px #09182755}' +
  '#ww-health{display:flex;gap:10px;margin-bottom:5px}#ww-health label{display:flex;align-items:center;gap:5px;font-size:11px}#ww-health progress{width:64px;height:9px;appearance:none;border:1px solid #fce0a394;border-radius:9px;overflow:hidden;background:#0b1828}#ww-health progress::-webkit-progress-bar{background:#0b1828}#ww-health progress::-webkit-progress-value{background:#f37574}#ww-health progress::-moz-progress-bar{background:#f37574}' +
  '#ww-notice{position:absolute;top:63px;left:50%;transform:translateX(-50%);width:max-content;max-width:80%;padding:9px 17px;border-radius:13px;border:1px solid #fff0c739;text-align:center;font:italic 17px/1.4 Georgia,serif;color:#fff8d9;background:#13273cc9;box-shadow:0 4px 21px #09182749}' +
  '#ww-help{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);max-width:85%;width:max-content;padding:8px 15px;border-radius:999px;text-align:center;font-size:13px;line-height:1.35;color:#fff9e7;background:#152e3ecc;box-shadow:0 2px 12px #07142544}' +
  '#ww-notice:empty,#ww-help:empty{display:none}' +
  '#ww-pause{position:absolute;inset:0;display:grid;place-items:center;text-align:center;background:#071527bb;color:#fff5d9;font:40px Georgia,serif}' +
  '#ww-startup{position:fixed;inset:0;z-index:20;display:grid;place-items:center;'+
  'background:#0c1b2b;color:#f3ebd5;font:18px system-ui;text-align:center;padding:28px}' +
  '[hidden]{display:none!important}' + menuStyles + '</style>' +
  '</head><body>' + startup + '<div id="game"></div>' + menuMarkup +
  '<div id="ww-ui" hidden><div id="ww-status"><div id="ww-health"><label>P1 <progress max="3" value="3" aria-label="Player 1 health"></progress></label><label hidden>P2 <progress max="3" value="3" aria-label="Player 2 health"></progress></label></div><div id="ww-objective"></div></div><div id="ww-notice"></div><div id="ww-help"></div>' +
  '<div id="ww-pause" hidden>PAUSED / START / ESC to resume</div></div>' +
  '<div id="credits">Kenney CC0 · Phaser MIT · Art provenance in source</div>' +
  bootErrors + '<script>'+javascript+'</script></body></html>';
await mkdir(resolve(root,'dist'),{recursive:true});
await writeFile(resolve(root,'dist/wonderwood-phaser.html'),html);
const shell=html.slice(0,html.indexOf('<script>'));
if (/<script\\s+src=|<link\\s+[^>]*href=/i.test(shell)) {
  throw Error('Standalone HTML shell unexpectedly references external assets');
}
console.log('Built dist/wonderwood-phaser.html ('+Math.round(Buffer.byteLength(html)/1024)+' KiB, self-contained)');
