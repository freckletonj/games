"""Real Chromium smoke test against the unmodified, offline Phaser artifact."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / "dist" / "wonderwood-phaser.html"


def main():
    assert GAME.is_file() and GAME.stat().st_size > 500_000, "Missing embedded Phaser/painted assets"
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=["--enable-webgl", "--use-gl=swiftshader"],
        )
        page = browser.new_page(viewport={"width": 960, "height": 540})
        errors = []
        external = []

        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on(
            "request",
            lambda request: external.append(request.url)
            if request.url.startswith(("http://", "https://"))
            else None,
        )

        page.goto(GAME.as_uri(), wait_until="load")
        page.wait_for_function(
            "window.__wonderwoodPhaser?.snapshot().stage === -1", timeout=30000
        )
        assert page.locator("canvas").count() == 1, "A Phaser canvas must render"

        page.keyboard.down("Space")
        page.wait_for_timeout(120)
        page.keyboard.up("Space")
        page.wait_for_function(
            "window.__wonderwoodPhaser?.snapshot().stage === 0", timeout=15000
        )
        before = page.evaluate("window.__wonderwoodPhaser.snapshot()")
        assert before["chapter"] == "first-forest"
        assert before["players"][0]["health"] == 3

        page.keyboard.down("d")
        page.wait_for_timeout(450)
        page.keyboard.up("d")
        after = page.evaluate("window.__wonderwoodPhaser.snapshot()")
        assert after["players"][0]["x"] > before["players"][0]["x"] + 10, (
            "Player must move under genuine animation-frame input", before, after
        )
        page.screenshot(path=str(ROOT / "dist" / "phaser-preview.png"))

        page.keyboard.press("2")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players.length === 2"
        )
        page.keyboard.down("l")
        page.wait_for_timeout(230)
        page.keyboard.up("l")
        assert not errors, "Browser errors: " + "; ".join(errors)
        assert not external, "Offline game requested network: " + "; ".join(external)
        browser.close()
    print("Phaser offline start, movement, local co-op and no-network smoke: PASS")


if __name__ == "__main__":
    main()
