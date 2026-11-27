// Optional real Chromium checks. Install Playwright separately; no game dependency.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { readFileSync, existsSync, mkdirSync } = require("node:fs");
const { resolve, extname } = require("node:path");
const { pathToFileURL } = require("node:url");
const root = resolve(__dirname, "..");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".glb": "model/gltf-binary",
};
const server = createServer((request, response) => {
  const path = resolve(
    root,
    "." +
      decodeURIComponent(new URL(request.url, "http://local").pathname).replace(
        /\/$/,
        "/index.html",
      ),
  );
  if (!path.startsWith(root + "/") || !existsSync(path)) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.setHeader(
    "Content-Type",
    types[extname(path)] || "application/octet-stream",
  );
  response.end(readFileSync(path));
});
(async () => {
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.ADVENTURE_CHROMIUM,
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const base = "http://127.0.0.1:" + server.address().port;
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const url of [
    base,
    pathToFileURL(root + "/dist/adventure-town.html").href,
  ]) {
    const requests = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(url);
    await page.waitForFunction(() => window.gameState?.().fps > 0);
    const start = await page.evaluate(() => gameState());
    assert.equal(start.renderer, "WebGL");
    await page.keyboard.down("s");
    await page.waitForTimeout(350);
    const walk = await page.evaluate(() => gameState());
    assert.equal(walk.clip, "Walk");
    assert.ok(Math.hypot(walk.x - start.x, walk.z - start.z) > 0.2);
    await page.keyboard.down("Shift");
    await page.waitForTimeout(200);
    assert.equal((await page.evaluate(() => gameState())).clip, "Run");
    await page.keyboard.up("s");
    await page.keyboard.up("Shift");
    await page.keyboard.press("Space");
    await page.waitForTimeout(160);
    const jump = await page.evaluate(() => gameState());
    assert.equal(jump.clip, "Jump");
    assert.ok(jump.y > 0);
    await page.waitForTimeout(1100);
    assert.ok((await page.evaluate(() => gameState())).grounded);
    await page.getByRole("button", { name: "Rotate view" }).click();
    await page.getByRole("button", { name: "Zoom out" }).click();
    await page.getByRole("button", { name: "Respawn" }).click();
    await page.waitForTimeout(150);
    assert.equal((await page.evaluate(() => gameState())).x, start.x);
    if (url.startsWith("file:"))
      assert.ok(
        requests.every((request) => request.startsWith("file:")),
        "offline launch has no network",
      );
  }
  mkdirSync(root + "/dist/review", { recursive: true });
  await page.screenshot({ path: root + "/dist/review/desktop.png" });
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  mobile.on("pageerror", (error) => errors.push(error.message));
  await mobile.goto(base);
  await mobile.waitForFunction(() => window.gameState?.().fps > 0);
  assert.ok(
    await mobile.getByRole("button", { name: "Jump", exact: true }).isVisible(),
  );
  await mobile.getByRole("button", { name: "Jump", exact: true }).tap();
  await mobile.waitForTimeout(150);
  assert.equal((await mobile.evaluate(() => gameState())).clip, "Jump");
  await mobile.screenshot({ path: root + "/dist/review/mobile.png" });
  assert.deepEqual(errors, []);
  await browser.close();
  server.close();
  console.log(
    "Browser checks passed: HTTP modules, offline file without network, WebGL, keyboard walk/run/jump/land, orbit/zoom/respawn, mobile touch jump, no page errors.",
  );
})().catch((error) => {
  console.error(error);
  server.close();
  process.exit(1);
});
