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
        page.locator(".ww-explorers button").first.click()
        page.locator("#ww-menu-continue").click()
        page.keyboard.down("d")
        page.wait_for_function("window.__wonderwoodPhaser.snapshot().choice === 1")
        page.keyboard.up("d")
        page.wait_for_timeout(130)
        page.keyboard.down("Space")
        page.wait_for_function("window.__wonderwoodPhaser.snapshot().stage === 1")
        page.keyboard.up("Space")

        # Earn Tidefox naturally before testing underwater mechanics. The
        # original bug occurs especially with Tidefox's swim-up controls.
        page.keyboard.down("d")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].x > 339",
            timeout=45000,
        )
        page.keyboard.up("d")
        page.wait_for_timeout(220)
        page.keyboard.down("e")
        page.wait_for_timeout(210)
        page.keyboard.up("e")
        page.wait_for_timeout(130)
        assert page.evaluate(
            "window.__wonderwoodPhaser.snapshot().players[0].food"
        ) == "nectar"
        for trust in (60, 100):
            page.keyboard.down("f")
            page.wait_for_timeout(210)
            page.keyboard.up("f")
            page.wait_for_timeout(150)
            page.wait_for_function(
                "window.__wonderwoodPhaser.snapshot().animals.some(a => "
                "a.kind === 'tideling' && a.trust >= " + str(trust) + ")",
                timeout=45000,
            )
        page.keyboard.down("d")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].x > 365",
            timeout=25000,
        )
        page.keyboard.up("d")
        page.wait_for_timeout(180)
        page.keyboard.down("g")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].caught === 'tideling'",
            timeout=35000,
        )
        page.keyboard.up("g")
        page.wait_for_timeout(100)
        page.keyboard.down("t")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].form === 'tideling'",
            timeout=12000,
        )
        page.keyboard.up("t")

        # Read-only frame observer; no game state is changed or abilities granted.
        page.evaluate("""()=>{
            window.__waterProbe={maxPenetration:0,recalls:0,submerged:0,
                maxSurfaceSpeed:0,last:null};
            window.__waterWatch=setInterval(()=>{
                const snapshot=window.__wonderwoodPhaser.snapshot();
                const p=snapshot.players[0];
                if(!p)return;
                const probe=window.__waterProbe;
                probe.maxPenetration=Math.max(probe.maxPenetration,p.y-p.ground);
                probe.recalls=p.recalls;
                if(p.inWater)probe.submerged++;
                const previous=probe.last;
                if(previous && p.grounded && previous.grounded){
                    const ticks=(snapshot.simulationSeconds-previous.time)*60;
                    if(ticks>0.5)
                        probe.maxSurfaceSpeed=Math.max(probe.maxSurfaceSpeed,
                            Math.hypot(p.x-previous.x,p.y-previous.y)/ticks);
                }
                probe.last={x:p.x,y:p.y,grounded:p.grounded,
                    time:snapshot.simulationSeconds};
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
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].x > 1660",
            timeout=45000,
        )
        page.keyboard.up("d")
        state=page.evaluate("window.__wonderwoodPhaser.snapshot()")
        observed=page.evaluate("window.__waterProbe")
        player=state["players"][0]
        assert player["x"]>1660 and player["form"]=="tideling",(player,observed)
        assert player["recalls"]==0,(player,observed)
        assert observed["recalls"]==0 and observed["submerged"]>0,observed
        assert observed["maxPenetration"]<5,observed
        assert observed["maxSurfaceSpeed"]<4.2,observed
        page.screenshot(path=str(GAME.parent/"phaser-water-slope.png"))
        assert not errors,errors
        browser.close()
    print("Captured Tidefox crosses submerged uphill shore with ten jumps, no recalls: PASS")

if __name__=="__main__":
    main()
