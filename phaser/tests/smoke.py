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
        assert page.locator("#ww-menu").is_visible()
        assert page.locator(".ww-menu-title").inner_text() == "Wonderwood"
        assert page.locator("#ww-character-select").is_visible()
        assert page.locator("#ww-menu-continue").is_disabled()
        page.keyboard.down("Right")
        page.wait_for_function("""
            document.querySelector(".ww-explorers [data-current=true]").textContent === "Princess"
        """)
        page.keyboard.up("Right")
        page.locator(".ww-explorers button").nth(5).click()
        page.keyboard.down("Space")
        page.wait_for_function("""
            document.querySelector(".ww-explorers [aria-pressed=true]").textContent === "Princess"
        """)
        page.keyboard.up("Space")
        page.wait_for_timeout(150)
        assert page.locator("#ww-character-select").is_visible()
        page.keyboard.down("Space")
        page.wait_for_function("window.__wonderwoodPhaser.snapshot().menu === 'levels'")
        page.keyboard.up("Space")
        assert page.locator("#ww-level-grid button").count() == 10
        page.keyboard.down("Down")
        page.wait_for_function("window.__wonderwoodPhaser.snapshot().choice === 3")
        page.keyboard.up("Down")
        page.locator("#ww-level-grid button").first.click()

        page.set_viewport_size({"width": 640, "height": 360})
        play = page.locator("#ww-menu-play").bounding_box()
        assert 0 <= play["y"] and play["y"] + play["height"] <= 360, play
        page.set_viewport_size({"width": 960, "height": 540})

        page.screenshot(path=str(ROOT / "dist" / "phaser-title.png"))
        page.evaluate("document.activeElement.blur()")
        page.keyboard.down("Space")
        page.wait_for_timeout(120)
        page.keyboard.up("Space")
        page.wait_for_function(
            "window.__wonderwoodPhaser?.snapshot().stage === 0", timeout=15000
        )
        assert page.locator("#ww-menu").is_hidden()
        before = page.evaluate("window.__wonderwoodPhaser.snapshot()")
        assert before["chapter"] == "first-forest"
        assert [p["explorer"] for p in before["players"]] == ["princess", "steampunk"]
        assert page.get_by_role("progressbar").count() == 2
        assert page.get_by_role("progressbar").first.get_attribute("value") == "3"

        # Headless WebGL can run only a handful of frames while compiling
        # shaders; wait for actual displacement rather than wall-clock duration.
        page.keyboard.down("d")
        target = before["players"][0]["x"] + 13
        page.wait_for_function(
            "window.__wonderwoodPhaser.snapshot().players[0].x > " + str(target),
            timeout=15000,
        )
        page.keyboard.up("d")
        after = page.evaluate("window.__wonderwoodPhaser.snapshot()")
        assert after["players"][0]["x"] > before["players"][0]["x"] + 12
        assert page.locator("#ww-ui").is_visible()
        assert "FIND THE GATE KEY" in page.locator("#ww-status").inner_text()
        page.screenshot(path=str(ROOT / "dist" / "phaser-preview.png"))

        page.keyboard.down("l")
        page.wait_for_timeout(230)
        page.keyboard.up("l")
        assert not errors, "Browser errors: " + "; ".join(errors)
        assert not external, "Offline game requested network: " + "; ".join(external)
        browser.close()
    print("Phaser offline start, movement, local co-op and no-network smoke: PASS")


if __name__ == "__main__":
    main()
