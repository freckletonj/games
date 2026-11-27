// Bundle our four modules and the selected model into a double-clickable offline HTML.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
let model = read("game/model.js");
const modelPath = model.match(/const defaultModelPath = ["']([^"']+)["']/)[1];
const encoded = readFileSync(resolve(root, modelPath)).toString("base64");
model = model.replace(
  /\/\/ BEGIN_MODEL_LOAD[\s\S]*?\/\/ END_MODEL_LOAD/,
  `const bytes = Uint8Array.from(atob('${encoded}'), c=>c.charCodeAt(0));`,
);
const clean = (s) =>
  s
    .replace(/^import[\s\S]*?from ["'][^"']+["'];\s*$/gm, "")
    .replace(/^export \{[\s\S]*?\};\s*$/gm, "")
    .replace(/^export /gm, "");
const world = read("game/world.js");
const js = [model, world, read("game/renderer.js"), read("game/main.js")]
  .map(clean)
  .join("\n");
let html = read("index.html")
  .replace(
    /<link rel="stylesheet" href="game\/style.css"\s*\/?>/,
    () => `<style>${read("game/style.css")}</style>`,
  )
  .replace(
    '<script type="module" src="game/main.js"></script>',
    () => `<script>\n${js}\n</script>`,
  );
mkdirSync(resolve(root, "dist"), { recursive: true });
writeFileSync(resolve(root, "dist/adventure-town.html"), html);
console.log("Built dist/adventure-town.html (offline, embedded GLB)");
