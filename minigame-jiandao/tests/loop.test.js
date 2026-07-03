const test = require('node:test');
const assert = require('node:assert');
const { createStepper, STEP } = require('../src/core/loop');

test('累计不足一步不更新，足量按整步更新', () => {
  let n = 0;
  const s = createStepper(() => n++);
  s.advance(STEP * 0.5);
  assert.strictEqual(n, 0);
  s.advance(STEP * 0.6); // 累计 1.1 步
  assert.strictEqual(n, 1);
  s.advance(STEP * 3);
  assert.strictEqual(n, 4);
});

test('超大 dt 被钳制，不产生死亡螺旋', () => {
  let n = 0;
  const s = createStepper(() => n++);
  s.advance(10); // 10 秒卡顿
  assert.ok(n <= Math.ceil(0.25 / STEP) + 1);
});
