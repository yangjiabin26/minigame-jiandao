const hud = require('../ui/hud');
const { tryDouble } = require('../flow/adgates');

function createResultScene(deps) {
  const { platform, gs, view, go } = deps;
  let s = null;

  return {
    enter({ levelIndex, earned, isBoss }) {
      s = {
        levelIndex, earned, isBoss, doubled: false, adBusy: false, adFailed: false,
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
      if (id === 'double' && !s.doubled && s.earned > 0 && platform.ads.available()) {
        s.adBusy = true;
        tryDouble(platform.ads, s.earned).then((total) => {
          s.adBusy = false;
          if (total > s.earned) { gs.addCoins(total - s.earned); s.earned = total; s.doubled = true; } else { s.adFailed = true; }
        }).catch(() => { s.adBusy = false; s.adFailed = true; });
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
      if (s.earned > 0 && platform.ads.available() && !s.doubled) {
        hud.drawBtn(ctx, s.buttons[0], s.adFailed ? '广告暂不可用' : '看视频金币翻倍', !s.adBusy && !s.adFailed);
      } else {
        hud.drawBtn(ctx, s.buttons[0], s.doubled ? '已翻倍' : '广告暂不可用', false);
      }
      if (s.isBoss) hud.drawBtn(ctx, s.buttons[1], '炫耀战绩', !s.adBusy);
      hud.drawBtn(ctx, s.buttons[2], s.levelIndex + 1 < 8 ? '下一关' : '返回主菜单', !s.adBusy);
      hud.drawBtn(ctx, s.buttons[3], '主菜单', !s.adBusy);
    },
  };
}
module.exports = { createResultScene };
