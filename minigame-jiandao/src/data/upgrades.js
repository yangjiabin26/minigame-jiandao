const LINES = {
  weapon: { max: 8, base: 10, perLevel: 4, cost0: 60, growth: 1.6 },
  armor:  { max: 8, base: 50, perLevel: 15, cost0: 60, growth: 1.6 },
  dash:   { max: 5, cost0: 80, growth: 1.7 },
};

// 从 curLevel 升到 curLevel+1 的金币价格
function upgradeCost(line, curLevel) {
  const c = LINES[line];
  return Math.round(c.cost0 * Math.pow(c.growth, curLevel));
}

function attackOf(weaponLevel) { return LINES.weapon.base + LINES.weapon.perLevel * weaponLevel; }
function maxHpOf(armorLevel) { return LINES.armor.base + LINES.armor.perLevel * armorLevel; }
function dashCooldownOf(dashLevel) { return +(2 - 0.2 * dashLevel).toFixed(2); }
function dashDistOf(dashLevel) { return 90 + 12 * dashLevel; }

const COMBO_MULT = [1, 1, 1.6];

module.exports = { LINES, upgradeCost, attackOf, maxHpOf, dashCooldownOf, dashDistOf, COMBO_MULT };
