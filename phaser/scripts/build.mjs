import {build} from 'esbuild';
import {mkdir, writeFile} from 'node:fs/promises';
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
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Wonderwood · Phaser</title>' +
  '<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#101b31;color:#f9eacf;font-family:Georgia,serif}' +
  'body{display:grid;place-items:center;overflow:hidden}#game{width:100vw;height:100vh}' +
  'canvas{display:block}#credits{position:fixed;bottom:6px;right:10px;font:10px system-ui;color:#b1b8b7;pointer-events:none}</style>' +
  '</head><body><div id="game"></div>' +
  '<div id="credits">Phaser MIT · Kenney CC0 · Wonderwood original art</div>' +
  '<script>'+javascript+'</script></body></html>';
await mkdir(resolve(root,'dist'),{recursive:true});
await writeFile(resolve(root,'dist/wonderwood-phaser.html'),html);
if (/<script\s+src=|<link\s+[^>]*href=|https?:\/\//i.test(html.slice(0,350))) {
  throw Error('Standalone HTML shell unexpectedly references external assets');
}
console.log('Built dist/wonderwood-phaser.html ('+Math.round(Buffer.byteLength(html)/1024)+' KiB, self-contained)');
