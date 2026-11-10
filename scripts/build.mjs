import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=async name=>readFile(resolve(root,name),'utf8');
const dataUrl=async (name,mime)=>`data:${mime};base64,${(await readFile(resolve(root,name))).toString('base64')}`;
const scripts=['src/platform/storage.js','src/platform/input.js','src/platform/levels.js','src/platform/scenery.js','src/platform/sprite-atlas.js','src/platform/art.js','src/platform/audio.js','src/games/animal-adventure/catalog.js','src/games/animal-adventure/chapters.js','src/games/animal-adventure/worlds.js','src/games/animal-adventure/game.js','src/main.js'];
const source=await read('index.html');
const css=await read('src/style.css');
const atlases = {
  hero: {
    manifest: JSON.parse(await read('src/assets/characters/hero/manifest.json')),
    image: await dataUrl('src/assets/characters/hero/sheet.png','image/png')
  },
  springaroo: {
    manifest: JSON.parse(await read('src/assets/characters/springaroo/manifest.json')),
    image: await dataUrl('src/assets/characters/springaroo/sheet.png','image/png')
  }
};
const scenes = {
  backdrop: await dataUrl('src/assets/scenes/meadow/backdrop.webp','image/webp'),
  lanternTree: 'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(await read('src/assets/scenes/meadow/lantern-tree.svg')),
  tiles: await dataUrl('src/assets/tiles/meadow/tiles.png','image/png')
};
const assetScript = '<script>\nwindow.WW_EMBEDDED_ATLASES=' +
  JSON.stringify(atlases).replaceAll('</script>','<\\/script>') + ';\nwindow.WW_EMBEDDED_SCENES=' +
  JSON.stringify(scenes).replaceAll('</script>','<\\/script>') + ';\n</script>\n';
const js=(await Promise.all(scripts.map(read))).map(code=>`<script>\n${code.replaceAll('</script>','<\\/script>')}\n</script>`).join('\n');
const html=source.replace('/* INLINE_CSS */',css).replace('<!-- INLINE_SCRIPTS -->',assetScript+js);
await mkdir(resolve(root,'dist'),{recursive:true});
await writeFile(resolve(root,'dist/wonderwood.html'),html);
console.log(`Built dist/wonderwood.html (${(Buffer.byteLength(html)/1024).toFixed(1)} KiB, zero external requests)`);
