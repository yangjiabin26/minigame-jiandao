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
