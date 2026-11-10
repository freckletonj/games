"""Chromium smoke test of the release HTML. Requires Python Playwright + Chromium.

The sandbox supplies a storage stub because it blocks localStorage on page.set_content;
normal browser operation retains real browser storage.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(__file__).parents[1] / 'dist' / 'wonderwood.html'
source = html.read_text().replace('requestAnimationFrame(frame);', '')
source = source.replace(
    '<script>window.WONDERWOOD_MAP',
    '<script>Object.defineProperty(window,"localStorage",'
    '{value:{getItem:()=>null,setItem:()=>{}}});</script><script>window.WONDERWOOD_MAP',
)
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(source, wait_until='domcontentloaded')
    assert page.locator('h1').inner_text() == 'WONDERWOOD'
    page.get_by_role('button', name='PLAY THE FOREST').click()
    page.locator('#menu').wait_for(state='hidden')
    assert page.locator('#hud').is_visible()
    page.keyboard.down('d')
    page.evaluate('for (let i=0;i<45;i++) WW.main.game.update(1/60)')
    page.keyboard.up('d')
    x = page.evaluate('WW.main.game.state.players[0].x')
    assert x > 70, f'Player did not move: {x}'
    page.keyboard.press('Escape')
    assert page.get_by_text('Paused').count() > 0
    page.get_by_role('button', name='Resume').click()
    page.keyboard.press('g')
    page.evaluate('for (let i=0;i<20;i++) WW.main.game.update(1/60)')
    assert not errors, errors
    page.evaluate('WW.main.game.render(document.getElementById("game").getContext("2d"), 1)')
    page.screenshot(path=str(html.parent / 'smoke.png'))
    print('PASS: menu, PNG parse, play, movement, pause, resume, projectile; no JS errors')
    browser.close()
