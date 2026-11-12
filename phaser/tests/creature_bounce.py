"""Real-input creature-back spring test in the standalone Phaser build.

No mutation of scene state: reach a wandering Springaroo by moving/jumping
with the same keys as a player, then tap Jump after the stomp.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

GAME = Path(__file__).resolve().parents[2] / "dist" / "wonderwood-phaser.html"


def state(page):
    return page.evaluate("window.__wonderwoodPhaser.snapshot()")


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, args=["--enable-webgl", "--use-gl=swiftshader"]
        )
        page = browser.new_page(viewport={"width": 960, "height": 540})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(GAME.as_uri(), wait_until="load")
        page.wait_for_function("window.__wonderwoodPhaser?.snapshot().stage === -1")
        page.keyboard.down("Space")
        page.wait_for_function("window.__wonderwoodPhaser.snapshot().stage === 0")
        page.keyboard.up("Space")

        # Springaroo is the harmless first creature. Read its actual patrol
        # position rather than assuming a hard-coded spawn coordinate.
        page.keyboard.down("d")
        page.wait_for_function("""() => {
            const s=window.__wonderwoodPhaser.snapshot();
            const a=s.animals.find(a=>a.kind==='springaroo');
            return s.players[0].x>=a.x-48;
        }""", timeout=30000)
        page.keyboard.down("Space")
        page.wait_for_function("""() => {
            const s=window.__wonderwoodPhaser.snapshot();
            const a=s.animals.find(a=>a.kind==='springaroo');
            return s.players[0].x>=a.x-14;
        }""", timeout=16000)
        page.keyboard.up("Space")
        page.keyboard.up("d")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].creatureBounceWindow > 0",
            timeout=12000,
        )
        impact = state(page)["players"][0]
        assert impact["vy"] < 0 and not impact["grounded"], impact

        page.keyboard.down("Space")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].creatureBounceBoosts === 1",
            timeout=12000,
        )
        boosted = state(page)["players"][0]
        assert boosted["vy"] < -6.5, (impact, boosted)
        assert boosted["creatureBounceWindow"] == 0, boosted
        page.wait_for_timeout(320)
        assert state(page)["players"][0]["creatureBounceBoosts"] == 1
        page.keyboard.up("Space")
        page.screenshot(path=str(GAME.parent / "phaser-creature-bounce.png"))
        assert not errors, errors
        browser.close()
    print("Creature-back stomp and timed second jump via real input: PASS")


if __name__ == "__main__":
    main()
