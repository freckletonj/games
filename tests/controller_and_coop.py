"""Browser regression: complete gamepad menu navigation and optional P2 follow bubble.

Use virtual Gamepad objects because CI does not attach physical controllers.
The gameplay and UI still read navigator.getGamepads through their production APIs.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(__file__).parents[1] / "dist" / "wonderwood.html"
source = html.read_text().replace("requestAnimationFrame(frame);", "")
source = source.replace(
    "<script>\nwindow.WW",
    '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>\nwindow.WW',
    1,
)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 1440, "height": 810})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_content(source, wait_until="domcontentloaded")

    page.evaluate("""() => {
      window.testPads=[0,1].map(index => ({
        id:'Virtual Wonderwood Pad '+index,index,connected:true,
        buttons:Array.from({length:17},()=>({value:0,pressed:false})),
        axes:[0,0]
      }));
      Object.defineProperty(navigator,'getGamepads',{
        configurable:true,value:()=>window.testPads
      });
      WW.input.syncAssignments();
    }""")

    def pad(button, down=True, controller=0):
        page.evaluate("""([button,down,index])=>{
          const b=window.testPads[index].buttons[button];b.value=down?1:0;b.pressed=down;
          WW.main.pollMenuGamepad();
        }""", [button, down, controller])

    def tap(button, controller=0):
        pad(button, True, controller)
        pad(button, False, controller)

    def focused():
        return page.evaluate("""() => ({
          action:document.activeElement?.dataset.action||null,
          id:document.activeElement?.id||null,
          tag:document.activeElement?.tagName
        })""")

    assert focused()["action"] == "play"
    tap(13)
    assert focused()["action"] == "chapters", focused()
    tap(0)
    assert page.locator(".chapter-card").count() == 5
    assert focused()["action"] == "stage-0"
    tap(13)
    assert focused()["action"] == "stage-1"
    tap(1)
    assert page.get_by_role("button", name="CHOOSE A LEVEL").count() == 1
    assert focused()["action"] == "play"

    for _ in range(3):
        tap(13)
    assert focused()["action"] == "settings", focused()
    tap(0)
    assert page.locator("#players").is_visible()
    assert focused()["action"] == "save-settings", focused()
    for _ in range(3):
        tap(12)
    assert focused()["id"] == "players", focused()
    tap(15)
    assert page.locator("#players").input_value() == "2"
    tap(13)
    assert focused()["id"] == "rumble"
    before = page.locator("#rumble").is_checked()
    tap(0)
    assert page.locator("#rumble").is_checked() != before
    tap(13)
    assert focused()["id"] == "sound"
    tap(13)
    assert focused()["action"] == "save-settings"
    tap(0)
    assert page.evaluate("WW.storage.data.settings.players") == 2
    assert focused()["action"] == "play"

    # Hold A through the menu transition. It must not turn into a phantom jump.
    pad(0, True)
    page.locator("#menu").wait_for(state="hidden")
    page.evaluate("() => {for(let i=0;i<8;i++)WW.main.game.update(1/60)}")
    assert page.evaluate("WW.main.game.state.players[0].jumpsUsed") == 0
    pad(0, False)
    assert page.evaluate("WW.main.game.state.players.length") == 2

    # Start works from gameplay, and B resumes directly from pause.
    tap(9)
    assert page.get_by_role("button", name="Resume").is_visible()
    tap(13)
    assert focused()["action"] == "camp"
    tap(1)
    page.locator("#menu").wait_for(state="hidden")
    tap(9)
    assert page.get_by_role("button", name="Resume").is_visible()
    tap(9)
    page.locator("#menu").wait_for(state="hidden")
    # Player 2's own controller can also pause and resume.
    tap(9, controller=1)
    assert page.get_by_role("button", name="Resume").is_visible()
    tap(1, controller=1)
    page.locator("#menu").wait_for(state="hidden")

    page.evaluate("""() => {
      const s=WW.main.game.state;
      s.animals.forEach(a=>{a.alive=false;a.respawn=99999;});
      s.players.forEach(p=>{p.invincible=10;});
    }""")
    start = page.evaluate("WW.main.game.state.players[0].x")
    page.keyboard.down("d")
    page.evaluate("""() => {for(let i=0;i<180;i++)WW.main.game.update(1/60)}""")
    page.keyboard.up("d")
    state = page.evaluate("""() => {
      const s=WW.main.game.state;
      return {x:s.players[0].x,y:s.players[0].y,partnerX:s.players[1].x,
        partnerY:s.players[1].y,bubble:s.players[1].bubble,cameraX:s.cameraX};
    }""")
    assert state["x"] > start + 185, state
    assert state["bubble"], state
    assert abs(state["partnerX"] - state["x"]) < 70, state
    assert state["cameraX"] > 0, state

    # Bubble passengers are not collectors. Place a shard at P2's location,
    # far enough from P1 that only the bubble would otherwise collect it.
    check = page.evaluate("""() => {
      const s=WW.main.game.state,p=s.players[1],light=s.items.find(i=>i.kind==='starShard');
      light.x=p.x;light.y=p.y-13;light.used=false;
      WW.main.game.update(1/60);
      return {used:light.used,bubble:p.bubble};
    }""")
    assert check == {"used": False, "bubble": True}, check

    # Review the passenger visually as well as checking the state transitions.
    page.evaluate("""() => WW.main.game.render(
      document.querySelector("#game").getContext("2d"), 12)""")
    page.screenshot(path=str(html.parent / "preview-coop-bubble.png"))

    # Keyboard action pops P2; the triggering button is consumed.
    page.keyboard.down("i")
    page.evaluate("WW.main.game.update(1/60)")
    page.keyboard.up("i")
    popped = page.evaluate("""() => {
      const p=WW.main.game.state.players[1];
      return {bubble:p.bubble,health:p.health,vy:p.vy,grace:p.bubbleGrace};
    }""")
    assert not popped["bubble"] and popped["health"] >= 1
    assert popped["vy"] == 0 and popped["grace"] > 0, popped

    # P2's independently assigned controller can pop their own bubble too.
    page.evaluate("""() => {
      const p=WW.main.game.state.players[1];p.bubble=true;
      p.bubbleGrace=0;WW.input.reset();
    }""")
    pad(0, True, 1)
    page.evaluate("WW.main.game.update(1/60)")
    pad(0, False, 1)
    assert not page.evaluate("WW.main.game.state.players[1].bubble")

    # If P2 runs ahead, player 1 remains camera focus rather than being leashed.
    offset = page.evaluate("""() => {
      const s=WW.main.game.state,one=s.players[0],two=s.players[1];
      two.bubble=false;two.bubbleGrace=10;two.x=one.x+310;
      const oldX=one.x;
      WW.main.game.update(1/60);
      return {p1:one.x,p2:two.x,cameraX:s.cameraX,oldX};
    }""")
    assert abs(offset["p1"] - offset["oldX"]) < 10, offset
    assert offset["p2"] - offset["p1"] > 200, offset

    assert not errors, errors
    browser.close()
    print("PASS: controller menus/settings/pause, co-op leader camera, bubble pop and inactive passenger")
