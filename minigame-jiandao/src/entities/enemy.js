const { makeEntity } = require('./entity');
const { angleDiff } = require('../core/collision');
const { ENEMIES } = require('../data/enemies');

const WINDUP = 0.35;

function createEnemy(type, x, y) {
  const cfg = ENEMIES[type];
  const en = makeEntity({ x, y, r: cfg.r, hp: cfg.hp, speed: cfg.speed });
  en.type = type;
  en.coin = cfg.coin;
  en.state = 'patrol';
  en.pendingHit = null;
  en._t = 0;           // 当前状态计时
  en._patrolDir = Math.random() * Math.PI * 2;
  en._spawnX = x; en._spawnY = y;

  en.currentSpeed = () =>
    (type === 'berserker' && en.hp < en.maxHp / 2) ? cfg.rageSpeed : cfg.speed;

  if (type === 'shield') {
    const baseTakeHit = en.takeHit;
    // hitDir: 攻击飞行方向（攻击者朝向）。攻击者位于 facing 前方时格挡。
    en.takeHit = (dmg, kx, ky, hitDir = en.facing + Math.PI) => {
      const fromDir = hitDir + Math.PI; // 攻击者相对盾兵的方位
      if (Math.abs(angleDiff(fromDir, en.facing)) <= cfg.guardAngle / 2) return false;
      return baseTakeHit(dmg, kx, ky);
    };
  }

  en.update = (dt, world) => {
    if (en.dead) return;
    en.applyKnockback(dt);
    const p = world.player;
    const dx = p.x - en.x, dy = p.y - en.y;
    const dist = Math.hypot(dx, dy);
    const toPlayer = Math.atan2(dy, dx);
    en._t -= dt;

    switch (en.state) {
      case 'patrol': {
        if (dist <= cfg.aggroR) { en.state = 'chase'; break; }
        if (en._t <= 0) { en._patrolDir = Math.random() * Math.PI * 2; en._t = 1 + Math.random(); }
        const s = cfg.speed * 0.4 * dt;
        en.moveWithWalls(Math.cos(en._patrolDir) * s, Math.sin(en._patrolDir) * s, world.walls, world.mapW, world.mapH);
        break;
      }
      case 'chase': {
        en.facing = toPlayer;
        if (dist <= cfg.attackR && (!cfg.keepR || dist >= cfg.keepR)) {
          en.state = 'windup'; en._t = WINDUP; break;
        }
        let dir = toPlayer;
        if (cfg.keepR && dist < cfg.keepR) dir = toPlayer + Math.PI; // 弓箭手拉开距离
        const s = en.currentSpeed() * dt;
        en.moveWithWalls(Math.cos(dir) * s, Math.sin(dir) * s, world.walls, world.mapW, world.mapH);
        break;
      }
      case 'windup': {
        en.facing = toPlayer;
        if (en._t <= 0) {
          if (type === 'archer') {
            world.shoot(en.x, en.y, toPlayer, cfg.atk, cfg.arrowSpeed);
          } else {
            en.pendingHit = { dmg: cfg.atk };
          }
          en.state = 'recover'; en._t = cfg.attackCd;
        }
        break;
      }
      case 'recover': {
        if (en._t <= 0) en.state = 'chase';
        break;
      }
    }
  };
  return en;
}
module.exports = { createEnemy, WINDUP };
