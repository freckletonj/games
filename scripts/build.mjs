import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=async name=>readFile(resolve(root,name),'utf8');
const dataUrl=async (name,mime)=>`data:${mime};base64,${(await readFile(resolve(root,name))).toString('base64')}`;
const scripts=['src/platform/storage.js','src/platform/input.js','src/platform/levels.js','src/platform/illustrations.js','src/platform/scenery.js','src/platform/props.js','src/platform/sprite-atlas.js','src/platform/art.js','src/platform/audio.js','src/games/animal-adventure/catalog.js','src/games/animal-adventure/chapters.js','src/games/animal-adventure/worlds.js','src/games/animal-adventure/game.js','src/main.js'];
const source=await read('index.html');
const css=await read('src/style.css');
// Every character with a manifest and painted PNG or WebP atlas is embedded automatically.
const characterDirs = (await readdir(resolve(root, 'src/assets/characters'), {withFileTypes: true}))
  .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
const atlases = Object.fromEntries(await Promise.all(characterDirs.map(async name => {
  const directory = `src/assets/characters/${name}`;
  const manifest = JSON.parse(await read(`${directory}/manifest.json`));
  const image = await readFile(resolve(root, directory, manifest.image));
  const format = manifest.image.endsWith('.png') ? 'png' : 'webp';
  // PNG dimensions are big-endian in IHDR; transparent WebP uses the VP8X header.
  const validHeader = format === 'png'
    ? image.subarray(1, 4).toString('ascii') === 'PNG'
    : image.toString('ascii', 0, 4) === 'RIFF' &&
      image.toString('ascii', 8, 16) === 'WEBPVP8X';
  const width = format === 'png' ? image.readUInt32BE(16) : 1 + image.readUIntLE(24, 3);
  const height = format === 'png' ? image.readUInt32BE(20) : 1 + image.readUIntLE(27, 3);
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
const illustrations = Object.fromEntries(await Promise.all(
  ['props','effects','landmarks','flora'].map(async name => [
    name,await dataUrl(`src/assets/illustrations/${name}.png`,'image/png')
  ])
));
const assetScript = '<script>\\nwindow.WW_EMBEDDED_ILLUSTRATIONS=' +
  JSON.stringify(illustrations) + ';\\nwindow.WW_EMBEDDED_ATLASES=' +
  JSON.stringify(atlases).replaceAll('</script>','<\\/script>') + ';\nwindow.WW_EMBEDDED_SCENES=' +
  JSON.stringify(scenes).replaceAll('</script>','<\\/script>') + ';\n</script>\n';
const js=(await Promise.all(scripts.map(read))).map(code=>`<script>\n${code.replaceAll('</script>','<\\/script>')}\n</script>`).join('\n');
const html=source.replace('/* INLINE_CSS */',css).replace('<!-- INLINE_SCRIPTS -->',assetScript+js);
await mkdir(resolve(root,'dist'),{recursive:true});
await writeFile(resolve(root,'dist/wonderwood.html'),html);
console.log(`Built dist/wonderwood.html (${(Buffer.byteLength(html)/1024).toFixed(1)} KiB, zero external requests)`);
