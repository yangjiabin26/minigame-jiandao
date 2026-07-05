const CHAR = 'jiandao_asset_character_sprite_sheet_v01_20260706.png';
const BOSS = 'jiandao_asset_boss_sprite_sheet_v01_20260706.png';
const ENV = 'jiandao_asset_environment_props_tileset_v01_20260706.png';
const UI = 'jiandao_asset_ui_icon_combat_vfx_v01_20260706.png';

// 角色表：每角色的 idle/move 行 ny、nh 已用像素级行边界扫描（非背景色游程检测）精确校准。
// attack 单独指定坐标（各角色攻击帧列偏移/宽高不同，含挥砍弧光）。
// move_1（第二个 MOVE 帧）在所有角色行中列偏移一致，且需比 move_0 略窄以避免左侧相邻帧残影
const MOVE1_NX = 0.352;
const MOVE1_NW = 0.028;

function charFrames(prefix, idleY, idleH, moveY, moveH, attackSpec) {
  return [
    { name: prefix + '_idle_0', src: CHAR, nx: 0.255, ny: idleY, nw: 0.033, nh: idleH, outH: 44 },
    { name: prefix + '_move_0', src: CHAR, nx: 0.255, ny: moveY, nw: 0.033, nh: moveH, outH: 44 },
    { name: prefix + '_move_1', src: CHAR, nx: MOVE1_NX, ny: moveY, nw: MOVE1_NW, nh: moveH, outH: 44 },
    { name: prefix + '_attack_0', src: CHAR, ...attackSpec, outH: 44 },
  ];
}

const MANIFEST = [
  ...charFrames('player', 0.0387, 0.044, 0.0884, 0.044,
    { nx: 0.375, ny: 0.1354, nw: 0.09, nh: 0.041 }),
  ...charFrames('soldier', 0.2698, 0.038, 0.3076, 0.038,
    { nx: 0.375, ny: 0.346, nw: 0.075, nh: 0.034 }),
  ...charFrames('archer', 0.4548, 0.032, 0.49, 0.032,
    { nx: 0.338, ny: 0.520, nw: 0.045, nh: 0.030 }),
  ...charFrames('shield', 0.635, 0.032, 0.669, 0.032,
    { nx: 0.245, ny: 0.7366, nw: 0.045, nh: 0.032 }),
  ...charFrames('berserker', 0.805, 0.037, 0.8434, 0.037,
    { nx: 0.245, ny: 0.878, nw: 0.045, nh: 0.037 }),
  // Boss 表：上半督军 / 下半黑骑士（ny/nh 已按像素级行边界扫描校准，避开分隔虚线与相邻文字）
  { name: 'warlord_idle_0', src: BOSS, nx: 0.372, ny: 0.085, nw: 0.070, nh: 0.068, outH: 64 },
  { name: 'warlord_move_0', src: BOSS, nx: 0.335, ny: 0.1835, nw: 0.095, nh: 0.075, outH: 64 },
  { name: 'warlord_attack_0', src: BOSS, nx: 0.352, ny: 0.297, nw: 0.095, nh: 0.082, outH: 64 },
  { name: 'warlord_telegraph_0', src: BOSS, nx: 0.655, ny: 0.175, nw: 0.14, nh: 0.0857, outH: 64 },
  { name: 'blackknight_idle_0', src: BOSS, nx: 0.298, ny: 0.505, nw: 0.075, nh: 0.075, outH: 64 },
  { name: 'blackknight_move_0', src: BOSS, nx: 0.318, ny: 0.594, nw: 0.06, nh: 0.078, outH: 64 },
  { name: 'blackknight_attack_0', src: BOSS, nx: 0.278, ny: 0.7072, nw: 0.10, nh: 0.071, outH: 64 },
  { name: 'blackknight_telegraph_0', src: BOSS, nx: 0.658, ny: 0.615, nw: 0.09, nh: 0.0654, outH: 64 },
  // 环境表：三主题行（floor 宽度收窄，避免右侧相邻瓦片残影）
  // floor_* 坐标经四角背景色校验（该瓦片为圆角异形贴图，裁剪框四角必须落在米色底上，
  // 否则 chromaKey 从瓦片自身深色像素洪水填充会侵蚀纹理，见校准记录）
  { name: 'floor_valley', src: ENV, nx: 0.01105, ny: 0.2348, nw: 0.0525, nh: 0.0746, outH: 64, tolerance: 18 },
  { name: 'wall_valley', src: ENV, nx: 0.24, ny: 0.24, nw: 0.032, nh: 0.12, outH: 64 },
  { name: 'portal_valley', src: ENV, nx: 0.618, ny: 0.245, nw: 0.055, nh: 0.10, outH: 56 },
  { name: 'floor_forest', src: ENV, nx: 0.01105, ny: 0.4523, nw: 0.0525, nh: 0.0746, outH: 64, tolerance: 18 },
  { name: 'wall_forest', src: ENV, nx: 0.24, ny: 0.458, nw: 0.032, nh: 0.12, outH: 64 },
  { name: 'portal_forest', src: ENV, nx: 0.618, ny: 0.463, nw: 0.055, nh: 0.10, outH: 56 },
  { name: 'floor_castle', src: ENV, nx: 0.01105, ny: 0.6774, nw: 0.0525, nh: 0.0746, outH: 64, tolerance: 18 },
  { name: 'wall_castle', src: ENV, nx: 0.24, ny: 0.685, nw: 0.032, nh: 0.12, outH: 64 },
  { name: 'portal_castle', src: ENV, nx: 0.618, ny: 0.688, nw: 0.055, nh: 0.10, outH: 56 },
  // UI/VFX 表
  { name: 'joy_base', src: UI, nx: 0.018, ny: 0.29, nw: 0.095, nh: 0.125, outH: 128 },
  { name: 'btn_attack', src: UI, nx: 0.155, ny: 0.282, nw: 0.075, nh: 0.11, outH: 96 },
  { name: 'btn_dash', src: UI, nx: 0.255, ny: 0.326, nw: 0.055, nh: 0.083, outH: 96 },
  { name: 'slash_0', src: UI, nx: 0.010, ny: 0.640, nw: 0.075, nh: 0.06, outH: 56 },
  { name: 'slash_1', src: UI, nx: 0.085, ny: 0.640, nw: 0.075, nh: 0.06, outH: 56 },
  { name: 'arrow_0', src: UI, nx: 0.732, ny: 0.647, nw: 0.06, nh: 0.02, outH: 20 },
  { name: 'coin_0', src: UI, nx: 0.312, ny: 0.822, nw: 0.03, nh: 0.04, outH: 16 },
];

const FRAME_NAMES = MANIFEST.map((m) => m.name);
module.exports = { MANIFEST, FRAME_NAMES };
