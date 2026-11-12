"""Black-box, real-input Phaser regression: befriending, transform and traversal.

Uses the same standalone HTML published to users. Never mutates runtime state.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

GAME = Path(__file__).resolve().parents[2] / "dist/wonderwood-phaser.html"


def press_until(page, key, predicate, timeout=20000):
    page.keyboard.down(key)
    page.wait_for_function(predicate, timeout=timeout)
    page.keyboard.up(key)
    # Give the next frame time to observe the release before another press.
    page.wait_for_timeout(80)


def snapshot(page):
    return page.evaluate("window.__wonderwoodPhaser.snapshot()")


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
        press_until(page, "Space", "window.__wonderwoodPhaser.snapshot().stage === 0")
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].grounded"
        )
        initial = snapshot(page)
        spring = next(a for a in initial["animals"] if a["kind"] == "springaroo")
        assert 0 < spring["x"] - (initial["players"][0]["x"] + 32) <= 85, (
            "First Springaroo must be within normal treat range", initial
        )

        # Feeding must really lure a wildlife creature across terrain.
        press_until(page, "f", "window.__wonderwoodPhaser.snapshot().lures.length > 0")
        page.wait_for_function(
            """window.__wonderwoodPhaser.snapshot().animals
               .some(a => a.kind === 'springaroo' && a.trust >= 60)""",
            timeout=30000,
        )
        press_until(
            page, "f",
            """window.__wonderwoodPhaser.snapshot().lures.length > 0 ||
               window.__wonderwoodPhaser.snapshot().animals
               .some(a => a.kind === 'springaroo' && a.trust === 100)""",
        )
        page.wait_for_function(
            """window.__wonderwoodPhaser.snapshot().animals
               .some(a => a.kind === 'springaroo' && a.trust === 100)""",
            timeout=20000,
        )

        # Catching requires genuine projectile contact with a fed creature.
        page.keyboard.down("g")
        page.wait_for_timeout(2200)
        page.keyboard.up("g")
        caught = snapshot(page)
        assert caught["players"][0]["caught"] == "springaroo", caught
        press_until(
            page, "t",
            "window.__wonderwoodPhaser.snapshot().players[0].form === 'springaroo'",
        )
        before_jump = snapshot(page)["players"][0]
        press_until(
            page, "Space",
            f"window.__wonderwoodPhaser.snapshot().players[0].y < {before_jump['y'] - 10}",
        )
        press_until(
            page, "Space",
            "window.__wonderwoodPhaser.snapshot().players[0].jumps === 2",
        )
        assert snapshot(page)["players"][0]["form"] == "springaroo"
        page.screenshot(path=str(GAME.parent / "phaser-befriending.png"))
        # Move away before recall, to verify a real checkpoint reset.
        press_until(
            page, "d",
            f"window.__wonderwoodPhaser.snapshot().players[0].x > {initial['players'][0]['x'] + 45}",
        )

        press_until(page, "Escape", "window.__wonderwoodPhaser.snapshot().paused")
        frozen = snapshot(page)["players"][0]["x"]
        page.keyboard.down("d")
        page.wait_for_timeout(220)
        page.keyboard.up("d")
        assert abs(snapshot(page)["players"][0]["x"] - frozen) < .01
        press_until(page, "Escape", "!window.__wonderwoodPhaser.snapshot().paused")
        press_until(
            page, "c",
            f"window.__wonderwoodPhaser.snapshot().players[0].x < {initial['players'][0]['x'] + 3} && window.__wonderwoodPhaser.snapshot().players[0].grounded",
        )
        player = snapshot(page)["players"][0]
        assert abs(player["x"] - initial["players"][0]["x"]) < 3
        assert not errors, "Page errors: " + "; ".join(errors)
        browser.close()
    print("Befriending, capture, transformation, double jump, pause and recall: PASS")


if __name__ == "__main__":
    main()
