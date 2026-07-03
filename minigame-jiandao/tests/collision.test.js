const test = require('node:test');
const assert = require('node:assert');
const { clamp, circleHit, circleRect, inSector, angleDiff } = require('../src/core/collision');

test('clamp 边界', () => {
  assert.strictEqual(clamp(5, 0, 10), 5);
  assert.strictEqual(clamp(-1, 0, 10), 0);
  assert.strictEqual(clamp(11, 0, 10), 10);
});

test('圆-圆碰撞', () => {
  assert.ok(circleHit(0, 0, 10, 15, 0, 10));      // 相交
  assert.ok(!circleHit(0, 0, 10, 25, 0, 10));     // 分离
});

test('圆-矩形碰撞', () => {
  assert.ok(circleRect(0, 0, 10, 5, -5, 20, 10)); // 圆心在矩形边上
  assert.ok(!circleRect(0, 0, 4, 5, 5, 10, 10));  // 角外分离
});

test('扇形命中：90° 扇形朝右', () => {
  const HALF = Math.PI / 4;
  assert.ok(inSector(0, 0, 0, 60, HALF, 40, 0));       // 正前方
  assert.ok(inSector(0, 0, 0, 60, HALF, 30, 25));      // 45° 内
  assert.ok(!inSector(0, 0, 0, 60, HALF, 0, 40));      // 正侧方 90°，超出半角
  assert.ok(!inSector(0, 0, 0, 60, HALF, 100, 0));     // 超出半径
  assert.ok(inSector(0, 0, 0, 60, HALF, 70, 0, 15));   // 目标半径补偿后命中
});

test('angleDiff 环绕', () => {
  assert.ok(Math.abs(angleDiff(Math.PI * 0.9, -Math.PI * 0.9) - (-Math.PI * 0.2)) < 1e-9);
});
