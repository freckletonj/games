"""Real-input springboard timing and projectile behavior in standalone HTML."""
from pathlib import Path
from playwright.sync_api import sync_playwright

GAME=Path(__file__).resolve().parents[2]/"dist"/"wonderwood-phaser.html"

def state(page):
    return page.evaluate("window.__wonderwoodPhaser.snapshot()")

def main():
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,
            args=["--enable-webgl","--use-gl=swiftshader"])
        page=browser.new_page(viewport={"width":960,"height":540})
        errors=[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        page.goto(GAME.as_uri())
        page.wait_for_function("window.__wonderwoodPhaser?.snapshot().stage === -1",
            timeout=30000)
        page.keyboard.down("Space")
        page.wait_for_function("window.__wonderwoodPhaser.snapshot().stage === 0")
        page.keyboard.up("Space")
        page.wait_for_timeout(160)

        x=state(page)["players"][0]["x"]
        page.keyboard.down("f")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().lures.length > 0",timeout=12000)
        thrown=state(page)
        page.keyboard.up("f")
        assert thrown["lures"][0]["x"]>x+80,thrown

        # A paused scene must not secretly finish an airborne food throw.
        page.keyboard.down("Escape")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().paused === true",timeout=12000)
        page.keyboard.up("Escape")
        airborne=state(page)["lures"][0]
        page.wait_for_timeout(750)
        frozen=state(page)["lures"][0]
        assert airborne["age"]==frozen["age"] and not frozen["landed"],(airborne,frozen)
        page.keyboard.down("Escape")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().paused === false",timeout=12000)
        page.keyboard.up("Escape")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().lures.length === 0 || "
            "window.__wonderwoodPhaser.snapshot().lures[0].landed",
            timeout=20000)
        page.screenshot(path=str(GAME.parent/"phaser-painted-berry.png"))

        page.keyboard.down("g")
        page.wait_for_function("window.__wonderwoodPhaser.snapshot().orbs > 0",
            timeout=10000)
        page.keyboard.up("g")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().orbStates.some(orb=>orb.bounces>=1)",
            timeout=25000)
        page.screenshot(path=str(GAME.parent/"phaser-bouncing-orb.png"))

        # The first Meadow bloom activates automatically by walking over it.
        page.keyboard.down("d")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].bloomWindow > 0",
            timeout=105000)
        page.keyboard.up("d")
        bounced=state(page)["players"][0]
        assert bounced["vy"]<0 and bounced["bloomWindow"]>0,bounced

        # Jump after the automatic launch: no perfect-frame timing needed.
        page.keyboard.down("Space")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].bloomBoosts >= 1",
            timeout=12000)
        boosted=state(page)["players"][0]
        page.keyboard.up("Space")
        assert boosted["bloomWindow"]==0 and boosted["vy"]<0,boosted
        assert boosted["y"] < bounced["y"]-25, (bounced,boosted)
        page.screenshot(path=str(GAME.parent/"phaser-bloom-boost.png"))
        assert not errors,errors
        browser.close()
    print("Long painted berry throw, nonhoming bounce orb, timed bloom super jump: PASS")

if __name__=="__main__":
    main()
