const { createPool } = require('../core/pool');
const { circleHit } = require('../core/collision');

const MAGNET_R = 60;
const PICK_R = 20;
const COIN_VALUE = 6;

function createPickups() {
  const pool = createPool(() => ({ x: 0, y: 0, vx: 0, vy: 0, value: 0 }));
  return {
    spawnCoins(x, y, total) {
      let left = total;
      while (left > 0) {
        const v = Math.min(COIN_VALUE, left);
        left -= v;
        const c = pool.obtain();
        const ang = Math.random() * Math.PI * 2;
        c.x = x; c.y = y; c.value = v;
        c.vx = Math.cos(ang) * 60; c.vy = Math.sin(ang) * 60; // 散开
      }
    },
    update(dt, player, onCollect) {
      pool.forEach((c) => {
        const dx = player.x - c.x, dy = player.y - c.y;
        const d = Math.hypot(dx, dy);
        if (d < MAGNET_R && d > 0) { c.vx = (dx / d) * 240; c.vy = (dy / d) * 240; } else { c.vx *= Math.max(0, 1 - dt * 4); c.vy *= Math.max(0, 1 - dt * 4); }
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (circleHit(c.x, c.y, PICK_R, player.x, player.y, player.r)) {
          onCollect(c.value);
          pool.free(c);
        }
      });
    },
    forEach(fn) { pool.forEach(fn); },
    clear() { pool.clear(); },
  };
}
module.exports = { createPickups };
