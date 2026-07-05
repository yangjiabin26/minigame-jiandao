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
