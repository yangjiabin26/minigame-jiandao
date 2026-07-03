const { createPool } = require('../core/pool');
const { circleHit, circleRect } = require('../core/collision');

function createProjectiles() {
  const pool = createPool(() => ({ x: 0, y: 0, vx: 0, vy: 0, dir: 0, dmg: 0, r: 4 }));
  return {
    spawn(x, y, dir, dmg, speed) {
      const a = pool.obtain();
      a.x = x; a.y = y; a.dir = dir; a.dmg = dmg;
      a.vx = Math.cos(dir) * speed; a.vy = Math.sin(dir) * speed;
    },
    update(dt, world, onHitPlayer) {
      pool.forEach((a) => {
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < 0 || a.x > world.mapW || a.y < 0 || a.y > world.mapH) { pool.free(a); return; }
        for (const w of world.walls) {
          if (circleRect(a.x, a.y, a.r, w.x, w.y, w.w, w.h)) { pool.free(a); return; }
        }
        const p = world.player;
        if (!p.dead && circleHit(a.x, a.y, a.r, p.x, p.y, p.r)) {
          onHitPlayer(a.dmg, a.dir);
          pool.free(a);
        }
      });
    },
    forEach(fn) { pool.forEach(fn); },
    clear() { pool.clear(); },
  };
}
module.exports = { createProjectiles };
