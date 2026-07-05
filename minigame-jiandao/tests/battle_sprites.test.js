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
