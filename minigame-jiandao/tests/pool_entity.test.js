const test = require('node:test');
const assert = require('node:assert');
const { createPool } = require('../src/core/pool');
const { makeEntity } = require('../src/entities/entity');

test('对象池复用释放的对象', () => {
  let made = 0;
  const pool = createPool(() => ({ n: made++ }));
  const a = pool.obtain();
  pool.free(a);
  const b = pool.obtain();
  assert.strictEqual(a, b);
  assert.strictEqual(made, 1);
  assert.strictEqual(pool.size(), 1);
});

test('forEach 只遍历活跃对象', () => {
  const pool = createPool(() => ({}));
  const a = pool.obtain(); pool.obtain(); pool.free(a);
  let n = 0;
  pool.forEach(() => n++);
  assert.strictEqual(n, 1);
});

test('受击扣血、死亡、无敌帧免伤', () => {
  const e = makeEntity({ x: 0, y: 0, r: 10, hp: 20, speed: 50 });
  assert.ok(e.takeHit(8, 0, 0));
  assert.strictEqual(e.hp, 12);
  e.invulnT = 0.5;
  assert.ok(!e.takeHit(8, 0, 0)); // 无敌中
  assert.strictEqual(e.hp, 12);
  e.invulnT = 0;
  e.takeHit(99, 0, 0);
  assert.ok(e.dead);
});

test('分轴移动被墙阻挡但能沿墙滑动', () => {
  const e = makeEntity({ x: 50, y: 50, r: 10, hp: 10, speed: 50 });
  const wall = { x: 70, y: 0, w: 20, h: 200 };
  e.moveWithWalls(30, 15, [wall], 400, 400); // 想穿墙
  assert.ok(e.x + e.r <= wall.x + 1e-9);     // x 被挡
  assert.strictEqual(e.y, 65);               // y 正常滑动
});

test('地图边界阻挡：越界移动被拒绝，贴边停住', () => {
  const e = makeEntity({ x: 15, y: 15, r: 10, hp: 10, speed: 50 });
  e.moveWithWalls(-30, -30, [], 400, 400); // 目标位置出界，两轴均被拒绝
  assert.strictEqual(e.x, 15);
  assert.strictEqual(e.y, 15);
});
