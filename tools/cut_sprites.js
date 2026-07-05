// 切图工具：从展示排版图裁剪→抠底→缩放→打包成游戏图集。仅开发期使用（pngjs 为 devDependency）。
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function cropNorm(png, nx, ny, nw, nh) {
  const x = Math.round(nx * png.width), y = Math.round(ny * png.height);
  const w = Math.round(nw * png.width), h = Math.round(nh * png.height);
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(png, out, x, y, w, h, 0, 0);
  return out;
}

// 从四角 flood-fill：与角点颜色相近(容差)的连通区域置透明
function chromaKey(png, tolerance = 30) {
  const { width: w, height: h, data } = png;
  const visited = new Uint8Array(w * h);
  const seeds = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
  for (const [sx, sy] of seeds) {
    const si = (sy * w + sx) * 4;
    const [br, bg, bb] = [data[si], data[si + 1], data[si + 2]];
    const stack = [[sx, sy]];
    while (stack.length) {
      const [x, y] = stack.pop();
      const idx = y * w + x;
      if (x < 0 || y < 0 || x >= w || y >= h || visited[idx]) continue;
      const i = idx * 4;
      if (Math.abs(data[i] - br) + Math.abs(data[i + 1] - bg) + Math.abs(data[i + 2] - bb) > tolerance * 3) continue;
      visited[idx] = 1;
      data[i + 3] = 0;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }
  return png;
}

function scaleNN(png, outH) {
  const scale = outH / png.height;
  const w = Math.max(1, Math.round(png.width * scale));
  const out = new PNG({ width: w, height: outH });
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(png.width - 1, Math.floor(x / scale));
      const sy = Math.min(png.height - 1, Math.floor(y / scale));
      const si = (sy * png.width + sx) * 4, di = (y * w + x) * 4;
      for (let k = 0; k < 4; k++) out.data[di + k] = png.data[si + k];
    }
  }
  return out;
}

// 行式打包：按高度降序放入行架
function shelfPack(frames, maxW = 1024) {
  const sorted = [...frames].sort((a, b) => b.png.height - a.png.height);
  const placements = {};
  let x = 0, y = 0, rowH = 0, sheetW = 0;
  const PAD = 2;
  for (const f of sorted) {
    if (x + f.png.width > maxW) { x = 0; y += rowH + PAD; rowH = 0; }
    placements[f.name] = { x, y, w: f.png.width, h: f.png.height };
    x += f.png.width + PAD;
    rowH = Math.max(rowH, f.png.height);
    sheetW = Math.max(sheetW, x);
  }
  // 版面宽取实际占用（单帧宽超过 maxW 时允许超出，保证不越界裁切）
  const sheet = new PNG({ width: sheetW, height: y + rowH });
  for (const f of sorted) {
    const p = placements[f.name];
    PNG.bitblt(f.png, sheet, 0, 0, p.w, p.h, p.x, p.y);
  }
  return { sheet, placements };
}

function cutSprites(manifest, srcDir, outPngPath, outJsonPath) {
  const srcCache = {};
  const frames = manifest.map((m) => {
    if (!srcCache[m.src]) {
      srcCache[m.src] = PNG.sync.read(fs.readFileSync(path.join(srcDir, m.src)));
    }
    let png = cropNorm(srcCache[m.src], m.nx, m.ny, m.nw, m.nh);
    png = chromaKey(png, m.tolerance || 30);
    png = scaleNN(png, m.outH);
    return { name: m.name, png };
  });
  const { sheet, placements } = shelfPack(frames);
  fs.writeFileSync(outPngPath, PNG.sync.write(sheet));
  fs.writeFileSync(outJsonPath, JSON.stringify({ meta: { w: sheet.width, h: sheet.height }, frames: placements }));
  return { count: frames.length, w: sheet.width, h: sheet.height };
}

module.exports = { cropNorm, chromaKey, scaleNN, shelfPack, cutSprites };
