const { clamp } = require('./collision');

function createCamera(vw, vh) {
  const c = { x: 0, y: 0, sx: 0, sy: 0, shakeT: 0, shakeP: 0 };
  return {
    follow(tx, ty, mw, mh) {
      c.x = clamp(tx - vw / 2, 0, Math.max(0, mw - vw));
      c.y = clamp(ty - vh / 2, 0, Math.max(0, mh - vh));
    },
    shake(power, dur) { c.shakeP = power; c.shakeT = dur; },
    update(dt) {
      if (c.shakeT > 0) {
        c.shakeT -= dt;
      }
      if (c.shakeT > 0) {
        c.sx = (Math.random() * 2 - 1) * c.shakeP;
        c.sy = (Math.random() * 2 - 1) * c.shakeP;
        if (c.sx === 0 && c.sy === 0) c.sx = c.shakeP; // 保证震动可见
      } else { c.sx = 0; c.sy = 0; }
    },
    ox() { return c.x + c.sx; },
    oy() { return c.y + c.sy; },
  };
}
module.exports = { createCamera };
