import test from 'node:test';
import assert from 'node:assert/strict';
import {bindings,readActions} from '../src/input.js';

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
