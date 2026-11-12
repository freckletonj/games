"""Optional mounted courses: real rider-gating, timed rings, reset and rewards."""
from pathlib import Path
from playwright.sync_api import sync_playwright

html=Path(__file__).parents[1]/"dist"/"wonderwood.html"
source=html.read_text().replace("requestAnimationFrame(frame);","")
source=source.replace('<script>\nwindow.WW',
    '<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>\nwindow.WW',1)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--no-sandbox"])
    page=browser.new_page(viewport={"width":1440,"height":810})
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    page.set_content(source,wait_until="domcontentloaded")

    def play(index):
        page.evaluate("(i)=>WW.main.play(i)",index)
        page.locator("#menu").wait_for(state="hidden")
        page.evaluate("""() => {
          const s=WW.main.game.state;
          s.animals.forEach(a=>{a.alive=false;a.respawn=99999});
          s.items.filter(o=>o.kind==='starShard').forEach(o=>o.used=true);
          s.players[0].invincible=9999;
        }""")

    def advance(frames=1):
        page.evaluate("(n)=>{for(let i=0;i<n;i++)WW.main.game.update(1/60)}",frames)

    def state(expr):
        return page.evaluate("WW.main.game.state."+expr)

    metadata=page.evaluate("""() => WW.chapters.map((chapter,i)=>{
        const level=WW.worlds.create(chapter);
        return {id:chapter.id,mounts:level.objects.filter(o=>['unicorn','pegasus'].includes(o.kind)).length,
          courses:level.mountCourses.map(c=>({id:c.id,mount:c.mount,seconds:c.seconds,nodes:c.nodes}))};
    })""")
    assert sum(len(d["courses"]) for d in metadata)==3,metadata
    assert metadata[0]["courses"][0]["mount"]=="unicorn"
    assert all(d["courses"][0]["mount"]=="pegasus" for d in (metadata[2],metadata[4]))
    assert all(len(c["nodes"])>=4 for d in metadata for c in d["courses"])

    def saddle(index):
        page.evaluate("""() => {
          const s=WW.main.game.state,p=s.players[0],m=s.mounts[0];
          m.rider=0;m.trust=100;m.vx=m.vy=0;
          p.mount=m.id;p.mountCooldown=0;p.form=null;p.invincible=9999;
        }""")

    def touch(index):
        # Scripted node contact checks progression logic. It is intentionally
        # separate from the real mounted physics controls exercised below.
        page.evaluate("""i => {
          const s=WW.main.game.state,p=s.players[0],m=s.mounts[0];
          const c=s.challenges.find(c=>c.type==='mountCourse'),[x,y]=c.nodes[i];
          m.x=x*16;m.y=(y+1)*16;m.vx=m.vy=0;m.grounded=false;
          p.x=m.x;p.y=m.y-32;p.vx=p.vy=0;p.grounded=false;
        }""",index)
        advance()

    play(0)
    assert state('challenges.filter(c=>c.type==="mountCourse").length')==1
    assert state('challenges.filter(c=>c.type==="trail").length')==1
    course=state('challenges.find(c=>c.type==="mountCourse")')
    pnode=course["nodes"][0]

    # Merely walking through a course marker cannot start a mounted activity.
    page.evaluate("""([x,y]) => {
       const s=WW.main.game.state,p=s.players[0];
       p.x=x*16;p.y=y*16+13;p.mount=null;p.vx=p.vy=0;
    }""",pnode)
    advance(2)
    assert not state('challenges.find(c=>c.type==="mountCourse").active')

    saddle(0)
    touch(0)
    assert state('challenges.find(c=>c.type==="mountCourse").next')==1
    touch(3)
    assert state('challenges.find(c=>c.type==="mountCourse").next')==1

    # Dismounting during the course must reset it and make it retryable.
    page.keyboard.down("t")
    advance()
    page.keyboard.up("t")
    advance()
    paused=state('challenges.find(c=>c.type==="mountCourse")')
    assert not paused["active"] and paused["next"]==0,paused
    advance(90)
    saddle(0)
    initial=state('shared.foods.star')
    for i in range(len(course["nodes"])):
        touch(i)
    completed=state('challenges.find(c=>c.type==="mountCourse")')
    assert completed["completed"] and not completed["active"],completed
    assert state("shared.mountCourses")==1
    assert state("shared.foods.star")==initial+5
    touch(0)
    assert state("shared.mountCourses")==1, "The reward is never repeatable"

    # The game must render the special rings and its small completion mark.
    page.evaluate('WW.main.game.render(document.querySelector("#game").getContext("2d"),4)')
    assert "♞" in page.locator("#hud").inner_text()

    # A mount-course timeout permits retry without blocking the main relic.
    play(2)
    saddle(2)
    touch(0)
    page.evaluate("""() => {
      const s=WW.main.game.state,m=s.mounts[0],p=s.players[0];
      m.x=30*16;m.y=60*16;p.x=m.x;p.y=m.y-32;
    }""")
    duration=state('challenges.find(c=>c.type==="mountCourse").seconds')
    advance(duration*60+4)
    expired=state('challenges.find(c=>c.type==="mountCourse")')
    assert not expired["active"] and not expired["completed"] and expired["next"]==0,expired
    advance(75)
    saddle(2)
    touch(0)
    assert state('challenges.find(c=>c.type==="mountCourse").active')

    # Continuous flight must be available to physically climb to later ring
    # altitudes; it consumes no Moonwing wingbeat charges.
    page.evaluate("""() => {
      const s=WW.main.game.state,m=s.mounts[0],p=s.players[0];
      m.x=276*16;m.y=29*16;m.vx=m.vy=0;m.grounded=true;
      p.x=m.x;p.y=m.y-32;p.flaps=4;
    }""")
    beginning=state("players[0].y")
    page.keyboard.down("Space")
    advance(50)
    page.keyboard.up("Space")
    assert state("players[0].y")<beginning-100
    assert state("players[0].flaps")==4

    play(4)
    saddle(4)
    for i in range(len(state('challenges.find(c=>c.type==="mountCourse").nodes'))):
        touch(i)
    assert state("shared.mountCourses")==1
    assert not errors,errors
    browser.close()
    print("PASS: three mount courses, rider-only rings, ordering, dismount/reset, timer, rewards and flight")
