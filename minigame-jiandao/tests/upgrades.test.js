const test = require('node:test');
const assert = require('node:assert');
const U = require('../src/data/upgrades');

test('三线上限：武器8/盔甲8/闪避5', () => {
  assert.strictEqual(U.LINES.weapon.max, 8);
  assert.strictEqual(U.LINES.armor.max, 8);
  assert.strictEqual(U.LINES.dash.max, 5);
});

test('升级价格单调递增', () => {
  for (const line of ['weapon', 'armor', 'dash']) {
    for (let lv = 1; lv < U.LINES[line].max; lv++) {
      assert.ok(U.upgradeCost(line, lv) > U.upgradeCost(line, lv - 1), `${line} L${lv}`);
    }
  }
});

test('属性成长', () => {
  assert.strictEqual(U.attackOf(0), 10);
  assert.ok(U.attackOf(8) > U.attackOf(0));
  assert.strictEqual(U.maxHpOf(0), 50);
  assert.strictEqual(U.dashCooldownOf(0), 2);
  assert.ok(U.dashCooldownOf(5) < 2);
  assert.ok(U.dashDistOf(5) > U.dashDistOf(0));
});

test('三连击倍率第三击更高', () => {
  assert.deepStrictEqual(U.COMBO_MULT, [1, 1, 1.6]);
});
