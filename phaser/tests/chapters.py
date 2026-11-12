"""Inspect all five Phaser chapters under the actual 60 Hz browser loop."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / "dist/wonderwood-phaser.html"
CHAPTERS = [
    "first-forest", "crystal-coast", "starfall-summit",
    "willow-wetlands", "cloud-gardens"
]


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, args=["--enable-webgl", "--use-gl=swiftshader"]
        )
        page = browser.new_page(viewport={"width": 960, "height": 540})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(GAME.as_uri())
        page.wait_for_function("window.__wonderwoodPhaser?.snapshot().stage === -1")

        for i, chapter in enumerate(CHAPTERS):
            if i:
                page.keyboard.down("h")
                page.wait_for_function(
                    "window.__wonderwoodPhaser.snapshot().stage === -1"
                )
                page.keyboard.up("h")
                page.wait_for_timeout(90)
                page.keyboard.down("d")
                page.wait_for_function(
                    "window.__wonderwoodPhaser.snapshot().choice === " + str(i)
                )
                page.keyboard.up("d")
                page.wait_for_timeout(90)

            page.keyboard.down("Space")
            page.wait_for_function(
                "window.__wonderwoodPhaser.snapshot().stage === " + str(i),
                timeout=20000,
            )
            page.keyboard.up("Space")
            page.wait_for_timeout(260)
            state = page.evaluate("window.__wonderwoodPhaser.snapshot()")
            assert state["chapter"] == chapter, state
            assert state["players"][0]["health"] == 3, state
            assert state["players"][0]["grounded"], (
                "Menu confirm must not trigger a jump when gameplay begins", state
            )
            assert state["animalCount"] > 0, state
            assert state["platformCount"] > 0, state
            assert state["parallaxLayers"] == 2, (chapter, state)
            assert not errors, (chapter, errors)
            page.screenshot(path=str(ROOT / "dist" / f"phaser-chapter-{chapter}.png"))
        browser.close()
    print("All five worlds render and spawn in the standalone Phaser build: PASS")


if __name__ == "__main__":
    main()
