const test = require('node:test');
const assert = require('node:assert');
const { resolveSwing } = require('../src/scenes/battle');
const { createPlayer } = require('../src/entities/player');
const { createEnemy } = require('../src/entities/enemy');

test('扇形内敌人受伤，扇形外不受伤，死亡计数', () => {
  const p = createPlayer({ atk: 100, maxHp: 50, dashCd: 2, dashDist: 90, x: 100, y: 100 });
  p.facing = 0; // 朝右
  const inside = createEnemy('soldier', 140, 100);   // 正前方 40px
  const outside = createEnemy('soldier', 100, 200);  // 正下方 100px（超半径60）
  const swing = p.tryAttack();
  const kills = resolveSwing(swing, p, [inside, outside]);
  assert.ok(inside.dead);          // 100 攻秒杀 30 血
  assert.ok(!outside.dead);
  assert.strictEqual(outside.hp, outside.maxHp);
  assert.strictEqual(kills, 1);
});

test('盾兵被正面挥剑格挡', () => {
  const p = createPlayer({ atk: 100, maxHp: 50, dashCd: 2, dashDist: 90, x: 100, y: 100 });
  p.facing = 0;
  const sh = createEnemy('shield', 140, 100);
  sh.facing = Math.PI; // 面朝玩家 = 玩家在其正面
  resolveSwing(p.tryAttack(), p, [sh]);
  assert.strictEqual(sh.hp, sh.maxHp); // 格挡
});
