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
