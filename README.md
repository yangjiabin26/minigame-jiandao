# 剑道 · Jiandao

> 一款抖音小游戏：2D 顶视角动作闯关。扮演身披重甲的骑士，穿越山谷、森林与城堡，升级武器与盔甲，击败黑骑士，铸就冠军之路。

**原生 JavaScript + Canvas 2D，零运行时依赖，零引擎。** 92 个单元测试覆盖全部核心逻辑，可在浏览器中直接试玩。

- 分类：动作 / H5 / 战士 / 闯关（适龄提示 16+）
- 平台：[抖音小游戏](https://developer.open-douyin.com/)（微信小游戏可低成本移植——所有平台 API 隔离在一个文件里）

## 玩法

- **8 个关卡**，三大场景：山谷（1-2）→ 森林（3-4）→ 城堡（5-8）
- **4 种敌人**：敌兵（追击近战）、弓箭手（保持距离放箭）、盾兵（正面免伤需绕背）、狂战士（半血狂暴加速）
- **2 个 Boss**：第 4 关「山谷督军」（横扫 + 冲锋，技能带前摇提示）、第 8 关「黑骑士」（血量三阶段，二阶段起八向箭雨）
- **战斗**：虚拟摇杆八向移动，三连击（第三击高伤高击退），闪避带 0.3s 无敌帧
- **三线成长**：铁匠铺用金币升级武器（+攻击）/ 盔甲（+生命）/ 闪避（减 CD 加距离），本地存档
- **变现**：三个激励视频广告点位（原地复活 / 金币双倍 / 升级半价），全部用户主动触发、失败自动降级不卡流程

## 快速开始

### 浏览器试玩（无需任何安装）

```bash
cd minigame-jiandao
python3 -m http.server 8080
# 打开 http://localhost:8080/dev/
```

| 按键 | 功能 |
|---|---|
| W / A / S / D | 移动 |
| J | 攻击（连按三连击） |
| K | 闪避 |
| 鼠标点击 | UI 按钮 |

`dev/` 目录是开发专用 harness（含一个 30 行的 CommonJS 加载器和键盘→触摸模拟），不会进入小游戏发布包。

### 抖音开发者工具

1. 下载[抖音开发者工具](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/developer-instrument/developer-instrument-update-and-download)
2. 导入 `minigame-jiandao/` 目录（默认 `touristappid` 可直接模拟器运行）
3. 上线全流程（账号注册 → 软著 → 流量主 → 提审）见 [minigame-jiandao/docs/RELEASE.md](minigame-jiandao/docs/RELEASE.md)

### 测试与代码检查

```bash
npm install        # 仅安装 dev 工具（ESLint）；游戏本体零依赖
npm test           # 92 个单元测试（Node ≥ 18，内置 node:test，无测试框架依赖）
npm run lint       # ESLint（Google Style 近似配置）
```

## 项目结构

```
minigame-jiandao/          # 小游戏本体（即抖音开发者工具的导入目录）
├── game.js  game.json  project.config.json
├── src/
│   ├── main.js            # 场景管理器 + 游戏入口
│   ├── state.js           # 玩家进度（金币/升级/解锁），改动即持久化
│   ├── core/              # 自建轻量框架：循环/输入/碰撞/镜头/动画/对象池/存档
│   ├── platform/          # 平台隔离层：douyin.js（唯一允许 tt.* 的文件）+ mock.js
│   ├── flow/adgates.js    # 三个广告点位（失败降级、绝不消耗玩家资源）
│   ├── data/              # 数据驱动：升级数值表 / 敌人数值表 / 8 关配置
│   ├── entities/          # 玩家 / 敌人AI状态机 / Boss / 箭矢 / 金币 / 关卡
│   ├── scenes/            # 主菜单(铁匠铺) / 选关 / 战斗 / 结算
│   └── ui/hud.js          # 摇杆/按钮/血条绘制
├── tests/                 # node:test 单元测试
├── dev/                   # 浏览器试玩 harness（不进发布包）
├── assets/audio/          # 6 个音效（Kenney CC0，来源见 assets/README.md）
└── docs/RELEASE.md        # 上线操作手册（联调/资质/提审/运营）

docs/superpowers/          # 设计文档与实施计划（开发过程档案）
tools/                     # 仓库级开发脚本
```

## 设计要点

- **不用引擎**：游戏逻辑约 1400 行，固定步长循环 + Canvas 2D 就够了。主包 < 300KB（平台上限 4MB），加载即玩
- **平台层隔离**：全部 `tt.*` API 集中在 `src/platform/douyin.js`，Node 测试和浏览器试玩用同接口的 mock —— 这也是移植微信小游戏时唯一要动的地方
- **数据驱动关卡**：加一关 = 在 `src/data/levels.js` 加一份配置，不改任何逻辑代码
- **广告审核红线内建**：广告失败绝不卡流程、绝不消耗玩家资源，按钮置灰有明确提示（对应平台常见拒审原因）
- **v1.1 已接入精灵图美术**（图集由 `tools/gen_atlas.js` 离线生成，加载失败自动回退程序绘制）

## Roadmap

- [ ] 抖音真机验收 → 提审上线（按 `docs/RELEASE.md`）
- [x] v1.1：精灵图美术
- [ ] v1.1：命中闪白与伤害飘字、Boss 走位优化、录屏分享
- [ ] v1.2：9-15 新关卡、新敌人类型；视数据决定是否引入内购

## License

代码采用 [MIT License](LICENSE)。

音效素材来自 [Kenney](https://kenney.nl/)（CC0 1.0，可商用，无署名要求），明细见 [assets/README.md](minigame-jiandao/assets/README.md)。
