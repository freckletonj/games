"""Real-input completion proof for the curated first chapter.

This script does not mutate player, level, creature, or objective state.
It navigates using the same controls as a human. The read-only snapshot
only establishes physical milestones and prevents fixed-FPS assumptions.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

GAME = Path(__file__).resolve().parents[2] / "dist/wonderwood-phaser.html"


def state(page):
    return page.evaluate("window.__wonderwoodPhaser.snapshot()")


def press(page, key, condition, timeout=20000):
    page.keyboard.down(key)
    page.wait_for_function(condition, timeout=timeout)
    page.keyboard.up(key)
    page.wait_for_timeout(120)


def move(page, x, timeout=60000):
    page.keyboard.down("d")
    page.wait_for_function(
        "window.__wonderwoodPhaser.snapshot().players[0].x >= " + str(x),
        timeout=timeout,
    )
    page.keyboard.up("d")
    page.wait_for_timeout(130)
    assert state(page)["players"][0]["health"] > 0


def jump_twice(page, first_height, pause=120):
    page.keyboard.down("Space")
    page.wait_for_function(
        "window.__wonderwoodPhaser.snapshot().players[0].y < "
        + str(first_height),
        timeout=15000,
    )
    page.keyboard.up("Space")
    page.wait_for_timeout(pause)
    page.keyboard.down("Space")
    page.wait_for_function(
        "window.__wonderwoodPhaser.snapshot().players[0].jumps === 2",
        timeout=12000,
    )


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, args=["--enable-webgl", "--use-gl=swiftshader"]
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
        press(page, "Space", "window.__wonderwoodPhaser.snapshot().stage === 0")

        # The first skill is earned by genuine trust and projectile contact.
        for threshold in (60, 100):
            page.keyboard.down("f")
            page.wait_for_timeout(190)
            page.keyboard.up("f")
            page.wait_for_timeout(90)
            page.wait_for_function(
                "window.__wonderwoodPhaser.snapshot().animals.some(a => "
                "a.kind === 'springaroo' && a.trust >= " + str(threshold) + ")",
                timeout=45000,
            )
        press(
            page,
            "g",
            "window.__wonderwoodPhaser.snapshot().players[0].caught === 'springaroo'",
        )
        press(
            page,
            "t",
            "window.__wonderwoodPhaser.snapshot().players[0].form === 'springaroo'",
        )

        # Cross the introductory garden and the telegraphed enemy by walking.
        # Take the real x97 ledge, 55 world units above the underlying slope.
        move(page, 1600, timeout=110000)
        assert state(page)["players"][0]["grounded"]
        jump_twice(page, 465)
        page.wait_for_timeout(220)
        page.keyboard.up("Space")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].grounded "
            "&& Math.abs(window.__wonderwoodPhaser.snapshot().players[0].y - 432) < 2",
            timeout=20000,
        )

        # A successful landing is not enough: the explorer must remain on
        # this platform without holding jump or movement for a full second.
        ledge_start = state(page)["players"][0]
        page.wait_for_timeout(1100)
        ledge_end = state(page)["players"][0]
        assert ledge_end["grounded"] and abs(ledge_end["y"] - 432) < 1, (
            ledge_start, ledge_end
        )
        # Run and double-jump right onto the second authentic ledge at y=384.
        page.keyboard.down("d")
        jump_twice(page, 398)
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].x > 1720",
            timeout=20000,
        )
        page.keyboard.up("Space")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].grounded "
            "&& Math.abs(window.__wonderwoodPhaser.snapshot().players[0].y - 384) < 2",
            timeout=20000,
        )
        page.keyboard.up("d")
        page.wait_for_timeout(1000)
        second = state(page)["players"][0]
        assert second["grounded"] and abs(second["y"] - 384) < 1, second
        move(page, 1790, timeout=20000)

        # The final high light is deliberately an optional high-path jump;
        # it MUST register contact, not merely approach its waypoint.
        jump_twice(page, 360)
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().relic === true",
            timeout=20000,
        )
        page.keyboard.up("Space")
        found = state(page)
        assert found["stage"] == 0 and found["relic"], found
        page.screenshot(path=str(GAME.parent / "phaser-meadow-relic.png"))

        # Follow the real ground route to the gate, which should trigger the
        # canonical next chapter. This exercises objective + exit plumbing.
        page.keyboard.down("d")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().stage === 1",
            timeout=110000,
        )
        page.keyboard.up("d")
        finished = state(page)
        assert finished["chapter"] == "crystal-coast", finished
        assert finished["players"][0]["health"] == 3, finished
        assert "first-forest" in finished["progress"]["completed"], finished
        assert finished["progress"]["lastPlayed"] == "crystal-coast", finished
        page.screenshot(path=str(GAME.parent / "phaser-meadow-complete.png"))
        # No game state is directly manipulated. Verify a genuine reload
        # restores progress from the same standalone file's local storage.
        page.reload()
        page.wait_for_function(
            "window.__wonderwoodPhaser?.snapshot().stage === -1", timeout=30000
        )
        resumed = state(page)
        assert resumed["choice"] == 1, resumed
        assert resumed["progress"]["completed"] == ["first-forest"], resumed
        assert page.locator("#ww-menu-chapter").inner_text() == "Crystal Coast"
        page.locator("#ww-menu-prev").click()
        assert "COMPLETED" in page.locator("#ww-menu-counter").inner_text()
        assert not errors, errors
        assert not external, external
        browser.close()

    print("Real-input Mosslight Meadow capture -> jumps -> relic -> gate: PASS")


if __name__ == "__main__":
    main()
