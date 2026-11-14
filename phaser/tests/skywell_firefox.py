"""Direct file:// Firefox acceptance test for the actual offline Phaser build.

Unlike the inline Chromium adapter, this uses Firefox's own file-origin
storage and WebGL behavior. Run after: python -m playwright install firefox
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / "dist/wonderwood-phaser.html"


def main():
    assert GAME.is_file(), "Build the standalone game first"
    with sync_playwright() as playwright:
        browser = playwright.firefox.launch(headless=True)
        page = browser.new_page(viewport={"width": 960, "height": 540})
        errors, external = [], []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: external.append(request.url)
                if request.url.startswith(("http://", "https://")) else None)
        # File origin is intentional: this is exactly how a downloaded
        # self-contained preview opens in Firefox, not an HTTP test server.
        page.goto(GAME.as_uri()+"#skywell-ascent", wait_until="load", timeout=120000)
        page.wait_for_function(
            "window.__wonderwoodPhaser?.snapshot().stage === -1",
            timeout=90000
        )
        assert page.locator("canvas").count() == 1
        assert page.locator(".ww-menu-title").inner_text() == "Wonderwood"
        assert page.locator("#ww-menu-chapter").inner_text() == "Skywell Ascent"
        page.locator("#ww-menu-play").click()
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().chapter === 'skywell-ascent'",
            timeout=90000
        )
        first = page.evaluate("window.__wonderwoodPhaser.snapshot()")
        assert first["sceneArt"]["layers"][-1]["sourcePixels"] == [3520, 2048]
        assert first["platformCount"] == 26
        assert first["climbWallCount"] == 10
        page.screenshot(path=str(ROOT / "dist/phaser-skywell-firefox.png"))
        page.keyboard.press("v")
        assert page.evaluate(
            "window.__wonderwoodPhaser.snapshot().sceneArt.geometryOverlay"
        )
        page.keyboard.press("v")
        page.keyboard.down("d")
        page.wait_for_function(
            "(x) => window.__wonderwoodPhaser.snapshot().players[0].x > x",
            arg=first["players"][0]["x"] + 18,
            timeout=30000
        )
        page.keyboard.up("d")
        assert not errors, errors
        assert not external, external
        browser.close()


if __name__ == "__main__":
    main()
