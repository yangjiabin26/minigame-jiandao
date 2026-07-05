# 素材清单

## 音效（assets/audio/）

来源：Kenney.nl 免费 CC0 音效包（原始文件为 .ogg，已用 ffmpeg 转码为 .mp3，
`libmp3lame -qscale:a 4`，未改变音高/时长/内容）。

| 文件 | 用途 | 时长 | 原始文件 | 来源包 |
|---|---|---|---|---|
| attack.mp3 | 挥剑 | 0.57s | knifeSlice2.ogg | Kenney RPG Audio (CC0) |
| hit.mp3 | 命中敌人 | 0.27s | impactMetal_medium_000.ogg | Kenney Impact Sounds (CC0) |
| hurt.mp3 | 玩家受伤 | 0.65s | impactPunch_heavy_000.ogg | Kenney Impact Sounds (CC0) |
| dash.mp3 | 闪避 | 0.42s | cloth2.ogg | Kenney RPG Audio (CC0) |
| coin.mp3 | 拾取金币 | 0.34s | handleCoins2.ogg | Kenney RPG Audio (CC0) |
| die.mp3 | 阵亡 | 0.94s | impactMining_000.ogg | Kenney Impact Sounds (CC0) |

下载地址：
- https://kenney.nl/assets/rpg-audio （Kenney RPG Audio）
- https://kenney.nl/assets/impact-sounds （Kenney Impact Sounds）

许可协议：均为 CC0 1.0 (Creative Commons Zero / 公共领域贡献)，
可用于个人及商业项目，署名非强制。原始许可文件摘要：

> License (Creative Commons Zero, CC0)
> http://creativecommons.org/publicdomain/zero/1.0/
> You may use these assets in personal and commercial projects.
> Credit (Kenney or www.kenney.nl) would be nice but is not mandatory.

素材总体积约 60KB（< 500KB 预算）。

### 回退方案说明

若未来需要离线重新生成音效（例如无法访问 kenney.nl），仓库根目录的
`tools/gen_audio.js`（零依赖 Node 脚本）可以合成 6 个占位 WAV 音效
（下扫音、噪声冲击音、锯齿波、白噪声呼啸、双音金币声、下行阵亡音）。
当前 `assets/audio/` 下使用的是上述 Kenney CC0 mp3，`gen_audio.js`
仅作为备用工具保留，未在本次提交中启用。若切换为其运行结果（.wav），
需要同步修改 `minigame-jiandao/src/platform/douyin.js` 中拼接音频路径的
`'.mp3'` 后缀为 `'.wav'`（抖音小游戏 InnerAudioContext 同时支持
mp3 与 wav 格式）。

## 图形（assets/sprites.png + sprites.json）

由 `tools/gen_atlas.js` 从 `assets-src/` 的四张 AI 生成素材图（项目自有，v01_20260706）
裁剪打包生成，44 帧。重新生成：仓库根执行 `npm install && node tools/gen_atlas.js`。
裁剪坐标清单：`tools/sprite_manifest.js`。
