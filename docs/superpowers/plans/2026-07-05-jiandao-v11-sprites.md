# 《剑道》v1.1 精灵图美术替换 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 `assets-src/` 中的四张 AI 生成素材图，替换战斗场景的全部程序绘制图形（玩家/敌人/Boss/金币/箭/地图/按钮），并补上加载场景。

**Architecture:** 素材原图是带标签的展示排版图（非规整网格、米色不透明底、共 8.8MB），不能直接进包。方案：Node 切图工具（归一化坐标裁剪 → 角点 flood-fill 抠底 → 最近邻缩放 → shelf 打包）离线生成一张紧凑图集 `sprites.png` + 映射 `sprites.json`（≤400KB）进主包；游戏侧新增 `core/images.js` 加载器（未就绪自动回退现有色块渲染），新增加载场景预载资源。

**Tech Stack:** Node + pngjs（仅 devDependency，工具链用）；游戏侧仍为零运行时依赖、Canvas 2D、CommonJS。

## Global Constraints

- 模块规范：CommonJS（`module.exports`/`require`），禁止 ESM import
- 游戏运行时零第三方依赖；`pngjs` 只能出现在仓库根 `package.json` 的 devDependencies，只被 `tools/` 引用
- 所有 `tt.` API 只允许出现在 `minigame-jiandao/src/platform/douyin.js`
- 原始素材图（4 张大 PNG）必须位于仓库根 `assets-src/`，**绝不进入** `minigame-jiandao/`
- 产物 `minigame-jiandao/assets/sprites.png` ≤ 400KB；`minigame-jiandao/` 目录总体积（不含 dev/）≤ 2MB
- 图集加载失败/未完成时，所有渲染必须回退到现有程序绘制（色块），不允许白屏或报错中断（审核红线）
- 测试命令：`cd minigame-jiandao && npm test`（现有 81 个测试必须持续通过）；lint：仓库根 `npm run lint` 0 errors
- 提交信息中文 conventional commits，每次提交带 trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## 帧命名总表（sprites.json 的 keys，后续所有任务共用）

```
player_idle_0  player_move_0  player_move_1  player_attack_0
soldier_idle_0 soldier_move_0 soldier_move_1 soldier_attack_0
archer_idle_0  archer_move_0  archer_move_1  archer_attack_0
shield_idle_0  shield_move_0  shield_move_1  shield_attack_0
berserker_idle_0 berserker_move_0 berserker_move_1 berserker_attack_0
warlord_idle_0 warlord_move_0 warlord_attack_0 warlord_telegraph_0
blackknight_idle_0 blackknight_move_0 blackknight_attack_0 blackknight_telegraph_0
arrow_0  coin_0  slash_0  slash_1
floor_valley  floor_forest  floor_castle
wall_valley   wall_forest   wall_castle
portal_valley portal_forest portal_castle
btn_attack  btn_dash  joy_base
```
（共 44 帧。目标显示高度：玩家/敌人 44px、Boss 64px、arrow 20px、coin 16px、slash 56px、floor/wall 64px、portal 56px、btn 96px、joy_base 128px——工具按"输出高度"参数缩放。）

## 视觉校准迭代流程（Task 2/5 复用，此处定义一次）

1. 跑生成命令得到图集
2. 用图像查看手段（Read 工具/浏览器）检查输出的 `sprites.png` 逐帧：裁剪框是否切到相邻帧或文字、抠底是否残留大块底色
3. 有问题 → 修改 manifest 中该帧的归一化坐标（±0.005 步进）→ 重跑 → 再看
4. 全部帧干净后才进入提交步骤。这是人工/控制器视觉迭代，预期 2-4 轮

---

### Task 1: 素材入库与切图工具链

**Files:**
- Move: `minigame-jiandao/assets/jiandao_asset_*_v01_20260706.png`（4 张）→ `assets-src/`
- Modify: `package.json`（根，devDependencies 加 pngjs）
- Create: `tools/cut_sprites.js`
- Test: `tools/cut_sprites.test.js`（用 node:test，跑在仓库根：`node --test tools/`）

**Interfaces:**
- Produces: `cutSprites(manifest, srcDir, outPngPath, outJsonPath)`；manifest 项格式 `{ name, src, nx, ny, nw, nh, outH }`（nx/ny/nw/nh 为 0-1 归一化坐标，outH 输出高度像素）。输出 sprites.json 格式：`{ meta: { w, h }, frames: { [name]: { x, y, w, h } } }`
- 内部函数按此拆分并全部导出便于测试：`cropNorm(png, nx, ny, nw, nh)`、`chromaKey(png, tolerance=30)`（从四角 flood-fill 清除近似底色为透明）、`scaleNN(png, outH)`（最近邻，保持宽高比）、`shelfPack(frames, maxW=1024)`（返回 {sheet, placements}）

**注意：** 本任务开始前工作区必须在 main 上且 4 张原图尚未跟踪——先完成 mv + `git add assets-src` 的入库提交，**之后**再按执行技能的要求创建 worktree（否则 untracked 素材不会跟随到 worktree）。

- [ ] **Step 1: 素材迁移入库（在 main 上）**

```bash
mkdir -p assets-src
git mv 2>/dev/null || true
mv minigame-jiandao/assets/jiandao_asset_boss_sprite_sheet_v01_20260706.png \
   minigame-jiandao/assets/jiandao_asset_character_sprite_sheet_v01_20260706.png \
   minigame-jiandao/assets/jiandao_asset_environment_props_tileset_v01_20260706.png \
   minigame-jiandao/assets/jiandao_asset_ui_icon_combat_vfx_v01_20260706.png \
   assets-src/
git add assets-src
git commit -m "chore: v1.1 素材原图入库到 assets-src（不进主包）"
```

Run: `du -sh assets-src && ls minigame-jiandao/assets/`
Expected: assets-src ≈ 8.8M；minigame-jiandao/assets 下只剩 README.md 与 audio/

- [ ] **Step 2: 安装 pngjs 并写失败测试**

```bash
npm install --save-dev pngjs
```

`tools/cut_sprites.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { PNG } = require('pngjs');
const { cropNorm, chromaKey, scaleNN, shelfPack } = require('./cut_sprites');

// 构造 20x20 测试图：米色底(232,228,218)，中央 10x10 红色方块
function makeFixture() {
  const png = new PNG({ width: 20, height: 20 });
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      const i = (y * 20 + x) * 4;
      const inBox = x >= 5 && x < 15 && y >= 5 && y < 15;
      png.data[i] = inBox ? 200 : 232;
      png.data[i + 1] = inBox ? 30 : 228;
      png.data[i + 2] = inBox ? 30 : 218;
      png.data[i + 3] = 255;
    }
  }
  return png;
}

test('cropNorm 按归一化坐标裁剪', () => {
  const out = cropNorm(makeFixture(), 0.25, 0.25, 0.5, 0.5); // 中央 10x10
  assert.strictEqual(out.width, 10);
  assert.strictEqual(out.height, 10);
  assert.strictEqual(out.data[0], 200); // 全是红色
});

test('chromaKey 从角落清除底色，保留内容', () => {
  const out = chromaKey(makeFixture(), 30);
  assert.strictEqual(out.data[3], 0);                    // 角落变透明
  const c = ((10 * 20) + 10) * 4;
  assert.strictEqual(out.data[c + 3], 255);              // 中央红块不透明
});

test('scaleNN 最近邻缩放保持宽高比', () => {
  const out = scaleNN(makeFixture(), 10); // 20x20 -> 10x10
  assert.strictEqual(out.width, 10);
  assert.strictEqual(out.height, 10);
});

test('shelfPack 不重叠且都在版面内', () => {
  const frames = [
    { name: 'a', png: new PNG({ width: 30, height: 20 }) },
    { name: 'b', png: new PNG({ width: 30, height: 25 }) },
    { name: 'c', png: new PNG({ width: 900, height: 10 }) },
  ];
  const { sheet, placements } = shelfPack(frames, 100);
  assert.ok(sheet.width <= 1024);
  const a = placements.a, b = placements.b;
  const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  assert.ok(!overlap);
  for (const p of Object.values(placements)) {
    assert.ok(p.x + p.w <= sheet.width && p.y + p.h <= sheet.height);
  }
});
```

- [ ] **Step 3: 运行确认失败**

Run: `node --test tools/`
Expected: FAIL（`Cannot find module './cut_sprites'`）

- [ ] **Step 4: 实现 tools/cut_sprites.js**

```js
// 切图工具：从展示排版图裁剪→抠底→缩放→打包成游戏图集。仅开发期使用（pngjs 为 devDependency）。
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function cropNorm(png, nx, ny, nw, nh) {
  const x = Math.round(nx * png.width), y = Math.round(ny * png.height);
  const w = Math.round(nw * png.width), h = Math.round(nh * png.height);
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(png, out, x, y, w, h, 0, 0);
  return out;
}

// 从四角 flood-fill：与角点颜色相近(容差)的连通区域置透明
function chromaKey(png, tolerance = 30) {
  const { width: w, height: h, data } = png;
  const visited = new Uint8Array(w * h);
  const seeds = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
  for (const [sx, sy] of seeds) {
    const si = (sy * w + sx) * 4;
    const [br, bg, bb] = [data[si], data[si + 1], data[si + 2]];
    const stack = [[sx, sy]];
    while (stack.length) {
      const [x, y] = stack.pop();
      const idx = y * w + x;
      if (x < 0 || y < 0 || x >= w || y >= h || visited[idx]) continue;
      const i = idx * 4;
      if (Math.abs(data[i] - br) + Math.abs(data[i + 1] - bg) + Math.abs(data[i + 2] - bb) > tolerance * 3) continue;
      visited[idx] = 1;
      data[i + 3] = 0;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }
  return png;
}

function scaleNN(png, outH) {
  const scale = outH / png.height;
  const w = Math.max(1, Math.round(png.width * scale));
  const out = new PNG({ width: w, height: outH });
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(png.width - 1, Math.floor(x / scale));
      const sy = Math.min(png.height - 1, Math.floor(y / scale));
      const si = (sy * png.width + sx) * 4, di = (y * w + x) * 4;
      for (let k = 0; k < 4; k++) out.data[di + k] = png.data[si + k];
    }
  }
  return out;
}

// 行式打包：按高度降序放入行架
function shelfPack(frames, maxW = 1024) {
  const sorted = [...frames].sort((a, b) => b.png.height - a.png.height);
  const placements = {};
  let x = 0, y = 0, rowH = 0, sheetW = 0;
  const PAD = 2;
  for (const f of sorted) {
    if (x + f.png.width > maxW) { x = 0; y += rowH + PAD; rowH = 0; }
    placements[f.name] = { x, y, w: f.png.width, h: f.png.height };
    x += f.png.width + PAD;
    rowH = Math.max(rowH, f.png.height);
    sheetW = Math.max(sheetW, x);
  }
  // 版面宽取实际占用（单帧宽超过 maxW 时允许超出，保证不越界裁切）
  const sheet = new PNG({ width: sheetW, height: y + rowH });
  for (const f of sorted) {
    const p = placements[f.name];
    PNG.bitblt(f.png, sheet, 0, 0, p.w, p.h, p.x, p.y);
  }
  return { sheet, placements };
}

function cutSprites(manifest, srcDir, outPngPath, outJsonPath) {
  const srcCache = {};
  const frames = manifest.map((m) => {
    if (!srcCache[m.src]) {
      srcCache[m.src] = PNG.sync.read(fs.readFileSync(path.join(srcDir, m.src)));
    }
    let png = cropNorm(srcCache[m.src], m.nx, m.ny, m.nw, m.nh);
    png = chromaKey(png, m.tolerance || 30);
    png = scaleNN(png, m.outH);
    return { name: m.name, png };
  });
  const { sheet, placements } = shelfPack(frames);
  fs.writeFileSync(outPngPath, PNG.sync.write(sheet));
  fs.writeFileSync(outJsonPath, JSON.stringify({ meta: { w: sheet.width, h: sheet.height }, frames: placements }));
  return { count: frames.length, w: sheet.width, h: sheet.height };
}

module.exports = { cropNorm, chromaKey, scaleNN, shelfPack, cutSprites };
```

- [ ] **Step 5: 运行确认通过**

Run: `node --test tools/`
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tools/cut_sprites.js tools/cut_sprites.test.js
git commit -m "feat: 精灵图切图工具链（裁剪/抠底/缩放/打包）"
```

---

### Task 2: 裁剪清单与图集生成（含视觉校准）

**Files:**
- Create: `tools/sprite_manifest.js`
- Create: `tools/gen_atlas.js`（命令入口）
- Create: `minigame-jiandao/assets/sprites.png`（生成物，入库）
- Create: `minigame-jiandao/assets/sprites.json`（生成物，入库）
- Test: `tools/sprite_manifest.test.js`

**Interfaces:**
- Consumes: Task 1 的 `cutSprites`
- Produces: `MANIFEST` 数组（44 项，帧名见总表）；`node tools/gen_atlas.js` 生成图集；`sprites.json` 结构 `{meta:{w,h}, frames:{name:{x,y,w,h}}}`

**归一化坐标说明：** 下表坐标是按四张源图目测的**初始估计**（源图见 assets-src/，角色总表=character、Boss=boss、环境=environment、UI/VFX=ui）。执行时必须按「视觉校准迭代流程」逐帧核对修正——预期多数帧需 1-2 轮微调。每张源图的帧取自其中标注区域：角色表每角色行取 IDLE 第1帧、MOVE 第1/3帧、ATTACK 第3帧（挥砍中段）；Boss 表取 IDLE 第1帧、WIND-UP 第1帧（作 move）、ATTACK 区第1帧、TELEGRAPH 区第1帧；环境表每主题取 FLOOR 第1块、WALL 第1块、EXIT PORTAL；UI 表取摇杆底盘、攻击/闪避按钮、SWORD SLASH ARCS 前2帧、ARROW PROJECTILES 第1支、COIN PICKUP SPARKLE 金币。

- [ ] **Step 1: 写失败测试**

`tools/sprite_manifest.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { MANIFEST } = require('./sprite_manifest');

// 期望清单在测试中独立硬编码（不引用 manifest 自身的 FRAME_NAMES，避免循环自证）
const EXPECTED = [
  ...['player', 'soldier', 'archer', 'shield', 'berserker']
    .flatMap((p) => [p + '_idle_0', p + '_move_0', p + '_move_1', p + '_attack_0']),
  ...['warlord', 'blackknight']
    .flatMap((b) => [b + '_idle_0', b + '_move_0', b + '_attack_0', b + '_telegraph_0']),
  'arrow_0', 'coin_0', 'slash_0', 'slash_1',
  ...['valley', 'forest', 'castle'].flatMap((t) => ['floor_' + t, 'wall_' + t, 'portal_' + t]),
  'btn_attack', 'btn_dash', 'joy_base',
]; // 共 44 帧

test('清单覆盖全部 44 个约定帧名', () => {
  const names = MANIFEST.map((m) => m.name);
  assert.strictEqual(new Set(names).size, names.length, '帧名不得重复');
  for (const need of EXPECTED) assert.ok(names.includes(need), '缺少: ' + need);
  assert.strictEqual(names.length, EXPECTED.length);
});

test('每项坐标合法且引用存在的源图', () => {
  const SRCS = [
    'jiandao_asset_character_sprite_sheet_v01_20260706.png',
    'jiandao_asset_boss_sprite_sheet_v01_20260706.png',
    'jiandao_asset_environment_props_tileset_v01_20260706.png',
    'jiandao_asset_ui_icon_combat_vfx_v01_20260706.png',
  ];
  for (const m of MANIFEST) {
    assert.ok(SRCS.includes(m.src), m.name);
    for (const k of ['nx', 'ny', 'nw', 'nh']) {
      assert.ok(m[k] >= 0 && m[k] <= 1, `${m.name}.${k}`);
    }
    assert.ok(m.nx + m.nw <= 1 && m.ny + m.nh <= 1, m.name + ' 越界');
    assert.ok(m.outH >= 8 && m.outH <= 160, m.name + ' outH');
  }
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tools/`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 写清单与入口**

`tools/sprite_manifest.js`（坐标为初始估计，执行时按校准流程修正）:
```js
const CHAR = 'jiandao_asset_character_sprite_sheet_v01_20260706.png';
const BOSS = 'jiandao_asset_boss_sprite_sheet_v01_20260706.png';
const ENV = 'jiandao_asset_environment_props_tileset_v01_20260706.png';
const UI = 'jiandao_asset_ui_icon_combat_vfx_v01_20260706.png';

// 角色表五段（每角色约占纵向 1/5）；行内动作行从上到下 IDLE/MOVE/ATTACK/HURT/DEATH
function charFrames(prefix, rowTop) {
  const H = 0.036; // 单帧高约 3.6%
  const idleY = rowTop, moveY = rowTop + 0.037, atkY = rowTop + 0.074;
  return [
    { name: prefix + '_idle_0', src: CHAR, nx: 0.262, ny: idleY, nw: 0.030, nh: H, outH: 44 },
    { name: prefix + '_move_0', src: CHAR, nx: 0.262, ny: moveY, nw: 0.030, nh: H, outH: 44 },
    { name: prefix + '_move_1', src: CHAR, nx: 0.360, ny: moveY, nw: 0.030, nh: H, outH: 44 },
    { name: prefix + '_attack_0', src: CHAR, nx: 0.360, ny: atkY, nw: 0.046, nh: H, outH: 44 },
  ];
}

const MANIFEST = [
  ...charFrames('player', 0.040),
  ...charFrames('soldier', 0.268),
  ...charFrames('archer', 0.452),
  ...charFrames('shield', 0.635),
  ...charFrames('berserker', 0.806),
  // Boss 表：上半督军 / 下半黑骑士
  { name: 'warlord_idle_0', src: BOSS, nx: 0.355, ny: 0.055, nw: 0.055, nh: 0.085, outH: 64 },
  { name: 'warlord_move_0', src: BOSS, nx: 0.355, ny: 0.175, nw: 0.055, nh: 0.085, outH: 64 },
  { name: 'warlord_attack_0', src: BOSS, nx: 0.352, ny: 0.300, nw: 0.075, nh: 0.095, outH: 64 },
  { name: 'warlord_telegraph_0', src: BOSS, nx: 0.660, ny: 0.185, nw: 0.075, nh: 0.080, outH: 64 },
  { name: 'blackknight_idle_0', src: BOSS, nx: 0.290, ny: 0.510, nw: 0.055, nh: 0.090, outH: 64 },
  { name: 'blackknight_move_0', src: BOSS, nx: 0.300, ny: 0.610, nw: 0.060, nh: 0.090, outH: 64 },
  { name: 'blackknight_attack_0', src: BOSS, nx: 0.290, ny: 0.710, nw: 0.075, nh: 0.095, outH: 64 },
  { name: 'blackknight_telegraph_0', src: BOSS, nx: 0.600, ny: 0.590, nw: 0.075, nh: 0.085, outH: 64 },
  // 环境表：三主题行
  { name: 'floor_valley', src: ENV, nx: 0.015, ny: 0.238, nw: 0.048, nh: 0.062, outH: 64, tolerance: 18 },
  { name: 'wall_valley', src: ENV, nx: 0.242, ny: 0.232, nw: 0.030, nh: 0.115, outH: 64 },
  { name: 'portal_valley', src: ENV, nx: 0.630, ny: 0.238, nw: 0.045, nh: 0.085, outH: 56 },
  { name: 'floor_forest', src: ENV, nx: 0.015, ny: 0.455, nw: 0.048, nh: 0.062, outH: 64, tolerance: 18 },
  { name: 'wall_forest', src: ENV, nx: 0.242, ny: 0.448, nw: 0.030, nh: 0.115, outH: 64 },
  { name: 'portal_forest', src: ENV, nx: 0.630, ny: 0.455, nw: 0.045, nh: 0.085, outH: 56 },
  { name: 'floor_castle', src: ENV, nx: 0.015, ny: 0.678, nw: 0.048, nh: 0.062, outH: 64, tolerance: 18 },
  { name: 'wall_castle', src: ENV, nx: 0.242, ny: 0.672, nw: 0.030, nh: 0.115, outH: 64 },
  { name: 'portal_castle', src: ENV, nx: 0.630, ny: 0.678, nw: 0.045, nh: 0.085, outH: 56 },
  // UI/VFX 表
  { name: 'joy_base', src: UI, nx: 0.020, ny: 0.285, nw: 0.100, nh: 0.135, outH: 128 },
  { name: 'btn_attack', src: UI, nx: 0.155, ny: 0.290, nw: 0.075, nh: 0.100, outH: 96 },
  { name: 'btn_dash', src: UI, nx: 0.250, ny: 0.300, nw: 0.055, nh: 0.075, outH: 96 },
  { name: 'slash_0', src: UI, nx: 0.020, ny: 0.645, nw: 0.055, nh: 0.055, outH: 56 },
  { name: 'slash_1', src: UI, nx: 0.085, ny: 0.645, nw: 0.055, nh: 0.055, outH: 56 },
  { name: 'arrow_0', src: UI, nx: 0.745, ny: 0.648, nw: 0.055, nh: 0.020, outH: 20 },
  { name: 'coin_0', src: UI, nx: 0.310, ny: 0.815, nw: 0.022, nh: 0.030, outH: 16 },
];

const FRAME_NAMES = MANIFEST.map((m) => m.name);
module.exports = { MANIFEST, FRAME_NAMES };
```

`tools/gen_atlas.js`:
```js
const path = require('path');
const { cutSprites } = require('./cut_sprites');
const { MANIFEST } = require('./sprite_manifest');

const root = path.join(__dirname, '..');
const out = cutSprites(
  MANIFEST,
  path.join(root, 'assets-src'),
  path.join(root, 'minigame-jiandao/assets/sprites.png'),
  path.join(root, 'minigame-jiandao/assets/sprites.json')
);
console.log(`图集生成: ${out.count} 帧, ${out.w}x${out.h}`);
```

- [ ] **Step 4: 运行测试与生成**

Run: `node --test tools/ && node tools/gen_atlas.js`
Expected: 测试 PASS；输出「图集生成: 44 帧, …」

- [ ] **Step 5: 视觉校准迭代（本任务核心工作量）**

按「视觉校准迭代流程」逐帧检查 `minigame-jiandao/assets/sprites.png`：
- 每帧只含目标精灵，无相邻帧残影、无文字、无大块米色残留
- 角色帧脚底大致居中于帧底部
- 修 manifest 坐标 → `node tools/gen_atlas.js` → 复查，直到全部干净

Run: `ls -la minigame-jiandao/assets/sprites.png && du -h minigame-jiandao/assets/sprites.png`
Expected: sprites.png ≤ 400KB

- [ ] **Step 6: Commit**

```bash
git add tools/sprite_manifest.js tools/gen_atlas.js tools/sprite_manifest.test.js minigame-jiandao/assets/sprites.png minigame-jiandao/assets/sprites.json
git commit -m "feat: 44帧游戏图集生成（含校准后的裁剪清单）"
```

---

### Task 3: 图集加载器 core/images.js + 平台 createImage

**Files:**
- Create: `minigame-jiandao/src/core/images.js`
- Modify: `minigame-jiandao/src/platform/douyin.js`（增加 `createImage()` 与 `readJson(path)`）
- Modify: `minigame-jiandao/src/platform/mock.js`（同上，mock 版）
- Test: `minigame-jiandao/tests/images.test.js`

**Interfaces:**
- Consumes: `sprites.json` 结构 `{meta:{w,h}, frames:{name:{x,y,w,h}}}`
- Produces:
  - platform 新增：`createImage()->{src, onload, onerror, width, height}`（douyin: `tt.createCanvas().createImage 不存在——用 canvas.createImage()`；实现为 `getCanvas().createImage()`，douyin.js 内部持有主 canvas 引用；mock: 返回可手动触发 onload 的假对象）；`readJson(path)->object|null`（douyin: `JSON.parse(tt.getFileSystemManager().readFileSync(path, 'utf8'))` try/catch null；mock: 从 `opts.files` 表读）
  - `createAtlas(platform)->atlas`：`atlas.load(basePath)->Promise<boolean>`（true=图与 json 均就绪）、`atlas.ready`、`atlas.has(name)`、`atlas.draw(ctx, name, cx, cy, destH, {flipX=false})`（以 (cx,cy) 为中心绘制，宽按帧宽高比推导；`!ready||!has(name)` 时返回 false，调用方走色块回退）
- **回退契约（后续任务依赖）：`atlas.draw` 返回 false 时调用方必须执行原有程序绘制。**

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/images.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { createAtlas } = require('../src/core/images');
const { createMockPlatform } = require('../src/platform/mock');

const JSON_BODY = { meta: { w: 100, h: 50 }, frames: { hero: { x: 0, y: 0, w: 20, h: 40 } } };

function platformWith(files, imgOk = true) {
  const p = createMockPlatform({ files, imageLoadResult: imgOk });
  return p;
}

test('json 与图片都就绪后 ready=true 且 has 命中', async () => {
  const p = platformWith({ 'assets/sprites.json': JSON_BODY });
  const atlas = createAtlas(p);
  const ok = await atlas.load('assets/sprites');
  assert.strictEqual(ok, true);
  assert.ok(atlas.ready);
  assert.ok(atlas.has('hero'));
  assert.ok(!atlas.has('nope'));
});

test('图片加载失败 -> ready=false，draw 返回 false（走色块回退）', async () => {
  const p = platformWith({ 'assets/sprites.json': JSON_BODY }, false);
  const atlas = createAtlas(p);
  const ok = await atlas.load('assets/sprites');
  assert.strictEqual(ok, false);
  assert.ok(!atlas.ready);
  assert.strictEqual(atlas.draw(null, 'hero', 0, 0, 40), false);
});

test('json 缺失 -> load false 不抛异常', async () => {
  const atlas = createAtlas(platformWith({}));
  assert.strictEqual(await atlas.load('assets/sprites'), false);
});

test('draw 以中心锚点计算目标矩形并水平翻转', async () => {
  const p = platformWith({ 'assets/sprites.json': JSON_BODY });
  const atlas = createAtlas(p);
  await atlas.load('assets/sprites');
  const calls = [];
  const ctx = {
    save() { calls.push(['save']); }, restore() { calls.push(['restore']); },
    scale(x, y) { calls.push(['scale', x, y]); }, translate(x, y) { calls.push(['translate', x, y]); },
    drawImage(...a) { calls.push(['drawImage', ...a.slice(1)]); }, // 略过 img 引用
  };
  assert.strictEqual(atlas.draw(ctx, 'hero', 100, 200, 80), true);
  // 帧 20x40，destH=80 -> destW=40；中心(100,200) -> 左上(80,160)
  const d = calls.find((c) => c[0] === 'drawImage');
  assert.deepStrictEqual(d.slice(1), [0, 0, 20, 40, 80, 160, 40, 80]);
  atlas.draw(ctx, 'hero', 100, 200, 80, { flipX: true });
  assert.ok(calls.some((c) => c[0] === 'scale' && c[1] === -1));
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/platform/mock.js` 修改——工厂签名与新增能力（在现有返回对象上增加两个成员，`opts` 新增 `files` 与 `imageLoadResult`）:
```js
    createImage() {
      const self = this;
      const img = {
        width: 1, height: 1, onload: null, onerror: null,
        set src(v) {
          this._src = v;
          const ok = opts.imageLoadResult !== false;
          setTimeout(() => { if (ok && img.onload) img.onload(); else if (!ok && img.onerror) img.onerror(); }, 0);
        },
        get src() { return this._src; },
      };
      return img;
    },
    readJson(p) {
      const files = opts.files || {};
      return files[p] !== undefined ? files[p] : null;
    },
```

`minigame-jiandao/src/platform/douyin.js` 新增（在返回对象中；主 canvas 引用挪为模块内 `let mainCanvas = null`，`createCanvas()` 首次创建时记录）:
```js
    createImage() { return (mainCanvas || (mainCanvas = tt.createCanvas())).createImage(); },
    readJson(p) {
      try { return JSON.parse(tt.getFileSystemManager().readFileSync(p, 'utf8')); } catch (e) { return null; }
    },
```

`minigame-jiandao/src/core/images.js`:
```js
function createAtlas(platform) {
  let img = null, frames = null, ready = false;
  const atlas = {
    get ready() { return ready; },
    has(name) { return !!(frames && frames[name]); },
    load(basePath) {
      const json = platform.readJson(basePath + '.json');
      if (!json || !json.frames) return Promise.resolve(false);
      frames = json.frames;
      return new Promise((resolve) => {
        img = platform.createImage();
        img.onload = () => { ready = true; resolve(true); };
        img.onerror = () => { ready = false; resolve(false); };
        img.src = basePath + '.png';
      });
    },
    // 以 (cx,cy) 为中心绘制帧，高 destH，宽按帧宽高比。失败返回 false，调用方走色块回退。
    draw(ctx, name, cx, cy, destH, opt = {}) {
      if (!ready || !frames || !frames[name]) return false;
      const f = frames[name];
      const destW = (f.w / f.h) * destH;
      const dx = cx - destW / 2, dy = cy - destH / 2;
      if (opt.flipX) {
        ctx.save();
        ctx.translate(cx * 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, f.x, f.y, f.w, f.h, dx, dy, destW, destH);
        ctx.restore();
      } else {
        ctx.drawImage(img, f.x, f.y, f.w, f.h, dx, dy, destW, destH);
      }
      return true;
    },
  };
  return atlas;
}
module.exports = { createAtlas };
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS（81 旧 + 4 新）

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/core/images.js minigame-jiandao/src/platform/mock.js minigame-jiandao/src/platform/douyin.js minigame-jiandao/tests/images.test.js
git commit -m "feat: 图集加载器与平台图片接口（未就绪自动回退）"
```

---

### Task 4: 加载场景与资源预载接线

**Files:**
- Create: `minigame-jiandao/src/scenes/loading.js`
- Modify: `minigame-jiandao/src/main.js`
- Test: `minigame-jiandao/tests/loading.test.js`

**Interfaces:**
- Consumes: Task 3 `createAtlas`；场景管理器 `go(name, params)`；hud 绘制工具
- Produces:
  - `createLoadingScene(deps)`，deps 在原有 `{platform, gs, input, view, go}` 基础上**新增 `atlas` 成员**（main.js 创建并注入所有场景——后续 battle 也从 deps.atlas 取）
  - 行为：`enter()` 即调 `atlas.load('assets/sprites')`；成功 → `go('menu')`；失败 → 显示「资源加载失败」+ 重试按钮（点按重新 load）；**重试 3 次仍失败 → 也 `go('menu')`（色块回退可玩，绝不卡死）**
  - main.js：deps 增加 `atlas: createAtlas(platform)`；注册 `loading` 场景；启动改为 `sm.go('loading')`

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/loading.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { createLoadingScene } = require('../src/scenes/loading');
const { createAtlas } = require('../src/core/images');
const { createMockPlatform } = require('../src/platform/mock');

const JSON_BODY = { meta: { w: 10, h: 10 }, frames: { a: { x: 0, y: 0, w: 5, h: 5 } } };
function tick() { return new Promise((r) => setTimeout(r, 5)); }

function makeDeps(files, imgOk) {
  const platform = createMockPlatform({ files, imageLoadResult: imgOk });
  const gone = [];
  const deps = {
    platform, gs: null, input: null, view: { w: 375, h: 667 },
    atlas: createAtlas(platform),
    go: (n) => gone.push(n),
  };
  return { deps, gone };
}

test('加载成功自动进入主菜单', async () => {
  const { deps, gone } = makeDeps({ 'assets/sprites.json': JSON_BODY }, true);
  createLoadingScene(deps).enter();
  await tick();
  assert.deepStrictEqual(gone, ['menu']);
  assert.ok(deps.atlas.ready);
});

test('失败显示重试，点重试成功后进入主菜单', async () => {
  const { deps, gone } = makeDeps({ 'assets/sprites.json': JSON_BODY }, false);
  const scene = createLoadingScene(deps);
  scene.enter();
  await tick();
  assert.deepStrictEqual(gone, []);           // 停在加载页
  assert.ok(scene.failed());                   // 暴露给渲染用
  // 修正 mock 使下次加载成功，再点重试
  deps.platform.setImageLoadResult(true);
  scene.onTap(375 / 2, 667 / 2 + 40);          // 重试按钮位置
  await tick();
  assert.deepStrictEqual(gone, ['menu']);
});

test('重试3次仍失败则降级进入主菜单（色块可玩）', async () => {
  const { deps, gone } = makeDeps({ 'assets/sprites.json': JSON_BODY }, false);
  const scene = createLoadingScene(deps);
  scene.enter();
  await tick();
  for (let i = 0; i < 3; i++) { scene.onTap(375 / 2, 667 / 2 + 40); await tick(); }
  assert.deepStrictEqual(gone, ['menu']);
  assert.ok(!deps.atlas.ready);
});
```

（mock 需新增 `setImageLoadResult(v)`——见 Step 3。）

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/platform/mock.js`：`opts.imageLoadResult` 改为内部可变量并暴露 setter：
```js
    // createMockPlatform 函数体顶部：
    let imageLoadResult = opts.imageLoadResult !== false;
    // 返回对象新增：
    setImageLoadResult(v) { imageLoadResult = v; },
    // createImage 内 ok 判定改为读取 imageLoadResult
```

`minigame-jiandao/src/scenes/loading.js`:
```js
const hud = require('../ui/hud');

const MAX_RETRY = 3;

function createLoadingScene(deps) {
  const { view, atlas, go } = deps;
  let failed = false, tries = 0, busy = false;
  const retryBtn = { id: 'retry', x: view.w / 2 - 80, y: view.h / 2 + 20, w: 160, h: 44 };

  function attempt() {
    busy = true;
    atlas.load('assets/sprites').then((ok) => {
      busy = false;
      tries += 1;
      if (ok || tries > MAX_RETRY) { go('menu'); return; } // 超限降级进菜单（色块回退）
      failed = true;
    }).catch(() => { busy = false; tries += 1; failed = true; });
  }

  return {
    failed: () => failed,
    enter() { failed = false; tries = 0; attempt(); },
    onTap(x, y) {
      if (busy || !failed) return;
      if (hud.hitButton([retryBtn], x, y) === 'retry') { failed = false; attempt(); }
    },
    render(ctx) {
      ctx.fillStyle = '#2c2620';
      ctx.fillRect(0, 0, view.w, view.h);
      hud.drawTextC(ctx, '剑 道', view.w / 2, view.h / 2 - 80, 40, '#f1c40f');
      if (failed) {
        hud.drawTextC(ctx, '资源加载失败', view.w / 2, view.h / 2 - 20, 16, '#e74c3c');
        hud.drawBtn(ctx, retryBtn, '重试', !busy);
      } else {
        hud.drawTextC(ctx, '加载中…', view.w / 2, view.h / 2 - 20, 16, '#fff');
      }
    },
  };
}
module.exports = { createLoadingScene };
```

`minigame-jiandao/src/main.js` 修改：
```js
// 新增 require
const { createAtlas } = require('./core/images');
const { createLoadingScene } = require('./scenes/loading');
// deps 增加 atlas：
const deps = { platform, gs, input, view, atlas: createAtlas(platform), go: (n, p) => sm.go(n, p) };
// 注册与启动：
sm.register('loading', createLoadingScene(deps));
// ...原有四个 register 不变...
sm.go('loading'); // 原 sm.go('menu')
```

- [ ] **Step 4: 运行确认通过**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/scenes/loading.js minigame-jiandao/src/main.js minigame-jiandao/src/platform/mock.js minigame-jiandao/tests/loading.test.js
git commit -m "feat: 加载场景与图集预载（失败重试/超限降级）"
```

---

### Task 5: 战斗场景渲染替换（实体/地图/按钮/特效）

**Files:**
- Modify: `minigame-jiandao/src/scenes/battle.js`（render 部分与少量状态）
- Modify: `minigame-jiandao/src/ui/hud.js`（drawJoystick/drawActionButtons 接受 atlas 可选参数）
- Test: `minigame-jiandao/tests/battle_sprites.test.js`

**Interfaces:**
- Consumes: `deps.atlas`（Task 4 注入）；`atlas.draw(ctx,name,cx,cy,destH,{flipX})->bool` 回退契约；帧命名总表
- Produces: 纯函数 `frameFor(kind, state, moving, animTick)->string`（导出供测试）：
  - player: swing 存在→`player_attack_0`；moving→`player_move_{animTick%2}`；否则 `player_idle_0`
  - enemy（soldier/archer/shield/berserker）：state `windup|recover`→`{type}_attack_0`；`chase`→`{type}_move_{animTick%2}`；否则 `{type}_idle_0`
  - boss（warlord/blackknight）：state `telegraph`→`{kind}_telegraph_0`；`strike`→`{kind}_attack_0`；`idle` 且 moving→`{kind}_move_0`；否则 `{kind}_idle_0`
- 朝向：`flipX = Math.cos(facing) < 0`（素材默认朝右）
- 渲染规则（每处都保持色块回退）：
  - 地板：以 64px 网格平铺 `floor_{theme}`（仅铺可视区域：从相机偏移推起始格）
  - 墙体 obstacles：矩形内按 64px 平铺 `wall_{theme}`
  - 出口：开门→`portal_{theme}`；未开→保持现有暗色圆
  - 金币→`coin_0`；箭→`arrow_0`（按 dir 旋转：save/translate/rotate 绘制）
  - 挥剑弧：swing 存在时在扇形方向叠加 `slash_{stage%2}`（中心在玩家前方 40px，方向旋转）
  - 敌人前摇红圈、血条、无敌闪烁逻辑保持不变（叠加在精灵上）
  - hud：`drawJoystick(ctx, joy, atlas)` 摇杆底盘用 `joy_base`；`drawActionButtons(ctx, buttons, dashReady, atlas)` 用 `btn_attack`/`btn_dash`（dash 冷却中叠加半透明灰罩）；atlas 未就绪走原绘制

- [ ] **Step 1: 写失败测试**

`minigame-jiandao/tests/battle_sprites.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { frameFor } = require('../src/scenes/battle');

test('玩家帧选择：攻击>移动>待机', () => {
  assert.strictEqual(frameFor('player', 'swing', false, 0), 'player_attack_0');
  assert.strictEqual(frameFor('player', null, true, 0), 'player_move_0');
  assert.strictEqual(frameFor('player', null, true, 1), 'player_move_1');
  assert.strictEqual(frameFor('player', null, false, 7), 'player_idle_0');
});

test('敌人帧选择按状态机', () => {
  assert.strictEqual(frameFor('soldier', 'windup', false, 0), 'soldier_attack_0');
  assert.strictEqual(frameFor('archer', 'recover', false, 0), 'archer_attack_0');
  assert.strictEqual(frameFor('shield', 'chase', true, 3), 'shield_move_1');
  assert.strictEqual(frameFor('berserker', 'patrol', false, 0), 'berserker_idle_0');
});

test('Boss 帧选择含前摇帧', () => {
  assert.strictEqual(frameFor('warlord', 'telegraph', false, 0), 'warlord_telegraph_0');
  assert.strictEqual(frameFor('blackknight', 'strike', false, 0), 'blackknight_attack_0');
  assert.strictEqual(frameFor('warlord', 'idle', true, 0), 'warlord_move_0');
  assert.strictEqual(frameFor('blackknight', 'recover', false, 0), 'blackknight_idle_0');
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd minigame-jiandao && npm test`
Expected: FAIL（battle 未导出 frameFor）

- [ ] **Step 3: 实现**

`minigame-jiandao/src/scenes/battle.js` 新增导出的纯函数：
```js
// 状态→图集帧名。kind: 'player'|敌人type|Boss kind；state: 实体状态或 'swing'(玩家攻击中)
function frameFor(kind, state, moving, animTick) {
  const isBoss = kind === 'warlord' || kind === 'blackknight';
  if (kind === 'player') {
    if (state === 'swing') return 'player_attack_0';
    return moving ? 'player_move_' + (animTick % 2) : 'player_idle_0';
  }
  if (isBoss) {
    if (state === 'telegraph') return kind + '_telegraph_0';
    if (state === 'strike') return kind + '_attack_0';
    return moving ? kind + '_move_0' : kind + '_idle_0';
  }
  if (state === 'windup' || state === 'recover') return kind + '_attack_0';
  if (state === 'chase') return kind + '_move_' + (animTick % 2);
  return kind + '_idle_0';
}
```

battle 场景内增加动画计时（enter 的 s 上加 `animT: 0`；update 开头 `s.animT += dt;`；`const animTick = Math.floor(s.animT * 6);` 在 render 计算——render 无 dt，将 animTick 存到 s：update 里 `s.animTick = Math.floor(s.animT * 6);`）。

render 替换要点（完整代码）：
```js
    render(ctx) {
      if (!s) return;
      const { cfg, player } = s;
      const atlas = deps.atlas;
      const ox = s.camera.ox(), oy = s.camera.oy();

      // 地板：图集平铺，回退纯色
      ctx.fillStyle = THEME_BG[cfg.theme];
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.save();
      ctx.translate(-ox, -oy);
      if (atlas.ready) {
        const T = 64;
        const x0 = Math.floor(ox / T) * T, y0 = Math.floor(oy / T) * T;
        for (let ty = y0; ty < oy + view.h; ty += T) {
          for (let tx = x0; tx < ox + view.w; tx += T) {
            atlas.draw(ctx, 'floor_' + cfg.theme, tx + T / 2, ty + T / 2, T);
          }
        }
      }

      // 墙体：图集平铺，回退深色矩形
      for (const o of cfg.obstacles) {
        let drawn = false;
        if (atlas.ready) {
          drawn = true;
          const T = 64;
          for (let ty = o.y; ty < o.y + o.h; ty += T) {
            for (let tx = o.x; tx < o.x + o.w; tx += T) {
              const w = Math.min(T, o.x + o.w - tx), h = Math.min(T, o.y + o.h - ty);
              ctx.save();
              ctx.beginPath(); ctx.rect(tx, ty, w, h); ctx.clip();
              atlas.draw(ctx, 'wall_' + cfg.theme, tx + T / 2, ty + T / 2, T);
              ctx.restore();
            }
          }
        }
        if (!drawn) { ctx.fillStyle = '#3a3226'; ctx.fillRect(o.x, o.y, o.w, o.h); }
      }

      // 出口
      if (s.level.exitOpen()) {
        if (!atlas.draw(ctx, 'portal_' + cfg.theme, cfg.exit.x, cfg.exit.y, 56)) {
          ctx.fillStyle = '#f1c40f';
          ctx.beginPath(); ctx.arc(cfg.exit.x, cfg.exit.y, EXIT_R, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(cfg.exit.x, cfg.exit.y, EXIT_R, 0, Math.PI * 2); ctx.fill();
      }

      // 金币与箭
      s.pickups.forEach((c) => {
        if (!atlas.draw(ctx, 'coin_0', c.x, c.y, 16)) {
          ctx.fillStyle = '#f39c12';
          ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI * 2); ctx.fill();
        }
      });
      s.projectiles.forEach((a) => {
        let drawn = false;
        if (atlas.ready) {
          ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.dir);
          drawn = atlas.draw(ctx, 'arrow_0', 0, 0, 20);
          ctx.restore();
        }
        if (!drawn) {
          ctx.fillStyle = '#ecf0f1';
          ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
        }
      });

      // 敌人与Boss（前摇圈与血条保持叠加）
      const COLORS = { soldier: '#b03a2e', archer: '#9b59b6', shield: '#7f8c8d', berserker: '#d35400' };
      for (const en of s.enemies) {
        if (en.dead) continue;
        if (en.state === 'telegraph' || en.state === 'windup') {
          ctx.globalAlpha = 0.3; ctx.fillStyle = '#e74c3c';
          ctx.beginPath(); ctx.arc(en.x, en.y, en.r + 20, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        const kind = en.kind || en.type;
        const moving = en.state === 'chase' || (en.kind && en.state === 'idle');
        const name = frameFor(kind, en.state, moving, s.animTick || 0);
        const destH = en.kind ? 64 : 44;
        if (!atlas.draw(ctx, name, en.x, en.y - destH * 0.15, destH, { flipX: Math.cos(en.facing) < 0 })) {
          ctx.fillStyle = en.kind ? '#2c3e50' : COLORS[en.type];
          ctx.beginPath(); ctx.arc(en.x, en.y, en.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(en.x, en.y);
          ctx.lineTo(en.x + Math.cos(en.facing) * en.r, en.y + Math.sin(en.facing) * en.r); ctx.stroke();
        }
        hud.drawBar(ctx, en.x - 16, en.y - (en.kind ? 44 : 34), 32, 4, en.hp / en.maxHp, '#e74c3c', '#222');
      }

      // 玩家（无敌闪烁保持）
      if (player.invulnT <= 0 || Math.floor(player.invulnT * 12) % 2 === 0) {
        const moving = !!(input.joy && input.joy.mag > 0);
        const pname = frameFor('player', player.swing ? 'swing' : null, moving, s.animTick || 0);
        if (!atlas.draw(ctx, pname, player.x, player.y - 7, 44, { flipX: Math.cos(player.facing) < 0 })) {
          ctx.fillStyle = '#2980b9';
          ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(player.x, player.y);
          ctx.lineTo(player.x + Math.cos(player.facing) * 20, player.y + Math.sin(player.facing) * 20); ctx.stroke();
        }
      }
      // 挥剑：精灵弧优先，回退白色扇形
      if (player.swing) {
        let drawn = false;
        if (atlas.ready) {
          ctx.save();
          ctx.translate(player.x + Math.cos(player.swing.dir) * 40, player.y + Math.sin(player.swing.dir) * 40);
          ctx.rotate(player.swing.dir);
          drawn = atlas.draw(ctx, 'slash_' + (player.swing.stage % 2), 0, 0, 56);
          ctx.restore();
        }
        if (!drawn) {
          ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.moveTo(player.x, player.y);
          ctx.arc(player.x, player.y, player.swing.radius,
            player.swing.dir - player.swing.halfAngle, player.swing.dir + player.swing.halfAngle);
          ctx.fill(); ctx.globalAlpha = 1;
        }
      }
      ctx.restore();

      // HUD（与现状相同，摇杆/按钮改传 atlas）
      hud.drawBar(ctx, 16, 20, 140, 14, player.hp / player.maxHp, '#27ae60', '#222');
      hud.drawTextC(ctx, '金币 ' + gs.data.coins, view.w - 70, 27, 14, '#f1c40f');
      hud.drawTextC(ctx, '第 ' + (s.levelIndex + 1) + ' 关', view.w / 2, 27, 14, '#fff');
      hud.drawJoystick(ctx, input.joy, atlas);
      hud.drawActionButtons(ctx, input.buttons, player.dashCdLeft <= 0, atlas);
      // ……死亡遮罩段保持现状不变……
    }
```
（`module.exports = { createBattleScene, resolveSwing, frameFor };`）

`minigame-jiandao/src/ui/hud.js`——两个函数追加可选 atlas 参数：
```js
function drawJoystick(ctx, joy, atlas) {
  if (!joy.active) return;
  ctx.globalAlpha = 0.6;
  const baseDrawn = atlas && atlas.draw(ctx, 'joy_base', joy.baseX, joy.baseY, 96);
  ctx.globalAlpha = 1;
  if (!baseDrawn) { /* 原圆形绘制代码保持 */ }
  else {
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(joy.baseX + joy.dx * 30 * joy.mag, joy.baseY + joy.dy * 30 * joy.mag, 18, 0, Math.PI * 2);
    ctx.fill(); ctx.globalAlpha = 1;
  }
}

function drawActionButtons(ctx, buttons, dashReady, atlas) {
  const aDrawn = atlas && atlas.draw(ctx, 'btn_attack', buttons.attack.x, buttons.attack.y, buttons.attack.r * 2);
  if (!aDrawn) { /* 原攻击按钮绘制保持 */ }
  const dDrawn = atlas && atlas.draw(ctx, 'btn_dash', buttons.dash.x, buttons.dash.y, buttons.dash.r * 2);
  if (!dDrawn) { /* 原闪避按钮绘制保持 */ }
  if (dDrawn && !dashReady) { // 冷却灰罩
    ctx.globalAlpha = 0.55; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(buttons.dash.x, buttons.dash.y, buttons.dash.r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
```
（注释「原…绘制保持」处照搬现有实现代码块，不删除。）

- [ ] **Step 4: 运行确认通过 + 浏览器视觉验收**

Run: `cd minigame-jiandao && npm test`
Expected: 全部 PASS

浏览器验收（`python3 -m http.server 8080` → `/dev/`）逐项截图确认：
1. 加载页出现后进主菜单
2. 进第 1 关：山谷地板平铺、墙体贴图、骑士精灵朝向随移动翻转、行走双帧交替
3. J 攻击出现挥砍弧精灵；敌兵/弓箭手/盾兵精灵与前摇红圈叠加正常
4. 杀敌金币精灵掉落磁吸；弓箭手箭矢精灵带旋转
5. 清场后出口变传送门精灵；摇杆底盘/攻击/闪避按钮为图集图标，闪避冷却有灰罩
6. 第 4 关督军、第 8 关黑骑士精灵（telegraph 帧在前摇时显示）——可临时改存档 unlocked 验证后还原

- [ ] **Step 5: Commit**

```bash
git add minigame-jiandao/src/scenes/battle.js minigame-jiandao/src/ui/hud.js minigame-jiandao/tests/battle_sprites.test.js
git commit -m "feat: 战斗场景全面接入精灵图（实体/地图/按钮/挥砍特效，保留色块回退）"
```

---

### Task 6: 体积核对与文档收尾

**Files:**
- Modify: `minigame-jiandao/assets/README.md`
- Modify: `README.md`（根）
- Modify: `minigame-jiandao/docs/RELEASE.md`

- [ ] **Step 1: 体积与质量核对**

Run: `du -sh minigame-jiandao --exclude=dev && du -h minigame-jiandao/assets/sprites.png && cd minigame-jiandao && npm test && cd .. && npm run lint`
Expected: 主包 ≤ 2MB；sprites.png ≤ 400KB；测试全过；lint 0 errors

- [ ] **Step 2: 更新三份文档**

`minigame-jiandao/assets/README.md` 图形节替换为：
```markdown
## 图形（assets/sprites.png + sprites.json）
由 `tools/gen_atlas.js` 从 `assets-src/` 的四张 AI 生成素材图（项目自有，v01_20260706）
裁剪打包生成，44 帧。重新生成：仓库根执行 `npm install && node tools/gen_atlas.js`。
裁剪坐标清单：`tools/sprite_manifest.js`。
```

根 `README.md`：
- 「设计要点」中「首版图形为程序绘制…」一条改为「v1.1 已接入精灵图美术（图集由 `tools/gen_atlas.js` 离线生成，加载失败自动回退程序绘制）」
- Roadmap 勾掉 v1.1 精灵图项（`- [x] v1.1：精灵图美术`，其余 v1.1 子项保留）

`minigame-jiandao/docs/RELEASE.md` D 节追加一行：
```markdown
- [ ] 主包体积复核：接入图集后 du -sh 确认 ≤ 2MB（当前实测值填此处）
```

- [ ] **Step 3: Commit**

```bash
git add minigame-jiandao/assets/README.md README.md minigame-jiandao/docs/RELEASE.md
git commit -m "docs: v1.1 精灵图接入后的文档与体积核对"
```

---

## 非目标（本计划不做，防止范围蔓延）

- 菜单/选关/结算的九宫格 UI 面板与结算徽章（v1.2）
- 全帧动画（HURT/DEATH 帧、5 帧行走循环）（v1.2）
- 伤害飘字与命中闪白（v1.1 后续独立小计划）
- 上下朝向精灵（素材只有侧向，左右翻转已足够 45° 顶视风格）

## 任务依赖

Task 1 → Task 2（工具→图集）；Task 3 独立于 2（用测试假数据）；Task 4 依赖 3；Task 5 依赖 2+4；Task 6 最后。


