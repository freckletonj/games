"""Offline Chromium regression for image-model-generated static water-cave art."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / "dist/wonderwood-phaser.html"

def main():
    assert GAME.is_file(), "Build the full Phaser HTML first"
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, args=["--enable-webgl", "--use-gl=swiftshader"]
        )
        page = browser.new_page(viewport={"width":960,"height":540})
        errors, external = [], []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: external.append(request.url)
            if request.url.startswith(("http://","https://")) else None)
        page.goto(GAME.as_uri(),wait_until="load")
        page.wait_for_function(
            "window.__wonderwoodPhaser?.snapshot().stage === -1",timeout=30000
        )
        for _ in range(5):
            page.locator("#ww-menu-next").click()
        assert page.evaluate("window.__wonderwoodPhaser.snapshot().choice") == 5
        page.locator("#ww-menu-play").click()
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().chapter === 'luminous-grotto'",
            timeout=25000
        )
        before=page.evaluate("window.__wonderwoodPhaser.snapshot()")
        art=before["caveArt"]
        assert art and art["rockLoaded"] and art["ambientLoaded"],art
        assert before["parallaxLayers"] == 2,before
        chunks=art["chunks"]
        assert len(chunks)==4,chunks
        assert chunks[0]["x"]==0,chunks
        assert all(c["x"] == c["displayX"] and
            c["width"]==c["displayWidth"] and c["width"]<=768
            for c in chunks),chunks
        assert all(chunks[i]["x"]+chunks[i]["width"]-
            chunks[i+1]["overlapPixels"]==chunks[i+1]["x"]
            for i in range(len(chunks)-1)),chunks
        assert all(c["source"] in ("fallback","chunk") for c in chunks),chunks
        assert chunks[-1]["x"]+chunks[-1]["width"]==before["worldWidth"]
        page.screenshot(path=str(ROOT/"dist"/"phaser-grotto-painted.png"))
        page.keyboard.press("g")
        assert page.evaluate(
            "window.__wonderwoodPhaser.snapshot().caveArt.geometryOverlay"
        ),"Geometry overlay should reveal the authored collision contours"
        page.keyboard.press("g")

        # The earlier stand-alone mock could show a static painting but had no
        # verified gameplay. Exercise actual Phaser keyboard input and 60 Hz sim.
        page.evaluate("document.activeElement.blur()")
        page.keyboard.down("d")
        target=before["players"][0]["x"]+16
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].x > "+str(target),
            timeout=20000
        )
        page.keyboard.up("d")
        after=page.evaluate("window.__wonderwoodPhaser.snapshot()")
        assert after["players"][0]["x"]>before["players"][0]["x"]+16
        assert not external,"Standalone game requested external assets: "+str(external)
        assert not errors,"Browser errors: "+"; ".join(errors)
        browser.close()

if __name__=="__main__":
    main()
