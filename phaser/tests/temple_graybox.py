"""Exercise the unregistered Sunken Temple without paintings in real Chromium.

This is intentionally a graybox smoke test; route-by-route deterministic
movement and negative bypasses live in tests/temple-world.test.mjs.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

GAME = Path(__file__).resolve().parents[2] / "dist/wonderwood-phaser.html"


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, args=["--enable-webgl", "--use-gl=swiftshader"]
        )
        page = browser.new_page(viewport={"width": 960, "height": 540})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(GAME.as_uri() + "#sunken-temple", wait_until="load")
        page.wait_for_function(
            "window.__wonderwoodPhaser?.snapshot().stage === -1", timeout=30000
        )
        page.locator(".ww-explorers button").first.click()
        page.locator("#ww-menu-continue").click()
        chapter_buttons = page.locator("#ww-level-grid button")
        labels = chapter_buttons.all_inner_texts()
        assert any("Sunken Temple" in label for label in labels), (
            "Temple preview chapter card missing", labels,
            page.evaluate("location.href")
        )
        chapter_buttons.filter(has_text="Sunken Temple").click()
        page.locator("#ww-menu-play").click()
        page.wait_for_function(
            "window.__wonderwoodPhaser?.snapshot().chapter === 'sunken-temple'",
            timeout=30000,
        )
        state = page.evaluate("window.__wonderwoodPhaser.snapshot()")
        assert state["temple"], state
        assert len(state["temple"]["rafts"]) == 6, state["temple"]
        assert state["sceneArt"]["layers"] == [], "Graybox must need no painting"
        assert state["temple"]["gates"] == {
            "sluice-gate": False, "wheel-gate": False
        }
        x = state["players"][0]["x"]
        page.keyboard.down("d")
        page.wait_for_function(
            "x => window.__wonderwoodPhaser.snapshot().players[0].x > x+30",
            arg=x, timeout=20000
        )
        page.keyboard.up("d")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().temple.tick >= 40"
        )
        water = page.evaluate("window.__wonderwoodPhaser.snapshot().temple")
        assert water["surfaces"]["courtyard"] < 55, water
        page.keyboard.press("v")
        assert page.evaluate(
            "window.__wonderwoodPhaser.snapshot().sceneArt.geometryOverlay"
        )
        page.keyboard.press("v")
        assert not errors, "Temple preview browser errors: " + str(errors)
        browser.close()
    print("Unpainted Sunken Temple preview, real movement and collision overlay: PASS")


if __name__ == "__main__":
    main()
