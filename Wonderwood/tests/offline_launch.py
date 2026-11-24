"""Launch the unmodified distributable HTML, click Play, and prove frames render.

This intentionally does NOT strip requestAnimationFrame or inject localStorage.
Earlier artifact previews did both, leaving a functioning menu over a blank
blue canvas even though direct game.render() tests passed.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(__file__).parents[1] / "dist" / "wonderwood.html"
source = html.read_text()
assert source.count("requestAnimationFrame(frame);") == 2, "Missing game loop from distributable"
assert 'Object.defineProperty(window,"localStorage"' not in source, "Test-only storage shim shipped"

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 1440, "height": 810})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_content(source, wait_until="domcontentloaded")
    page.locator('[data-action="play"]').click()
    page.locator("#menu").wait_for(state="hidden")

    # Observe the real animation callback, not an explicit game.render call.
    page.evaluate("""() => {
      window.__renderTicks=0;
      const game=WW.main.game,draw=game.render;
      game.render=(...args)=>{window.__renderTicks++;return draw(...args);};
    }""")
    page.wait_for_timeout(900)
    assert page.evaluate("window.__renderTicks") >= 3, "Animation loop stopped after menu"

    colors = page.evaluate("""() => {
      const canvas=document.querySelector('#game');
      const data=canvas.getContext('2d').getImageData(
        0,0,canvas.width,canvas.height).data;
      const samples=new Set();
      for(let i=0;i<data.length;i+=572)
        samples.add((data[i]<<16)|(data[i+1]<<8)|data[i+2]);
      return samples.size;
    }""")
    assert colors > 100, "Blank or uniform canvas after clicking Play"
    page.screenshot(path=str(html.parent / "preview-offline-launch.png"))

    before = page.evaluate("WW.main.game.state.players[0].x")
    page.keyboard.down("d")
    page.wait_for_timeout(650)
    page.keyboard.up("d")
    after = page.evaluate("WW.main.game.state.players[0].x")
    assert after > before + 12, (before, after)

    for index in range(5):
        page.evaluate("(i) => WW.main.play(i)", index)
        page.locator("#menu").wait_for(state="hidden")
        page.wait_for_timeout(350)
        assert page.evaluate("WW.main.game.state.players[0].health") > 0
    assert not errors, errors
    browser.close()

print("PASS: standalone HTML starts the real frame loop, paints game frames, "
      "moves the player and opens all five chapters")
