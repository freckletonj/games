"""Load and draw all three authored adventures in real Chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(__file__).parents[1] / 'dist' / 'wonderwood.html'
source = html.read_text().replace('requestAnimationFrame(frame);', '')
source = source.replace(
    '<script>\nwindow.WW',
    '<script>Object.defineProperty(window,"localStorage",'
    '{value:{getItem:()=>null,setItem:()=>{}}});</script><script>window.WW',
    1,
)
# WW is initialized in the first inlined platform script after CSS.
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440, 'height':810})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(source, wait_until='domcontentloaded')
    page.screenshot(path=str(html.parent / 'preview-home.png'))
    print('BOOT DIAGNOSTIC:', errors, page.locator('h1').all_inner_texts(), page.locator('body').inner_text()[:250])
    assert page.locator('h1').count()==1 and page.locator('h1').inner_text()=='WONDERWOOD',errors
    page.get_by_role('button', name='CHOOSE A LEVEL').click()
    assert page.locator('.chapter-card').count() == 3
    for i, (name,kind,size) in enumerate([
        ('Mosslight Meadow','springKey',144),
        ('Crystal Coast','diveKey',157),
        ('Starfall Summit','skyKey',166),
    ]):
        page.get_by_role('button', name='Explore '+name).click()
        page.locator('#menu').wait_for(state='hidden')
        page.evaluate('for(let i=0;i<30;i++)WW.main.game.update(1/60)')
        assert page.evaluate('WW.main.game.state.goals.length') == 1
        assert page.evaluate('WW.main.game.state.goals[0].kind') == kind
        assert page.evaluate('WW.main.game.state.items.some(i=>i.kind===WW.main.game.state.goals[0].kind)')
        assert page.evaluate('WW.worlds.summary[WW.main.game.state.chapter.id].width') == size
        assert page.locator('#hud').bounding_box()['height'] < 65
        page.evaluate('WW.main.game.render(document.querySelector("#game").getContext("2d"), 3)')
        page.screenshot(path=str(html.parent / ("preview-"+["meadow","coast","summit"][i]+".png")))
        page.keyboard.press('Escape')
        page.get_by_role('button', name='Main menu').click()
        page.get_by_role('button', name='CHOOSE A LEVEL').click()
    assert not errors, errors
    browser.close()
    print('PASS: 3 authored worlds, 1 light each, HUD, canvas rendering, keyboard menus')
