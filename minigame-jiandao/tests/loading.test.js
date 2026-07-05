const test = require('node:test');
const assert = require('node:assert');
const { createLoadingScene } = require('../src/scenes/loading');
const { createAtlas } = require('../src/core/images');
const { createMockPlatform } = require('../src/platform/mock');

const JSON_BODY = { meta: { w: 10, h: 10 }, frames: { a: { x: 0, y: 0, w: 5, h: 5 } } };
function tick() { return new Promise((r) => setTimeout(r, 5)); }

function makeDeps(files, imgOk) {
  const platform = createMockPlatform({ files, imageLoadResult: imgOk });
  const gone = [];
  const deps = {
    platform, gs: null, input: null, view: { w: 375, h: 667 },
    atlas: createAtlas(platform),
    go: (n) => gone.push(n),
  };
  return { deps, gone };
}

test('加载成功自动进入主菜单', async () => {
  const { deps, gone } = makeDeps({ 'assets/sprites.json': JSON_BODY }, true);
  createLoadingScene(deps).enter();
  await tick();
  assert.deepStrictEqual(gone, ['menu']);
  assert.ok(deps.atlas.ready);
});

test('失败显示重试，点重试成功后进入主菜单', async () => {
  const { deps, gone } = makeDeps({ 'assets/sprites.json': JSON_BODY }, false);
  const scene = createLoadingScene(deps);
  scene.enter();
  await tick();
  assert.deepStrictEqual(gone, []);           // 停在加载页
  assert.ok(scene.failed());                   // 暴露给渲染用
  // 修正 mock 使下次加载成功，再点重试
  deps.platform.setImageLoadResult(true);
  scene.onTap(375 / 2, 667 / 2 + 40);          // 重试按钮位置
  await tick();
  assert.deepStrictEqual(gone, ['menu']);
});

test('重试3次仍失败则降级进入主菜单（色块可玩）', async () => {
  const { deps, gone } = makeDeps({ 'assets/sprites.json': JSON_BODY }, false);
  const scene = createLoadingScene(deps);
  scene.enter();
  await tick();
  for (let i = 0; i < 3; i++) { scene.onTap(375 / 2, 667 / 2 + 40); await tick(); }
  assert.deepStrictEqual(gone, ['menu']);
  assert.ok(!deps.atlas.ready);
});
