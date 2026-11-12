"""Real mounted-physics route probes for every authored Unicorn/Pegasus course.

This begins beside an earned, already-mounted companion and disables wildlife,
so it verifies physical riding-course geometry rather than the feeding puzzle
(which is independently covered by tests/rideable_mounts.py).
"""
import json
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
    page.on("pageerror",lambda e:errors.append(str(e)))
    page.set_content(source,wait_until="domcontentloaded")
    reports=[]

    for chapter_index in (0,2,4):
        report=page.evaluate("""index => {
          WW.main.play(index);
          const game=WW.main.game,s=game.state;
          s.animals.forEach(a=>{a.alive=false;a.respawn=99999;});
          s.items.filter(o=>o.kind==='starShard').forEach(o=>o.used=true);
          const m=s.mounts[0],p=s.players[0];
          const course=s.challenges.find(c=>c.type==='mountCourse');
          m.rider=0;m.trust=100;m.vx=m.vy=0;
          p.mount=0;p.invincible=9999;p.x=m.x;p.y=m.y-32;p.vx=p.vy=0;
          const formerRead=WW.input.read;
          let oldJump=false,frame=0,maxNext=0;
          const trace=[];
          WW.input.read=slot=>{
            const target=course.nodes[Math.min(course.active?course.next:0,course.nodes.length-1)];
            const dx=target[0]*16-p.x,dy=target[1]*16-(p.y+16);
            const direction=dx>11?1:dx< -11?-1:0;
            const jump=m.kind==='pegasus'?dy< -9:
              course.active&&m.grounded&&dy< -22&&dx<75;
            const down=m.kind==='pegasus'&&dy>12;
            const pressed=jump&&!oldJump,released=!jump&&oldJump;
            oldJump=jump;
            const actions=Object.fromEntries(WW.input.actions.map(a=>[a,false]));
            return {...actions,left:direction<0,right:direction>0,jump,down,
              pressed:{...actions,jump:pressed},released:{...actions,jump:released}};
          };
          for(frame=0;frame<780;frame++){
            game.update(1/60);
            maxNext=Math.max(maxNext,course.next);
            if(frame%20===0||course.completed)trace.push({
              frame,x:Number((p.x/16).toFixed(1)),y:Number((p.y/16).toFixed(1)),
              next:course.next,vx:Number(m.vx.toFixed(1)),vy:Number(m.vy.toFixed(1))
            });
            if(course.completed||p.sleep)break;
          }
          WW.input.read=formerRead;
          return {chapter:s.chapter.id,course:course.id,mount:m.kind,
            completed:course.completed,frames:frame+1,maxNext,
            rewards:s.shared.mountCourses,trace};
        }""",chapter_index)
        reports.append(report)
        assert report["completed"] and report["rewards"]==1,report
        assert report["frames"] < 780,report
        assert report["maxNext"]>=4,report
        page.evaluate('WW.main.game.render(document.querySelector("#game").getContext("2d"),8)')
        page.locator("#game").screenshot(path=str(html.parent/f"preview-mount-course-{chapter_index}.png"))
        print(f"PASS: {report['chapter']} {report['course']} completed in {report['frames']} real physics frames")

    assert not errors,errors
    browser.close()

(html.parent/"mount-course-routes.json").write_text(json.dumps({
    "method":"Actual 60 Hz browser player+mount physics and real Jump/Down/Left/Right inputs",
    "limits":"Mount friendship granted, threats disabled, and each attempt starts locally at its authored mount. Not a full campaign playthrough.",
    "courses":reports
},indent=2)+"\n")
print("PASS: all three optional mounted routes under actual movement/flight physics")
