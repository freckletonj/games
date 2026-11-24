import test from 'node:test';
import assert from 'node:assert/strict';
import {bindings,controlGuide,readActions} from '../src/input.js';

function keyboard(layout,active) {
  return Object.fromEntries(Object.entries(layout).map(([action,keys]) =>
    [action,keys.map(name=>({isDown:active.includes(name)}))]));
}
test('keyboard actions and rising edges for both players',()=>{
  for (const layout of bindings) {
    const jumpKey=layout.jump[0];
    const held=readActions(keyboard(layout,[jumpKey]),null);
    assert.equal(held.jump,true);
    assert.equal(held.jumpPressed,true);
    assert.equal(readActions(keyboard(layout,[jumpKey]),null,held).jumpPressed,false);
    assert.equal(readActions(keyboard(layout,[]),null,held).jump,false);
  }
});
test('gamepad axes, dpad and standard face button mapping',()=>{
  const pad={leftStick:{x:-0.6,y:0},buttons:Array.from({length:16},(_,i)=>({pressed:i===0||i===2}))};
  const input=readActions(keyboard(bindings[0],[]),pad);
  assert.equal(input.left,true);
  assert.equal(input.jumpPressed,true);
  assert.equal(input.capturePressed,true);
  assert.equal(readActions(keyboard(bindings[0],[]),pad,input).capturePressed,false);
});

test('revive keys and left shoulder map independently from gamepad pause',()=>{
  const first=readActions(keyboard(bindings[0],['R']),null);
  const second=readActions(keyboard(bindings[1],['Y']),null);
  assert.equal(first.revivePressed,true);
  assert.equal(second.revivePressed,true);
  const pad={buttons:Array.from({length:16},(_,i)=>({pressed:i===4}))};
  const pressed=readActions(keyboard(bindings[0],[]),pad);
  assert.equal(pressed.revivePressed,true);
  assert.equal(pressed.pausePressed,false);
  assert.equal(readActions(keyboard(bindings[0],[]),pad,pressed).revivePressed,false);
});


test('cloud assist uses the right bumper or P2 keyboard B independently of food',()=>{
  const pad={buttons:Array.from({length:16},(_,i)=>({pressed:i===5}))};
  const assist=readActions(keyboard(bindings[1],[]),pad);
  assert.equal(assist.cloudPressed,true);
  assert.equal(assist.foodPressed,false);
  assert.equal(readActions(keyboard(bindings[1],[]),pad,assist).cloudPressed,false);
  assert.equal(readActions(keyboard(bindings[1],['B']),null).cloudPressed,true);
  assert.deepEqual(controlGuide(1,true,true).find(([action])=>action.includes('homing')),
    ['Send homing cloud','RB / R1']);
});
