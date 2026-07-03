const test = require('node:test');
const assert = require('node:assert');
const { createBoss } = require('../src/entities/boss');

function world(px, py) {
  const shots = [];
  return { player: { x: px, y: py, r: 13, dead: false }, walls: [], mapW: 800, mapH: 1000,
    shoot(x, y, dir, dmg, speed) { shots.push({ dir }); }, shots };
}
function step(b, w, t) { for (let i = 0; i < Math.round(t / (1 / 60)); i++) b.update(1 / 60, w); }

test('先前摇再出伤害：telegraph 期间无 pendingHit', () => {
  const b = createBoss('warlord', 400, 400);
  b._rng = () => 0; // 强制选 sweep
  const w = world(430, 400);
  b.update(1 / 60, w);
  assert.strictEqual(b.state, 'telegraph');
  assert.strictEqual(b.currentSkill, 'sweep');
  step(b, w, 0.3);
  assert.ok(!b.pendingHit); // 前摇中
  step(b, w, 0.4); // 前摇 0.6s 结束
  assert.ok(b.pendingHit);
  assert.strictEqual(b.pendingHit.dmg, 18);
  assert.strictEqual(b.pendingHit.kind, 'sweep');
});

test('督军冲锋：位置向玩家方向大幅位移', () => {
  const b = createBoss('warlord', 400, 700);
  b._rng = () => 0.9; // 强制选 charge
  const w = world(400, 200);
  step(b, w, 0.7); // 进入 strike
  const y0 = b.y;
  step(b, w, 0.5);
  assert.ok(y0 - b.y > 100); // 向上冲了一大段
});

test('黑骑士阶段按血量切换', () => {
  const b = createBoss('blackknight', 400, 400);
  assert.strictEqual(b.phase(), 1);
  b.hp = b.maxHp * 0.5;
  assert.strictEqual(b.phase(), 2);
  b.hp = b.maxHp * 0.2;
  assert.strictEqual(b.phase(), 3);
});

test('黑骑士2阶段起解锁八向箭雨', () => {
  const b = createBoss('blackknight', 400, 400);
  b.hp = b.maxHp * 0.5; // 2 阶段
  b._rng = () => 0.99;  // 强制选 volley
  const w = world(400, 200);
  step(b, w, 1.2);
  assert.strictEqual(w.shots.length, 8);
});

test('督军永远不会放箭雨', () => {
  const b = createBoss('warlord', 400, 400);
  b._rng = () => 0.99;
  const w = world(430, 400);
  step(b, w, 2);
  assert.strictEqual(w.shots.length, 0);
});
