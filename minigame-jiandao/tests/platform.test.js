const test = require('node:test');
const assert = require('node:assert');
const { createMockPlatform } = require('../src/platform/mock');
const { getPlatform } = require('../src/platform/index');

test('Node 环境下 getPlatform 返回 mock', () => {
  assert.strictEqual(getPlatform().name, 'mock');
});

test('mock 存储读写与缺省 null', () => {
  const p = createMockPlatform();
  assert.strictEqual(p.storage.get('nope'), null);
  p.storage.set('k', 'v');
  assert.strictEqual(p.storage.get('k'), 'v');
});

test('mock 广告可配置成功/失败', async () => {
  const p = createMockPlatform();
  assert.strictEqual(await p.ads.showRewarded(), true);
  p.ads.adResult = false;
  assert.strictEqual(await p.ads.showRewarded(), false);
});

test('mock 广告可用性默认 true，可配置为不可用', () => {
  const p1 = createMockPlatform();
  assert.strictEqual(p1.ads.available(), true);
  const p2 = createMockPlatform({ adAvailable: false });
  assert.strictEqual(p2.ads.available(), false);
});

test('mock 触摸事件分发', () => {
  const p = createMockPlatform();
  let got = null;
  p.touch.onStart((ts) => { got = ts; });
  p.touch.emit('start', [{ id: 1, x: 10, y: 20 }]);
  assert.deepStrictEqual(got, [{ id: 1, x: 10, y: 20 }]);
});
