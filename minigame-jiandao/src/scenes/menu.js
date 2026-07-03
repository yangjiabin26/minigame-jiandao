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
