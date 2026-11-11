"""Optional four-ring Wonder Trails: sequence, timeout, rewards and authored geometry."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(__file__).parents[1] / 'dist' / 'wonderwood.html'
source = html.read_text().replace('requestAnimationFrame(frame);', '')
source = source.replace('<script>\nwindow.WW',
    '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>\nwindow.WW', 1)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440, 'height':810})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(source, wait_until='domcontentloaded')

    def play(index):
        page.evaluate('(index) => WW.main.play(index)', index)
        page.locator('#menu').wait_for(state='hidden')
        page.evaluate("""() => {
          const s=WW.main.game.state;
          s.animals.forEach(a=>{a.alive=false;a.respawn=99999});
          s.players[0].invincible=999;
        }""")

    def advance(frames=1):
        page.evaluate('(frames)=>{for(let i=0;i<frames;i++)WW.main.game.update(1/60)}', frames)

    def touch_node(index):
        page.evaluate("""index=>{
          const s=WW.main.game.state,p=s.players[0],node=s.challenges[0].nodes[index];
          p.x=node[0]*16;p.y=node[1]*16+13;p.vx=p.vy=0;p.grounded=false;
        }""", index)
        advance()

    chapters = page.evaluate("""() => WW.chapters.map(ch => {
      const w=WW.worlds.create(ch),c=ch.events[0];
      return {id:ch.id,width:w.width,height:w.height,events:ch.events.length,
        kind:c.type,seconds:c.seconds,nodes:c.nodes,
        valid:c.nodes.every(([x,y])=>x>0&&x<w.width&&y>0&&y<w.height)};
    })""")
    assert len(chapters)==5
    assert all(c['events']==1 and c['kind']=='trail' and
               len(c['nodes'])==4 and c['valid'] and c['seconds']>=12
               for c in chapters), chapters
    assert all(len({y for x,y in c['nodes']})>=3 for c in chapters)

    play(0)
    advance(5)
    assert not page.evaluate('WW.main.game.state.challenges[0].active')
    initial = page.evaluate('WW.main.game.state.shared.foods.star')
    touch_node(0)
    assert page.evaluate('WW.main.game.state.challenges[0].active')
    assert page.evaluate('WW.main.game.state.challenges[0].next') == 1
    touch_node(3)
    assert page.evaluate('WW.main.game.state.challenges[0].next') == 1
    touch_node(1)
    touch_node(2)
    page.evaluate('WW.main.game.state.players[0].health=1')
    touch_node(3)
    result = page.evaluate("""() => {
      const s=WW.main.game.state;
      return {completed:s.challenges[0].completed,active:s.challenges[0].active,
        trails:s.shared.trails,star:s.shared.foods.star,hearts:s.players[0].health};
    }""")
    assert result == {'completed':True,'active':False,
                      'trails':1,'star':initial+3,'hearts':2}, result
    touch_node(0)
    assert page.evaluate('WW.main.game.state.shared.trails') == 1
    page.evaluate('WW.main.game.render(document.querySelector("#game").getContext("2d"),5)')

    play(1)
    touch_node(0)
    seconds = page.evaluate('WW.main.game.state.challenges[0].seconds')
    page.evaluate("""() => {
      const p=WW.main.game.state.players[0];
      p.x=60;p.y=500;p.vx=p.vy=0;
    }""")
    advance((seconds+1)*60)
    timed = page.evaluate("""() => {
      const c=WW.main.game.state.challenges[0];
      return {active:c.active,completed:c.completed,next:c.next};
    }""")
    assert timed == {'active':False,'completed':False,'next':0}, timed
    advance(90)
    touch_node(0)
    assert page.evaluate('WW.main.game.state.challenges[0].next') == 1
    assert not errors, errors
    browser.close()
    print('PASS: five Wonder Trails, ordering, rewards, expiry, retry, rendering')
