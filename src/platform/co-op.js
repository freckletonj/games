window.WW = window.WW || {};
// One player leads the camera. A trailing partner rides safely in a bubble
// instead of creating a camera leash or losing the rest of the level.
WW.coop = (() => {
  const horizontalLimit = 180, verticalLimit = 128;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const popActions = ['jump', 'snack', 'orb', 'transform', 'revive', 'foodCycle', 'recall'];

  function shouldBubble(leader, partner) {
    return Math.abs(leader.x - partner.x) > horizontalLimit ||
      Math.abs(leader.y - partner.y) > verticalLimit;
  }
  function bubbleAnchor(leader, width, height) {
    return {
      x: clamp(leader.x - (leader.face || 1) * 37, 12, width - 12),
      y: clamp(leader.y - 33, 32, height - 12)
    };
  }
  function wantsToPop(input) {
    return popActions.some(action => input.pressed[action]);
  }
  function cameraTarget(leader, width, height, viewportWidth, viewportHeight) {
    return {
      x: clamp(leader.x - viewportWidth / 2 + leader.vx * 14,
        0, Math.max(0, width - viewportWidth)),
      // At wingbeat/pegasus speeds reveal the next landing or gust above,
      // and the approach below during a dive, without snapping on the ground.
      y: clamp(leader.y - viewportHeight * .73 +
        (leader.grounded?0:clamp(leader.vy * 11, -55, 45)),
        0, Math.max(0, height - viewportHeight))
    };
  }
  return {shouldBubble, bubbleAnchor, wantsToPop, cameraTarget};
})();
