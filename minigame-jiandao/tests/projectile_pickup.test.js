const test = require('node:test');
const assert = require('node:assert');
const { createProjectiles } = require('../src/entities/projectile');
const { createPickups } = require('../src/entities/pickup');

function world(px, py) {
  return { player: { x: px, y: py, r: 13, dead: false, invulnT: 0 }, walls: [], mapW: 800, mapH: 800 };
}
function stepP(ps, w, t, onHit) { for (let i = 0; i < Math.round(t / (1 / 60)); i++) ps.update(1 / 60, w, onHit || (() => {})); }

test('箭直线飞行命中玩家触发回调并消失', () => {
  const ps = createProjectiles();
  ps.spawn(100, 100, 0, 6, 220); // 向右
  const w = world(200, 100);
  let hit = 0;
  stepP(ps, w, 1, () => hit++);
  assert.strictEqual(hit, 1);
  let alive = 0; ps.forEach(() => alive++);
  assert.strictEqual(alive, 0);
});

test('箭撞墙消失', () => {
  const ps = createProjectiles();
  ps.spawn(100, 100, 0, 6, 220);
  const w = world(700, 700);
  w.walls = [{ x: 150, y: 50, w: 20, h: 100 }];
  stepP(ps, w, 1);
  let alive = 0; ps.forEach(() => alive++);
  assert.strictEqual(alive, 0);
});

test('箭出地图边界消失', () => {
  const ps = createProjectiles();
  ps.spawn(780, 100, 0, 6, 220);
  stepP(ps, world(10, 700), 0.5);
  let alive = 0; ps.forEach(() => alive++);
  assert.strictEqual(alive, 0);
});

test('金币散开、磁吸、拾取计值', () => {
  const pk = createPickups();
  pk.spawnCoins(100, 100, 18); // 3 枚 × 6
  let coins = 0; pk.forEach(() => coins++);
  assert.strictEqual(coins, 3);
  const player = { x: 100, y: 100, r: 13 };
  let got = 0;
  for (let i = 0; i < 240; i++) pk.update(1 / 60, player, (v) => { got += v; });
  assert.strictEqual(got, 18);
  let left = 0; pk.forEach(() => left++);
  assert.strictEqual(left, 0);
});
