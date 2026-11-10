"""Smoke test for the fully self-contained HTML in headless Chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(__file__).parents[1] / 'dist' / 'wonderwood.html'
source = html.read_text().replace('requestAnimationFrame(frame);', '')
source = source.replace('<script>window.WONDERWOOD_LEVELS',
    '<script>Object.defineProperty(window,"localStorage",'
    '{value:{getItem:()=>null,setItem:()=>{}}});</script><script>window.WONDERWOOD_LEVELS')

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':810})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(source,wait_until='domcontentloaded')
    assert page.locator('h1').inner_text() == 'WONDERWOOD'
    page.get_by_role('button',name='CHOOSE A LEVEL').click()
    assert page.locator('.chapter-card').count()==3
    for i,name in enumerate(['Mosslight Meadow','Crystal Coast','Starfall Summit']):
        page.get_by_role('button',name='Explore '+name).click()
        page.locator('#menu').wait_for(state='hidden')
        page.evaluate('for(let n=0;n<20;n++)WW.main.game.update(1/60)')
        chapter=page.evaluate('WW.main.game.state.chapter')
        assert chapter['name']==name and len(chapter['goals'])==3
        assert page.locator('#hud').bounding_box()['height'] < 65
        page.evaluate('WW.main.game.render(document.querySelector("#game").getContext("2d"),2)')
        if i==0:page.screenshot(path=str(html.parent / 'smoke.png'))
        page.keyboard.press('Escape')
        page.get_by_role('button',name='Main menu').click()
        page.get_by_role('button',name='CHOOSE A LEVEL').click()
    assert not errors,errors
    browser.close()
    print('PASS: three chapter maps load, compact HUD, render, pause, menu navigation, zero JavaScript errors')
