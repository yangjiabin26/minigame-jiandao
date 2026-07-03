const test = require('node:test');
const assert = require('node:assert');
const { tryRevive, tryDouble, tryDiscount } = require('../src/flow/adgates');
const { createGameState } = require('../src/state');
const { createStore } = require('../src/core/storage');

const adsOk = { showRewarded: () => Promise.resolve(true) };
const adsFail = { showRewarded: () => Promise.resolve(false) };
function newState() {
  const mem = new Map();
  return createGameState(createStore({ get: (k) => mem.get(k) || null, set: (k, v) => mem.set(k, v) }));
}

test('复活：看完发奖/失败降级/每关一次', async () => {
  assert.strictEqual(await tryRevive(adsOk, false), 'revived');
  assert.strictEqual(await tryRevive(adsFail, false), 'failed');
  assert.strictEqual(await tryRevive(adsOk, true), 'unavailable');
});

test('双倍：成功翻倍，失败原样', async () => {
  assert.strictEqual(await tryDouble(adsOk, 50), 100);
  assert.strictEqual(await tryDouble(adsFail, 50), 50);
});

test('折扣：成功消耗次数，广告失败不消耗，次数用尽拒绝', async () => {
  const gs = newState();
  assert.strictEqual(await tryDiscount(adsOk, gs, '2026-07-03'), true);
  assert.strictEqual(gs.discountLeft('2026-07-03'), 2);
  assert.strictEqual(await tryDiscount(adsFail, gs, '2026-07-03'), false);
  assert.strictEqual(gs.discountLeft('2026-07-03'), 2); // 失败不消耗
  await tryDiscount(adsOk, gs, '2026-07-03');
  await tryDiscount(adsOk, gs, '2026-07-03');
  assert.strictEqual(await tryDiscount(adsOk, gs, '2026-07-03'), false); // 用尽
});
