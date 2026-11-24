"""Real-input coverage for the shared camera, rescue bubble, and early pickups."""
from pathlib import Path

from playwright.sync_api import sync_playwright

GAME = Path(__file__).resolve().parents[2] / "dist" / "wonderwood-phaser.html"
STATE = "window.__wonderwoodPhaser?.snapshot()"


def wait(page, predicate):
    return page.wait_for_function(
        f"() => {{ const s = {STATE}; return s && ({predicate}) && s; }}",
        timeout=45000,
    ).json_value()


def visible(state, player):
    view = state["cameraView"]
    return (
        view["x"] < player["x"] < view["x"] + view["width"]
        and view["y"] < player["y"] - 24 < player["y"] < view["y"] + view["height"]
    )


def start(page, coop=False):
    page.goto(GAME.as_uri(), wait_until="load")
    wait(page, "s.stage === -1")
    choices = page.locator(".ww-explorers button")
    choices.first.click()
    if coop:
        choices.nth(4).click()
    page.locator("#ww-menu-continue").click()
    page.locator("#ww-menu-play").click()
    return wait(page, "s.stage === 0 && s.cameraView.width > 0")


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, args=["--enable-webgl", "--use-gl=swiftshader"]
        )
        page = browser.new_page(viewport={"width": 960, "height": 540})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))

        start(page, coop=True)
        page.keyboard.down("d")
        wide = wait(page, "s.cameraZoom < 1.92 && !s.players[1].bubble")
        assert all(visible(wide, p) for p in wide["players"]), wide["cameraView"]
        bubbled = wait(page, "s.players[1].bubble")
        assert bubbled["players"][1]["bubbleFrame"] is not None
        assert abs(bubbled["players"][1]["x"] - wide["players"][1]["x"]) < 12
        running = wait(page, f"s.players[0].x > {bubbled['players'][0]['x'] + 165}")
        page.keyboard.up("d")
        assert running["players"][1]["bubble"]
        assert running["players"][1]["x"] > bubbled["players"][1]["x"] + 100

        settled = wait(page, "s.cameraZoom === 2 && s.players[1].bubble"
                             " && Math.abs(s.players[0].x-s.players[1].x)<70")
        assert visible(settled, settled["players"][1])
        bubble = settled["players"][1]
        bobbed = wait(page, f"Math.abs(s.players[1].y - {bubble['y']}) > 2")
        assert bobbed["players"][1]["bubble"]
        page.screenshot(path=str(GAME.parent / "phaser-coop-bubble.png"))

        page.keyboard.press("i")
        resumed = wait(page, "!s.players[1].bubble")
        assert resumed["players"][1]["health"] > 0
        assert abs(resumed["players"][1]["x"] - bobbed["players"][1]["x"]) < 18
        assert abs(resumed["players"][1]["y"] - bobbed["players"][1]["y"]) < 18
        page.keyboard.down("l")
        wait(page, f"s.players[1].x > {resumed['players'][1]['x'] + 15}")
        page.keyboard.up("l")

        page.close()
        page = browser.new_page(viewport={"width": 960, "height": 540})
        page.on("pageerror", lambda error: errors.append(str(error)))
        start(page)
        assert page.evaluate(STATE)["cameraZoom"] == 2
        page.keyboard.down("d")
        bloom = wait(page, "s.players[0].dandelion > 0")
        page.keyboard.up("d")
        assert bloom["pickups"][0]["used"]
        page.keyboard.down("Space")
        wait(page, f"s.players[0].y < {bloom['players'][0]['y'] - 57}")
        page.keyboard.up("Space")
        page.wait_for_timeout(40)
        wait(page, "s.players[0].grounded")
        spent = wait(page, "s.players[0].dandelion === 0")
        assert 4.85 <= spent["simulationSeconds"] - bloom["simulationSeconds"] <= 5.1

        page.keyboard.down("d")
        ice = wait(page, "s.players[0].iceWater > 0")
        page.keyboard.up("d")
        page.screenshot(path=str(GAME.parent / "phaser-ice-water.png"))
        coast = wait(page, f"s.simulationSeconds >= {ice['simulationSeconds'] + .24}")
        assert coast["players"][0]["x"] > ice["players"][0]["x"] + 19
        assert coast["players"][0]["vx"] > 1

        page.keyboard.down("d")
        bounce = wait(page, "s.pickups.find(p => p.kind === 'toadstool').used")
        page.keyboard.up("d")
        wait(page, f"s.players[0].y < {bounce['players'][0]['y'] - 28}")
        assert not errors, errors
        browser.close()
    print("Co-op camera, bobbing rescue, and all three pickups: PASS")


if __name__ == "__main__":
    main()
