import {build} from 'esbuild';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const result = await build({
  entryPoints:[resolve(root,'phaser/src/game.js')],
  bundle:true,
  write:false,
  minify:true,
  format:'iife',
  target:'es2022',
  platform:'browser',
  loader:{'.png':'dataurl','.webp':'dataurl','.avif':'dataurl'},
  logLevel:'warning'
});
const javascript = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
const thirdPartyLicense = await readFile(resolve(root,'phaser/LICENSE-THIRD-PARTY.txt'),'utf8');
const menuStyles = "\n/* Crisp, responsive native-DOM title screen; gameplay canvas keeps its 2x zoom. */\n#ww-menu{position:fixed;inset:0;z-index:4;display:grid;place-items:center;\n  padding:22px;background:linear-gradient(110deg,#071b32a8,#12263869 70%,#152c3b8c);\n  font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#fff5dc}\n.ww-menu-panel{width:min(790px,100%);max-height:calc(100dvh - 36px);overflow:auto;\n  padding:32px 42px 27px;border:1px solid #f1e4be61;border-radius:22px;\n  background:linear-gradient(148deg,#152f46ed,#14243ce9 75%,#10243de8);\n  box-shadow:0 18px 65px #071321a6,0 0 0 6px #dff3ea12;backdrop-filter:blur(12px)}\n#ww-menu[data-biome=coast] .ww-menu-panel{background:linear-gradient(148deg,#103847ed,#14334ae8 75%,#103044ef)}\n#ww-menu[data-biome=summit] .ww-menu-panel{background:linear-gradient(148deg,#29294bed,#1c2947eb 75%,#14233feb)}\n.ww-menu-eyebrow{margin:0 0 10px;color:#bfe9d8;font-size:11px;font-weight:700;\n  letter-spacing:.24em;text-transform:uppercase}\n.ww-menu-title{margin:0;font:normal clamp(48px,7vw,74px)/1.05 Georgia,'Times New Roman',serif;\n  letter-spacing:.035em;color:#fff2ca;text-shadow:0 4px 24px #060e20a8}\n.ww-menu-subtitle{margin:9px 0 0;font:italic 18px/1.5 Georgia,serif;color:#d5e9df}\n.ww-menu-divider{height:1px;margin:24px 0 17px;background:linear-gradient(90deg,#eccf8daa,transparent)}\n.ww-menu-selector{display:grid;grid-template-columns:47px minmax(0,1fr) 47px;\n  align-items:center;gap:13px}\n.ww-menu-chapter{min-width:0;text-align:center}\n.ww-menu-chapter small{display:block;color:#afcfc9;font-size:10px;font-weight:700;\n  letter-spacing:.20em}\n.ww-menu-chapter h2{margin:6px 0 0;font:normal clamp(24px,3.7vw,35px)/1.18 Georgia,serif;color:#fff0bd}\n#ww-menu-description{min-height:35px;margin:13px auto 9px;max-width:570px;\n  text-align:center;color:#d9e8e5;font-size:14px;line-height:1.5}\n#ww-menu-mode{margin:0;text-align:center;font-size:12px;color:#aedaca}\n.ww-menu-actions{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:21px}\n#ww-menu button{cursor:pointer;touch-action:manipulation;font:600 14px system-ui,\n  -apple-system,'Segoe UI',sans-serif;transition:background .14s,border-color .14s,transform .14s}\n.ww-menu-arrow{height:47px;width:47px;border:1px solid #cce9d66e;border-radius:13px;\n  background:#ffffff13;color:#fff1c5;font-size:28px!important}\n.ww-menu-arrow:hover,.ww-menu-secondary:hover{background:#ffffff24}\n.ww-menu-primary{min-width:197px;min-height:47px;padding:10px 25px;border:1px solid #ffe6ad;\n  border-radius:13px;color:#142c37;background:linear-gradient(#ffe9af,#e8c887);\n  box-shadow:0 5px 22px #f5d69128}\n.ww-menu-primary:hover{background:#fff0c8;transform:translateY(-1px)}\n.ww-menu-secondary{min-height:47px;padding:10px 21px;border:1px solid #cce9d66e;\n  border-radius:13px;color:#e8f6ed;background:#ffffff12}\n#ww-menu button:focus-visible{outline:3px solid #b6eddd;outline-offset:3px}\n.ww-menu-controls{margin:19px 0 0;text-align:center;color:#b4c8c9;\n  font-size:11px;line-height:1.6}\n@media(max-width:600px){\n  #ww-menu{padding:12px}\n  .ww-menu-panel{padding:20px 20px 16px;border-radius:17px;max-height:calc(100dvh - 16px)}\n  .ww-menu-title{font-size:clamp(39px,10vw,60px)}\n  .ww-menu-divider{margin:14px 0}\n  .ww-menu-subtitle{font-size:15px}\n  .ww-menu-chapter h2{font-size:23px}\n  #ww-menu-description{font-size:13px;margin-top:8px}\n  .ww-menu-actions{margin-top:13px}\n  .ww-menu-controls{margin-top:12px}\n}\n\n@media(max-height:480px){\n  .ww-menu-panel{padding:12px 24px 10px}\n  .ww-menu-eyebrow{display:none}\n  .ww-menu-title{font-size:40px}\n  .ww-menu-subtitle{display:none}\n  .ww-menu-divider{margin:9px 0}\n  .ww-menu-chapter h2{font-size:23px;margin:2px 0}\n  #ww-menu-description{font-size:12px;min-height:0;margin:6px auto}\n  #ww-menu-mode{font-size:11px}\n  .ww-menu-actions{margin-top:8px}\n  #ww-menu button{min-height:36px}\n  .ww-menu-arrow{height:36px;width:36px}\n  .ww-menu-controls{margin-top:6px;font-size:10px}\n}\n";
const menuMarkup = "\n<div id=\"ww-menu\" hidden role=\"region\" aria-label=\"Chapter selection\">\n  <main class=\"ww-menu-panel\">\n    <p class=\"ww-menu-eyebrow\">An illustrated adventure · Choose your path</p>\n    <h1 class=\"ww-menu-title\">Wonderwood</h1>\n    <p class=\"ww-menu-subtitle\">A little world worth exploring.</p>\n    <div class=\"ww-menu-divider\"></div>\n    <div class=\"ww-menu-selector\">\n      <button class=\"ww-menu-arrow\" id=\"ww-menu-prev\" type=\"button\" aria-label=\"Previous chapter\">‹</button>\n      <div class=\"ww-menu-chapter\">\n        <small id=\"ww-menu-counter\">CHAPTER 01 / 05</small>\n        <h2 id=\"ww-menu-chapter\" aria-live=\"polite\"></h2>\n      </div>\n      <button class=\"ww-menu-arrow\" id=\"ww-menu-next\" type=\"button\" aria-label=\"Next chapter\">›</button>\n    </div>\n    <p id=\"ww-menu-description\"></p>\n    <p id=\"ww-menu-mode\">One explorer · Solo play</p>\n    <div class=\"ww-menu-actions\">\n      <button id=\"ww-menu-play\" class=\"ww-menu-primary\" type=\"button\">Begin adventure</button>\n      <button id=\"ww-menu-coop\" class=\"ww-menu-secondary\" type=\"button\">Enable local co-op</button>\n    </div>\n    <p class=\"ww-menu-controls\">Keyboard: A / D select · Space begins · 2 toggles co-op\n      <span aria-hidden=\"true\"> &nbsp; | &nbsp; </span> Controller: stick select · A begins</p>\n  </main>\n</div>";
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Wonderwood · Phaser</title>' +
  '<!-- '+thirdPartyLicense.replaceAll('--','—')+' -->' +
  '<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#101b31;color:#f9eacf;font-family:Georgia,serif}' +
  'body{display:grid;place-items:center;overflow:hidden}#game{width:100vw;height:100vh}' +
  'canvas{display:block}#credits{position:fixed;bottom:6px;right:10px;font:10px system-ui;color:#b1b8b7;pointer-events:none}' +
  '#ww-ui{position:fixed;left:50%;top:50%;width:min(100vw,177.7778vh);height:min(100vh,56.25vw);transform:translate(-50%,-50%);pointer-events:none;font-family:Arial,sans-serif;text-shadow:0 1px 3px #152233}' +
  '#ww-status{position:absolute;left:12px;top:11px;max-width:calc(100% - 24px);padding:7px 12px;border-radius:11px;font-size:14px;color:#fff7d4;background:#142a3dcc;box-shadow:0 2px 10px #09182755}' +
  '#ww-notice{position:absolute;top:63px;left:50%;transform:translateX(-50%);width:max-content;max-width:80%;padding:9px 17px;border-radius:13px;border:1px solid #fff0c739;text-align:center;font:italic 17px/1.4 Georgia,serif;color:#fff8d9;background:#13273cc9;box-shadow:0 4px 21px #09182749}' +
  '#ww-help{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);max-width:85%;width:max-content;padding:8px 15px;border-radius:999px;text-align:center;font-size:13px;line-height:1.35;color:#fff9e7;background:#152e3ecc;box-shadow:0 2px 12px #07142544}' +
  '#ww-notice:empty,#ww-help:empty{display:none}' +
  '#ww-pause{position:absolute;inset:0;display:grid;place-items:center;text-align:center;background:#071527bb;color:#fff5d9;font:40px Georgia,serif}' +
  '[hidden]{display:none!important}' + menuStyles + '</style>' +
  '</head><body><div id="game"></div>' + menuMarkup +
  '<div id="ww-ui" hidden><div id="ww-status"></div><div id="ww-notice"></div><div id="ww-help"></div>' +
  '<div id="ww-pause" hidden>PAUSED / START / ESC to resume</div></div>' +
  '<div id="credits">Kenney CC0 · Phaser MIT · Art provenance in source</div>' +
  '<script>'+javascript+'</script></body></html>';
await mkdir(resolve(root,'dist'),{recursive:true});
await writeFile(resolve(root,'dist/wonderwood-phaser.html'),html);
const shell=html.slice(0,html.indexOf('<script>'));
if (/<script\\s+src=|<link\\s+[^>]*href=/i.test(shell)) {
  throw Error('Standalone HTML shell unexpectedly references external assets');
}
console.log('Built dist/wonderwood-phaser.html ('+Math.round(Buffer.byteLength(html)/1024)+' KiB, self-contained)');
