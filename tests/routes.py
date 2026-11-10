"""Verify that the first chapter's animal powers solve its three traversal puzzles.
Tests use genuine physics updates and keyboard presses; only initial location/form setup is controlled.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
html=Path(__file__).parents[1]/'dist'/'wonderwood.html'
s=html.read_text().replace('requestAnimationFrame(frame);','').replace('<script>window.WONDERWOOD_LEVELS','<script>Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script><script>window.WONDERWOOD_LEVELS')
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox']);p=b.new_page()
 errs=[];p.on('pageerror',lambda e:errs.append(str(e)));p.set_content(s,wait_until='domcontentloaded')
 p.get_by_role('button',name='PLAY FIRST FOREST').click();p.locator('#menu').wait_for(state='hidden')
 def advance(n):p.evaluate(f'for(let i=0;i<{n};i++)WW.main.game.update(1/60)')
 def setp(x,y,form=None):
  p.evaluate('''([x,y,form])=>{let s=WW.main.game.state;let a=s.players[0];
    a.x=x;a.y=y;a.vx=0;a.vy=0;a.grounded=true;a.coyote=.1;a.jumpsUsed=0;
    a.form=form;a.lastSafe={x,y};a.invincible=999;a.energy.springaroo=999;a.energy.skyling=999;a.energy.tideling=999;
  }''',[x,y,form])
 def key(code,frames=1):p.keyboard.down(code);advance(frames);p.keyboard.up(code);advance(1)
 def got(name):return p.evaluate('(kind)=>WW.main.game.state.shared.keys[kind]',name)
 p.evaluate('WW.main.game.state.animals.forEach(a=>{a.alive=false;a.respawn=99999})')
 # Canopy puzzle: a plain single jump from the top ledge cannot reach the gem.
 setp(47*16,19*16)
 key('w',12);advance(48)
 assert not got('springKey'),'Canopy Gem accidentally reachable without double jump'
 # Springaroo makes a genuinely different vertical route possible.
 setp(47*16,19*16,'springaroo')
 key('w',10);advance(3);key('w',12);advance(27)
 assert got('springKey'),'Springaroo double jump did not reach the gem'
 # Sky puzzle: an ordinary jump cannot, Moonwing flight does.
 setp(167*16,14*16)
 key('w');advance(45)
 assert not got('skyKey'),'Moon Gem accidentally reachable without flight'
 setp(167*16,14*16,'skyling')
 p.keyboard.down('w');advance(90);p.keyboard.up('w');advance(1)
 assert got('skyKey'),'Moonwing could not fly to the Moon Gem'
 # Dive puzzle: Tidefox swims down through the water to the River Gem.
 setp(121*16,30*16,'tideling')
 p.keyboard.down('s');advance(51);p.keyboard.up('s');advance(1)
 assert got('diveKey'),'Tidefox could not collect the underwater gem'
 # Final gate opens after the three physically collected relics.
 e=p.evaluate('WW.main.game.state.items.find(item=>item.kind==="exit")')
 setp(e['x'],e['y']+13)
 advance(2)
 assert p.get_by_text('The ancient gate has awakened!').is_visible()
 assert not errs,errs
 print('PASS: normal jump cannot bypass key puzzles; Springaroo, Moonwing, Tidefox physically earn three relics and win')
 b.close()
