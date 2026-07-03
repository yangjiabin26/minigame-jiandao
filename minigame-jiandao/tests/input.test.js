const test = require('node:test');
const assert = require('node:assert');
const { createInput } = require('../src/core/input');

test('左半屏按下出现摇杆，拖动产生方向', () => {
  const inp = createInput(375, 667);
  inp.onStart([{ id: 1, x: 100, y: 400 }]);
  assert.ok(inp.joy.active);
  assert.strictEqual(inp.joy.baseX, 100);
  inp.onMove([{ id: 1, x: 160, y: 400 }]); // 右移 60px = 满速
  assert.ok(Math.abs(inp.joy.dx - 1) < 1e-9);
  assert.ok(Math.abs(inp.joy.dy) < 1e-9);
  assert.strictEqual(inp.joy.mag, 1);
  inp.onEnd([{ id: 1, x: 160, y: 400 }]);
  assert.ok(!inp.joy.active);
  assert.strictEqual(inp.joy.mag, 0);
});

test('小幅拖动 mag 按比例', () => {
  const inp = createInput(375, 667);
  inp.onStart([{ id: 1, x: 100, y: 400 }]);
  inp.onMove([{ id: 1, x: 100, y: 430 }]); // 30px = 0.5
  assert.ok(Math.abs(inp.joy.mag - 0.5) < 1e-9);
  assert.ok(Math.abs(inp.joy.dy - 1) < 1e-9);
});

test('点攻击/闪避按钮产生一次性事件', () => {
  const inp = createInput(375, 667);
  inp.onStart([{ id: 2, x: 375 - 70, y: 667 - 90 }]);
  inp.onStart([{ id: 3, x: 375 - 152, y: 667 - 56 }]);
  assert.deepStrictEqual(inp.consume(), ['attack', 'dash']);
  assert.deepStrictEqual(inp.consume(), []); // 已取走
});

test('右半屏非按钮区域按下不影响摇杆', () => {
  const inp = createInput(375, 667);
  inp.onStart([{ id: 9, x: 300, y: 100 }]);
  assert.ok(!inp.joy.active);
});

test('双指：摇杆手指不受按钮手指干扰', () => {
  const inp = createInput(375, 667);
  inp.onStart([{ id: 1, x: 80, y: 500 }]);
  inp.onStart([{ id: 2, x: 375 - 70, y: 667 - 90 }]);
  inp.onMove([{ id: 1, x: 140, y: 500 }, { id: 2, x: 375 - 70, y: 667 - 90 }]);
  assert.strictEqual(inp.joy.mag, 1);
  inp.onEnd([{ id: 2, x: 375 - 70, y: 667 - 90 }]);
  assert.ok(inp.joy.active); // 摇杆手指还在
});
