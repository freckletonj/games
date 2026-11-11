"""Track render/update cost in the same Chromium environment as gameplay tests.

Observational telemetry, not a flaky absolute-speed pass/fail threshold.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).parents[1]
html = root / 'dist' / 'wonderwood.html'
source = html.read_text().replace('requestAnimationFrame(frame);', '')
source = source.replace(
    '<script>\nwindow.WW',
    '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>\nwindow.WW', 1
)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 810})
    page.set_content(source, wait_until='domcontentloaded')
    page.wait_for_function("() => WW.scenery.ready('tiles')")
    report = []
    for index in [0, 1, 2, 3, 4]:
        page.evaluate('(index) => WW.main.play(index)', index)
        measurements = page.evaluate("""() => {
            const game = WW.main.game;
            const ctx = document.querySelector('#game').getContext('2d');
            const costs = [];
            // Warm the Canvas paints and sprite atlas before measuring.
            for (let i=0; i<20; i++) {
                game.update(1/60);
                game.render(ctx, i/60);
            }
            for (let i=0; i<120; i++) {
                const start = performance.now();
                game.update(1/60);
                game.render(ctx, (i+20)/60);
                costs.push(performance.now()-start);
            }
            costs.sort((a,b)=>a-b);
            return {p50:costs[59],p95:costs[113],max:costs[119]};
        }""")
        report.append({'chapter': index, 'frame_ms': measurements})
    browser.close()
    (root / 'dist' / 'performance-report.json').write_text(
        json.dumps({'note': 'Observed headless Chromium hardware only; not a device FPS guarantee',
                    'chapters': report}, indent=2) + '\n'
    )
    print('PASS: emitted five-chapter render/update performance telemetry')
