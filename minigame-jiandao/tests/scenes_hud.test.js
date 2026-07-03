const test = require('node:test');
const assert = require('node:assert');
const { createSceneManager } = require('../src/core/scenes');
const { hitButton } = require('../src/ui/hud');

test('go 触发 exit/enter 并携带参数', () => {
  const sm = createSceneManager();
  const log = [];
  sm.register('a', { enter: () => log.push('a.enter'), exit: () => log.push('a.exit') });
  sm.register('b', { enter: (p) => log.push('b.enter:' + p.n) });
  sm.go('a');
  sm.go('b', { n: 7 });
  assert.deepStrictEqual(log, ['a.enter', 'a.exit', 'b.enter:7']);
});

test('update/tap 路由到当前场景', () => {
  const sm = createSceneManager();
  let u = 0, tapped = null;
  sm.register('a', { update: () => u++, onTap: (x, y) => { tapped = [x, y]; } });
  sm.go('a');
  sm.update(1 / 60);
  sm.tap(5, 6);
  assert.strictEqual(u, 1);
  assert.deepStrictEqual(tapped, [5, 6]);
});

test('go 未注册场景抛出带场景名的错误', () => {
  const sm = createSceneManager();
  assert.throws(() => sm.go('nope'), /未注册的场景: nope/);
});

test('hitButton 矩形命中', () => {
  const btns = [{ id: 'ok', x: 100, y: 200, w: 80, h: 40 }];
  assert.strictEqual(hitButton(btns, 140, 220), 'ok');
  assert.strictEqual(hitButton(btns, 90, 220), null);
});
