const test = require('node:test');
const assert = require('node:assert');
const { LEVELS } = require('../src/data/levels');
const { createLevelState } = require('../src/entities/level');
const { ENEMIES } = require('../src/data/enemies');

test('共8关，主题分布 山谷2/森林2/城堡4', () => {
  assert.strictEqual(LEVELS.length, 8);
  assert.deepStrictEqual(LEVELS.map((l) => l.theme),
    ['valley', 'valley', 'forest', 'forest', 'castle', 'castle', 'castle', 'castle']);
});

test('第4关督军Boss，第8关黑骑士Boss', () => {
  assert.strictEqual(LEVELS[3].boss, 'warlord');
  assert.strictEqual(LEVELS[7].boss, 'blackknight');
});

test('每关配置完整：刷怪点类型合法、出生点与出口在图内', () => {
  for (const [i, l] of LEVELS.entries()) {
    assert.ok(l.w >= 600 && l.h >= 900, `L${i + 1} 尺寸`);
    const total = l.spawns.length + (l.boss ? 1 : 0); // Boss 关允许 spawns 为空
    assert.ok(total >= 1 && total <= 10, `L${i + 1} 敌人数`);
    for (const s of l.spawns) assert.ok(ENEMIES[s.type], `L${i + 1} 敌人类型 ${s.type}`);
    for (const pt of [l.playerStart, l.exit]) {
      assert.ok(pt.x > 0 && pt.x < l.w && pt.y > 0 && pt.y < l.h, `L${i + 1} 点位越界`);
    }
  }
});

test('清空敌人才开门，走到出口过关', () => {
  const ls = createLevelState(LEVELS[0]);
  ls.noteSpawn(3);
  assert.ok(!ls.exitOpen());
  ls.noteDeath(); ls.noteDeath();
  assert.ok(!ls.exitOpen());
  ls.noteDeath();
  assert.ok(ls.exitOpen());
  const exit = LEVELS[0].exit;
  assert.ok(!ls.atExit({ x: exit.x + 100, y: exit.y, r: 13 }));
  assert.ok(ls.atExit({ x: exit.x + 10, y: exit.y, r: 13 }));
});

test('门没开时 atExit 恒为 false', () => {
  const ls = createLevelState(LEVELS[0]);
  ls.noteSpawn(1);
  assert.ok(!ls.atExit({ x: LEVELS[0].exit.x, y: LEVELS[0].exit.y, r: 13 }));
});

test('每关都有通关奖励，Boss 关（第4、8关）奖励不低于40', () => {
  for (const [i, l] of LEVELS.entries()) {
    assert.ok(l.reward > 0, `L${i + 1} reward`);
  }
  assert.ok(LEVELS[3].reward >= 40);
  assert.ok(LEVELS[7].reward >= 40);
});
