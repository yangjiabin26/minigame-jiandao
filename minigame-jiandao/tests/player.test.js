const test = require('node:test');
const assert = require('node:assert');
const { createPlayer } = require('../src/entities/player');
const { COMBO_MULT } = require('../src/data/upgrades');

function newP() { return createPlayer({ atk: 10, maxHp: 50, dashCd: 2, dashDist: 90, x: 100, y: 100 }); }
function step(p, t) { for (let i = 0; i < Math.round(t / (1 / 60)); i++) p.update(1 / 60, [], 400, 400, 0, 0); }

test('三连击倍率递进，超时重置', () => {
  const p = newP();
  const s1 = p.tryAttack();
  assert.strictEqual(s1.dmg, 10 * COMBO_MULT[0]);
  step(p, 0.4);
  const s2 = p.tryAttack();
  assert.strictEqual(s2.stage, 1);
  step(p, 0.4);
  const s3 = p.tryAttack();
  assert.strictEqual(s3.stage, 2);
  assert.strictEqual(s3.dmg, 16); // 10 * 1.6
  assert.strictEqual(s3.knock, 160);
  step(p, 1.0); // 超过连击窗口
  assert.strictEqual(p.tryAttack().stage, 0);
});

test('攻击冷却期间 tryAttack 返回 null', () => {
  const p = newP();
  assert.ok(p.tryAttack());
  assert.strictEqual(p.tryAttack(), null);
});

test('闪避给无敌帧并进入冷却', () => {
  const p = newP();
  assert.ok(p.tryDash(1, 0));
  assert.ok(p.invulnT >= 0.3 - 1e-9);
  assert.ok(!p.tryDash(1, 0)); // 冷却中
  const x0 = p.x;
  step(p, 0.2);
  assert.ok(p.x - x0 > 80); // 冲刺出去了（约 90px）
  step(p, 2);
  assert.ok(p.tryDash(0, 1)); // 冷却完毕
});

test('受击后 0.5s 无敌', () => {
  const p = newP();
  assert.ok(p.takeHit(5, 0, 0));
  assert.ok(Math.abs(p.invulnT - 0.5) < 1e-9);
  assert.ok(!p.takeHit(5, 0, 0));
});

test('摇杆移动按 140 速度', () => {
  const p = newP();
  p.update(1, [], 1000, 1000, 1, 0); // 满摇杆向右 1 秒
  assert.ok(Math.abs(p.x - 240) < 1e-6);
});
