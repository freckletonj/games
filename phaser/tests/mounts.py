"""Real-input feeding, riding, jumping and flying with both painted mounts."""
from pathlib import Path
from playwright.sync_api import sync_playwright

GAME=Path(__file__).resolve().parents[2]/"dist"/"wonderwood-phaser.html"

def snapshot(page):
    return page.evaluate("window.__wonderwoodPhaser.snapshot()")

def tap(page,key):
    page.keyboard.down(key)
    page.wait_for_timeout(190)
    page.keyboard.up(key)
    page.wait_for_timeout(110)

def hold_until(page,key,condition,timeout=60000):
    page.keyboard.down(key)
    page.wait_for_function(condition,timeout=timeout)
    page.keyboard.up(key)
    page.wait_for_timeout(130)

def main():
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,
            args=["--enable-webgl","--use-gl=swiftshader"])
        page=browser.new_page(viewport={"width":960,"height":540})
        errors=[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        page.goto(GAME.as_uri(),wait_until="load")
        page.wait_for_function("window.__wonderwoodPhaser?.snapshot().stage === -1",
            timeout=30000)
        page.locator(".ww-explorers button").first.click()
        page.locator("#ww-menu-continue").click()
        hold_until(page,"Space","window.__wonderwoodPhaser.snapshot().stage === 0")
        hold_until(page,"d",
            "window.__wonderwoodPhaser.snapshot().players[0].x > 655",timeout=100000)

        for threshold in (60,100):
            tap(page,"f")
            page.wait_for_function(
                "window.__wonderwoodPhaser.snapshot().mounts[0].trust >= "+str(threshold),
                timeout=45000)
        mount=snapshot(page)["mounts"][0]
        assert mount["kind"]=="unicorn" and mount["rider"] is None
        hold_until(page,"d",
            "window.__wonderwoodPhaser.snapshot().players[0].x > 738")
        hold_until(page,"t",
            "window.__wonderwoodPhaser.snapshot().players[0].mount === 'unicorn'")
        mounted=snapshot(page)
        assert mounted["players"][0]["texture"]=="riders"
        assert mounted["mounts"][0]["rider"]==0 and mounted["players"][0]["form"] is None
        page.screenshot(path=str(GAME.parent/"phaser-unicorn-mounted.png"))

        start=mounted["players"][0]["x"]
        page.keyboard.down("d")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].x > "+str(start+90),
            timeout=30000)
        gallop=snapshot(page)
        assert gallop["mounts"][0]["vx"]>2.5,gallop
        page.keyboard.up("d")
        page.wait_for_timeout(130)
        height=snapshot(page)["mounts"][0]["y"]
        hold_until(page,"Space",
            "window.__wonderwoodPhaser.snapshot().mounts[0].y < "+str(height-22))
        assert snapshot(page)["mounts"][0]["rider"]==0
        page.screenshot(path=str(GAME.parent/"phaser-unicorn-leap.png"))
        hold_until(page,"t",
            "window.__wonderwoodPhaser.snapshot().players[0].mount === null")

        # An accessible Pegasus in Cloud Gardens can be earned normally.
        hold_until(page,"h",
            "window.__wonderwoodPhaser.snapshot().stage === -1")
        page.locator(".ww-explorers button").first.click()
        page.locator("#ww-menu-continue").click()
        page.get_by_role("button", name="Cloud Gardens").click()
        hold_until(page,"Space",
            "window.__wonderwoodPhaser.snapshot().stage === 4")
        assert snapshot(page)["mounts"][0]["kind"]=="pegasus"
        hold_until(page,"d",
            "window.__wonderwoodPhaser.snapshot().players[0].x > 345")
        tap(page,"e")
        tap(page,"e")
        assert snapshot(page)["players"][0]["food"]=="star"

        for threshold in (60,100):
            tap(page,"f")
            page.wait_for_function(
                "window.__wonderwoodPhaser.snapshot().mounts[0].trust >= "+str(threshold),
                timeout=45000)
        hold_until(page,"d",
            "window.__wonderwoodPhaser.snapshot().players[0].x > 408")
        hold_until(page,"t",
            "window.__wonderwoodPhaser.snapshot().players[0].mount === 'pegasus'")
        pegasus=snapshot(page)
        assert pegasus["mounts"][0]["rider"]==0
        page.screenshot(path=str(GAME.parent/"phaser-pegasus-mounted.png"))
        start_y=pegasus["mounts"][0]["y"]
        for _ in range(3):
            tap(page,"Space")
            page.wait_for_timeout(135)
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().mounts[0].y < "+str(start_y-45),
            timeout=20000)
        flown=snapshot(page)
        assert flown["mounts"][0]["flaps"]>=2,flown
        assert flown["players"][0]["mount"]=="pegasus"
        assert flown["players"][0]["texture"]=="riders"
        page.screenshot(path=str(GAME.parent/"phaser-pegasus-flight.png"))
        assert not errors,"Browser errors: "+"; ".join(errors)
        browser.close()
    print("Unicorn feed/ride/gallop/leap/dismount, Pegasus feed/flight: PASS")

if __name__=="__main__":
    main()
