"""Real-input Chromium check for the single-painting sixth chapter."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
GAME=ROOT/"dist/wonderwood-phaser.html"

def main():
    assert GAME.is_file(),"Run npm run build --prefix phaser first"
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(
            headless=True,args=["--enable-webgl","--use-gl=swiftshader"]
        )
        page=browser.new_page(viewport={"width":960,"height":540})
        errors,external=[],[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        page.on("request",lambda req:external.append(req.url)
            if req.url.startswith(("http://","https://")) else None)
        page.goto(GAME.as_uri(),wait_until="load")
        page.wait_for_function(
            "window.__wonderwoodPhaser?.snapshot().stage === -1",
            timeout=30000
        )
        for _ in range(5):
            page.locator("#ww-menu-next").click()
        page.locator("#ww-menu-play").click()
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().chapter === 'luminous-grotto'",
            timeout=25000
        )
        before=page.evaluate("window.__wonderwoodPhaser.snapshot()")
        art=before["sceneArt"]
        layer,=art["layers"]
        assert layer["textureKey"]=="scene-luminous-grotto-scene-0",art
        assert layer["origin"]==[0,0] and layer["scrollFactor"]==1,art
        assert layer["worldPixels"]==[3200,1792],art
        assert before["worldWidth"]==3200,before
        assert before["players"],before
        page.screenshot(path=str(ROOT/"dist"/"phaser-grotto-painted.png"))
        page.keyboard.press("v")
        assert page.evaluate(
            "window.__wonderwoodPhaser.snapshot().sceneArt.geometryOverlay"
        ),"V must display the real collision spline"
        page.keyboard.press("v")
        page.evaluate("document.activeElement.blur()")
        page.keyboard.down("d")
        target=before["players"][0]["x"]+16
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].x > "+str(target),
            timeout=20000
        )
        page.keyboard.up("d")
        after=page.evaluate("window.__wonderwoodPhaser.snapshot()")
        assert after["players"][0]["x"]>target,(before,after)
        assert not external,external
        assert not errors,errors
        browser.close()

if __name__=="__main__":
    main()
