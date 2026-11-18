"""Inspect the surface chapter samples under the actual 60 Hz browser loop."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / "dist/wonderwood-phaser.html"
CHAPTERS = [
    "first-forest", "crystal-coast", "starfall-summit",
    "willow-wetlands", "cloud-gardens", "monkey-jungle", "cavern-ascent"
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
            page.locator(".ww-explorers button").first.click()
            page.locator("#ww-menu-continue").click()
            if chapter == "monkey-jungle":
                page.get_by_role("button", name="Monkey Jungle").click()
            elif chapter == "cavern-ascent":
                page.get_by_role("button", name="Cavern Ascent").click()
            else:
                page.locator("#ww-level-grid button").nth(i).click()

            page.keyboard.down("Space")
            page.wait_for_function(
                "chapter => window.__wonderwoodPhaser.snapshot().chapter === chapter",
                arg=chapter,
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
            art = state["sceneArt"]
            assert not art["geometryOverlay"], art
            if chapter == "cavern-ascent":
                assert len(state["movingPlatforms"]) == 4, state
                assert len(state["puzzleObjects"]) == 4, state
                assert art["layers"][0]["worldPixels"] == [1280, 3200], art
            right = 0
            for index, layer in enumerate(art["layers"]):
                assert layer["textureKey"] == f"scene-{chapter}-scene-{index}", layer
                assert layer["origin"] == [right, 0] and layer["scrollFactor"] == 1, layer
                sourceWidth, sourceHeight = layer["sourcePixels"]
                worldWidth, worldHeight = layer["worldPixels"]
                assert worldWidth <= sourceWidth <= 4096, layer
                assert worldHeight <= sourceHeight <= 4096, layer
                right += layer["worldPixels"][0]
            assert right == state["worldWidth"], art
            if chapter == "cavern-ascent":
                # Real keyboard input on the actual bottom cave floor.
                start = state["players"][0]
                page.keyboard.down("d")
                page.wait_for_function(
                    "x => window.__wonderwoodPhaser.snapshot().players[0].x > x + 40",
                    arg=start["x"], timeout=10000,
                )
                page.keyboard.up("d")
                walked = page.evaluate("window.__wonderwoodPhaser.snapshot()")
                assert abs(walked["players"][0]["y"] - start["y"]) < 2, walked

                page.keyboard.down("f")
                page.wait_for_function(
                    "window.__wonderwoodPhaser.snapshot().lures.length > 0",
                    timeout=10000,
                )
                page.keyboard.up("f")
                tossed = page.evaluate("window.__wonderwoodPhaser.snapshot()")
                assert tossed["lures"][0]["x"] > walked["players"][0]["x"] + 60, tossed
                page.wait_for_function(
                    """() => {
                      const state=window.__wonderwoodPhaser.snapshot();
                      return state.lures.some(food=>food.landed) ||
                        state.animals.some(animal=>animal.trust>0);
                    }""", timeout=20000,
                )

                page.keyboard.down("g")
                page.wait_for_function(
                    "window.__wonderwoodPhaser.snapshot().orbStates.length > 0",
                    timeout=10000,
                )
                page.keyboard.up("g")
                page.wait_for_function(
                    "window.__wonderwoodPhaser.snapshot().orbStates.some(orb => orb.bounces > 0)",
                    timeout=10000,
                )
                bounced = page.evaluate("window.__wonderwoodPhaser.snapshot()")
                assert any(orb["y"] < start["y"] for orb in bounced["orbStates"]), bounced
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
                    canvas = page.locator("#game canvas").bounding_box()
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
    print("Sampled worlds render and spawn in the standalone Phaser build: PASS")


if __name__ == "__main__":
    main()
