const test = require('node:test');
const assert = require('node:assert');
const { createGameState } = require('../src/state');
const { createStore, SAVE_KEY } = require('../src/core/storage');
const { upgradeCost } = require('../src/data/upgrades');

function memAdapter() {
  const mem = new Map();
  return { get: (k) => (mem.has(k) ? mem.get(k) : null), set: (k, v) => mem.set(k, v) };
}
function newState() { return createGameState(createStore(memAdapter())); }

test('金币增减与不足拒绝', () => {
  const gs = newState();
  gs.addCoins(100);
  assert.strictEqual(gs.data.coins, 100);
  assert.ok(gs.spend(40));
  assert.strictEqual(gs.data.coins, 60);
  assert.ok(!gs.spend(999));
  assert.strictEqual(gs.data.coins, 60);
});

test('买升级：扣钱升1级，钱不够失败，满级拒绝', () => {
  const gs = newState();
  gs.addCoins(upgradeCost('weapon', 0));
  assert.ok(gs.buyUpgrade('weapon'));
  assert.strictEqual(gs.levelOf('weapon'), 1);
  assert.strictEqual(gs.data.coins, 0);
  assert.ok(!gs.buyUpgrade('weapon')); // 没钱
  gs.data.upgrades.dash = 5;
  gs.addCoins(999999);
  assert.ok(!gs.buyUpgrade('dash')); // 满级
});

test('半价按上取整', () => {
  const gs = newState();
  assert.strictEqual(gs.costOf('weapon', true), Math.ceil(upgradeCost('weapon', 0) / 2));
});

test('通关解锁下一关且不回退、封顶8', () => {
  const gs = newState();
  gs.unlockNext(1);
  assert.strictEqual(gs.data.unlocked, 2);
  gs.unlockNext(1); // 重复通关不变
  assert.strictEqual(gs.data.unlocked, 2);
  gs.data.unlocked = 8;
  gs.unlockNext(8);
  assert.strictEqual(gs.data.unlocked, 8);
});

test('每日折扣3次，跨天重置', () => {
  const gs = newState();
  assert.strictEqual(gs.discountLeft('2026-07-03'), 3);
  assert.ok(gs.useDiscount('2026-07-03'));
  assert.ok(gs.useDiscount('2026-07-03'));
  assert.ok(gs.useDiscount('2026-07-03'));
  assert.ok(!gs.useDiscount('2026-07-03'));
  assert.strictEqual(gs.discountLeft('2026-07-04'), 3);
});

test('改动即持久化：重建实例数据仍在', () => {
  const adapter = memAdapter();
  const gs1 = createGameState(createStore(adapter));
  gs1.addCoins(77);
  const gs2 = createGameState(createStore(adapter));
  assert.strictEqual(gs2.data.coins, 77);
});
