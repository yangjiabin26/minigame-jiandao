const { makeEntity } = require('./entity');
const { COMBO_MULT } = require('../data/upgrades');

const MOVE_SPEED = 140;
const ATTACK_CD = 0.32;
const COMBO_WINDOW = 0.8;
const SWING_TIME = 0.18;
const DASH_TIME = 0.15;
const DASH_INVULN = 0.3;
const HURT_INVULN = 0.5;

function createPlayer({ atk, maxHp, dashCd, dashDist, x, y }) {
  const p = makeEntity({ x, y, r: 13, hp: maxHp, speed: MOVE_SPEED });
  p.atk = atk;
  p.dashCd = dashCd;
  p.dashDist = dashDist;
  p.dashCdLeft = 0;
  p.dashing = false;
  p.swing = null;
  p._attackCd = 0;
  p._comboStage = 0;
  p._comboT = 0;
  p._dashT = 0;
  p._dashVx = 0;
  p._dashVy = 0;

  const baseTakeHit = p.takeHit;
  p.takeHit = (dmg, kx, ky) => {
    const ok = baseTakeHit(dmg, kx, ky);
    if (ok) p.invulnT = HURT_INVULN;
    return ok;
  };

  p.tryAttack = () => {
    if (p._attackCd > 0) return null;
    const stage = p._comboT > 0 ? p._comboStage : 0;
    p._attackCd = ATTACK_CD;
    p._comboStage = (stage + 1) % 3;
    p._comboT = COMBO_WINDOW;
    p.swing = {
      dir: p.facing,
      dmg: p.atk * COMBO_MULT[stage],
      radius: 60,
      halfAngle: Math.PI / 4,
      knock: stage === 2 ? 160 : 80,
      stage,
      t: SWING_TIME,
    };
    return p.swing;
  };

  p.tryDash = (dx, dy) => {
    if (p.dashCdLeft > 0 || p.dashing) return false;
    const d = Math.hypot(dx, dy) || 1;
    const speed = p.dashDist / DASH_TIME;
    p._dashVx = (dx / d) * speed;
    p._dashVy = (dy / d) * speed;
    p._dashT = DASH_TIME;
    p.dashing = true;
    p.invulnT = Math.max(p.invulnT, DASH_INVULN);
    p.dashCdLeft = p.dashCd;
    return true;
  };

  p.update = (dt, walls, mapW, mapH, moveX, moveY) => {
    p._attackCd = Math.max(0, p._attackCd - dt);
    p._comboT = Math.max(0, p._comboT - dt);
    p.dashCdLeft = Math.max(0, p.dashCdLeft - dt);
    p.invulnT = Math.max(0, p.invulnT - dt);
    if (p.swing) { p.swing.t -= dt; if (p.swing.t <= 0) p.swing = null; }

    if (p.dashing) {
      p.moveWithWalls(p._dashVx * dt, p._dashVy * dt, walls, mapW, mapH);
      p._dashT -= dt;
      if (p._dashT <= 0) p.dashing = false;
    } else if (moveX !== 0 || moveY !== 0) {
      p.facing = Math.atan2(moveY, moveX);
      p.moveWithWalls(moveX * MOVE_SPEED * dt, moveY * MOVE_SPEED * dt, walls, mapW, mapH);
    }
    p.applyKnockback(dt);
  };

  return p;
}
module.exports = { createPlayer };
