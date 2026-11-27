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
  async function walkTo(targetX, targetZ, tab = page) {
    // Short waypoints keep eight-direction input on the authored paths.
    // Steering toward a distant point can cut a corner into a lamp or wall.
    const start = await tab.evaluate(() => gameState());
    const distance = Math.hypot(targetX - start.x, targetZ - start.z);
    if (distance > 1.2) {
      const count = Math.ceil(distance / 0.75);
      for (let i = 1; i <= count; i++)
        await walkTo(
          start.x + ((targetX - start.x) * i) / count,
          start.z + ((targetZ - start.z) * i) / count,
          tab,
        );
      return;
    }
    const held = new Set();
    for (let step = 0; step < 150; step++) {
      const state = await tab.evaluate(() => gameState());
      const x = targetX - state.x,
        z = targetZ - state.z,
        distance = Math.hypot(x, z);
      if (distance < 0.22) {
        for (const key of held) await tab.keyboard.up(key);
        return;
      }
      const dx =
        (x * Math.cos(state.cameraYaw) - z * Math.sin(state.cameraYaw)) /
        distance;
      const dz =
        (x * Math.sin(state.cameraYaw) + z * Math.cos(state.cameraYaw)) /
        distance;
      const desired = new Set();
      if (dx > 0.38) desired.add("d");
      if (dx < -0.38) desired.add("a");
      if (dz > 0.38) desired.add("s");
      if (dz < -0.38) desired.add("w");
      if (distance > 1 && !state.swimming) desired.add("Shift");
      for (const key of held)
        if (!desired.has(key)) {
          await tab.keyboard.up(key);
          held.delete(key);
        }
      for (const key of desired)
        if (!held.has(key)) {
          await tab.keyboard.down(key);
          held.add(key);
        }
      await tab.waitForTimeout(100);
    }
    throw Error(
      "Walk could not reach " +
        JSON.stringify({
          targetX,
          targetZ,
          state: await tab.evaluate(() => gameState()),
        }),
    );
  }
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
    assert.equal(start.scenery.length, 8, "all converted town assets loaded");
    await page.keyboard.press("Escape");
    assert.equal((await page.evaluate(() => gameState())).paused, true);
    await page.keyboard.down("s");
    await page.waitForTimeout(200);
    await page.keyboard.up("s");
    assert.equal((await page.evaluate(() => gameState())).x, start.x);
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "resume");
    await page.getByRole("button", { name: "Back to exploring" }).click();
    assert.equal((await page.evaluate(() => gameState())).paused, false);
    if (url === base) {
      const pixels = await page.evaluate(async () => {
        const { webRenderer } = await import("./game/renderer.js");
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 64;
        const gl = canvas.getContext("webgl", { antialias: false });
        const vertex = (x,y,z,c) => [x,y,z,...c];
        const blue = [.1,.2,.5], green = [.2,.7,.3];
        const wall = new Float32Array([
          ...vertex(-2,-2,1,blue),...vertex(2,-2,1,blue),...vertex(2,2,1,blue),
          ...vertex(-2,-2,1,blue),...vertex(2,2,1,blue),...vertex(-2,2,1,blue),
        ]);
        const actor = (z) => new Float32Array([
          ...vertex(-.7,-.7,z,green),...vertex(.7,-.7,z,green),...vertex(0,.7,z,green),
        ]);
        const renderer = webRenderer(gl, canvas, wall);
        const camera = {target:[0,0,0],right:[1,0,0],up:[0,1,0],dir:[0,0,1],scale:16};
        const amberPixels = (z) => {
          renderer.draw(camera, actor(z), new Float32Array());
          const pixels = new Uint8Array(64*64*4);
          gl.readPixels(0,0,64,64,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
          let amber = 0;
          for(let i=0;i<pixels.length;i+=4)
            if(pixels[i]>240 && pixels[i+1]>190 && pixels[i+2]<160) amber++;
          return amber;
        };
        return { visible: amberPixels(2), hidden: amberPixels(0), error: gl.getError() };
      });
      assert.equal(pixels.visible, 0, "visible player keeps normal colors");
      assert.ok(pixels.hidden > 50, "hidden player has a stippled silhouette");
      assert.equal(pixels.error, 0, "renderer produces no WebGL errors");
    }
    await page.keyboard.down("s");
    await page.waitForFunction((start) => {
      const state = gameState();
      return (
        state.clip === "Walk" &&
        Math.hypot(state.x - start.x, state.z - start.z) > 0.2
      );
    }, start);
    const walk = await page.evaluate(() => gameState());
    assert.equal(walk.clip, "Walk");
    assert.ok(Math.hypot(walk.x - start.x, walk.z - start.z) > 0.2);
    await page.keyboard.down("Shift");
    await page.waitForFunction(() => gameState().clip === "Run");
    assert.equal((await page.evaluate(() => gameState())).clip, "Run");
    await page.keyboard.up("s");
    await page.keyboard.up("Shift");
    await page.keyboard.press("Space");
    await page.waitForFunction(
      () => gameState().clip === "Jump" && gameState().y > 0.1,
    );
    const jump = await page.evaluate(() => gameState());
    assert.equal(jump.clip, "Jump");
    assert.ok(jump.y > 0);
    await page.waitForFunction(() => gameState().grounded);
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
  // Tour using only real movement keys and the actual contextual action.
  await walkTo(-3.8, -1.2);
  await walkTo(-5.5, -1.5);
  await page.keyboard.press("f");
  await page.waitForTimeout(100);
  assert.equal((await page.evaluate(() => gameState())).scene, "cottage");
  await page.screenshot({ path: root + "/dist/review/cottage.png" });
  await page
    .getByRole("button", { name: "F · Return to town", exact: true })
    .click();
  await walkTo(-5.5, 0);
  await walkTo(-10.6, 0);
  await walkTo(-10.6, -1.75);
  await walkTo(-10.2, -1.85);
  await page.keyboard.press("f");
  await page.waitForTimeout(100);
  assert.equal((await page.evaluate(() => gameState())).scene, "grocery");
  await walkTo(1.2, 0);
  await walkTo(2, -0.65);
  await page.keyboard.press("f");
  assert.match(await page.locator("#message").textContent(), /Crisp/);
  await page.screenshot({ path: root + "/dist/review/grocery.png" });
  await walkTo(0, 1.5);
  await walkTo(0, 2.6);
  await page.keyboard.press("f");
  await walkTo(-10.2, 0);
  await walkTo(-3, 0);
  await walkTo(0, 0);
  await walkTo(3, 0);
  await walkTo(11, 0);
  await page.keyboard.press("f");
  await page.waitForTimeout(100);
  assert.equal((await page.evaluate(() => gameState())).scene, "potions");
  await walkTo(0, -0.65);
  await page.keyboard.press("f");
  await page.waitForTimeout(150);
  assert.match(await page.locator("#message").textContent(), /bubbly/);
  await page.screenshot({ path: root + "/dist/review/potions.png" });
  await walkTo(0, 2.6);
  await page.keyboard.press("f");
  await walkTo(11, 0);
  await walkTo(3.3, 0);
  await walkTo(3.3, 7.8);
  await walkTo(2.5, 7.8);
  await walkTo(0, 7.8);
  assert.ok((await page.evaluate(() => gameState())).swimming);
  await page.screenshot({ path: root + "/dist/review/swimming.png" });
  await walkTo(-2.5, 7.8);
  assert.ok((await page.evaluate(() => gameState())).grounded);
  // Load an unpromoted synthetic static GLB through the real scenery path.
  await page.goto(
    base + "/?scenery=produce-shelf&candidate=dist/static-fixture.glb",
  );
  await page.waitForFunction(() => window.gameState?.().fps > 0);
  const scenery = (await page.evaluate(() => gameState())).scenery;
  assert.equal(scenery.length, 8);
  assert.ok(scenery.includes("produce-shelf"));
  await walkTo(-4.1, 0);
  await walkTo(-10.6, 0);
  await walkTo(-10.6, -1.75);
  await walkTo(-10.2, -1.85);
  await page.keyboard.press("f");
  await page.waitForTimeout(150);
  assert.equal((await page.evaluate(() => gameState())).scene, "grocery");
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
  await mobile.waitForFunction(() => gameState().clip === "Jump");
  assert.equal((await mobile.evaluate(() => gameState())).clip, "Jump");
  await mobile.screenshot({ path: root + "/dist/review/mobile.png" });
  await mobile.getByRole("button", { name: "Respawn" }).tap();
  await walkTo(-3.8, -1.2, mobile);
  await walkTo(-5.5, -1.5, mobile);
  await mobile
    .getByRole("button", { name: "F · Enter Willow Cottage", exact: true })
    .tap();
  await mobile.waitForTimeout(150);
  assert.equal((await mobile.evaluate(() => gameState())).scene, "cottage");
  await mobile
    .getByRole("button", { name: "F · Return to town", exact: true })
    .tap();
  assert.equal((await mobile.evaluate(() => gameState())).scene, "outdoors");
  assert.deepEqual(errors, []);
  await browser.close();
  server.close();
  console.log(
    "Browser checks passed: HTTP and offline/no network, real WebGL silhouette pixels, pause/resume/focus, keyboard movement, camera, mobile touch/doors, all interior types, shop interactions, bank-to-bank swimming, candidate scenery, no page errors.",
  );
})().catch((error) => {
  console.error(error);
  server.close();
  process.exit(1);
});
