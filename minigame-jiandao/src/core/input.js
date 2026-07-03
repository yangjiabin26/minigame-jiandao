const JOY_RANGE = 60;

function createInput(w, h) {
  const buttons = {
    attack: { x: w - 70, y: h - 90, r: 46 },
    dash: { x: w - 152, y: h - 56, r: 32 },
  };
  const joy = { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0, mag: 0 };
  let events = [];

  function inCircle(t, c) {
    const dx = t.x - c.x, dy = t.y - c.y;
    return dx * dx + dy * dy <= c.r * c.r;
  }
  function resetJoy() { joy.active = false; joy.id = null; joy.dx = joy.dy = joy.mag = 0; }

  return {
    joy, buttons,
    onStart(touches) {
      for (const t of touches) {
        if (inCircle(t, buttons.attack)) { events.push('attack'); continue; }
        if (inCircle(t, buttons.dash)) { events.push('dash'); continue; }
        if (t.x < w / 2 && !joy.active) {
          joy.active = true; joy.id = t.id; joy.baseX = t.x; joy.baseY = t.y;
          joy.dx = joy.dy = joy.mag = 0;
        }
      }
    },
    onMove(touches) {
      if (!joy.active) return;
      for (const t of touches) {
        if (t.id !== joy.id) continue;
        const dx = t.x - joy.baseX, dy = t.y - joy.baseY;
        const d = Math.hypot(dx, dy);
        if (d === 0) { joy.dx = joy.dy = joy.mag = 0; continue; }
        joy.dx = dx / d; joy.dy = dy / d;
        joy.mag = Math.min(1, d / JOY_RANGE);
      }
    },
    onEnd(touches) {
      for (const t of touches) if (t.id === joy.id) resetJoy();
    },
    consume() { const e = events; events = []; return e; },
    reset() { resetJoy(); events = []; },
  };
}

module.exports = { createInput, JOY_RANGE };
