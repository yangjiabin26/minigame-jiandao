const test = require('node:test');
const assert = require('node:assert');
const { createAtlas } = require('../src/core/images');
const { createMockPlatform } = require('../src/platform/mock');

const JSON_BODY = { meta: { w: 100, h: 50 }, frames: { hero: { x: 0, y: 0, w: 20, h: 40 } } };

function platformWith(files, imgOk = true) {
  const p = createMockPlatform({ files, imageLoadResult: imgOk });
  return p;
}

test('json 与图片都就绪后 ready=true 且 has 命中', async () => {
  const p = platformWith({ 'assets/sprites.json': JSON_BODY });
  const atlas = createAtlas(p);
  const ok = await atlas.load('assets/sprites');
  assert.strictEqual(ok, true);
  assert.ok(atlas.ready);
  assert.ok(atlas.has('hero'));
  assert.ok(!atlas.has('nope'));
});

test('图片加载失败 -> ready=false，draw 返回 false（走色块回退）', async () => {
  const p = platformWith({ 'assets/sprites.json': JSON_BODY }, false);
  const atlas = createAtlas(p);
  const ok = await atlas.load('assets/sprites');
  assert.strictEqual(ok, false);
  assert.ok(!atlas.ready);
  assert.strictEqual(atlas.draw(null, 'hero', 0, 0, 40), false);
});

test('json 缺失 -> load false 不抛异常', async () => {
  const atlas = createAtlas(platformWith({}));
  assert.strictEqual(await atlas.load('assets/sprites'), false);
});

test('draw 以中心锚点计算目标矩形并水平翻转', async () => {
  const p = platformWith({ 'assets/sprites.json': JSON_BODY });
  const atlas = createAtlas(p);
  await atlas.load('assets/sprites');
  const calls = [];
  const ctx = {
    save() { calls.push(['save']); }, restore() { calls.push(['restore']); },
    scale(x, y) { calls.push(['scale', x, y]); }, translate(x, y) { calls.push(['translate', x, y]); },
    drawImage(...a) { calls.push(['drawImage', ...a.slice(1)]); }, // 略过 img 引用
  };
  assert.strictEqual(atlas.draw(ctx, 'hero', 100, 200, 80), true);
  // 帧 20x40，destH=80 -> destW=40；中心(100,200) -> 左上(80,160)
  const d = calls.find((c) => c[0] === 'drawImage');
  assert.deepStrictEqual(d.slice(1), [0, 0, 20, 40, 80, 160, 40, 80]);
  atlas.draw(ctx, 'hero', 100, 200, 80, { flipX: true });
  assert.ok(calls.some((c) => c[0] === 'scale' && c[1] === -1));
});
