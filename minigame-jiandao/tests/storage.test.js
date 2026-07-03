const test = require('node:test');
const assert = require('node:assert');
const { createStore, defaultState, migrate, SAVE_KEY, SAVE_VERSION } = require('../src/core/storage');

function memAdapter(initial) {
  const mem = new Map(initial ? [[SAVE_KEY, initial]] : []);
  return { get: (k) => (mem.has(k) ? mem.get(k) : null), set: (k, v) => mem.set(k, v) };
}

test('默认存档结构', () => {
  const s = defaultState();
  assert.strictEqual(s.version, SAVE_VERSION);
  assert.strictEqual(s.coins, 0);
  assert.deepStrictEqual(s.upgrades, { weapon: 0, armor: 0, dash: 0 });
  assert.strictEqual(s.unlocked, 1);
  assert.deepStrictEqual(s.discount, { date: '', used: 0 });
});

test('保存后能读回', () => {
  const store = createStore(memAdapter());
  const s = store.load();
  s.coins = 123;
  store.save(s);
  assert.strictEqual(store.load().coins, 123);
});

test('损坏 JSON 回退默认存档，不抛异常', () => {
  const store = createStore(memAdapter('{{{not json'));
  assert.deepStrictEqual(store.load(), defaultState());
});

test('未知未来版本回退默认存档', () => {
  assert.deepStrictEqual(migrate({ version: 999 }), defaultState());
});

test('非对象/缺版本号回退默认存档', () => {
  assert.deepStrictEqual(migrate(null), defaultState());
  assert.deepStrictEqual(migrate({ coins: 5 }), defaultState());
});
