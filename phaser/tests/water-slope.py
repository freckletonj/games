"""Real-browser regression for uphill water banks and repeated jumps."""
from pathlib import Path
from playwright.sync_api import sync_playwright

GAME=Path(__file__).resolve().parents[2]/"dist"/"wonderwood-phaser.html"

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
        page.keyboard.down("d")
        page.wait_for_function("window.__wonderwoodPhaser.snapshot().choice === 1")
        page.keyboard.up("d")
        page.wait_for_timeout(130)
        page.keyboard.down("Space")
        page.wait_for_function("window.__wonderwoodPhaser.snapshot().stage === 1")
        page.keyboard.up("Space")

        # Read-only frame observer; no game state is changed or abilities granted.
        page.evaluate("""()=>{
            window.__waterProbe={maxPenetration:0,recalls:0,submerged:0};
            window.__waterWatch=setInterval(()=>{
                const p=window.__wonderwoodPhaser.snapshot().players[0];
                if(!p)return;
                window.__waterProbe.maxPenetration=Math.max(
                    window.__waterProbe.maxPenetration,p.y-p.ground);
                window.__waterProbe.recalls=p.recalls;
                if(p.inWater)window.__waterProbe.submerged++;
            },25);
        }""")
        page.keyboard.down("d")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].x > 1400",
            timeout=110000)
        in_basin=page.evaluate("window.__wonderwoodPhaser.snapshot().players[0]")
        assert in_basin["grounded"] and in_basin["inWater"],in_basin
        # A common failure was repeatedly jumping against the uphill shore.
        for _ in range(10):
            page.keyboard.down("Space")
            page.wait_for_timeout(270)
            page.keyboard.up("Space")
            page.wait_for_timeout(80)
        page.keyboard.up("d")
        state=page.evaluate("window.__wonderwoodPhaser.snapshot()")
        observed=page.evaluate("window.__waterProbe")
        player=state["players"][0]
        assert player["x"]>1660,(player,observed)
        assert player["recalls"]==0,(player,observed)
        assert observed["recalls"]==0 and observed["submerged"]>0,observed
        assert observed["maxPenetration"]<5,observed
        page.screenshot(path=str(GAME.parent/"phaser-water-slope.png"))
        assert not errors,errors
        browser.close()
    print("Coastal submerged bank, ten jumps, no under-terrain falls or recalls: PASS")

if __name__=="__main__":
    main()
