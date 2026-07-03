# 《剑道》抖音小游戏实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现设计文档 `docs/superpowers/specs/2026-07-03-jiandao-design.md` 中的《剑道》——2D 顶视角动作闯关抖音小游戏，8 关 + 三线升级 + 激励视频广告，可在抖音开发者工具中运行并具备提审条件。

**Architecture:** 原生 JS + Canvas 2D，无游戏引擎。轻量自建框架（游戏循环/输入/碰撞/精灵/镜头），场景状态机管理页面流转，数据驱动关卡，所有 `tt.*` API 隔离在 `src/platform/`（Node 测试与浏览器试玩用 mock 实现）。

**Tech Stack:** CommonJS 模块（抖音小游戏原生支持）；测试用 Node 内置 `node:test` + `node:assert`（零第三方依赖）；渲染用 Canvas 2D。

## Global Constraints

- 游戏根目录：`minigame-jiandao/`（在仓库根目录下）
- 竖屏（`game.json` 的 `deviceOrientation: "portrait"`），逻辑分辨率以 `platform.system` 为准
- 模块规范：CommonJS（`module.exports` / `require`），禁止 ESM `import`
- 零第三方运行时依赖；测试仅用 Node ≥ 18 内置 `node:test`
- 主包体积 ≤ 2MB
- 所有 `tt.` 前缀 API 只允许出现在 `src/platform/douyin.js`
- 每个任务结束必须 `git commit`，提交信息用中文 conventional commits（`feat:` / `test:` / `chore:`）
- 所有测试命令都在 `minigame-jiandao/` 目录下执行：`npm test`
- 玩家受击无敌 0.5s；闪避无敌 0.3s、冷却基础 2s；三连击倍率 `[1, 1, 1.6]`（来自设计文档）

## 文件结构总览

```
minigame-jiandao/
├── game.js  game.json  project.config.json  package.json
├── src/
│   ├── main.js                  # 场景管理器 + 启动
│   ├── state.js                 # GameState（金币/升级/进度）
│   ├── core/                    # loop input camera collision sprite pool storage
│   ├── platform/                # index douyin mock config
│   ├── flow/adgates.js          # 三个广告点位流程
│   ├── data/                    # upgrades enemies levels
│   ├── entities/                # entity player enemy projectile pickup level boss_*
│   ├── scenes/                  # menu levelselect battle result
│   └── ui/hud.js                # 摇杆/按钮/血条/飘字渲染
├── tests/                       # *.test.js（node:test）
├── dev/                         # 浏览器试玩 harness（不进主包）
└── assets/                      # 素材（含 README 来源说明）
```

---

### Task 1: 项目脚手架与测试基线

**Files:**
- Create: `minigame-jiandao/game.js`
- Create: `minigame-jiandao/game.json`
- Create: `minigame-jiandao/project.config.json`
- Create: `minigame-jiandao/package.json`
- Test: `minigame-jiandao/tests/smoke.test.js`

**Interfaces:**
- Produces: 可运行的 `npm test`；后续所有任务在此目录内工作。

- [ ] **Step 1: 创建配置文件**

`minigame-jiandao/game.json`:
```json
{
  "deviceOrientation": "portrait",
  "showStatusBar": false,
  "networkTimeout": { "request": 10000, "downloadFile": 10000 }
}
```

`minigame-jiandao/project.config.json`（`touristappid` 是开发者工具的游客 appid，注册后替换）:
```json
{
  "miniprogramRoot": "./",
  "projectname": "minigame-jiandao",
  "appid": "touristappid",
  "setting": { "es6": true, "minified": true }
}
```

`minigame-jiandao/package.json`:
```json
{
  "name": "minigame-jiandao",
  "private": true,
  "scripts": { "test": "node --test tests/" }
}
```

`minigame-jiandao/game.js`（入口，Task 17 接入 main.js）:
```js
// 抖音小游戏入口。Task 17 之前保持最小可运行。
console.log('[jiandao] boot');
```

- [ ] **Step 2: 写冒烟测试**

`minigame-jiandao/tests/smoke.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');

test('测试环境可用', () => {
  assert.strictEqual(1 + 1, 2);
});
```

- [ ] **Step 3: 运行测试确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: `pass 1`, `fail 0`

- [ ] **Step 4: Commit**

```bash
git add minigame-jiandao
git commit -m "chore: 剑道小游戏项目脚手架与测试基线"
```

---

### Task 2: 碰撞检测模块

**Files:**
- Create: `minigame-jiandao/src/core/collision.js`
- Test: `minigame-jiandao/tests/collision.test.js`

**Interfaces:**
- Produces: `clamp(v,min,max)`, `circleHit(ax,ay,ar,bx,by,br)->bool`, `circleRect(cx,cy,cr,rx,ry,rw,rh)->bool`, `inSector(ox,oy,dirRad,radius,halfAngleRad,tx,ty,tr=0)->bool`, `angleDiff(a,b)->rad(-π,π]`。后续玩家挥剑用 `inSector`，墙体用 `circleRect`。

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/collision.test.js`:
```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（`Cannot find module '../src/core/collision'`）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/core/collision.js`:
```js
function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

function circleHit(ax, ay, ar, bx, by, br) {
  const r = ar + br;
  return dist2(ax, ay, bx, by) <= r * r;
}

function circleRect(cx, cy, cr, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw), ny = clamp(cy, ry, ry + rh);
  return dist2(cx, cy, nx, ny) <= cr * cr;
}

// 归一化角差到 (-π, π]
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

// 原点 o、朝向 dir、半径 radius、半角 halfAngle 的扇形是否覆盖圆(t, tr)
function inSector(ox, oy, dir, radius, halfAngle, tx, ty, tr = 0) {
  const dx = tx - ox, dy = ty - oy;
  const d2 = dx * dx + dy * dy;
  const r = radius + tr;
  if (d2 > r * r) return false;
  if (d2 === 0) return true;
  return Math.abs(angleDiff(Math.atan2(dy, dx), dir)) <= halfAngle;
}

module.exports = { clamp, circleHit, circleRect, inSector, angleDiff };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/core/collision.js minigame-jiandao/tests/collision.test.js
git commit -m "feat: 碰撞检测模块（圆/矩形/扇形）"
```

---

### Task 3: 升级数值表

**Files:**
- Create: `minigame-jiandao/src/data/upgrades.js`
- Test: `minigame-jiandao/tests/upgrades.test.js`

**Interfaces:**
- Produces: `LINES`（weapon/armor/dash 三线，含 `max`）、`upgradeCost(line, curLevel)->int`、`attackOf(lv)`、`maxHpOf(lv)`、`dashCooldownOf(lv)`、`dashDistOf(lv)`、`COMBO_MULT=[1,1,1.6]`。Task 5 的 GameState 与 Task 11 的玩家属性消费这些函数。

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/upgrades.test.js`:
```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/data/upgrades.js`:
```js
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
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/data/upgrades.js minigame-jiandao/tests/upgrades.test.js
git commit -m "feat: 三线升级数值表与连击倍率"
```

---

### Task 4: 存档模块（版本迁移 + 损坏回退）

**Files:**
- Create: `minigame-jiandao/src/core/storage.js`
- Test: `minigame-jiandao/tests/storage.test.js`

**Interfaces:**
- Consumes: 适配器接口 `{ get(key)->string|null, set(key, string) }`（Task 6 的 platform 提供真实现）
- Produces: `createStore(adapter)->{load()->state, save(state)}`、`defaultState()`、`migrate(raw)->state`、`SAVE_KEY`、`SAVE_VERSION=1`。state 形如 `{version, coins, upgrades:{weapon,armor,dash}, unlocked, discount:{date,used}}`。

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/storage.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { createStore, defaultState, migrate, SAVE_KEY, SAVE_VERSION } = require('../src/core/storage');

function memAdapter(initial) {
  const mem = new Map(initial ? [[SAVE_KEY, initial]] : []);
  return { get: (k) => (mem.has(k) ? mem.get(k) : null), set: (k, v) => mem.set(k, v) };
}

test('默认存档结构', () => {
  const s = defaultState();
  assert.strictEqual(s.version, SAVE_VERSION);
  assert.strictEqual(s.coins, 0);
  assert.deepStrictEqual(s.upgrades, { weapon: 0, armor: 0, dash: 0 });
  assert.strictEqual(s.unlocked, 1);
  assert.deepStrictEqual(s.discount, { date: '', used: 0 });
});

test('保存后能读回', () => {
  const store = createStore(memAdapter());
  const s = store.load();
  s.coins = 123;
  store.save(s);
  assert.strictEqual(store.load().coins, 123);
});

test('损坏 JSON 回退默认存档，不抛异常', () => {
  const store = createStore(memAdapter('{{{not json'));
  assert.deepStrictEqual(store.load(), defaultState());
});

test('未知未来版本回退默认存档', () => {
  assert.deepStrictEqual(migrate({ version: 999 }), defaultState());
});

test('非对象/缺版本号回退默认存档', () => {
  assert.deepStrictEqual(migrate(null), defaultState());
  assert.deepStrictEqual(migrate({ coins: 5 }), defaultState());
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/core/storage.js`:
```js
const SAVE_KEY = 'jiandao_save';
const SAVE_VERSION = 1;

function defaultState() {
  return {
    version: SAVE_VERSION,
    coins: 0,
    upgrades: { weapon: 0, armor: 0, dash: 0 },
    unlocked: 1, // 已解锁的最大关卡号（1-8）
    discount: { date: '', used: 0 }, // 铁匠铺半价：每日 3 次
  };
}

function migrate(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.version !== 'number') return defaultState();
  if (raw.version === SAVE_VERSION) return raw;
  // 未来加版本时在此逐级迁移：if (raw.version === 1) raw = migrateV1toV2(raw); ...
  return defaultState();
}

function createStore(adapter) {
  return {
    load() {
      try {
        const raw = adapter.get(SAVE_KEY);
        if (raw == null) return defaultState();
        return migrate(typeof raw === 'string' ? JSON.parse(raw) : raw);
      } catch (e) {
        return defaultState();
      }
    },
    save(state) {
      try { adapter.set(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* 存储失败不致命 */ }
    },
  };
}

module.exports = { createStore, defaultState, migrate, SAVE_KEY, SAVE_VERSION };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/core/storage.js minigame-jiandao/tests/storage.test.js
git commit -m "feat: 存档模块（版本迁移与损坏回退）"
```

---

### Task 5: GameState（金币/升级/进度/每日折扣）

**Files:**
- Create: `minigame-jiandao/src/state.js`
- Test: `minigame-jiandao/tests/state.test.js`

**Interfaces:**
- Consumes: Task 4 的 `createStore`；Task 3 的 `upgradeCost`、`LINES`
- Produces: `createGameState(store)` 返回 `{ data, addCoins(n), spend(n)->bool, levelOf(line), costOf(line, halfPrice=false), buyUpgrade(line, halfPrice=false)->bool, unlockNext(clearedLevel), discountLeft(today)->int, useDiscount(today)->bool, save() }`。场景层（Task 16/17/18）只通过它读写进度。

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/state.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { createGameState } = require('../src/state');
const { createStore, SAVE_KEY } = require('../src/core/storage');
const { upgradeCost } = require('../src/data/upgrades');

function memAdapter() {
  const mem = new Map();
  return { get: (k) => (mem.has(k) ? mem.get(k) : null), set: (k, v) => mem.set(k, v) };
}
function newState() { return createGameState(createStore(memAdapter())); }

test('金币增减与不足拒绝', () => {
  const gs = newState();
  gs.addCoins(100);
  assert.strictEqual(gs.data.coins, 100);
  assert.ok(gs.spend(40));
  assert.strictEqual(gs.data.coins, 60);
  assert.ok(!gs.spend(999));
  assert.strictEqual(gs.data.coins, 60);
});

test('买升级：扣钱升1级，钱不够失败，满级拒绝', () => {
  const gs = newState();
  gs.addCoins(upgradeCost('weapon', 0));
  assert.ok(gs.buyUpgrade('weapon'));
  assert.strictEqual(gs.levelOf('weapon'), 1);
  assert.strictEqual(gs.data.coins, 0);
  assert.ok(!gs.buyUpgrade('weapon')); // 没钱
  gs.data.upgrades.dash = 5;
  gs.addCoins(999999);
  assert.ok(!gs.buyUpgrade('dash')); // 满级
});

test('半价按上取整', () => {
  const gs = newState();
  assert.strictEqual(gs.costOf('weapon', true), Math.ceil(upgradeCost('weapon', 0) / 2));
});

test('通关解锁下一关且不回退、封顶8', () => {
  const gs = newState();
  gs.unlockNext(1);
  assert.strictEqual(gs.data.unlocked, 2);
  gs.unlockNext(1); // 重复通关不变
  assert.strictEqual(gs.data.unlocked, 2);
  gs.data.unlocked = 8;
  gs.unlockNext(8);
  assert.strictEqual(gs.data.unlocked, 8);
});

test('每日折扣3次，跨天重置', () => {
  const gs = newState();
  assert.strictEqual(gs.discountLeft('2026-07-03'), 3);
  assert.ok(gs.useDiscount('2026-07-03'));
  assert.ok(gs.useDiscount('2026-07-03'));
  assert.ok(gs.useDiscount('2026-07-03'));
  assert.ok(!gs.useDiscount('2026-07-03'));
  assert.strictEqual(gs.discountLeft('2026-07-04'), 3);
});

test('改动即持久化：重建实例数据仍在', () => {
  const adapter = memAdapter();
  const gs1 = createGameState(createStore(adapter));
  gs1.addCoins(77);
  const gs2 = createGameState(createStore(adapter));
  assert.strictEqual(gs2.data.coins, 77);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/state.js`:
```js
const { upgradeCost, LINES } = require('./data/upgrades');

function createGameState(store) {
  const s = store.load();
  const api = {
    get data() { return s; },
    save() { store.save(s); },
    addCoins(n) { s.coins += n; api.save(); },
    spend(n) {
      if (s.coins < n) return false;
      s.coins -= n; api.save(); return true;
    },
    levelOf(line) { return s.upgrades[line]; },
    costOf(line, halfPrice = false) {
      const c = upgradeCost(line, s.upgrades[line]);
      return halfPrice ? Math.ceil(c / 2) : c;
    },
    buyUpgrade(line, halfPrice = false) {
      if (s.upgrades[line] >= LINES[line].max) return false;
      if (!api.spend(api.costOf(line, halfPrice))) return false;
      s.upgrades[line] += 1; api.save(); return true;
    },
    unlockNext(clearedLevel) {
      if (clearedLevel >= s.unlocked && s.unlocked < 8) { s.unlocked = clearedLevel + 1; api.save(); }
    },
    discountLeft(today) {
      if (s.discount.date !== today) { s.discount = { date: today, used: 0 }; api.save(); }
      return 3 - s.discount.used;
    },
    useDiscount(today) {
      if (api.discountLeft(today) <= 0) return false;
      s.discount.used += 1; api.save(); return true;
    },
  };
  return api;
}

module.exports = { createGameState };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/state.js minigame-jiandao/tests/state.test.js
git commit -m "feat: GameState 金币升级进度与每日折扣"
```

---

### Task 6: 平台层（douyin / mock / 广告降级）

**Files:**
- Create: `minigame-jiandao/src/platform/config.js`
- Create: `minigame-jiandao/src/platform/mock.js`
- Create: `minigame-jiandao/src/platform/douyin.js`
- Create: `minigame-jiandao/src/platform/index.js`
- Test: `minigame-jiandao/tests/platform.test.js`

**Interfaces:**
- Produces: `getPlatform()->platform`，platform 统一接口：
  - `name: 'douyin'|'mock'`
  - `system: {width, height, pixelRatio}`
  - `createCanvas()->canvas|null`
  - `storage: {get(k), set(k,v)}`（喂给 Task 4 的 `createStore`）
  - `ads: {showRewarded()->Promise<boolean>}`（true=完整看完发奖；false=失败/中断/未配置，一律走降级）
  - `share({title, desc})`、`audio: {play(name), stopAll()}`、`recorder: {start(), stop()}`、`onError(cb)`
  - `touch: {onStart(cb), onMove(cb), onEnd(cb)}`，回调参数为 `[{id, x, y}]`
- mock 额外暴露 `ads.adResult`（测试可设 true/false）与 `touch.emit(type, touches)`（测试/浏览器 harness 注入触摸）。

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/platform.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { createMockPlatform } = require('../src/platform/mock');
const { getPlatform } = require('../src/platform/index');

test('Node 环境下 getPlatform 返回 mock', () => {
  assert.strictEqual(getPlatform().name, 'mock');
});

test('mock 存储读写与缺省 null', () => {
  const p = createMockPlatform();
  assert.strictEqual(p.storage.get('nope'), null);
  p.storage.set('k', 'v');
  assert.strictEqual(p.storage.get('k'), 'v');
});

test('mock 广告可配置成功/失败', async () => {
  const p = createMockPlatform();
  assert.strictEqual(await p.ads.showRewarded(), true);
  p.ads.adResult = false;
  assert.strictEqual(await p.ads.showRewarded(), false);
});

test('mock 触摸事件分发', () => {
  const p = createMockPlatform();
  let got = null;
  p.touch.onStart((ts) => { got = ts; });
  p.touch.emit('start', [{ id: 1, x: 10, y: 20 }]);
  assert.deepStrictEqual(got, [{ id: 1, x: 10, y: 20 }]);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/platform/config.js`:
```js
// 流量主后台创建广告位后填入真实 adUnitId；为空时 showRewarded 直接返回 false（走降级 UI）
module.exports = { AD_UNIT_REWARDED: '' };
```

`minigame-jiandao/src/platform/mock.js`:
```js
function createMockPlatform(opts = {}) {
  const mem = new Map();
  const handlers = { start: [], move: [], end: [] };
  return {
    name: 'mock',
    system: { width: opts.width || 375, height: opts.height || 667, pixelRatio: 1 },
    createCanvas() { return opts.canvas || null; },
    storage: {
      get(k) { return mem.has(k) ? mem.get(k) : null; },
      set(k, v) { mem.set(k, v); },
    },
    ads: {
      adResult: opts.adResult !== undefined ? opts.adResult : true,
      showRewarded() { return Promise.resolve(this.adResult); },
    },
    share() {},
    audio: { play() {}, stopAll() {} },
    recorder: { start() {}, stop() {} },
    onError() {},
    touch: {
      onStart(cb) { handlers.start.push(cb); },
      onMove(cb) { handlers.move.push(cb); },
      onEnd(cb) { handlers.end.push(cb); },
      emit(type, touches) { handlers[type].forEach((cb) => cb(touches)); },
    },
  };
}
module.exports = { createMockPlatform };
```

`minigame-jiandao/src/platform/douyin.js`（唯一允许出现 `tt.` 的文件）:
```js
const { AD_UNIT_REWARDED } = require('./config');

function mapTouches(e) {
  return (e.touches.length ? Array.from(e.touches) : Array.from(e.changedTouches))
    .map((t) => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
}
function mapEnded(e) {
  return Array.from(e.changedTouches).map((t) => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
}

function createDouyinPlatform() {
  const info = tt.getSystemInfoSync();
  let rewarded = null;
  const audios = {};
  return {
    name: 'douyin',
    system: { width: info.windowWidth, height: info.windowHeight, pixelRatio: info.pixelRatio },
    createCanvas() { return tt.createCanvas(); },
    storage: {
      get(k) { try { const v = tt.getStorageSync(k); return v === '' ? null : v; } catch (e) { return null; } },
      set(k, v) { try { tt.setStorageSync(k, v); } catch (e) {} },
    },
    ads: {
      showRewarded() {
        if (!AD_UNIT_REWARDED) return Promise.resolve(false);
        return new Promise((resolve) => {
          if (!rewarded) rewarded = tt.createRewardedVideoAd({ adUnitId: AD_UNIT_REWARDED });
          const onClose = (res) => { rewarded.offClose(onClose); resolve(!!(res && res.isEnded)); };
          rewarded.onClose(onClose);
          rewarded.show().catch(() =>
            rewarded.load().then(() => rewarded.show()).catch(() => { rewarded.offClose(onClose); resolve(false); })
          );
        });
      },
    },
    share({ title, desc }) { tt.shareAppMessage({ title, desc }); },
    audio: {
      play(name) {
        if (!audios[name]) {
          const a = tt.createInnerAudioContext();
          a.src = 'assets/audio/' + name + '.mp3';
          audios[name] = a;
        }
        audios[name].stop(); audios[name].play();
      },
      stopAll() { Object.keys(audios).forEach((k) => audios[k].stop()); },
    },
    recorder: {
      start() { try { tt.getGameRecorderManager().start({ duration: 300 }); } catch (e) {} },
      stop() { try { tt.getGameRecorderManager().stop(); } catch (e) {} },
    },
    onError(cb) { tt.onError(cb); },
    touch: {
      onStart(cb) { tt.onTouchStart((e) => cb(mapTouches(e))); },
      onMove(cb) { tt.onTouchMove((e) => cb(mapTouches(e))); },
      onEnd(cb) { tt.onTouchEnd((e) => cb(mapEnded(e))); },
    },
  };
}
module.exports = { createDouyinPlatform };
```

`minigame-jiandao/src/platform/index.js`:
```js
const { createMockPlatform } = require('./mock');

let cached = null;
function getPlatform() {
  if (cached) return cached;
  if (typeof tt !== 'undefined') {
    const { createDouyinPlatform } = require('./douyin');
    cached = createDouyinPlatform();
  } else {
    cached = createMockPlatform();
  }
  return cached;
}
module.exports = { getPlatform };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/platform minigame-jiandao/tests/platform.test.js
git commit -m "feat: 平台层抽象（抖音实现与测试mock）"
```

---

### Task 7: 固定步长游戏循环

**Files:**
- Create: `minigame-jiandao/src/core/loop.js`
- Test: `minigame-jiandao/tests/loop.test.js`

**Interfaces:**
- Produces: `STEP = 1/60`；`createStepper(update, step=STEP)->{advance(dtSec)}`（固定步长累加器，单帧 dt 钳制 0.25s 防螺旋）；`createLoop(update, render)->{start(), stop()}`（用全局 `requestAnimationFrame` 驱动 stepper + render）。Task 17 的 main.js 消费 `createLoop`。

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/loop.test.js`:
```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/core/loop.js`:
```js
const STEP = 1 / 60;
const MAX_DT = 0.25;

function createStepper(update, step = STEP) {
  let acc = 0;
  return {
    advance(dt) {
      acc += Math.min(dt, MAX_DT);
      while (acc >= step) { update(step); acc -= step; }
    },
  };
}

function createLoop(update, render) {
  const stepper = createStepper(update);
  let running = false;
  let last = 0;
  function frame(now) {
    if (!running) return;
    if (last) stepper.advance((now - last) / 1000);
    last = now;
    render();
    requestAnimationFrame(frame);
  }
  return {
    start() { running = true; last = 0; requestAnimationFrame(frame); },
    stop() { running = false; },
  };
}

module.exports = { STEP, createStepper, createLoop };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/core/loop.js minigame-jiandao/tests/loop.test.js
git commit -m "feat: 固定步长游戏循环"
```

---

### Task 8: 虚拟摇杆与按钮输入

**Files:**
- Create: `minigame-jiandao/src/core/input.js`
- Test: `minigame-jiandao/tests/input.test.js`

**Interfaces:**
- Consumes: platform 的 `touch` 回调格式 `[{id, x, y}]`
- Produces: `createInput(w, h)` 返回：
  - `joy: {active, baseX, baseY, dx, dy, mag}`（dx/dy 归一化方向，mag 0..1，拖动 60px 满速）
  - `buttons: {attack: {x,y,r}, dash: {x,y,r}}`（渲染用布局）
  - `onStart(touches)` / `onMove(touches)` / `onEnd(touches)`
  - `consume()->events[]`：取走并清空本帧事件，元素为 `'attack'` 或 `'dash'`
  - 布局：左半屏按下出动态摇杆；attack 按钮圆心 `(w-70, h-90)` 半径 46；dash `(w-152, h-56)` 半径 32。

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/input.test.js`:
```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/core/input.js`:
```js
const JOY_RANGE = 60;

function createInput(w, h) {
  const buttons = {
    attack: { x: w - 70, y: h - 90, r: 46 },
    dash: { x: w - 152, y: h - 56, r: 32 },
  };
  const joy = { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0, mag: 0 };
  let events = [];

  function inCircle(t, c) {
    const dx = t.x - c.x, dy = t.y - c.y;
    return dx * dx + dy * dy <= c.r * c.r;
  }
  function resetJoy() { joy.active = false; joy.id = null; joy.dx = joy.dy = joy.mag = 0; }

  return {
    joy, buttons,
    onStart(touches) {
      for (const t of touches) {
        if (inCircle(t, buttons.attack)) { events.push('attack'); continue; }
        if (inCircle(t, buttons.dash)) { events.push('dash'); continue; }
        if (t.x < w / 2 && !joy.active) {
          joy.active = true; joy.id = t.id; joy.baseX = t.x; joy.baseY = t.y;
          joy.dx = joy.dy = joy.mag = 0;
        }
      }
    },
    onMove(touches) {
      if (!joy.active) return;
      for (const t of touches) {
        if (t.id !== joy.id) continue;
        const dx = t.x - joy.baseX, dy = t.y - joy.baseY;
        const d = Math.hypot(dx, dy);
        if (d === 0) { joy.dx = joy.dy = joy.mag = 0; continue; }
        joy.dx = dx / d; joy.dy = dy / d;
        joy.mag = Math.min(1, d / JOY_RANGE);
      }
    },
    onEnd(touches) {
      for (const t of touches) if (t.id === joy.id) resetJoy();
    },
    consume() { const e = events; events = []; return e; },
  };
}

module.exports = { createInput, JOY_RANGE };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/core/input.js minigame-jiandao/tests/input.test.js
git commit -m "feat: 动态虚拟摇杆与攻击闪避按钮输入"
```

---

### Task 9: 精灵帧动画与跟随镜头

**Files:**
- Create: `minigame-jiandao/src/core/sprite.js`
- Create: `minigame-jiandao/src/core/camera.js`
- Test: `minigame-jiandao/tests/sprite_camera.test.js`

**Interfaces:**
- Produces:
  - `createAnim({frames, fps, loop=true})->{update(dt), frame, done, reset()}`
  - `createCamera(vw, vh)->{follow(tx,ty,mapW,mapH), shake(power,dur), update(dt), ox()->x, oy()->y}`（follow 即时居中并钳制到地图边界；shake 在 ox/oy 上叠加随机偏移）

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/sprite_camera.test.js`:
```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/core/sprite.js`:
```js
function createAnim({ frames, fps, loop = true }) {
  const a = {
    frame: 0, done: false, _t: 0,
    update(dt) {
      if (a.done) return;
      a._t += dt;
      const idx = Math.floor(a._t * fps);
      if (loop) { a.frame = idx % frames; return; }
      if (idx >= frames - 1) { a.frame = frames - 1; a.done = true; } else { a.frame = idx; }
    },
    reset() { a.frame = 0; a.done = false; a._t = 0; },
  };
  return a;
}
module.exports = { createAnim };
```

`minigame-jiandao/src/core/camera.js`:
```js
const { clamp } = require('./collision');

function createCamera(vw, vh) {
  const c = { x: 0, y: 0, sx: 0, sy: 0, shakeT: 0, shakeP: 0 };
  return {
    follow(tx, ty, mw, mh) {
      c.x = clamp(tx - vw / 2, 0, Math.max(0, mw - vw));
      c.y = clamp(ty - vh / 2, 0, Math.max(0, mh - vh));
    },
    shake(power, dur) { c.shakeP = power; c.shakeT = dur; },
    update(dt) {
      if (c.shakeT > 0) {
        c.shakeT -= dt;
        c.sx = (Math.random() * 2 - 1) * c.shakeP;
        c.sy = (Math.random() * 2 - 1) * c.shakeP;
        if (c.sx === 0 && c.sy === 0) c.sx = c.shakeP; // 保证震动可见
      } else { c.sx = 0; c.sy = 0; }
    },
    ox() { return c.x + c.sx; },
    oy() { return c.y + c.sy; },
  };
}
module.exports = { createCamera };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/core/sprite.js minigame-jiandao/src/core/camera.js minigame-jiandao/tests/sprite_camera.test.js
git commit -m "feat: 帧动画与跟随震屏镜头"
```

---

### Task 10: 对象池与实体基类

**Files:**
- Create: `minigame-jiandao/src/core/pool.js`
- Create: `minigame-jiandao/src/entities/entity.js`
- Test: `minigame-jiandao/tests/pool_entity.test.js`

**Interfaces:**
- Produces:
  - `createPool(make)->{obtain()->obj, free(obj), forEach(fn), clear(), size()->活跃数}`（复用释放的对象，`obj.__active` 由池管理）
  - `makeEntity({x, y, r, hp, speed})->e`：字段 `x,y,r,hp,maxHp,speed,facing,dead,invulnT,kx,ky`；方法：
    - `e.takeHit(dmg, kx, ky)->bool`：无敌中返回 false；否则扣血、设置击退速度、hp≤0 置 `dead`
    - `e.applyKnockback(dt)`：击退速度位移并衰减
    - `e.moveWithWalls(dx, dy, walls, mapW, mapH)`：分轴移动，圆 vs 矩形墙与地图边界阻挡（walls 为 `[{x,y,w,h}]`）

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/pool_entity.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { createPool } = require('../src/core/pool');
const { makeEntity } = require('../src/entities/entity');

test('对象池复用释放的对象', () => {
  let made = 0;
  const pool = createPool(() => ({ n: made++ }));
  const a = pool.obtain();
  pool.free(a);
  const b = pool.obtain();
  assert.strictEqual(a, b);
  assert.strictEqual(made, 1);
  assert.strictEqual(pool.size(), 1);
});

test('forEach 只遍历活跃对象', () => {
  const pool = createPool(() => ({}));
  const a = pool.obtain(); pool.obtain(); pool.free(a);
  let n = 0;
  pool.forEach(() => n++);
  assert.strictEqual(n, 1);
});

test('受击扣血、死亡、无敌帧免伤', () => {
  const e = makeEntity({ x: 0, y: 0, r: 10, hp: 20, speed: 50 });
  assert.ok(e.takeHit(8, 0, 0));
  assert.strictEqual(e.hp, 12);
  e.invulnT = 0.5;
  assert.ok(!e.takeHit(8, 0, 0)); // 无敌中
  assert.strictEqual(e.hp, 12);
  e.invulnT = 0;
  e.takeHit(99, 0, 0);
  assert.ok(e.dead);
});

test('分轴移动被墙阻挡但能沿墙滑动', () => {
  const e = makeEntity({ x: 50, y: 50, r: 10, hp: 10, speed: 50 });
  const wall = { x: 70, y: 0, w: 20, h: 200 };
  e.moveWithWalls(30, 15, [wall], 400, 400); // 想穿墙
  assert.ok(e.x + e.r <= wall.x + 1e-9);     // x 被挡
  assert.strictEqual(e.y, 65);               // y 正常滑动
});

test('地图边界阻挡：越界移动被拒绝，贴边停住', () => {
  const e = makeEntity({ x: 15, y: 15, r: 10, hp: 10, speed: 50 });
  e.moveWithWalls(-30, -30, [], 400, 400); // 目标位置出界，两轴均被拒绝
  assert.strictEqual(e.x, 15);
  assert.strictEqual(e.y, 15);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/core/pool.js`:
```js
function createPool(make) {
  const items = [];
  return {
    obtain() {
      for (const o of items) if (!o.__active) { o.__active = true; return o; }
      const o = make();
      o.__active = true;
      items.push(o);
      return o;
    },
    free(o) { o.__active = false; },
    forEach(fn) { for (const o of items) if (o.__active) fn(o); },
    clear() { for (const o of items) o.__active = false; },
    size() { let n = 0; for (const o of items) if (o.__active) n++; return n; },
  };
}
module.exports = { createPool };
```

`minigame-jiandao/src/entities/entity.js`:
```js
const { clamp, circleRect } = require('../core/collision');

function makeEntity({ x, y, r, hp, speed }) {
  const e = {
    x, y, r, hp, maxHp: hp, speed,
    facing: 0, dead: false, invulnT: 0, kx: 0, ky: 0,
    takeHit(dmg, kx, ky) {
      if (e.invulnT > 0 || e.dead) return false;
      e.hp -= dmg;
      e.kx = kx; e.ky = ky;
      if (e.hp <= 0) { e.hp = 0; e.dead = true; }
      return true;
    },
    applyKnockback(dt) {
      if (e.kx === 0 && e.ky === 0) return;
      e.x += e.kx * dt; e.y += e.ky * dt;
      const decay = Math.max(0, 1 - dt * 8);
      e.kx *= decay; e.ky *= decay;
      if (Math.abs(e.kx) < 1) e.kx = 0;
      if (Math.abs(e.ky) < 1) e.ky = 0;
    },
    moveWithWalls(dx, dy, walls, mapW, mapH) {
      const tryAxis = (nx, ny) => {
        if (nx - e.r < 0 || nx + e.r > mapW || ny - e.r < 0 || ny + e.r > mapH) return false;
        for (const w of walls) if (circleRect(nx, ny, e.r, w.x, w.y, w.w, w.h)) return false;
        return true;
      };
      if (tryAxis(e.x + dx, e.y)) e.x += dx;
      if (tryAxis(e.x, e.y + dy)) e.y += dy;
      e.x = clamp(e.x, e.r, mapW - e.r);
      e.y = clamp(e.y, e.r, mapH - e.r);
    },
  };
  return e;
}
module.exports = { makeEntity };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/core/pool.js minigame-jiandao/src/entities/entity.js minigame-jiandao/tests/pool_entity.test.js
git commit -m "feat: 对象池与实体基类（受击/击退/墙体移动）"
```

---

### Task 11: 玩家实体（三连击 / 闪避无敌帧）

**Files:**
- Create: `minigame-jiandao/src/entities/player.js`
- Test: `minigame-jiandao/tests/player.test.js`

**Interfaces:**
- Consumes: Task 10 `makeEntity`、Task 3 `COMBO_MULT`
- Produces: `createPlayer({atk, maxHp, dashCd, dashDist, x, y})->p`：
  - 继承实体字段；额外 `p.atk`、`p.dashCdLeft`、`p.dashing`、`p.swing`（无挥剑时为 null）
  - `p.tryAttack()->swing|null`：冷却 0.32s；swing = `{dir, dmg, radius: 60, halfAngle: Math.PI/4, knock, stage}`，stage 0/1/2，dmg = atk × COMBO_MULT[stage]，第三击 knock 160 否则 80；连击窗口 0.8s 内连按推进，超时回 stage 0
  - `p.tryDash(dx, dy)->bool`：冷却中返回 false；成功则 0.15s 冲刺（速度 = dashDist/0.15）、无敌 0.3s、进入 dashCd 冷却
  - `p.update(dt, walls, mapW, mapH, moveX, moveY)`：处理移动（速度 140×mag）、冲刺位移、各计时器递减
  - 受击无敌：`takeHit` 成功后 `p.invulnT = 0.5`（在 player 内包装）

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/player.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { createPlayer } = require('../src/entities/player');
const { COMBO_MULT } = require('../src/data/upgrades');

function newP() { return createPlayer({ atk: 10, maxHp: 50, dashCd: 2, dashDist: 90, x: 100, y: 100 }); }
function step(p, t) { for (let i = 0; i < Math.round(t / (1 / 60)); i++) p.update(1 / 60, [], 400, 400, 0, 0); }

test('三连击倍率递进，超时重置', () => {
  const p = newP();
  const s1 = p.tryAttack();
  assert.strictEqual(s1.dmg, 10 * COMBO_MULT[0]);
  step(p, 0.4);
  const s2 = p.tryAttack();
  assert.strictEqual(s2.stage, 1);
  step(p, 0.4);
  const s3 = p.tryAttack();
  assert.strictEqual(s3.stage, 2);
  assert.strictEqual(s3.dmg, 16); // 10 * 1.6
  assert.strictEqual(s3.knock, 160);
  step(p, 1.0); // 超过连击窗口
  assert.strictEqual(p.tryAttack().stage, 0);
});

test('攻击冷却期间 tryAttack 返回 null', () => {
  const p = newP();
  assert.ok(p.tryAttack());
  assert.strictEqual(p.tryAttack(), null);
});

test('闪避给无敌帧并进入冷却', () => {
  const p = newP();
  assert.ok(p.tryDash(1, 0));
  assert.ok(p.invulnT >= 0.3 - 1e-9);
  assert.ok(!p.tryDash(1, 0)); // 冷却中
  const x0 = p.x;
  step(p, 0.2);
  assert.ok(p.x - x0 > 80); // 冲刺出去了（约 90px）
  step(p, 2);
  assert.ok(p.tryDash(0, 1)); // 冷却完毕
});

test('受击后 0.5s 无敌', () => {
  const p = newP();
  assert.ok(p.takeHit(5, 0, 0));
  assert.ok(Math.abs(p.invulnT - 0.5) < 1e-9);
  assert.ok(!p.takeHit(5, 0, 0));
});

test('摇杆移动按 140 速度', () => {
  const p = newP();
  p.update(1, [], 1000, 1000, 1, 0); // 满摇杆向右 1 秒
  assert.ok(Math.abs(p.x - 240) < 1e-6);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/entities/player.js`:
```js
const { makeEntity } = require('./entity');
const { COMBO_MULT } = require('../data/upgrades');

const MOVE_SPEED = 140;
const ATTACK_CD = 0.32;
const COMBO_WINDOW = 0.8;
const SWING_TIME = 0.18;
const DASH_TIME = 0.15;
const DASH_INVULN = 0.3;
const HURT_INVULN = 0.5;

function createPlayer({ atk, maxHp, dashCd, dashDist, x, y }) {
  const p = makeEntity({ x, y, r: 13, hp: maxHp, speed: MOVE_SPEED });
  p.atk = atk;
  p.dashCd = dashCd;
  p.dashDist = dashDist;
  p.dashCdLeft = 0;
  p.dashing = false;
  p.swing = null;
  p._attackCd = 0;
  p._comboStage = 0;
  p._comboT = 0;
  p._dashT = 0;
  p._dashVx = 0;
  p._dashVy = 0;

  const baseTakeHit = p.takeHit;
  p.takeHit = (dmg, kx, ky) => {
    const ok = baseTakeHit(dmg, kx, ky);
    if (ok) p.invulnT = HURT_INVULN;
    return ok;
  };

  p.tryAttack = () => {
    if (p._attackCd > 0) return null;
    const stage = p._comboT > 0 ? p._comboStage : 0;
    p._attackCd = ATTACK_CD;
    p._comboStage = (stage + 1) % 3;
    p._comboT = COMBO_WINDOW;
    p.swing = {
      dir: p.facing,
      dmg: p.atk * COMBO_MULT[stage],
      radius: 60,
      halfAngle: Math.PI / 4,
      knock: stage === 2 ? 160 : 80,
      stage,
      t: SWING_TIME,
    };
    return p.swing;
  };

  p.tryDash = (dx, dy) => {
    if (p.dashCdLeft > 0 || p.dashing) return false;
    const d = Math.hypot(dx, dy) || 1;
    const speed = p.dashDist / DASH_TIME;
    p._dashVx = (dx / d) * speed;
    p._dashVy = (dy / d) * speed;
    p._dashT = DASH_TIME;
    p.dashing = true;
    p.invulnT = Math.max(p.invulnT, DASH_INVULN);
    p.dashCdLeft = p.dashCd;
    return true;
  };

  p.update = (dt, walls, mapW, mapH, moveX, moveY) => {
    p._attackCd = Math.max(0, p._attackCd - dt);
    p._comboT = Math.max(0, p._comboT - dt);
    p.dashCdLeft = Math.max(0, p.dashCdLeft - dt);
    p.invulnT = Math.max(0, p.invulnT - dt);
    if (p.swing) { p.swing.t -= dt; if (p.swing.t <= 0) p.swing = null; }

    if (p.dashing) {
      p.moveWithWalls(p._dashVx * dt, p._dashVy * dt, walls, mapW, mapH);
      p._dashT -= dt;
      if (p._dashT <= 0) p.dashing = false;
    } else if (moveX !== 0 || moveY !== 0) {
      p.facing = Math.atan2(moveY, moveX);
      p.moveWithWalls(moveX * MOVE_SPEED * dt, moveY * MOVE_SPEED * dt, walls, mapW, mapH);
    }
    p.applyKnockback(dt);
  };

  return p;
}
module.exports = { createPlayer };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/entities/player.js minigame-jiandao/tests/player.test.js
git commit -m "feat: 玩家实体（三连击、闪避、无敌帧）"
```

---

### Task 12: 敌人数值表与四种敌人 AI

**Files:**
- Create: `minigame-jiandao/src/data/enemies.js`
- Create: `minigame-jiandao/src/entities/enemy.js`
- Test: `minigame-jiandao/tests/enemy.test.js`

**Interfaces:**
- Consumes: Task 10 `makeEntity`、Task 2 `angleDiff`
- Produces:
  - `ENEMIES`：soldier/archer/shield/berserker 数值表（含 `coin` 掉落值）
  - `createEnemy(type, x, y)->en`：字段 `en.type,en.state('patrol'|'chase'|'windup'|'recover'),en.coin`；方法 `en.update(dt, world)`；world = `{player, walls, mapW, mapH, shoot(x,y,dir,dmg,speed)}`
  - 行为约定：
    - 所有敌人：玩家进入 `aggroR` 转 chase；进入 `attackR` 转 windup（前摇 0.35s）→ 通过 `en.pendingHit = {dmg}` 由战斗场景结算 → recover（= attackCd）
    - archer：与玩家距离 < `keepR` 时后退；windup 结束时调用 `world.shoot` 发箭而非近战
    - shield：`en.takeHit` 被包装——攻击来向在正面 `guardAngle` 内伤害无效（返回 false）
    - berserker：hp < maxHp/2 后速度变 `rageSpeed`

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/enemy.test.js`:
```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/data/enemies.js`:
```js
const ENEMIES = {
  soldier:   { hp: 30, speed: 55, atk: 8,  r: 12, aggroR: 150, attackR: 26,  attackCd: 1.0, coin: 6 },
  archer:    { hp: 20, speed: 45, atk: 6,  r: 11, aggroR: 220, attackR: 180, keepR: 120, attackCd: 1.6, coin: 8, arrowSpeed: 220 },
  shield:    { hp: 45, speed: 40, atk: 10, r: 13, aggroR: 150, attackR: 28,  attackCd: 1.2, coin: 10, guardAngle: Math.PI / 2 },
  berserker: { hp: 40, speed: 50, atk: 12, r: 13, aggroR: 180, attackR: 26,  attackCd: 0.9, coin: 12, rageSpeed: 95 },
};
module.exports = { ENEMIES };
```

`minigame-jiandao/src/entities/enemy.js`:
```js
const { makeEntity } = require('./entity');
const { angleDiff } = require('../core/collision');
const { ENEMIES } = require('../data/enemies');

const WINDUP = 0.35;

function createEnemy(type, x, y) {
  const cfg = ENEMIES[type];
  const en = makeEntity({ x, y, r: cfg.r, hp: cfg.hp, speed: cfg.speed });
  en.type = type;
  en.coin = cfg.coin;
  en.state = 'patrol';
  en.pendingHit = null;
  en._t = 0;           // 当前状态计时
  en._patrolDir = Math.random() * Math.PI * 2;
  en._spawnX = x; en._spawnY = y;

  en.currentSpeed = () =>
    (type === 'berserker' && en.hp < en.maxHp / 2) ? cfg.rageSpeed : cfg.speed;

  if (type === 'shield') {
    const baseTakeHit = en.takeHit;
    // hitDir: 攻击飞行方向（攻击者朝向）。攻击者位于 facing 前方时格挡。
    en.takeHit = (dmg, kx, ky, hitDir = en.facing + Math.PI) => {
      const fromDir = hitDir + Math.PI; // 攻击者相对盾兵的方位
      if (Math.abs(angleDiff(fromDir, en.facing)) <= cfg.guardAngle / 2) return false;
      return baseTakeHit(dmg, kx, ky);
    };
  }

  en.update = (dt, world) => {
    if (en.dead) return;
    en.applyKnockback(dt);
    const p = world.player;
    const dx = p.x - en.x, dy = p.y - en.y;
    const dist = Math.hypot(dx, dy);
    const toPlayer = Math.atan2(dy, dx);
    en._t -= dt;

    switch (en.state) {
      case 'patrol': {
        if (dist <= cfg.aggroR) { en.state = 'chase'; break; }
        if (en._t <= 0) { en._patrolDir = Math.random() * Math.PI * 2; en._t = 1 + Math.random(); }
        const s = cfg.speed * 0.4 * dt;
        en.moveWithWalls(Math.cos(en._patrolDir) * s, Math.sin(en._patrolDir) * s, world.walls, world.mapW, world.mapH);
        break;
      }
      case 'chase': {
        en.facing = toPlayer;
        if (dist <= cfg.attackR && (!cfg.keepR || dist >= cfg.keepR)) {
          en.state = 'windup'; en._t = WINDUP; break;
        }
        let dir = toPlayer;
        if (cfg.keepR && dist < cfg.keepR) dir = toPlayer + Math.PI; // 弓箭手拉开距离
        const s = en.currentSpeed() * dt;
        en.moveWithWalls(Math.cos(dir) * s, Math.sin(dir) * s, world.walls, world.mapW, world.mapH);
        break;
      }
      case 'windup': {
        en.facing = toPlayer;
        if (en._t <= 0) {
          if (type === 'archer') {
            world.shoot(en.x, en.y, toPlayer, cfg.atk, cfg.arrowSpeed);
          } else {
            en.pendingHit = { dmg: cfg.atk };
          }
          en.state = 'recover'; en._t = cfg.attackCd;
        }
        break;
      }
      case 'recover': {
        if (en._t <= 0) en.state = 'chase';
        break;
      }
    }
  };
  return en;
}
module.exports = { createEnemy, WINDUP };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/data/enemies.js minigame-jiandao/src/entities/enemy.js minigame-jiandao/tests/enemy.test.js
git commit -m "feat: 四种敌人AI状态机（敌兵/弓箭手/盾兵/狂战士）"
```

---

### Task 13: 箭矢与金币掉落（对象池）

**Files:**
- Create: `minigame-jiandao/src/entities/projectile.js`
- Create: `minigame-jiandao/src/entities/pickup.js`
- Test: `minigame-jiandao/tests/projectile_pickup.test.js`

**Interfaces:**
- Consumes: Task 10 `createPool`、Task 2 `circleHit/circleRect`
- Produces:
  - `createProjectiles()->{spawn(x,y,dir,dmg,speed), update(dt, world, onHitPlayer(dmg,dir)), forEach(fn), clear()}`——箭命中玩家回调后释放；撞墙/出界释放。world 同 Task 12。
  - `createPickups()->{spawnCoins(x,y,total), update(dt, player, onCollect(value)), forEach(fn), clear()}`——total 拆成若干枚金币散开；60px 磁吸加速，20px 内拾取。

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/projectile_pickup.test.js`:
```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/entities/projectile.js`:
```js
const { createPool } = require('../core/pool');
const { circleHit, circleRect } = require('../core/collision');

function createProjectiles() {
  const pool = createPool(() => ({ x: 0, y: 0, vx: 0, vy: 0, dir: 0, dmg: 0, r: 4 }));
  return {
    spawn(x, y, dir, dmg, speed) {
      const a = pool.obtain();
      a.x = x; a.y = y; a.dir = dir; a.dmg = dmg;
      a.vx = Math.cos(dir) * speed; a.vy = Math.sin(dir) * speed;
    },
    update(dt, world, onHitPlayer) {
      pool.forEach((a) => {
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < 0 || a.x > world.mapW || a.y < 0 || a.y > world.mapH) { pool.free(a); return; }
        for (const w of world.walls) {
          if (circleRect(a.x, a.y, a.r, w.x, w.y, w.w, w.h)) { pool.free(a); return; }
        }
        const p = world.player;
        if (!p.dead && circleHit(a.x, a.y, a.r, p.x, p.y, p.r)) {
          onHitPlayer(a.dmg, a.dir);
          pool.free(a);
        }
      });
    },
    forEach(fn) { pool.forEach(fn); },
    clear() { pool.clear(); },
  };
}
module.exports = { createProjectiles };
```

`minigame-jiandao/src/entities/pickup.js`:
```js
const { createPool } = require('../core/pool');
const { circleHit } = require('../core/collision');

const MAGNET_R = 60;
const PICK_R = 20;
const COIN_VALUE = 6;

function createPickups() {
  const pool = createPool(() => ({ x: 0, y: 0, vx: 0, vy: 0, value: 0 }));
  return {
    spawnCoins(x, y, total) {
      let left = total;
      while (left > 0) {
        const v = Math.min(COIN_VALUE, left);
        left -= v;
        const c = pool.obtain();
        const ang = Math.random() * Math.PI * 2;
        c.x = x; c.y = y; c.value = v;
        c.vx = Math.cos(ang) * 60; c.vy = Math.sin(ang) * 60; // 散开
      }
    },
    update(dt, player, onCollect) {
      pool.forEach((c) => {
        const dx = player.x - c.x, dy = player.y - c.y;
        const d = Math.hypot(dx, dy);
        if (d < MAGNET_R && d > 0) { c.vx = (dx / d) * 240; c.vy = (dy / d) * 240; }
        else { c.vx *= Math.max(0, 1 - dt * 4); c.vy *= Math.max(0, 1 - dt * 4); }
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (circleHit(c.x, c.y, PICK_R, player.x, player.y, player.r)) {
          onCollect(c.value);
          pool.free(c);
        }
      });
    },
    forEach(fn) { pool.forEach(fn); },
    clear() { pool.clear(); },
  };
}
module.exports = { createPickups };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/entities/projectile.js minigame-jiandao/src/entities/pickup.js minigame-jiandao/tests/projectile_pickup.test.js
git commit -m "feat: 箭矢与金币掉落（对象池/磁吸拾取）"
```

---

### Task 14: 八关关卡数据与关卡逻辑

**Files:**
- Create: `minigame-jiandao/src/data/levels.js`
- Create: `minigame-jiandao/src/entities/level.js`
- Test: `minigame-jiandao/tests/level.test.js`

**Interfaces:**
- Produces:
  - `LEVELS`：长度 8 的数组，每项 `{theme:'valley'|'forest'|'castle', w, h, obstacles:[{x,y,w,h}], spawns:[{type, x, y}], playerStart:{x,y}, exit:{x,y}, boss?: 'warlord'|'blackknight'}`
  - `createLevelState(cfg)->{enemiesLeft, noteSpawn(n), noteDeath(), exitOpen()->bool, atExit(player)->bool}`（出口半径 26）
- 同屏敌人上限 12 由关卡配置本身保证（单关敌人 ≤ 10），无需运行时延迟激活（YAGNI：首版关卡规模用不到）。

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/level.test.js`:
```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/data/levels.js`:
```js
// 地图约定：竖长房间，玩家从下方出生，出口在上方。obstacles 是不可通行矩形。
const LEVELS = [
  { // L1 山谷：教学关，3 敌兵
    theme: 'valley', w: 750, h: 1000,
    obstacles: [{ x: 200, y: 400, w: 120, h: 40 }, { x: 450, y: 620, w: 120, h: 40 }],
    spawns: [
      { type: 'soldier', x: 300, y: 620 }, { type: 'soldier', x: 480, y: 430 },
      { type: 'soldier', x: 370, y: 250 },
    ],
    playerStart: { x: 375, y: 900 }, exit: { x: 375, y: 80 },
  },
  { // L2 山谷：引入弓箭手
    theme: 'valley', w: 750, h: 1100,
    obstacles: [{ x: 120, y: 350, w: 160, h: 40 }, { x: 470, y: 550, w: 160, h: 40 }, { x: 280, y: 780, w: 180, h: 40 }],
    spawns: [
      { type: 'soldier', x: 200, y: 700 }, { type: 'soldier', x: 550, y: 700 },
      { type: 'soldier', x: 375, y: 470 }, { type: 'soldier', x: 200, y: 280 },
      { type: 'archer', x: 550, y: 250 },
    ],
    playerStart: { x: 375, y: 1000 }, exit: { x: 375, y: 80 },
  },
  { // L3 森林：引入盾兵
    theme: 'forest', w: 800, h: 1100,
    obstacles: [{ x: 100, y: 300, w: 60, h: 220 }, { x: 640, y: 300, w: 60, h: 220 }, { x: 320, y: 600, w: 160, h: 60 }],
    spawns: [
      { type: 'soldier', x: 250, y: 750 }, { type: 'soldier', x: 550, y: 750 },
      { type: 'soldier', x: 400, y: 500 }, { type: 'archer', x: 200, y: 250 },
      { type: 'archer', x: 600, y: 250 }, { type: 'shield', x: 400, y: 350 },
    ],
    playerStart: { x: 400, y: 1000 }, exit: { x: 400, y: 80 },
  },
  { // L4 森林 Boss：督军 + 2 护卫
    theme: 'forest', w: 800, h: 1000, boss: 'warlord',
    obstacles: [],
    spawns: [{ type: 'soldier', x: 250, y: 400 }, { type: 'soldier', x: 550, y: 400 }],
    playerStart: { x: 400, y: 900 }, exit: { x: 400, y: 80 },
  },
  { // L5 城堡：引入狂战士
    theme: 'castle', w: 800, h: 1100,
    obstacles: [{ x: 200, y: 400, w: 400, h: 50 }],
    spawns: [
      { type: 'shield', x: 300, y: 700 }, { type: 'shield', x: 500, y: 700 },
      { type: 'archer', x: 250, y: 280 }, { type: 'archer', x: 550, y: 280 },
      { type: 'berserker', x: 400, y: 550 },
    ],
    playerStart: { x: 400, y: 1000 }, exit: { x: 400, y: 80 },
  },
  { // L6 城堡：狂战士群
    theme: 'castle', w: 800, h: 1200,
    obstacles: [{ x: 120, y: 380, w: 200, h: 50 }, { x: 480, y: 380, w: 200, h: 50 }, { x: 300, y: 750, w: 200, h: 50 }],
    spawns: [
      { type: 'berserker', x: 250, y: 900 }, { type: 'berserker', x: 550, y: 900 },
      { type: 'berserker', x: 400, y: 600 }, { type: 'shield', x: 300, y: 300 },
      { type: 'shield', x: 500, y: 300 }, { type: 'archer', x: 400, y: 180 },
      { type: 'archer', x: 150, y: 550 },
    ],
    playerStart: { x: 400, y: 1100 }, exit: { x: 400, y: 80 },
  },
  { // L7 城堡：大混战
    theme: 'castle', w: 850, h: 1300,
    obstacles: [{ x: 150, y: 450, w: 120, h: 120 }, { x: 580, y: 450, w: 120, h: 120 }, { x: 360, y: 850, w: 130, h: 120 }],
    spawns: [
      { type: 'soldier', x: 250, y: 1000 }, { type: 'soldier', x: 600, y: 1000 },
      { type: 'shield', x: 300, y: 650 }, { type: 'shield', x: 550, y: 650 },
      { type: 'berserker', x: 425, y: 500 }, { type: 'berserker', x: 200, y: 300 },
      { type: 'archer', x: 425, y: 200 }, { type: 'archer', x: 650, y: 300 },
    ],
    playerStart: { x: 425, y: 1200 }, exit: { x: 425, y: 80 },
  },
  { // L8 城堡 Boss：黑骑士单挑
    theme: 'castle', w: 800, h: 1000, boss: 'blackknight',
    obstacles: [],
    spawns: [],
    playerStart: { x: 400, y: 900 }, exit: { x: 400, y: 80 },
  },
];
module.exports = { LEVELS };
```

`minigame-jiandao/src/entities/level.js`:
```js
const { circleHit } = require('../core/collision');

const EXIT_R = 26;

function createLevelState(cfg) {
  let left = 0;
  return {
    get enemiesLeft() { return left; },
    noteSpawn(n) { left += n; },
    noteDeath() { left = Math.max(0, left - 1); },
    exitOpen() { return left === 0; },
    atExit(player) {
      if (left !== 0) return false;
      return circleHit(cfg.exit.x, cfg.exit.y, EXIT_R, player.x, player.y, player.r);
    },
  };
}
module.exports = { createLevelState, EXIT_R };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/data/levels.js minigame-jiandao/src/entities/level.js minigame-jiandao/tests/level.test.js
git commit -m "feat: 八关关卡配置与清场开门逻辑"
```

---

### Task 15: 两个 Boss（督军 / 黑骑士）

**Files:**
- Create: `minigame-jiandao/src/entities/boss.js`
- Test: `minigame-jiandao/tests/boss.test.js`

**Interfaces:**
- Consumes: Task 10 `makeEntity`、Task 2 `inSector`
- Produces: `createBoss(kind, x, y)->b`（kind: `'warlord'|'blackknight'`）：
  - 字段：`b.kind, b.state('idle'|'telegraph'|'strike'|'recover'), b.currentSkill('sweep'|'charge'|'volley'|null), b.telegraphT, b.coin`
  - `b.update(dt, world)`（world 同 Task 12，黑骑士用 `world.shoot` 放八向箭）
  - `b.pendingHit = {dmg, kind:'sweep'|'charge'}` 由战斗场景结算：sweep 用 `inSector(b.x,b.y,b.facing, 90, 3*Math.PI/4, p.x,p.y,p.r)` 判定，场景结算后置 null；charge 用身体碰撞判定（场景做 circleHit），在 strike 状态持续存在、strike 结束时由 Boss 自行清除（玩家受击无敌帧防止多段伤害）
  - `b.phase()->1|2|3`（黑骑士按 hp/maxHp > 2/3、> 1/3、其余分段；督军恒为 1）
  - `b._rng`：可注入的随机函数（默认 `Math.random`），测试用它强制技能选择
  - 数值：warlord hp 260 / sweep dmg 18 / charge dmg 15 / coin 80；blackknight hp 520 / dmg 20/16 / coin 200；telegraph 0.6s（黑骑士 3 阶段 0.45s）；recover 0.8s（黑骑士 3 阶段 0.5s）

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/boss.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { createBoss } = require('../src/entities/boss');

function world(px, py) {
  const shots = [];
  return { player: { x: px, y: py, r: 13, dead: false }, walls: [], mapW: 800, mapH: 1000,
           shoot(x, y, dir, dmg, speed) { shots.push({ dir }); }, shots };
}
function step(b, w, t) { for (let i = 0; i < Math.round(t / (1 / 60)); i++) b.update(1 / 60, w); }

test('先前摇再出伤害：telegraph 期间无 pendingHit', () => {
  const b = createBoss('warlord', 400, 400);
  b._rng = () => 0; // 强制选 sweep
  const w = world(430, 400);
  b.update(1 / 60, w);
  assert.strictEqual(b.state, 'telegraph');
  assert.strictEqual(b.currentSkill, 'sweep');
  step(b, w, 0.3);
  assert.ok(!b.pendingHit); // 前摇中
  step(b, w, 0.4); // 前摇 0.6s 结束
  assert.ok(b.pendingHit);
  assert.strictEqual(b.pendingHit.dmg, 18);
  assert.strictEqual(b.pendingHit.kind, 'sweep');
});

test('督军冲锋：位置向玩家方向大幅位移', () => {
  const b = createBoss('warlord', 400, 700);
  b._rng = () => 0.9; // 强制选 charge
  const w = world(400, 200);
  step(b, w, 0.7); // 进入 strike
  const y0 = b.y;
  step(b, w, 0.5);
  assert.ok(y0 - b.y > 100); // 向上冲了一大段
});

test('黑骑士阶段按血量切换', () => {
  const b = createBoss('blackknight', 400, 400);
  assert.strictEqual(b.phase(), 1);
  b.hp = b.maxHp * 0.5;
  assert.strictEqual(b.phase(), 2);
  b.hp = b.maxHp * 0.2;
  assert.strictEqual(b.phase(), 3);
});

test('黑骑士2阶段起解锁八向箭雨', () => {
  const b = createBoss('blackknight', 400, 400);
  b.hp = b.maxHp * 0.5; // 2 阶段
  b._rng = () => 0.99;  // 强制选 volley
  const w = world(400, 200);
  step(b, w, 1.2);
  assert.strictEqual(w.shots.length, 8);
});

test('督军永远不会放箭雨', () => {
  const b = createBoss('warlord', 400, 400);
  b._rng = () => 0.99;
  const w = world(430, 400);
  step(b, w, 2);
  assert.strictEqual(w.shots.length, 0);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/entities/boss.js`:
```js
const { makeEntity } = require('./entity');

const CONFIG = {
  warlord: {
    hp: 260, r: 22, speed: 60, coin: 80,
    telegraph: 0.6, recover: 0.8,
    skills: { sweep: { dmg: 18 }, charge: { dmg: 15, dist: 320, time: 0.45 } },
  },
  blackknight: {
    hp: 520, r: 24, speed: 70, coin: 200,
    telegraph: 0.6, recover: 0.8, telegraphP3: 0.45, recoverP3: 0.5,
    skills: { sweep: { dmg: 20 }, charge: { dmg: 16, dist: 360, time: 0.4 }, volley: { dmg: 8, speed: 200 } },
  },
};

function createBoss(kind, x, y) {
  const cfg = CONFIG[kind];
  const b = makeEntity({ x, y, r: cfg.r, hp: cfg.hp, speed: cfg.speed });
  b.kind = kind;
  b.coin = cfg.coin;
  b.state = 'idle';
  b.currentSkill = null;
  b.pendingHit = null;
  b.telegraphT = 0;
  b._t = 0;
  b._rng = Math.random;
  b._chargeVx = 0; b._chargeVy = 0;

  b.phase = () => {
    if (kind !== 'blackknight') return 1;
    const ratio = b.hp / b.maxHp;
    if (ratio > 2 / 3) return 1;
    if (ratio > 1 / 3) return 2;
    return 3;
  };

  function pickSkill() {
    const canVolley = kind === 'blackknight' && b.phase() >= 2;
    const roll = b._rng();
    if (canVolley && roll > 0.66) return 'volley';
    return roll > 0.5 ? 'charge' : 'sweep';
  }
  function telegraphTime() { return (kind === 'blackknight' && b.phase() === 3) ? cfg.telegraphP3 : cfg.telegraph; }
  function recoverTime() { return (kind === 'blackknight' && b.phase() === 3) ? cfg.recoverP3 : cfg.recover; }

  b.update = (dt, world) => {
    if (b.dead) return;
    b.applyKnockback(dt);
    const p = world.player;
    const toPlayer = Math.atan2(p.y - b.y, p.x - b.x);
    b._t -= dt;

    switch (b.state) {
      case 'idle': {
        b.facing = toPlayer;
        const dist = Math.hypot(p.x - b.x, p.y - b.y);
        if (dist > 90) {
          const s = cfg.speed * dt;
          b.moveWithWalls(Math.cos(toPlayer) * s, Math.sin(toPlayer) * s, world.walls, world.mapW, world.mapH);
        }
        b.currentSkill = pickSkill();
        b.state = 'telegraph';
        b._t = telegraphTime();
        b.telegraphT = b._t;
        break;
      }
      case 'telegraph': {
        b.telegraphT = Math.max(0, b._t);
        if (b.currentSkill !== 'charge') b.facing = toPlayer; // 冲锋方向在前摇时锁定
        if (b._t <= 0) {
          if (b.currentSkill === 'sweep') {
            b.pendingHit = { dmg: cfg.skills.sweep.dmg, kind: 'sweep' };
            b.state = 'recover'; b._t = recoverTime();
          } else if (b.currentSkill === 'charge') {
            const sk = cfg.skills.charge;
            const speed = sk.dist / sk.time;
            b._chargeVx = Math.cos(b.facing) * speed;
            b._chargeVy = Math.sin(b.facing) * speed;
            b.state = 'strike'; b._t = sk.time;
          } else { // volley：八向箭
            for (let i = 0; i < 8; i++) {
              world.shoot(b.x, b.y, (Math.PI / 4) * i, cfg.skills.volley.dmg, cfg.skills.volley.speed);
            }
            b.state = 'recover'; b._t = recoverTime();
          }
        }
        break;
      }
      case 'strike': { // 仅 charge 使用
        b.moveWithWalls(b._chargeVx * dt, b._chargeVy * dt, world.walls, world.mapW, world.mapH);
        b.pendingHit = { dmg: cfg.skills.charge.dmg, kind: 'charge' };
        if (b._t <= 0) { b.pendingHit = null; b.state = 'recover'; b._t = recoverTime(); }
        break;
      }
      case 'recover': {
        // sweep 的 pendingHit 由战斗场景消费后置 null，此处不清除
        if (b._t <= 0) { b.state = 'idle'; b.currentSkill = null; }
        break;
      }
    }
  };
  return b;
}
module.exports = { createBoss };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/entities/boss.js minigame-jiandao/tests/boss.test.js
git commit -m "feat: 督军与黑骑士Boss（前摇提示/三阶段）"
```

---

### Task 16: 广告点位流程（复活/双倍/折扣）

**Files:**
- Create: `minigame-jiandao/src/flow/adgates.js`
- Test: `minigame-jiandao/tests/adgates.test.js`

**Interfaces:**
- Consumes: platform 的 `ads.showRewarded()->Promise<boolean>`；Task 5 GameState 的 `discountLeft/useDiscount`
- Produces:
  - `tryRevive(ads, usedThisLevel)->Promise<'revived'|'failed'|'unavailable'>`
  - `tryDouble(ads, coins)->Promise<int>`（成功翻倍，失败原样返回）
  - `tryDiscount(ads, state, today)->Promise<boolean>`（无次数或广告失败返回 false，且不消耗次数）
- 降级原则（设计文档）：广告失败绝不卡流程、绝不消耗玩家资源。

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/adgates.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { tryRevive, tryDouble, tryDiscount } = require('../src/flow/adgates');
const { createGameState } = require('../src/state');
const { createStore } = require('../src/core/storage');

const adsOk = { showRewarded: () => Promise.resolve(true) };
const adsFail = { showRewarded: () => Promise.resolve(false) };
function newState() {
  const mem = new Map();
  return createGameState(createStore({ get: (k) => mem.get(k) || null, set: (k, v) => mem.set(k, v) }));
}

test('复活：看完发奖/失败降级/每关一次', async () => {
  assert.strictEqual(await tryRevive(adsOk, false), 'revived');
  assert.strictEqual(await tryRevive(adsFail, false), 'failed');
  assert.strictEqual(await tryRevive(adsOk, true), 'unavailable');
});

test('双倍：成功翻倍，失败原样', async () => {
  assert.strictEqual(await tryDouble(adsOk, 50), 100);
  assert.strictEqual(await tryDouble(adsFail, 50), 50);
});

test('折扣：成功消耗次数，广告失败不消耗，次数用尽拒绝', async () => {
  const gs = newState();
  assert.strictEqual(await tryDiscount(adsOk, gs, '2026-07-03'), true);
  assert.strictEqual(gs.discountLeft('2026-07-03'), 2);
  assert.strictEqual(await tryDiscount(adsFail, gs, '2026-07-03'), false);
  assert.strictEqual(gs.discountLeft('2026-07-03'), 2); // 失败不消耗
  await tryDiscount(adsOk, gs, '2026-07-03');
  await tryDiscount(adsOk, gs, '2026-07-03');
  assert.strictEqual(await tryDiscount(adsOk, gs, '2026-07-03'), false); // 用尽
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/flow/adgates.js`:
```js
async function tryRevive(ads, usedThisLevel) {
  if (usedThisLevel) return 'unavailable';
  const ok = await ads.showRewarded();
  return ok ? 'revived' : 'failed';
}

async function tryDouble(ads, coins) {
  const ok = await ads.showRewarded();
  return ok ? coins * 2 : coins;
}

async function tryDiscount(ads, state, today) {
  if (state.discountLeft(today) <= 0) return false;
  const ok = await ads.showRewarded();
  if (!ok) return false; // 广告失败不消耗次数
  return state.useDiscount(today);
}

module.exports = { tryRevive, tryDouble, tryDiscount };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/flow/adgates.js minigame-jiandao/tests/adgates.test.js
git commit -m "feat: 三个激励视频广告点位（失败降级）"
```

---

### Task 17: 场景管理器与 UI 工具

**Files:**
- Create: `minigame-jiandao/src/core/scenes.js`
- Create: `minigame-jiandao/src/ui/hud.js`
- Test: `minigame-jiandao/tests/scenes_hud.test.js`

**Interfaces:**
- Produces:
  - `createSceneManager()->{register(name, scene), go(name, params), update(dt), render(ctx), tap(x, y)}`。scene 接口：`{enter(params), exit(), update(dt), render(ctx), onTap(x,y)}`（全部可选）。`go` 先调旧场景 `exit` 再调新场景 `enter(params)`。
  - `hitButton(buttons, x, y)->id|null`：buttons 为 `[{id, x, y, w, h}]` 矩形，命中返回 id
  - 绘制工具（渲染，人工验证）：`drawBar(ctx,x,y,w,h,ratio,fg,bg)`、`drawTextC(ctx,text,x,y,size,color)`（居中文本）、`drawBtn(ctx,btn,label,enabled)`、`drawJoystick(ctx,joy)`、`drawActionButtons(ctx,buttons,dashReady)`
- 后续场景（Task 18/19）全部通过 `go(name, params)` 流转：`'menu' | 'levelselect' | 'battle' | 'result'`。

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/scenes_hud.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { createSceneManager } = require('../src/core/scenes');
const { hitButton } = require('../src/ui/hud');

test('go 触发 exit/enter 并携带参数', () => {
  const sm = createSceneManager();
  const log = [];
  sm.register('a', { enter: () => log.push('a.enter'), exit: () => log.push('a.exit') });
  sm.register('b', { enter: (p) => log.push('b.enter:' + p.n) });
  sm.go('a');
  sm.go('b', { n: 7 });
  assert.deepStrictEqual(log, ['a.enter', 'a.exit', 'b.enter:7']);
});

test('update/tap 路由到当前场景', () => {
  const sm = createSceneManager();
  let u = 0, tapped = null;
  sm.register('a', { update: () => u++, onTap: (x, y) => { tapped = [x, y]; } });
  sm.go('a');
  sm.update(1 / 60);
  sm.tap(5, 6);
  assert.strictEqual(u, 1);
  assert.deepStrictEqual(tapped, [5, 6]);
});

test('hitButton 矩形命中', () => {
  const btns = [{ id: 'ok', x: 100, y: 200, w: 80, h: 40 }];
  assert.strictEqual(hitButton(btns, 140, 220), 'ok');
  assert.strictEqual(hitButton(btns, 90, 220), null);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/core/scenes.js`:
```js
function createSceneManager() {
  const scenes = {};
  let current = null;
  return {
    register(name, scene) { scenes[name] = scene; },
    go(name, params = {}) {
      if (current && current.exit) current.exit();
      current = scenes[name];
      if (current.enter) current.enter(params);
    },
    update(dt) { if (current && current.update) current.update(dt); },
    render(ctx) { if (current && current.render) current.render(ctx); },
    tap(x, y) { if (current && current.onTap) current.onTap(x, y); },
  };
}
module.exports = { createSceneManager };
```

`minigame-jiandao/src/ui/hud.js`:
```js
function hitButton(buttons, x, y) {
  for (const b of buttons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
  }
  return null;
}

function drawBar(ctx, x, y, w, h, ratio, fg, bg) {
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fg; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
}

function drawTextC(ctx, text, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = 'bold ' + size + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function drawBtn(ctx, btn, label, enabled = true) {
  ctx.fillStyle = enabled ? '#8b5a2b' : '#555';
  ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
  ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 3;
  ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
  drawTextC(ctx, label, btn.x + btn.w / 2, btn.y + btn.h / 2, 16, enabled ? '#fff' : '#999');
}

function drawJoystick(ctx, joy) {
  if (!joy.active) return;
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(joy.baseX, joy.baseY, 44, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(joy.baseX + joy.dx * 30 * joy.mag, joy.baseY + joy.dy * 30 * joy.mag, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawActionButtons(ctx, buttons, dashReady) {
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#c0392b';
  ctx.beginPath(); ctx.arc(buttons.attack.x, buttons.attack.y, buttons.attack.r, 0, Math.PI * 2); ctx.fill();
  drawTextC(ctx, '攻', buttons.attack.x, buttons.attack.y, 22, '#fff');
  ctx.fillStyle = dashReady ? '#2980b9' : '#555';
  ctx.beginPath(); ctx.arc(buttons.dash.x, buttons.dash.y, buttons.dash.r, 0, Math.PI * 2); ctx.fill();
  drawTextC(ctx, '闪', buttons.dash.x, buttons.dash.y, 16, '#fff');
  ctx.globalAlpha = 1;
}

module.exports = { hitButton, drawBar, drawTextC, drawBtn, drawJoystick, drawActionButtons };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/core/scenes.js minigame-jiandao/src/ui/hud.js minigame-jiandao/tests/scenes_hud.test.js
git commit -m "feat: 场景管理器与HUD绘制工具"
```

---

### Task 18: 四个场景 + main.js + game.js 接线

**Files:**
- Create: `minigame-jiandao/src/scenes/menu.js`
- Create: `minigame-jiandao/src/scenes/levelselect.js`
- Create: `minigame-jiandao/src/scenes/battle.js`
- Create: `minigame-jiandao/src/scenes/result.js`
- Create: `minigame-jiandao/src/main.js`
- Modify: `minigame-jiandao/game.js`
- Test: `minigame-jiandao/tests/battle_logic.test.js`

**Interfaces:**
- Consumes: 前面所有任务的产出
- Produces: 每个场景工厂签名统一为 `createXxxScene(deps)`，deps = `{platform, gs, input, view: {w, h}, go(name, params)}`。battle 额外导出纯函数 `resolveSwing(swing, player, enemies)->击杀数`（把挥剑判定抽出来便于测试）。`main.js` 导出 `start()`。
- 与设计文档的偏差说明：设计中的「加载场景」省略——首版图形为程序绘制、无图片资源需要预载，音效由平台层惰性加载，游戏启动即达主菜单（加载页反而增加白屏时间）。v1.1 引入精灵图时再补加载场景。
- 主题底色：valley `#7a8c5a`、forest `#3e5a3e`、castle `#5a5a6a`。

- [ ] **Step 1: 写失败测试（挥剑结算纯函数）**

`minigame-jiandao/tests/battle_logic.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { resolveSwing } = require('../src/scenes/battle');
const { createPlayer } = require('../src/entities/player');
const { createEnemy } = require('../src/entities/enemy');

test('扇形内敌人受伤，扇形外不受伤，死亡计数', () => {
  const p = createPlayer({ atk: 100, maxHp: 50, dashCd: 2, dashDist: 90, x: 100, y: 100 });
  p.facing = 0; // 朝右
  const inside = createEnemy('soldier', 140, 100);   // 正前方 40px
  const outside = createEnemy('soldier', 100, 200);  // 正下方 100px（超半径60）
  const swing = p.tryAttack();
  const kills = resolveSwing(swing, p, [inside, outside]);
  assert.ok(inside.dead);          // 100 攻秒杀 30 血
  assert.ok(!outside.dead);
  assert.strictEqual(outside.hp, outside.maxHp);
  assert.strictEqual(kills, 1);
});

test('盾兵被正面挥剑格挡', () => {
  const p = createPlayer({ atk: 100, maxHp: 50, dashCd: 2, dashDist: 90, x: 100, y: 100 });
  p.facing = 0;
  const sh = createEnemy('shield', 140, 100);
  sh.facing = Math.PI; // 面朝玩家 = 玩家在其正面
  resolveSwing(p.tryAttack(), p, [sh]);
  assert.strictEqual(sh.hp, sh.maxHp); // 格挡
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现四个场景与入口**

`minigame-jiandao/src/scenes/battle.js`:
```js
const { LEVELS } = require('../data/levels');
const { createLevelState, EXIT_R } = require('../entities/level');
const { createPlayer } = require('../entities/player');
const { createEnemy } = require('../entities/enemy');
const { createBoss } = require('../entities/boss');
const { createProjectiles } = require('../entities/projectile');
const { createPickups } = require('../entities/pickup');
const { createCamera } = require('../core/camera');
const { inSector, circleHit } = require('../core/collision');
const { attackOf, maxHpOf, dashCooldownOf, dashDistOf } = require('../data/upgrades');
const { tryRevive } = require('../flow/adgates');
const hud = require('../ui/hud');

const THEME_BG = { valley: '#7a8c5a', forest: '#3e5a3e', castle: '#5a5a6a' };

// 挥剑结算：对扇形内每个敌人造成伤害与击退，返回击杀数
function resolveSwing(swing, player, enemies) {
  let kills = 0;
  for (const en of enemies) {
    if (en.dead) continue;
    if (!inSector(player.x, player.y, swing.dir, swing.radius, swing.halfAngle, en.x, en.y, en.r)) continue;
    const wasDead = en.dead;
    en.takeHit(swing.dmg, Math.cos(swing.dir) * swing.knock, Math.sin(swing.dir) * swing.knock, swing.dir);
    if (!wasDead && en.dead) kills++;
  }
  return kills;
}

function createBattleScene(deps) {
  const { platform, gs, input, view, go } = deps;
  let s = null; // 每次 enter 重建的局内状态

  function spawnAll(cfg) {
    const list = cfg.spawns.map((sp) => createEnemy(sp.type, sp.x, sp.y));
    if (cfg.boss) list.push(createBoss(cfg.boss, cfg.w / 2, 250));
    return list;
  }

  return {
    enter({ levelIndex }) {
      const cfg = LEVELS[levelIndex];
      const enemies = spawnAll(cfg);
      const level = createLevelState(cfg);
      level.noteSpawn(enemies.length); // 含 Boss，清空才开门
      s = {
        levelIndex, cfg, enemies,
        level,
        player: createPlayer({
          atk: attackOf(gs.levelOf('weapon')),
          maxHp: maxHpOf(gs.levelOf('armor')),
          dashCd: dashCooldownOf(gs.levelOf('dash')),
          dashDist: dashDistOf(gs.levelOf('dash')),
          x: cfg.playerStart.x, y: cfg.playerStart.y,
        }),
        projectiles: createProjectiles(),
        pickups: createPickups(),
        camera: createCamera(view.w, view.h),
        earned: 0, reviveUsed: false, phase: 'playing', adBusy: false,
        deadButtons: [
          { id: 'revive', x: view.w / 2 - 110, y: view.h / 2, w: 220, h: 52 },
          { id: 'giveup', x: view.w / 2 - 110, y: view.h / 2 + 70, w: 220, h: 44 },
        ],
      };
      platform.recorder.start();
    },
    exit() { platform.recorder.stop(); s = null; },

    update(dt) {
      if (!s || s.phase !== 'playing') return;
      const { player, enemies, cfg } = s;
      const world = {
        player, walls: cfg.obstacles, mapW: cfg.w, mapH: cfg.h,
        shoot: (x, y, dir, dmg, speed) => s.projectiles.spawn(x, y, dir, dmg, speed),
      };

      // 输入
      for (const ev of input.consume()) {
        if (ev === 'attack') {
          const swing = player.tryAttack();
          if (swing) {
            platform.audio.play('attack');
            const before = s.enemies.filter((e) => !e.dead).length;
            resolveSwing(swing, player, s.enemies);
            const after = s.enemies.filter((e) => !e.dead).length;
            for (let i = 0; i < before - after; i++) s.level.noteDeath();
            if (before > after) { platform.audio.play('hit'); s.camera.shake(3, 0.1); }
            // 击杀掉金币
            for (const en of s.enemies) {
              if (en.dead && !en._looted) { en._looted = true; s.pickups.spawnCoins(en.x, en.y, en.coin); }
            }
          }
        } else if (ev === 'dash') {
          const dx = input.joy.mag > 0 ? input.joy.dx : Math.cos(player.facing);
          const dy = input.joy.mag > 0 ? input.joy.dy : Math.sin(player.facing);
          if (player.tryDash(dx, dy)) platform.audio.play('dash');
        }
      }

      player.update(dt, cfg.obstacles, cfg.w, cfg.h,
        input.joy.dx * input.joy.mag, input.joy.dy * input.joy.mag);

      // 敌人与Boss
      for (const en of enemies) {
        if (en.dead) continue;
        en.update(dt, world);
        if (en.pendingHit) {
          let hit = false;
          if (en.pendingHit.kind === 'sweep') {
            hit = inSector(en.x, en.y, en.facing, 90, (3 * Math.PI) / 4, player.x, player.y, player.r);
          } else if (en.pendingHit.kind === 'charge') {
            hit = circleHit(en.x, en.y, en.r, player.x, player.y, player.r);
          } else {
            hit = circleHit(en.x, en.y, en.r + 18, player.x, player.y, player.r); // 近战挥刀
          }
          if (hit) {
            const dir = Math.atan2(player.y - en.y, player.x - en.x);
            if (player.takeHit(en.pendingHit.dmg, Math.cos(dir) * 120, Math.sin(dir) * 120)) {
              platform.audio.play('hurt'); s.camera.shake(5, 0.15);
            }
          }
          if (en.pendingHit.kind !== 'charge') en.pendingHit = null; // 冲锋持续判定
        }
      }

      s.projectiles.update(dt, world, (dmg, dir) => {
        if (player.takeHit(dmg, Math.cos(dir) * 100, Math.sin(dir) * 100)) {
          platform.audio.play('hurt'); s.camera.shake(4, 0.12);
        }
      });
      s.pickups.update(dt, player, (v) => {
        s.earned += v; gs.addCoins(v); platform.audio.play('coin');
      });

      s.camera.follow(player.x, player.y, cfg.w, cfg.h);
      s.camera.update(dt);

      if (player.dead) { s.phase = 'dead'; platform.audio.play('die'); return; }
      if (s.level.atExit(player)) {
        s.phase = 'cleared';
        gs.unlockNext(s.levelIndex + 1);
        go('result', { levelIndex: s.levelIndex, earned: s.earned, isBoss: !!cfg.boss });
      }
    },

    onTap(x, y) {
      if (!s || s.phase !== 'dead' || s.adBusy) return;
      const id = hud.hitButton(s.deadButtons, x, y);
      if (id === 'revive' && !s.reviveUsed) {
        s.adBusy = true;
        tryRevive(platform.ads, s.reviveUsed).then((r) => {
          s.adBusy = false;
          if (r === 'revived') {
            s.reviveUsed = true;
            s.player.dead = false; s.player.hp = s.player.maxHp; s.player.invulnT = 1.5;
            s.phase = 'playing';
          }
          // 'failed'/'unavailable'：停留在死亡界面，玩家可选放弃
        });
      } else if (id === 'giveup') {
        go('levelselect');
      }
    },

    render(ctx) {
      if (!s) return;
      const { cfg, player } = s;
      const ox = s.camera.ox(), oy = s.camera.oy();
      ctx.fillStyle = THEME_BG[cfg.theme];
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.save();
      ctx.translate(-ox, -oy);

      // 障碍
      ctx.fillStyle = '#3a3226';
      for (const o of cfg.obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);
      // 出口
      ctx.fillStyle = s.level.exitOpen() ? '#f1c40f' : '#333';
      ctx.beginPath(); ctx.arc(cfg.exit.x, cfg.exit.y, EXIT_R, 0, Math.PI * 2); ctx.fill();

      // 金币与箭
      ctx.fillStyle = '#f39c12';
      s.pickups.forEach((c) => { ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#ecf0f1';
      s.projectiles.forEach((a) => { ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill(); });

      // 敌人（含前摇提示）
      const COLORS = { soldier: '#b03a2e', archer: '#9b59b6', shield: '#7f8c8d', berserker: '#d35400' };
      for (const en of s.enemies) {
        if (en.dead) continue;
        if (en.state === 'telegraph' || en.state === 'windup') {
          ctx.globalAlpha = 0.3; ctx.fillStyle = '#e74c3c';
          ctx.beginPath(); ctx.arc(en.x, en.y, en.r + 20, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = en.kind ? '#2c3e50' : COLORS[en.type];
        ctx.beginPath(); ctx.arc(en.x, en.y, en.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(en.x, en.y);
        ctx.lineTo(en.x + Math.cos(en.facing) * en.r, en.y + Math.sin(en.facing) * en.r); ctx.stroke();
        hud.drawBar(ctx, en.x - 16, en.y - en.r - 10, 32, 4, en.hp / en.maxHp, '#e74c3c', '#222');
      }

      // 玩家（无敌闪烁）
      if (player.invulnT <= 0 || Math.floor(player.invulnT * 12) % 2 === 0) {
        ctx.fillStyle = '#2980b9';
        ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(player.x, player.y);
        ctx.lineTo(player.x + Math.cos(player.facing) * 20, player.y + Math.sin(player.facing) * 20); ctx.stroke();
      }
      // 挥剑弧线
      if (player.swing) {
        ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(player.x, player.y);
        ctx.arc(player.x, player.y, player.swing.radius,
          player.swing.dir - player.swing.halfAngle, player.swing.dir + player.swing.halfAngle);
        ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.restore();

      // HUD
      hud.drawBar(ctx, 16, 20, 140, 14, player.hp / player.maxHp, '#27ae60', '#222');
      hud.drawTextC(ctx, '金币 ' + gs.data.coins, view.w - 70, 27, 14, '#f1c40f');
      hud.drawTextC(ctx, '第 ' + (s.levelIndex + 1) + ' 关', view.w / 2, 27, 14, '#fff');
      hud.drawJoystick(ctx, input.joy);
      hud.drawActionButtons(ctx, input.buttons, player.dashCdLeft <= 0);

      if (s.phase === 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, view.w, view.h);
        hud.drawTextC(ctx, '你阵亡了', view.w / 2, view.h / 2 - 70, 28, '#e74c3c');
        hud.drawBtn(ctx, s.deadButtons[0], s.reviveUsed ? '本关已复活过' : '看视频原地复活', !s.reviveUsed && !s.adBusy);
        hud.drawBtn(ctx, s.deadButtons[1], '返回选关', !s.adBusy);
      }
    },
  };
}
module.exports = { createBattleScene, resolveSwing };
```

`minigame-jiandao/src/scenes/menu.js`:
```js
const hud = require('../ui/hud');
const { LINES } = require('../data/upgrades');
const { tryDiscount } = require('../flow/adgates');

const LINE_NAMES = { weapon: '武器', armor: '盔甲', dash: '闪避' };

function today() { return new Date().toISOString().slice(0, 10); }

function createMenuScene(deps) {
  const { platform, gs, view, go } = deps;
  let halfNext = false, adBusy = false;
  const rows = ['weapon', 'armor', 'dash'];
  const buttons = [];

  function layout() {
    buttons.length = 0;
    rows.forEach((line, i) => {
      buttons.push({ id: 'buy:' + line, x: view.w - 120, y: 250 + i * 70, w: 96, h: 44 });
    });
    buttons.push({ id: 'discount', x: 24, y: 250 + 3 * 70, w: view.w - 48, h: 44 });
    buttons.push({ id: 'start', x: view.w / 2 - 110, y: view.h - 120, w: 220, h: 60 });
  }

  return {
    enter() { layout(); halfNext = false; },
    onTap(x, y) {
      if (adBusy) return;
      const id = hud.hitButton(buttons, x, y);
      if (!id) return;
      if (id === 'start') { go('levelselect'); return; }
      if (id === 'discount') {
        adBusy = true;
        tryDiscount(platform.ads, gs, today()).then((ok) => { adBusy = false; if (ok) halfNext = true; });
        return;
      }
      const line = id.split(':')[1];
      if (gs.buyUpgrade(line, halfNext)) { halfNext = false; platform.audio.play('coin'); }
    },
    render(ctx) {
      ctx.fillStyle = '#2c2620'; ctx.fillRect(0, 0, view.w, view.h);
      hud.drawTextC(ctx, '剑 道', view.w / 2, 100, 44, '#f1c40f');
      hud.drawTextC(ctx, '铁匠铺', view.w / 2, 200, 20, '#fff');
      hud.drawTextC(ctx, '金币 ' + gs.data.coins, view.w / 2, 160, 16, '#f1c40f');
      rows.forEach((line, i) => {
        const lv = gs.levelOf(line), max = LINES[line].max;
        const y = 250 + i * 70;
        hud.drawTextC(ctx, LINE_NAMES[line] + ' Lv.' + lv + '/' + max, 90, y + 22, 16, '#fff');
        const btn = buttons[i];
        if (lv >= max) hud.drawBtn(ctx, btn, '已满级', false);
        else hud.drawBtn(ctx, btn, gs.costOf(line, halfNext) + ' 金币', gs.data.coins >= gs.costOf(line, halfNext));
      });
      const dBtn = buttons[3];
      const left = gs.discountLeft(today());
      hud.drawBtn(ctx, dBtn,
        halfNext ? '下次升级半价已激活' : '看视频获半价 (今日剩' + left + '次)',
        !halfNext && left > 0 && !adBusy);
      hud.drawBtn(ctx, buttons[4], '开始闯关');
    },
  };
}
module.exports = { createMenuScene };
```

`minigame-jiandao/src/scenes/levelselect.js`:
```js
const hud = require('../ui/hud');
const { LEVELS } = require('../data/levels');

const THEME_NAMES = { valley: '山谷', forest: '森林', castle: '城堡' };

function createLevelSelectScene(deps) {
  const { gs, view, go } = deps;
  const buttons = [];

  return {
    enter() {
      buttons.length = 0;
      for (let i = 0; i < 8; i++) {
        const col = i % 2, row = Math.floor(i / 2);
        buttons.push({ id: 'lv:' + i, x: 40 + col * (view.w / 2), y: 140 + row * 110, w: view.w / 2 - 60, h: 84 });
      }
      buttons.push({ id: 'back', x: 24, y: view.h - 70, w: 100, h: 44 });
    },
    onTap(x, y) {
      const id = hud.hitButton(buttons, x, y);
      if (!id) return;
      if (id === 'back') { go('menu'); return; }
      const idx = +id.split(':')[1];
      if (idx + 1 <= gs.data.unlocked) go('battle', { levelIndex: idx });
    },
    render(ctx) {
      ctx.fillStyle = '#2c2620'; ctx.fillRect(0, 0, view.w, view.h);
      hud.drawTextC(ctx, '选择关卡', view.w / 2, 80, 28, '#fff');
      for (let i = 0; i < 8; i++) {
        const b = buttons[i];
        const unlocked = i + 1 <= gs.data.unlocked;
        const cfg = LEVELS[i];
        ctx.fillStyle = unlocked ? '#8b5a2b' : '#444';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        hud.drawTextC(ctx, '第 ' + (i + 1) + ' 关', b.x + b.w / 2, b.y + 26, 18, unlocked ? '#fff' : '#888');
        hud.drawTextC(ctx, THEME_NAMES[cfg.theme] + (cfg.boss ? ' · BOSS' : ''),
          b.x + b.w / 2, b.y + 56, 13, unlocked ? '#f1c40f' : '#777');
      }
      hud.drawBtn(ctx, buttons[8], '返回');
    },
  };
}
module.exports = { createLevelSelectScene };
```

`minigame-jiandao/src/scenes/result.js`:
```js
const hud = require('../ui/hud');
const { tryDouble } = require('../flow/adgates');

function createResultScene(deps) {
  const { platform, gs, view, go } = deps;
  let s = null;

  return {
    enter({ levelIndex, earned, isBoss }) {
      s = {
        levelIndex, earned, isBoss, doubled: false, adBusy: false,
        buttons: [
          { id: 'double', x: view.w / 2 - 110, y: 300, w: 220, h: 52 },
          { id: 'share', x: view.w / 2 - 110, y: 370, w: 220, h: 44 },
          { id: 'next', x: view.w / 2 - 110, y: 440, w: 220, h: 52 },
          { id: 'menu', x: view.w / 2 - 110, y: 510, w: 220, h: 44 },
        ],
      };
    },
    onTap(x, y) {
      if (!s || s.adBusy) return;
      const id = hud.hitButton(s.buttons, x, y);
      if (id === 'double' && !s.doubled) {
        s.adBusy = true;
        tryDouble(platform.ads, s.earned).then((total) => {
          s.adBusy = false;
          if (total > s.earned) { gs.addCoins(total - s.earned); s.earned = total; s.doubled = true; }
        });
      } else if (id === 'share' && s.isBoss) {
        platform.share({ title: '我在《剑道》击败了Boss，第' + (s.levelIndex + 1) + '关通关！', desc: '来试试你的剑道' });
      } else if (id === 'next') {
        if (s.levelIndex + 1 < 8) go('battle', { levelIndex: s.levelIndex + 1 });
        else go('menu');
      } else if (id === 'menu') {
        go('menu');
      }
    },
    render(ctx) {
      if (!s) return;
      ctx.fillStyle = '#2c2620'; ctx.fillRect(0, 0, view.w, view.h);
      hud.drawTextC(ctx, '第 ' + (s.levelIndex + 1) + ' 关 通关！', view.w / 2, 140, 30, '#f1c40f');
      hud.drawTextC(ctx, '本关金币 +' + s.earned, view.w / 2, 220, 20, '#fff');
      hud.drawBtn(ctx, s.buttons[0], s.doubled ? '已翻倍' : '看视频金币翻倍', !s.doubled && !s.adBusy);
      if (s.isBoss) hud.drawBtn(ctx, s.buttons[1], '炫耀战绩', !s.adBusy);
      hud.drawBtn(ctx, s.buttons[2], s.levelIndex + 1 < 8 ? '下一关' : '返回主菜单', !s.adBusy);
      hud.drawBtn(ctx, s.buttons[3], '主菜单', !s.adBusy);
    },
  };
}
module.exports = { createResultScene };
```

`minigame-jiandao/src/main.js`:
```js
const { getPlatform } = require('./platform/index');
const { createStore } = require('./core/storage');
const { createGameState } = require('./state');
const { createInput } = require('./core/input');
const { createLoop } = require('./core/loop');
const { createSceneManager } = require('./core/scenes');
const { createMenuScene } = require('./scenes/menu');
const { createLevelSelectScene } = require('./scenes/levelselect');
const { createBattleScene } = require('./scenes/battle');
const { createResultScene } = require('./scenes/result');

function start() {
  const platform = getPlatform();
  const canvas = platform.createCanvas();
  if (!canvas) { console.log('[jiandao] 无canvas环境（测试模式），跳过启动'); return null; }

  const view = { w: platform.system.width, h: platform.system.height };
  const dpr = platform.system.pixelRatio;
  canvas.width = view.w * dpr;
  canvas.height = view.h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const gs = createGameState(createStore(platform.storage));
  const input = createInput(view.w, view.h);
  const sm = createSceneManager();
  const deps = { platform, gs, input, view, go: (n, p) => sm.go(n, p) };

  sm.register('menu', createMenuScene(deps));
  sm.register('levelselect', createLevelSelectScene(deps));
  sm.register('battle', createBattleScene(deps));
  sm.register('result', createResultScene(deps));

  platform.touch.onStart((ts) => { input.onStart(ts); for (const t of ts) sm.tap(t.x, t.y); });
  platform.touch.onMove((ts) => input.onMove(ts));
  platform.touch.onEnd((ts) => input.onEnd(ts));
  platform.onError((e) => console.error('[jiandao]', e));

  sm.go('menu');
  const loop = createLoop((dt) => sm.update(dt), () => sm.render(ctx));
  loop.start();
  return { sm, gs };
}

module.exports = { start };
```

`minigame-jiandao/game.js`（覆盖原 stub）:
```js
require('./src/main.js').start();
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS（battle_logic 2 个新测试 + 既有测试无回归）

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/scenes minigame-jiandao/src/main.js minigame-jiandao/game.js minigame-jiandao/tests/battle_logic.test.js
git commit -m "feat: 四场景接线与游戏入口（可完整游玩）"
```

---

### Task 19: 浏览器试玩 Harness（键盘模拟触摸）

**Files:**
- Create: `minigame-jiandao/dev/index.html`
- Create: `minigame-jiandao/dev/boot.js`

**Interfaces:**
- Consumes: `createMockPlatform({canvas, width, height})` 与 `touch.emit`；`main.js start()`
- Produces: 本地浏览器完整试玩环境。`dev/` 不进抖音主包（提审前无需删除，开发者工具只按 `game.json` 入口打包，但为保险起见 Task 21 的提审清单里会再确认）。
- 键位映射（仅 dev）：WASD=摇杆、J=攻击、K=闪避、鼠标点击=tap。

- [ ] **Step 1: 实现 harness**

`minigame-jiandao/dev/index.html`:
```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>剑道 - dev</title>
<style>body{margin:0;background:#111;display:flex;justify-content:center}canvas{border:1px solid #333}</style>
</head>
<body>
<canvas id="game" width="375" height="667"></canvas>
<script src="boot.js"></script>
</body>
</html>
```

`minigame-jiandao/dev/boot.js`:
```js
// 极简同步 CommonJS 加载器：仅本地开发用
(function () {
  const cache = {};
  function resolve(base, path) {
    const parts = (base + '/../' + path).split('/');
    const out = [];
    for (const p of parts) {
      if (p === '.' || p === '') continue;
      if (p === '..') out.pop(); else out.push(p);
    }
    let file = out.join('/');
    if (!file.endsWith('.js')) file += '.js';
    return file;
  }
  function load(file) {
    if (cache[file]) return cache[file].exports;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '../' + file, false); // 同步，仅开发用
    xhr.send();
    const module = { exports: {} };
    cache[file] = module;
    const fn = new Function('module', 'exports', 'require',
      xhr.responseText + '\n//# sourceURL=' + file);
    fn(module, module.exports, (p) => load(resolve(file, p)));
    return module.exports;
  }

  const canvas = document.getElementById('game');
  const { createMockPlatform } = load('src/platform/mock.js');
  const platform = createMockPlatform({ canvas, width: 375, height: 667 });

  // 把 mock 注入 platform/index 的缓存，让 main.js 拿到带 canvas 的实例
  const platformIndex = load('src/platform/index.js');
  const orig = platformIndex.getPlatform;
  platformIndex.getPlatform = () => platform;

  // 键盘 → 触摸模拟
  const keys = {};
  const JOY_ID = 100, BASE = { x: 90, y: 500 };
  function joyTouch() {
    let dx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    let dy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
    return { id: JOY_ID, x: BASE.x + dx * 60, y: BASE.y + dy * 60 };
  }
  let joyActive = false;
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ('wasd'.includes(k)) {
      keys[k] = true;
      if (!joyActive) { platform.touch.emit('start', [{ id: JOY_ID, x: BASE.x, y: BASE.y }]); joyActive = true; }
      platform.touch.emit('move', [joyTouch()]);
    }
    if (k === 'j') platform.touch.emit('start', [{ id: 200, x: 375 - 70, y: 667 - 90 }]);
    if (k === 'k') platform.touch.emit('start', [{ id: 201, x: 375 - 152, y: 667 - 56 }]);
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if ('wasd'.includes(k)) {
      keys[k] = false;
      if (!keys.w && !keys.a && !keys.s && !keys.d) {
        platform.touch.emit('end', [joyTouch()]); joyActive = false;
      } else platform.touch.emit('move', [joyTouch()]);
    }
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    platform.touch.emit('start', [{ id: 300, x: e.clientX - r.left, y: e.clientY - r.top }]);
  });
  canvas.addEventListener('mouseup', (e) => {
    const r = canvas.getBoundingClientRect();
    platform.touch.emit('end', [{ id: 300, x: e.clientX - r.left, y: e.clientY - r.top }]);
  });

  load('src/main.js').start();
})();
```

- [ ] **Step 2: 手动验证**

Run: `cd minigame-jiandao && python3 -m http.server 8080`，浏览器打开 `http://localhost:8080/dev/`
Expected 检查清单：
1. 主菜单显示「剑 道」标题、铁匠铺三行、开始按钮
2. 点开始 → 选关页 8 个格子，仅第 1 关亮
3. 进第 1 关：WASD 移动、J 挥剑三连、K 闪避、清 3 敌兵后出口变金色、走进出口弹结算
4. 结算「看视频金币翻倍」点击后金币翻倍（mock 广告恒成功）
5. 故意阵亡：死亡界面出现「看视频原地复活」，点击后满血复活

- [ ] **Step 3: Commit**

```bash
git add minigame-jiandao/dev
git commit -m "feat: 浏览器试玩harness（键盘模拟触摸）"
```

---

### Task 20: 音效与美术素材接入

**Files:**
- Create: `minigame-jiandao/assets/README.md`
- Create: `minigame-jiandao/assets/audio/`（音效文件）
- Modify: `minigame-jiandao/src/platform/mock.js`（无改动则跳过——mock audio 已是 noop）

**Interfaces:**
- Consumes: `platform.audio.play(name)`，name ∈ `attack | hit | hurt | dash | coin | die`（Task 18 已在调用）
- Produces: `assets/audio/<name>.mp3` 六个音效文件。图形首版保持程序绘制（色块骑士），精灵图列为 v1.1 迭代项——这是有意的范围决策，不是缺失：色块画面在 dev harness 验证可玩性足够，替换精灵图不影响任何逻辑代码。

- [ ] **Step 1: 下载 CC0 音效**

来源（均 CC0，商用无风险）：
- Kenney "RPG Audio" / "Impact Sounds"：https://kenney.nl/assets/rpg-audio 、https://kenney.nl/assets/impact-sounds
- 下载后挑选 6 个短音效，转成 mp3（若是 ogg：`ffmpeg -i in.ogg out.mp3`），重命名为：
  `attack.mp3`（挥剑）、`hit.mp3`（命中）、`hurt.mp3`（受伤）、`dash.mp3`（闪避）、`coin.mp3`（金币）、`die.mp3`（阵亡）
- 放入 `minigame-jiandao/assets/audio/`

`minigame-jiandao/assets/README.md`:
```markdown
# 素材清单

## 音效（assets/audio/）
| 文件 | 用途 | 来源 |
|---|---|---|
| attack.mp3 | 挥剑 | Kenney RPG Audio (CC0) |
| hit.mp3 | 命中敌人 | Kenney Impact Sounds (CC0) |
| hurt.mp3 | 玩家受伤 | Kenney Impact Sounds (CC0) |
| dash.mp3 | 闪避 | Kenney RPG Audio (CC0) |
| coin.mp3 | 拾取金币 | Kenney RPG Audio (CC0) |
| die.mp3 | 阵亡 | Kenney RPG Audio (CC0) |

所有素材 CC0 协议，可商用，无署名要求。

## 图形
首版为程序绘制（Canvas 几何图形）。v1.1 计划接入 Kenney Tiny Dungeon
精灵图（https://kenney.nl/assets/tiny-dungeon, CC0）。
```

- [ ] **Step 2: 验证体积与音效播放**

Run: `du -sh minigame-jiandao/assets && du -sh minigame-jiandao --exclude=dev --exclude=node_modules`
Expected: assets < 500KB，主包总计 < 2MB

Run: 重开 `http://localhost:8080/dev/`（mock audio 是 noop，浏览器听不到声音——音效在 Task 21 真机预览时人工验证）
Expected: 游戏行为无回归

- [ ] **Step 3: Commit**

```bash
git add minigame-jiandao/assets
git commit -m "feat: CC0音效素材接入"
```

---

### Task 21: 抖音开发者工具联调与提审准备（人工清单）

**Files:**
- Create: `minigame-jiandao/docs/RELEASE.md`（上线操作手册）

本任务全部为人工步骤，产出一份可勾选的上线手册。

- [ ] **Step 1: 写上线手册**

`minigame-jiandao/docs/RELEASE.md`:
```markdown
# 《剑道》上线操作手册

## A. 开发者工具联调
- [ ] 下载「抖音开发者工具」：https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/developer-instrument/developer-instrument-update-and-download
- [ ] 打开工具 → 导入项目 → 选择 minigame-jiandao/ 目录（appid 暂用 touristappid）
- [ ] 模拟器验证：五步检查（主菜单/选关/战斗操作/结算翻倍/死亡复活，与 dev harness 清单相同，但用鼠标模拟触摸）
- [ ] 性能面板：战斗场景 FPS ≥ 30（目标 60）
- [ ] 真机预览：扫码在抖音 App 内试玩，验收摇杆手感、按钮大小、音效播放

## B. 账号与资质（可与开发并行）
- [ ] 注册抖音开放平台账号（个人主体）：https://developer.open-douyin.com/ → 实名认证
- [ ] 创建小游戏，获得真实 appid → 替换 project.config.json 的 "touristappid"
- [ ] 申请软著（约200-300元，1-2个月，建议尽早）：中国版权保护中心 https://register.ccopyright.com.cn/
- [ ] 确认备案要求：纯广告变现无内购的休闲小游戏走备案通道（提审前在平台后台核对最新政策）
- [ ] 开通流量主 → 创建激励视频广告位 → 把 adUnitId 填入 src/platform/config.js 的 AD_UNIT_REWARDED → 重新真机验证三个广告点位

## C. 提审材料
- [ ] 游戏名称：剑道；类目：动作；适龄提示：16+
- [ ] 简介（用设计文档概述改写，≤200字）
- [ ] 截图 4-5 张（战斗/Boss/铁匠铺/选关）：真机预览时截取
- [ ] 自审自查报告（平台后台有模板）
- [ ] 上传代码（开发者工具「上传」按钮）→ 提交审核

## D. 常见拒审自查
- [ ] 广告均为用户主动触发，无诱导点击文案 ✓（设计如此）
- [ ] 广告失败有降级不卡流程 ✓（Task 16 已测）
- [ ] 加载无长时间白屏（主包 < 2MB）
- [ ] 无网络请求、无用户隐私收集（本项目无后端，天然满足）

## E. 发布后运营
- [ ] 开发者后台看板：次日留存 / 广告 eCPM / 关卡漏斗（哪关流失高调哪关难度）
- [ ] 接入游戏发行人计划（达人挂载推广）
- [ ] 收集数据 2 周后规划 v1.1：精灵图美术、9-15 关、新敌人
```

- [ ] **Step 2: 按手册 A 节执行联调**

Run: 人工按 `docs/RELEASE.md` A 节逐项勾选
Expected: 五步检查全过、真机 FPS ≥ 30、音效正常

- [ ] **Step 3: Commit**

```bash
git add minigame-jiandao/docs/RELEASE.md
git commit -m "docs: 上线操作手册（联调/资质/提审/运营）"
```

---

## 任务依赖图

```
Task 1 (脚手架)
 ├→ Task 2 (碰撞) ─→ Task 9 (镜头) / Task 10 (实体基类)
 ├→ Task 3 (升级数值) ─→ Task 5 (GameState) / Task 11 (玩家)
 ├→ Task 4 (存档) ─→ Task 5 (GameState)
 ├→ Task 6 (平台层) ─→ Task 16 (广告点位) / Task 18 / Task 19
 ├→ Task 7 (循环) / Task 8 (输入) ─→ Task 18
 Task 10 ─→ Task 11 (玩家) / Task 12 (敌人) / Task 15 (Boss)
 Task 12 ─→ Task 13 (箭/金币) / Task 14 (关卡)
 Task 11..16 + 17 (场景管理) ─→ Task 18 (场景接线)
 Task 18 ─→ Task 19 (浏览器试玩) ─→ Task 20 (素材) ─→ Task 21 (联调提审)
```

Task 2/3/4/6/7/8 相互独立，可并行实现。






