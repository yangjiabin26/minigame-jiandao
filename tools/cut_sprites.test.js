const test = require('node:test');
const assert = require('node:assert');
const { PNG } = require('pngjs');
const { cropNorm, chromaKey, scaleNN, shelfPack } = require('./cut_sprites');

// 构造 20x20 测试图：米色底(232,228,218)，中央 10x10 红色方块
function makeFixture() {
  const png = new PNG({ width: 20, height: 20 });
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      const i = (y * 20 + x) * 4;
      const inBox = x >= 5 && x < 15 && y >= 5 && y < 15;
      png.data[i] = inBox ? 200 : 232;
      png.data[i + 1] = inBox ? 30 : 228;
      png.data[i + 2] = inBox ? 30 : 218;
      png.data[i + 3] = 255;
    }
  }
  return png;
}

test('cropNorm 按归一化坐标裁剪', () => {
  const out = cropNorm(makeFixture(), 0.25, 0.25, 0.5, 0.5); // 中央 10x10
  assert.strictEqual(out.width, 10);
  assert.strictEqual(out.height, 10);
  assert.strictEqual(out.data[0], 200); // 全是红色
});

test('chromaKey 从角落清除底色，保留内容', () => {
  const out = chromaKey(makeFixture(), 30);
  assert.strictEqual(out.data[3], 0);                    // 角落变透明
  const c = ((10 * 20) + 10) * 4;
  assert.strictEqual(out.data[c + 3], 255);              // 中央红块不透明
});

test('scaleNN 最近邻缩放保持宽高比', () => {
  const out = scaleNN(makeFixture(), 10); // 20x20 -> 10x10
  assert.strictEqual(out.width, 10);
  assert.strictEqual(out.height, 10);
});

test('shelfPack 不重叠且都在版面内', () => {
  const frames = [
    { name: 'a', png: new PNG({ width: 30, height: 20 }) },
    { name: 'b', png: new PNG({ width: 30, height: 25 }) },
    { name: 'c', png: new PNG({ width: 900, height: 10 }) },
  ];
  const { sheet, placements } = shelfPack(frames, 100);
  assert.ok(sheet.width <= 1024);
  const a = placements.a, b = placements.b;
  const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  assert.ok(!overlap);
  for (const p of Object.values(placements)) {
    assert.ok(p.x + p.w <= sheet.width && p.y + p.h <= sheet.height);
  }
});
