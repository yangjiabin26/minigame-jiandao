const { clamp, circleRect } = require('../core/collision');

function makeEntity({ x, y, r, hp, speed }) {
  const e = {
    x, y, r, hp, maxHp: hp, speed,
    facing: 0, dead: false, invulnT: 0, kx: 0, ky: 0,
    takeHit(dmg, kx, ky) {
      if (e.invulnT > 0 || e.dead) return false;
      e.hp -= dmg;
      e.kx = kx; e.ky = ky;
      if (e.hp <= 0) { e.hp = 0; e.dead = true; }
      return true;
    },
    applyKnockback(dt) {
      if (e.kx === 0 && e.ky === 0) return;
      e.x += e.kx * dt; e.y += e.ky * dt;
      const decay = Math.max(0, 1 - dt * 8);
      e.kx *= decay; e.ky *= decay;
      if (Math.abs(e.kx) < 1) e.kx = 0;
      if (Math.abs(e.ky) < 1) e.ky = 0;
    },
    moveWithWalls(dx, dy, walls, mapW, mapH) {
      const tryAxis = (nx, ny) => {
        if (nx - e.r < 0 || nx + e.r > mapW || ny - e.r < 0 || ny + e.r > mapH) return false;
        for (const w of walls) if (circleRect(nx, ny, e.r, w.x, w.y, w.w, w.h)) return false;
        return true;
      };
      if (tryAxis(e.x + dx, e.y)) e.x += dx;
      if (tryAxis(e.x, e.y + dy)) e.y += dy;
      e.x = clamp(e.x, e.r, mapW - e.r);
      e.y = clamp(e.y, e.r, mapH - e.r);
    },
  };
  return e;
}
module.exports = { makeEntity };
