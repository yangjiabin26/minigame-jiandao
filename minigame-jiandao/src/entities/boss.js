const { makeEntity } = require('./entity');

const CONFIG = {
  warlord: {
    hp: 260, r: 22, speed: 60, coin: 80,
    telegraph: 0.6, recover: 0.8,
    skills: { sweep: { dmg: 18 }, charge: { dmg: 15, dist: 320, time: 0.45 } },
  },
  blackknight: {
    hp: 520, r: 24, speed: 70, coin: 200,
    telegraph: 0.6, recover: 0.8, telegraphP3: 0.45, recoverP3: 0.5,
    skills: { sweep: { dmg: 20 }, charge: { dmg: 16, dist: 360, time: 0.4 }, volley: { dmg: 8, speed: 200 } },
  },
};

function createBoss(kind, x, y) {
  const cfg = CONFIG[kind];
  const b = makeEntity({ x, y, r: cfg.r, hp: cfg.hp, speed: cfg.speed });
  b.kind = kind;
  b.coin = cfg.coin;
  b.state = 'idle';
  b.currentSkill = null;
  b.pendingHit = null;
  b.telegraphT = 0;
  b._t = 0;
  b._rng = Math.random;
  b._chargeVx = 0; b._chargeVy = 0;

  b.phase = () => {
    if (kind !== 'blackknight') return 1;
    const ratio = b.hp / b.maxHp;
    if (ratio > 2 / 3) return 1;
    if (ratio > 1 / 3) return 2;
    return 3;
  };

  function pickSkill() {
    const canVolley = kind === 'blackknight' && b.phase() >= 2;
    const roll = b._rng();
    if (canVolley && roll > 0.66) return 'volley';
    return roll > 0.5 ? 'charge' : 'sweep';
  }
  function telegraphTime() { return (kind === 'blackknight' && b.phase() === 3) ? cfg.telegraphP3 : cfg.telegraph; }
  function recoverTime() { return (kind === 'blackknight' && b.phase() === 3) ? cfg.recoverP3 : cfg.recover; }

  b.update = (dt, world) => {
    if (b.dead) return;
    b.applyKnockback(dt);
    const p = world.player;
    const toPlayer = Math.atan2(p.y - b.y, p.x - b.x);
    b._t -= dt;

    switch (b.state) {
      case 'idle': {
        b.facing = toPlayer;
        const dist = Math.hypot(p.x - b.x, p.y - b.y);
        if (dist > 90) {
          const s = cfg.speed * dt;
          b.moveWithWalls(Math.cos(toPlayer) * s, Math.sin(toPlayer) * s, world.walls, world.mapW, world.mapH);
        }
        b.currentSkill = pickSkill();
        b.state = 'telegraph';
        b._t = telegraphTime();
        b.telegraphT = b._t;
        break;
      }
      case 'telegraph': {
        b.telegraphT = Math.max(0, b._t);
        if (b.currentSkill !== 'charge') b.facing = toPlayer; // 冲锋方向在前摇时锁定
        if (b._t <= 0) {
          if (b.currentSkill === 'sweep') {
            b.pendingHit = { dmg: cfg.skills.sweep.dmg, kind: 'sweep' };
            b.state = 'recover'; b._t = recoverTime();
          } else if (b.currentSkill === 'charge') {
            const sk = cfg.skills.charge;
            const speed = sk.dist / sk.time;
            b._chargeVx = Math.cos(b.facing) * speed;
            b._chargeVy = Math.sin(b.facing) * speed;
            b.state = 'strike'; b._t = sk.time;
          } else { // volley：八向箭
            for (let i = 0; i < 8; i++) {
              world.shoot(b.x, b.y, (Math.PI / 4) * i, cfg.skills.volley.dmg, cfg.skills.volley.speed);
            }
            b.state = 'recover'; b._t = recoverTime();
          }
        }
        break;
      }
      case 'strike': { // 仅 charge 使用
        b.moveWithWalls(b._chargeVx * dt, b._chargeVy * dt, world.walls, world.mapW, world.mapH);
        b.pendingHit = { dmg: cfg.skills.charge.dmg, kind: 'charge' };
        if (b._t <= 0) { b.pendingHit = null; b.state = 'recover'; b._t = recoverTime(); }
        break;
      }
      case 'recover': {
        // sweep 的 pendingHit 由战斗场景消费后置 null，此处不清除
        if (b._t <= 0) { b.state = 'idle'; b.currentSkill = null; }
        break;
      }
    }
  };
  return b;
}
module.exports = { createBoss };
