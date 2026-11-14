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
            assert state["paintedStateFrames"] == 9, state
            assert state["platformCount"] > 0, state
            art = state["sceneArt"]
            assert not art["geometryOverlay"], art
            right = 0
            for index, layer in enumerate(art["layers"]):
                assert layer["textureKey"] == f"scene-{chapter}-scene-{index}", layer
                assert layer["origin"] == [right, 0] and layer["scrollFactor"] == 1, layer
                assert layer["sourcePixels"] == layer["worldPixels"], layer
                assert layer["worldPixels"][0] <= 4096, layer
                right += layer["worldPixels"][0]
            assert right == state["worldWidth"], art
            page.keyboard.press("v")
            assert page.evaluate(
                "window.__wonderwoodPhaser.snapshot().sceneArt.geometryOverlay"
            )
            page.keyboard.press("v")
            assert not errors, (chapter, errors)
            page.screenshot(path=str(ROOT / "dist" / f"phaser-chapter-{chapter}.png"))
            if i == 0:
                for width, height, label in (
                    (390, 844, "portrait"), (640, 360, "compact-landscape")
                ):
                    page.set_viewport_size({"width": width, "height": height})
                    page.wait_for_timeout(110)
                    hud = page.locator("#ww-ui").bounding_box()
                    canvas = page.locator("canvas").bounding_box()
                    for axis in ("x", "y", "width", "height"):
                        assert abs(hud[axis] - canvas[axis]) < 3, (
                            label, axis, hud, canvas
                        )
                    for selector in ("#ww-status", "#ww-help"):
                        element = page.locator(selector)
                        if element.is_visible():
                            rect = element.bounding_box()
                            assert rect["x"] >= 0 and rect["y"] >= 0, rect
                            assert rect["x"] + rect["width"] <= width + 1, rect
                            assert rect["y"] + rect["height"] <= height + 1, rect
                    page.screenshot(path=str(ROOT / "dist" / f"phaser-meadow-{label}.png"))
                page.set_viewport_size({"width": 960, "height": 540})
        browser.close()
    print("All five worlds render and spawn in the standalone Phaser build: PASS")


if __name__ == "__main__":
    main()
