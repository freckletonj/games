"""Real-input browser smoke for the full-scale, one-image Skywell chapter."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
GAME=ROOT/"dist/wonderwood-phaser.html"

def main():
    assert GAME.is_file(),"Build the offline Phaser HTML first"
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(
            headless=True,args=["--enable-webgl","--use-gl=swiftshader"]
        )
        page=browser.new_page(viewport={"width":960,"height":540})
        errors,external=[],[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        page.on("request",lambda request:external.append(request.url)
            if request.url.startswith(("http://","https://")) else None)
        page.goto(GAME.as_uri(),wait_until="load")
        page.wait_for_function(
            "window.__wonderwoodPhaser?.snapshot().stage === -1",timeout=30000)
        for _ in range(6):
            page.locator("#ww-menu-next").click()
        page.locator("#ww-menu-play").click()
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().chapter === 'skywell-ascent'",
            timeout=30000)
        state=page.evaluate("window.__wonderwoodPhaser.snapshot()")
        assert state["worldWidth"]==3520,state
        assert state["platformCount"]==26,state
        assert state["climbWallCount"]==10,state
        assert state["cameraZoom"]==1.4,state
        art=state["caveArt"]
        assert art and art["rockLoaded"],state
        assert art["textureKey"]=="skywell-painted-rock",art
        assert art["imageCount"]==1,art
        assert art["sourcePixels"]=={"width":3520,"height":2048},art
        assert art["painting"]=={
            "x":0,"y":0,"displayWidth":3520,"displayHeight":2048
        },art
        assert state["parallaxLayers"]==0,state
        assert state["players"][0]["grounded"],state
        # Real gameplay: choose stars (two E presses), feed the nearby
        # Glimmermoth twice, catch it with G and transform with T.
        # Poll fixed-tick state rather than relying on animation-frame timing.
        page.keyboard.down("e")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].food === 'nectar'",
            timeout=30000)
        page.keyboard.up("e")
        released=page.evaluate(
            "window.__wonderwoodPhaser.snapshot().simulationSeconds")
        page.wait_for_function(
            "(s) => window.__wonderwoodPhaser.snapshot().simulationSeconds > s",
            arg=released+.05,timeout=30000)
        page.keyboard.down("e")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].food === 'star'",
            timeout=30000)
        page.keyboard.up("e")
        page.wait_for_function(
            "(s) => window.__wonderwoodPhaser.snapshot().simulationSeconds > s",
            arg=page.evaluate(
                "window.__wonderwoodPhaser.snapshot().simulationSeconds")+.05,
            timeout=30000)

        for trust in (60,100):
            page.keyboard.down("f")
            page.wait_for_function(
                "window.__wonderwoodPhaser.snapshot().lures.length > 0",
                timeout=30000)
            page.keyboard.up("f")
            page.wait_for_function(
                "(t) => window.__wonderwoodPhaser.snapshot().animals"
                ".some(a => a.kind === 'glimmermoth' && a.trust >= t)",
                arg=trust,timeout=90000)
            page.wait_for_function(
                "(s) => window.__wonderwoodPhaser.snapshot().simulationSeconds > s",
                arg=page.evaluate(
                    "window.__wonderwoodPhaser.snapshot().simulationSeconds")+.05,
                timeout=30000)
        page.keyboard.down("g")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].caught === 'glimmermoth'",
            timeout=90000)
        page.keyboard.up("g")
        page.keyboard.down("t")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].form === 'glimmermoth'",
            timeout=30000)
        page.keyboard.up("t")

        page.screenshot(path=str(ROOT/"dist"/"phaser-skywell-painted.png"))
        page.keyboard.press("v")
        assert page.evaluate(
            "window.__wonderwoodPhaser.snapshot().caveArt.geometryOverlay"
        ),"Filled geometry inspection must be available"
        page.screenshot(path=str(ROOT/"dist"/"phaser-skywell-physics.png"))
        page.keyboard.press("v")
        page.keyboard.down("d")
        target=state["players"][0]["x"]+14
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].x > "+str(target),
            timeout=20000)
        # Reach the first authored wall by normal input, then press Jump,
        # release it, and press again to spring away from the rock face.
        page.keyboard.down("d")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].x > 425",
            timeout=30000)
        page.keyboard.down("w")
        initial=page.evaluate(
            "window.__wonderwoodPhaser.snapshot().simulationSeconds")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().simulationSeconds >= "+str(initial+.12),
            timeout=30000)
        page.keyboard.up("w")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().simulationSeconds >= "+str(initial+.16),
            timeout=30000)
        page.keyboard.down("w")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].wallJumps > 0",
            timeout=30000)
        page.keyboard.up("w")
        page.keyboard.up("d")
        assert not errors,errors
        assert not external,external
        browser.close()

if __name__=="__main__":
    main()
