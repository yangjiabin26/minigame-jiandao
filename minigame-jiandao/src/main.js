const { getPlatform } = require('./platform/index');
const { createStore } = require('./core/storage');
const { createGameState } = require('./state');
const { createInput } = require('./core/input');
const { createLoop } = require('./core/loop');
const { createSceneManager } = require('./core/scenes');
const { createAtlas } = require('./core/images');
const { createLoadingScene } = require('./scenes/loading');
const { createMenuScene } = require('./scenes/menu');
const { createLevelSelectScene } = require('./scenes/levelselect');
const { createBattleScene } = require('./scenes/battle');
const { createResultScene } = require('./scenes/result');

function start() {
  const platform = getPlatform();
  const canvas = platform.createCanvas();
  if (!canvas) { console.log('[jiandao] 无canvas环境（测试模式），跳过启动'); return null; }

  const view = { w: platform.system.width, h: platform.system.height };
  const dpr = platform.system.pixelRatio;
  canvas.width = view.w * dpr;
  canvas.height = view.h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const gs = createGameState(createStore(platform.storage));
  const input = createInput(view.w, view.h);
  const sm = createSceneManager();
  const deps = { platform, gs, input, view, atlas: createAtlas(platform), go: (n, p) => sm.go(n, p) };

  sm.register('loading', createLoadingScene(deps));
  sm.register('menu', createMenuScene(deps));
  sm.register('levelselect', createLevelSelectScene(deps));
  sm.register('battle', createBattleScene(deps));
  sm.register('result', createResultScene(deps));

  platform.touch.onStart((ts) => { input.onStart(ts); for (const t of ts) sm.tap(t.x, t.y); });
  platform.touch.onMove((ts) => input.onMove(ts));
  platform.touch.onEnd((ts) => input.onEnd(ts));
  platform.onError((e) => console.error('[jiandao]', e));

  sm.go('loading');
  const loop = createLoop((dt) => sm.update(dt), () => sm.render(ctx));
  loop.start();
  return { sm, gs };
}

module.exports = { start };
