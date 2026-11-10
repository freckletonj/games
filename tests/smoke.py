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
    assert page.evaluate("Boolean(window.WW_EMBEDDED_ATLASES?.springaroo)")
    assert page.evaluate("Boolean(window.WW_EMBEDDED_ATLASES?.hero)")
    assert page.evaluate("Boolean(window.WW_EMBEDDED_SCENES?.backdrop)")
    # Companions and the Emberkit wildlife now load from painted WebP atlases.
    for kind in ('tideling', 'skyling', 'emberkit'):
        assert page.evaluate(
            "(kind) => WW_EMBEDDED_ATLASES[kind].image.startsWith('data:image/webp;base64,')", kind
        )
    page.wait_for_function("() => ['backdrop','lanternTree','tiles'].every(WW.scenery.ready)")
    assert page.evaluate("WW.scenery.url('backdrop').startsWith('data:image/webp;base64,')")
    assert page.evaluate("document.querySelector('.home-art').style.backgroundImage.includes('data:image/webp;base64,')")
    page.wait_for_function("""() => ['springaroo','hero'].every(name => WW.spriteAtlas.draw(
        document.querySelector('#game').getContext('2d'), name, 40, 80, 0
    ))""")
    # Painted frames and secondary animation should change actual canvas pixels by state.
    animated = page.evaluate("""() => {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 140;
        const context = canvas.getContext('2d');
        const render = (action, time) => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            WW.spriteAtlas.draw(context, 'hero', 64, 95, 0, false, 0,
                {action, time, grounded: true});
            return context.getImageData(0, 0, canvas.width, canvas.height).data;
        };
        const idle = render('idle', 0);
        const running = render('run', .14);
        const falling = render('fall', .14);
        return idle.some((pixel, index) => pixel !== running[index]) &&
            running.some((pixel, index) => pixel !== falling[index]);
    }""")
    assert animated, 'Painted sprite animation states must render differently'
    page.wait_for_function("""() => ['tideling', 'skyling', 'emberkit'].every(name =>
        WW.spriteAtlas.draw(document.querySelector('#game').getContext('2d'),
            name, 90, 120, 0, false, null, {action:'run', time:.13})
    )""")
    assert page.evaluate("WW.spriteAtlas.portrait('hero').startsWith('data:image/png;base64,')")
    assert page.evaluate("WW.spriteAtlas.portrait('springaroo').startsWith('data:image/png;base64,')")
    # Remaining wildlife retain distinct illustrated silhouettes and states.
    wildlife = page.evaluate("""() => {
        const names = ['mossback', 'prismtail', 'glimmermoth', 'cloudwhisp'];
        const canvas = document.createElement('canvas');
        canvas.width = 96; canvas.height = 80;
        const ctx = canvas.getContext('2d');
        const render = (kind, action) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            WW.art.draw(ctx, kind, 48, 52, 0, false, null, {action, time:.16});
            const pixels = ctx.getImageData(0, 0, 96, 80).data;
            return [...pixels].reduce((value, channel, index) =>
                value + channel * ((index % 11) + 1), 0);
        };
        return names.map(name => [render(name, 'idle'), render(name, 'run')]);
    }""")
    assert len(set(idle for idle, running in wildlife)) == 4, wildlife
    assert all(idle != running for idle, running in wildlife), wildlife
    # No alpha gaps at the boundaries of the world-anchored painted texture.
    # Neighboring pixels may differ naturally because texture detail is continuous,
    # rather than repeated identically on each side of every 16-unit seam.
    seam_alpha = page.evaluate("""() => {
        return ['water','ground','platform'].map(kind => {
            const canvas = document.createElement('canvas');
            canvas.width = 32; canvas.height = 16;
            const ctx = canvas.getContext('2d');
            const neighbors = {n:true,e:true,s:true,w:true,ne:true,nw:true,se:true,sw:true};
            WW.scenery.tile(ctx,'meadow',kind,0,0,0,neighbors);
            WW.scenery.tile(ctx,'meadow',kind,16,0,0,neighbors);
            const data = ctx.getImageData(0,0,32,16).data;
            let alpha = 255;
            for(let y=0;y<16;y++)for(const x of [15,16]) {
                alpha = Math.min(alpha,data[(y*32+x)*4+3]);
            }
            return alpha;
        });
    }""")
    assert min(seam_alpha) >= 245, seam_alpha
    assert page.evaluate("""() => ['coast','summit'].every(biome =>
        WW.scenery.background(document.createElement('canvas').getContext('2d'),biome,0))""")
    # Every shape of shoreline, including concave and convex corners, renders.
    assert page.evaluate("""() => {
        const ctx = document.createElement('canvas').getContext('2d');
        return ['water','ground','platform'].every(kind =>
            WW.scenery.tile(ctx, 'meadow', kind, 0, 0, 0,
                {n:false,e:false,s:false,w:false,nw:false,ne:false}));
    }""")
    # Each missing diagonal exposes a distinct concave corner on a ground or
    # water tile. Test all four quadrants, not just the upper shoreline.
    diagonal_corners = page.evaluate("""() => {
        const corners = ['nw', 'ne', 'sw', 'se'];
        const changes = [];
        for (const kind of ['ground', 'water']) {
            const render = neighbors => {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 16;
                WW.scenery.tile(canvas.getContext('2d'), 'meadow', kind, 0, 0, 0, neighbors);
                return canvas.getContext('2d').getImageData(0, 0, 16, 16).data;
            };
            const all = {n:true,e:true,s:true,w:true,nw:true,ne:true,sw:true,se:true};
            const reference = render(all);
            for (const corner of corners) {
                const altered = render({...all, [corner]:false});
                changes.push(altered.some((value, i) => value !== reference[i]));
            }
        }
        return changes;
    }""")
    assert all(diagonal_corners), diagonal_corners
    # Distinct visuals for locked and unlocked gates; readable illustrated signs.
    props = page.evaluate("""() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 100;
        const ctx = canvas.getContext('2d');
        const pixels = () => [...ctx.getImageData(0, 0, 100, 100).data];
        WW.props.gate(ctx, 50, 80, false, 'meadow', 0);
        const closed = pixels();
        ctx.clearRect(0, 0, 100, 100);
        WW.props.gate(ctx, 50, 80, true, 'meadow', 0);
        const open = pixels();
        ctx.clearRect(0, 0, 100, 100);
        WW.props.sign(ctx, 50, 80, 'THE PICNIC', 'meadow', 0);
        const sign = pixels();
        return {gateChanged: closed.some((v,i) => v !== open[i]),
                signVisible: sign.some((v,i) => i % 4 === 3 && v > 0)};
    }""")
    assert props == {'gateChanged': True, 'signVisible': True}, props
    # A semantic proxy PNG creates gameplay cells; shoreline shape is derived later.
    parsed = page.evaluate("""() => {
        const tile = 4, w = 24, h = 12;
        const canvas = document.createElement('canvas');
        canvas.width = w * tile; canvas.height = h * tile;
        const ctx = canvas.getContext('2d');
        const paint = (kind, x, y, width = 1, height = 1) => {
            ctx.fillStyle = WW.levels.colors[kind];
            ctx.fillRect(x*tile, y*tile, width*tile, height*tile);
        };
        paint('empty', 0, 0, w, h);
        paint('ground', 0, 8, w, 4);
        paint('water', 5, 8, 3, 2);
        paint('water', 6, 10);
        paint('platform', 10, 5, 5, 1);
        paint('p1', 3, 7);
        paint('exit', 20, 7);
        const result = WW.levels.parseCanvas(canvas, tile, 'summit');
        const invalid = document.createElement('canvas');
        invalid.width = canvas.width; invalid.height = canvas.height;
        const bad = invalid.getContext('2d');
        bad.fillStyle = '#444444';
        bad.fillRect(0, 0, invalid.width, invalid.height);
        let rejected = false;
        try {WW.levels.parseCanvas(invalid, tile);} catch (error) {
            rejected = error.message.includes('unknown colors');
        }
        return {w:result.width, h:result.height, biome:result.biome, cells:[
            result.grid[8][5], result.grid[9][6], result.grid[10][6],
            result.grid[10][5], result.grid[5][10]
        ],markers:result.objects.map(item => item.kind), rejected};
    }""")
    assert parsed == {'w':24,'h':12,'biome':'summit',
        'cells':['water','water','water','ground','platform'],
        'markers':['p1','exit'],'rejected':True}, parsed
    # A compiled level JSON bundle must be loadable without any network access.
    imported = page.evaluate("""async () => {
        const original = WW.worlds.create(WW.chapters[0]);
        const blob = new Blob([JSON.stringify(original)], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const result = await WW.levels.loadJSON(url);
        URL.revokeObjectURL(url);
        return [result.width, result.objects.length];
    }""")
    assert imported[0] == 144 and imported[1] > 0
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
