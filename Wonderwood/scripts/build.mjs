import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=async name=>readFile(resolve(root,name),'utf8');
const dataUrl=async (name,mime)=>`data:${mime};base64,${(await readFile(resolve(root,name))).toString('base64')}`;
const scripts=['src/platform/storage.js','src/platform/input.js','src/platform/world-compiler.js','src/platform/co-op.js','src/platform/levels.js','src/platform/illustrations.js','src/platform/scenery.js','src/platform/vistas.js','src/platform/props.js','src/platform/sprite-atlas.js','src/platform/art.js','src/platform/audio.js','src/games/animal-adventure/catalog.js','src/games/animal-adventure/chapters.js','src/games/animal-adventure/worlds.js','src/games/animal-adventure/game.js','src/main.js'];
const source=await read('index.html');
const css=await read('src/style.css');
// Every character with a manifest and painted PNG or WebP atlas is embedded automatically.
const characterDirs = (await readdir(resolve(root, 'src/assets/characters'), {withFileTypes: true}))
  .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
const atlases = Object.fromEntries(await Promise.all(characterDirs.map(async name => {
  const directory = `src/assets/characters/${name}`;
  const manifest = JSON.parse(await read(`${directory}/manifest.json`));
  const image = await readFile(resolve(root, directory, manifest.image));
  const format = manifest.image.endsWith('.png') ? 'png' :
    manifest.image.endsWith('.avif') ? 'avif' : 'webp';
  // AVIF uses an ISOBMFF 'ispe' box for intrinsic dimensions.
  const ispe = format === 'avif' ? image.indexOf(Buffer.from('ispe')) : -1;
  const validHeader = format === 'png'
    ? image.subarray(1, 4).toString('ascii') === 'PNG'
    : format === 'avif'
      ? image.toString('ascii',4,12) === 'ftypavif' && ispe >= 4 && ispe + 16 <= image.length
      : image.toString('ascii', 0, 4) === 'RIFF' &&
        image.toString('ascii', 8, 16) === 'WEBPVP8X';
  const width = format === 'png' ? image.readUInt32BE(16) :
    format === 'avif' && validHeader ? image.readUInt32BE(ispe+8) :
    format === 'webp' ? 1 + image.readUIntLE(24, 3) : 0;
  const height = format === 'png' ? image.readUInt32BE(20) :
    format === 'avif' && validHeader ? image.readUInt32BE(ispe+12) :
    format === 'webp' ? 1 + image.readUIntLE(27, 3) : 0;
  const rows = height / manifest.frameHeight;
  const cellCount = rows * manifest.columns;
  if (!validHeader || width !== manifest.columns * manifest.frameWidth ||
      !Number.isInteger(rows) || rows < 1 ||
      Object.values(manifest.animations).some(animation =>
        !animation.frames.length || animation.fps <= 0 ||
        animation.frames.some(frame => !Number.isInteger(frame) || frame < 0 || frame >= cellCount))) {
    throw Error(`Invalid sprite grid or animation frames: ${name}`);
  }
  return [name, {manifest, image: `data:image/${format};base64,${image.toString('base64')}`}];
})));
const scenes = {
  backdrop: await dataUrl('src/assets/scenes/meadow/backdrop.webp','image/webp'),
  lanternTree: await dataUrl('src/assets/scenes/meadow/lantern-tree.webp','image/webp'),
  coastBackdrop: await dataUrl('src/assets/scenes/coast/backdrop.webp','image/webp'),
  summitBackdrop: await dataUrl('src/assets/scenes/summit/backdrop.webp','image/webp'),
  tiles: await dataUrl('src/assets/tiles/meadow/tiles.png','image/png')
};
// Optional diffusion-painted level chunks, bundled with the same zero-network
// guarantee as all other paintings. No chunk has to match the collision grid.
const panelFiles=(await readdir(resolve(root,'src/assets/scenes/panels')))
  .filter(name=>/\.(webp|png)$/i.test(name)).sort();
for(const file of panelFiles){
  const name=file.replace(/\.(webp|png)$/i,'');
  if(Object.hasOwn(scenes,name))throw Error('Duplicate scene asset: '+name);
  const mime=file.toLowerCase().endsWith('.png')?'image/png':'image/webp';
  scenes[name]=await dataUrl('src/assets/scenes/panels/'+file,mime);
}
const levelDesigns = JSON.parse(await read('src/games/animal-adventure/designs.json'));
for (const level of Object.values(levelDesigns)) {
  for (const layer of Object.values(level.art || {})) {
    for (const panel of layer) {
      if (!Object.hasOwn(scenes, panel.asset)) {
        throw Error('Missing painted scene asset: '+level.id+' / '+panel.asset);
      }
    }
  }
}
const illustrations = Object.fromEntries(await Promise.all(
  ['props','effects','landmarks','flora','states'].map(async name => [
    name,await dataUrl(`src/assets/illustrations/${name}.webp`,'image/webp')
  ])
));
const assetScript = '<script>\nwindow.WW_EMBEDDED_DESIGNS=' +
  JSON.stringify(levelDesigns).replaceAll('</script>','<\\/script>') + ';\nwindow.WW_EMBEDDED_ILLUSTRATIONS=' +
  JSON.stringify(illustrations) + ';\nwindow.WW_EMBEDDED_ATLASES=' +
  JSON.stringify(atlases).replaceAll('</script>','<\\/script>') + ';\nwindow.WW_EMBEDDED_SCENES=' +
  JSON.stringify(scenes).replaceAll('</script>','<\\/script>') + ';\n</script>\n';
const js=(await Promise.all(scripts.map(read))).map(code=>`<script>\n${code.replaceAll('</script>','<\\/script>')}\n</script>`).join('\n');
const html=source.replace('/* INLINE_CSS */',css).replace('<!-- INLINE_SCRIPTS -->',assetScript+js);
await mkdir(resolve(root,'dist'),{recursive:true});
await writeFile(resolve(root,'dist/wonderwood.html'),html);
console.log(`Built dist/wonderwood.html (${(Buffer.byteLength(html)/1024).toFixed(1)} KiB, zero external requests)`);
