const test = require('node:test');
const assert = require('node:assert');
const { ENEMIES } = require('../src/data/enemies');
const { createEnemy } = require('../src/entities/enemy');

function world(px, py) {
  const shots = [];
  return {
    player: { x: px, y: py, r: 13, dead: false },
    walls: [], mapW: 800, mapH: 800,
    shoot(x, y, dir, dmg, speed) { shots.push({ x, y, dir, dmg, speed }); },
    shots,
  };
}
function step(en, w, t) { for (let i = 0; i < Math.round(t / (1 / 60)); i++) en.update(1 / 60, w); }

test('四种敌人数值表齐全', () => {
  for (const k of ['soldier', 'archer', 'shield', 'berserker']) {
    assert.ok(ENEMIES[k].hp > 0 && ENEMIES[k].coin > 0, k);
  }
});

test('玩家在仇恨圈外巡逻，进圈追击', () => {
  const en = createEnemy('soldier', 100, 100);
  const far = world(700, 700);
  en.update(1 / 60, far);
  assert.strictEqual(en.state, 'patrol');
  const near = world(180, 100); // aggroR 150 内
  en.update(1 / 60, near);
  assert.strictEqual(en.state, 'chase');
});

test('近战：进入攻击距离先前摇再产生 pendingHit', () => {
  const en = createEnemy('soldier', 100, 100);
  const w = world(120, 100); // attackR 26 内
  en.update(1 / 60, w); // patrol -> chase
  en.update(1 / 60, w); // chase -> windup
  assert.strictEqual(en.state, 'windup');
  assert.ok(!en.pendingHit);
  step(en, w, 0.4); // 前摇 0.35s 结束
  assert.ok(en.pendingHit);
  assert.strictEqual(en.pendingHit.dmg, ENEMIES.soldier.atk);
});

test('弓箭手前摇结束射箭且不近战', () => {
  const en = createEnemy('archer', 100, 100);
  const w = world(250, 100); // keepR(120) < 150 < attackR(180)
  step(en, w, 0.6);
  assert.strictEqual(w.shots.length, 1);
  assert.ok(!en.pendingHit);
});

test('弓箭手贴脸时后退拉开距离', () => {
  const en = createEnemy('archer', 100, 100);
  const w = world(140, 100); // 距离 40 < keepR 120
  const x0 = en.x;
  step(en, w, 0.3);
  assert.ok(en.x < x0); // 向远离玩家方向移动
});

test('盾兵正面免伤、背后受伤', () => {
  const en = createEnemy('shield', 100, 100);
  en.facing = 0; // 朝右
  // 攻击者在盾兵右侧（正面），攻击向左飞行：hitDir = π → 格挡
  assert.ok(!en.takeHit(10, 0, 0, Math.PI));
  assert.strictEqual(en.hp, ENEMIES.shield.hp);
  // 攻击者在盾兵左侧（背后），攻击向右飞行：hitDir = 0 → 受伤
  assert.ok(en.takeHit(10, 0, 0, 0));
  assert.strictEqual(en.hp, ENEMIES.shield.hp - 10);
});

test('狂战士半血狂暴加速', () => {
  const en = createEnemy('berserker', 100, 100);
  assert.strictEqual(en.currentSpeed(), ENEMIES.berserker.speed);
  en.hp = en.maxHp / 2 - 1;
  assert.strictEqual(en.currentSpeed(), ENEMIES.berserker.rageSpeed);
});
