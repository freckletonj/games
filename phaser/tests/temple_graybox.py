"""Open the three registered graybox chapters from the normal offline game.

The production Phaser engine and keyboard inputs run unchanged; only the
offline test wrapper supplies a browser-compatible localStorage shim.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

GAME = Path(__file__).resolve().parents[2] / "dist/wonderwood-phaser.html"
CHAPTERS = ["sunken-temple", "mirror-palace", "skybound-stampede"]
CAPTURES = GAME.parents[1] / "dist" / "graybox-screenshots"
WORLD_KEYS = ["temple", "palace", "race"]


def main():
    assert GAME.is_file() and GAME.stat().st_size > 500_000
    CAPTURES.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, args=["--enable-webgl", "--use-gl=swiftshader"]
        )
        for chapter, world_key in zip(CHAPTERS, WORLD_KEYS):
            page = browser.new_page(viewport={"width": 960, "height": 540})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            # A chapter hash preselects its card in the normal game; it does
            # not enable a different or filename-dependent chapter list.
            page.goto(GAME.as_uri() + "#" + chapter, wait_until="load")
            page.wait_for_function(
                "window.__wonderwoodPhaser?.snapshot().stage === -1",
                timeout=30000
            )
            page.locator(".ww-explorers button").first.click()
            page.locator("#ww-menu-continue").click()
            buttons = page.locator("#ww-level-grid button")
            labels = buttons.all_inner_texts()
            assert len(labels) == 15, ("All normal and graybox chapters", labels)
            assert all(
                any(expected.replace("-", " ").lower() in label.lower()
                    for label in labels)
                for expected in CHAPTERS
            ), ("Three grayboxes must be in the main chapter selection", labels)
            assert page.locator("#ww-level-heading").inner_text() == "Choose a level"
            assert page.locator("#ww-level-grid [aria-pressed=true]").inner_text().startswith(
                chapter.replace("-", " ").title()
            ), ("Chapter hash must preselect the normal menu card", chapter)
            buttons.filter(has_text=chapter.replace("-", " ").title()).click()
            page.locator("#ww-menu-play").click()
            page.wait_for_function(
                "chapter => window.__wonderwoodPhaser?.snapshot().chapter === chapter",
                arg=chapter, timeout=30000
            )
            state = page.evaluate("window.__wonderwoodPhaser.snapshot()")
            assert state[world_key], (chapter, state)
            assert state["sceneArt"]["layers"] == [], (
                chapter, "Graybox should not require approved scene art"
            )
            assert state["players"][0]["grounded"], (chapter, state)
            if chapter == "sunken-temple":
                assert len(state["temple"]["rafts"]) == 6
                assert state["temple"]["gates"] == {
                    "sluice-gate": False, "wheel-gate": False
                }
            start_x = state["players"][0]["x"]
            page.keyboard.down("d")
            page.wait_for_function(
                "x => window.__wonderwoodPhaser.snapshot().players[0].x > x+30",
                arg=start_x, timeout=20000
            )
            page.keyboard.up("d")
            if chapter == "sunken-temple":
                page.wait_for_function(
                    "window.__wonderwoodPhaser.snapshot().temple.tick >= 40"
                )
                water = page.evaluate(
                    "window.__wonderwoodPhaser.snapshot().temple"
                )
                assert water["surfaces"]["courtyard"] == 55, (
                    "Courtyard intentionally waits at low tide for first-time boarding", water
                )
                page.wait_for_function(
                    "window.__wonderwoodPhaser.snapshot().temple.surfaces.courtyard < 55",
                    timeout=20000,
                )
            if chapter == "mirror-palace":
                assert state["palace"]["gates"] == {
                    "atrium-light-gate": False,
                    "gallery-light-gate": False,
                    "observatory-light-gate": False,
                }
                assert len(state["palace"]["platforms"]) == 18
                # Actual P1 walking to the first dial, not teleporting.
                page.keyboard.down("d")
                page.wait_for_function(
                    "window.__wonderwoodPhaser.snapshot().players[0].x > 545",
                    timeout=15000,
                )
                page.keyboard.up("d")
                page.keyboard.down("ArrowUp")
                page.wait_for_function(
                    "window.__wonderwoodPhaser.snapshot().palace."
                    "mirrors['atrium-mirror'] === -45",
                    timeout=5000,
                )
                page.keyboard.up("ArrowUp")
                page.wait_for_function(
                    "window.__wonderwoodPhaser.snapshot().palace."
                    "platforms['atrium-crystal'].solid",
                    timeout=7000,
                )
                assert page.evaluate(
                    "window.__wonderwoodPhaser.snapshot().palace."
                    "gates['atrium-light-gate']"
                ), "The real keyboard dial must open the physical first door"
                page.screenshot(path=str(
                    CAPTURES / "mirror-palace-first-reflection.png"
                ))
            page.keyboard.down("v")
            page.wait_for_function(
                "window.__wonderwoodPhaser.snapshot().sceneArt.geometryOverlay",
                timeout=5000,
            )
            page.keyboard.up("v")
            page.screenshot(path=str(CAPTURES / (chapter + "-collision.png")))
            # The first real V keydown is verified and captured above.
            # A rapid second keypress has a browser-input timing race and
            # does not add coverage of the stage's actual geometry.
            assert not errors, (chapter, errors)
            page.close()
        browser.close()
    print("All three grayboxes selected from the main game, played and V-overlaid: PASS")


if __name__ == "__main__":
    main()
