const test = require('node:test');
const assert = require('node:assert');
const { createAnim } = require('../src/core/sprite');
const { createCamera } = require('../src/core/camera');

test('动画按 fps 推进并循环', () => {
  const a = createAnim({ frames: 4, fps: 10 });
  assert.strictEqual(a.frame, 0);
  a.update(0.1); assert.strictEqual(a.frame, 1);
  a.update(0.3); assert.strictEqual(a.frame, 0); // 4 帧循环回 0
});

test('非循环动画停在末帧且 done', () => {
  const a = createAnim({ frames: 3, fps: 10, loop: false });
  a.update(1);
  assert.strictEqual(a.frame, 2);
  assert.ok(a.done);
});

test('镜头居中跟随并钳制边界', () => {
  const c = createCamera(375, 667);
  c.follow(500, 500, 1000, 2000);
  assert.strictEqual(c.ox(), 500 - 375 / 2);
  assert.strictEqual(c.oy(), 500 - 667 / 2);
  c.follow(0, 0, 1000, 2000); // 左上角钳制
  assert.strictEqual(c.ox(), 0);
  assert.strictEqual(c.oy(), 0);
  c.follow(1000, 2000, 1000, 2000); // 右下角钳制
  assert.strictEqual(c.ox(), 1000 - 375);
  assert.strictEqual(c.oy(), 2000 - 667);
});

test('震屏时偏移非零，结束后归零', () => {
  const c = createCamera(375, 667);
  c.follow(500, 500, 1000, 2000);
  const bx = c.ox();
  c.shake(6, 0.2);
  c.update(0.05);
  assert.ok(c.ox() !== bx || c.oy() !== 500 - 667 / 2);
  c.update(1);
  assert.strictEqual(c.ox(), bx);
});
