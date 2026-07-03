const test = require('node:test');
const assert = require('node:assert');

test('测试环境可用', () => {
  assert.strictEqual(1 + 1, 2);
});
