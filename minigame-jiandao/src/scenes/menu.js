const hud = require('../ui/hud');
const { LINES } = require('../data/upgrades');
const { tryDiscount } = require('../flow/adgates');

const LINE_NAMES = { weapon: '武器', armor: '盔甲', dash: '闪避' };

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function createMenuScene(deps) {
  const { platform, gs, view, go } = deps;
  let adBusy = false, discountFailed = false;
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
    enter() { layout(); discountFailed = false; },
    onTap(x, y) {
      if (adBusy) return;
      const id = hud.hitButton(buttons, x, y);
      if (!id) return;
      if (id === 'start') { go('levelselect'); return; }
      if (id === 'discount') {
        if (!platform.ads.available()) return;
        adBusy = true;
        tryDiscount(platform.ads, gs, today()).then((ok) => {
          adBusy = false;
          if (ok) { gs.setPendingHalf(true); discountFailed = false; }
          else { discountFailed = true; }
        }).catch(() => { adBusy = false; discountFailed = true; });
        return;
      }
      const line = id.split(':')[1];
      const halfNext = !!gs.data.pendingHalf;
      if (gs.buyUpgrade(line, halfNext)) { platform.audio.play('coin'); }
    },
    render(ctx) {
      ctx.fillStyle = '#2c2620'; ctx.fillRect(0, 0, view.w, view.h);
      hud.drawTextC(ctx, '剑 道', view.w / 2, 100, 44, '#f1c40f');
      hud.drawTextC(ctx, '铁匠铺', view.w / 2, 200, 20, '#fff');
      hud.drawTextC(ctx, '金币 ' + gs.data.coins, view.w / 2, 160, 16, '#f1c40f');
      const halfNext = !!gs.data.pendingHalf;
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
      const adOk = platform.ads.available();
      let label, enabled;
      if (halfNext) { label = '下次升级半价已激活'; enabled = false; }
      else if (!adOk) { label = '广告暂不可用'; enabled = false; }
      else if (discountFailed) { label = '广告暂不可用'; enabled = false; }
      else { label = '看视频获半价 (今日剩' + left + '次)'; enabled = left > 0 && !adBusy; }
      hud.drawBtn(ctx, dBtn, label, enabled);
      hud.drawBtn(ctx, buttons[4], '开始闯关');

      // 16+ 适龄提示（CADPA 显著位置）
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(16, 16, 44, 24);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, 44, 24);
      hud.drawTextC(ctx, '16+', 16 + 22, 16 + 12, 14, '#fff');
    },
  };
}
module.exports = { createMenuScene };
