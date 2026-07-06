function createAtlas(platform) {
  let img = null, frames = null, ready = false;
  const atlas = {
    get ready() { return ready; },
    has(name) { return !!(frames && frames[name]); },
    load(basePath) {
      const json = platform.readJson(basePath + '.json');
      if (!json || !json.frames) return Promise.resolve(false);
      frames = json.frames;
      return new Promise((resolve) => {
        try {
          img = platform.createImage();
          img.onload = () => { ready = true; resolve(true); };
          img.onerror = () => { ready = false; resolve(false); };
          img.src = basePath + '.png';
        } catch (e) {
          ready = false;
          resolve(false);
        }
      });
    },
    // 以 (cx,cy) 为中心绘制帧，高 destH，宽按帧宽高比。失败返回 false，调用方走色块回退。
    draw(ctx, name, cx, cy, destH, opt = {}) {
      if (!ready || !frames || !frames[name]) return false;
      const f = frames[name];
      const destW = (f.w / f.h) * destH;
      const dx = cx - destW / 2, dy = cy - destH / 2;
      if (opt.flipX) {
        ctx.save();
        ctx.translate(cx * 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, f.x, f.y, f.w, f.h, dx, dy, destW, destH);
        ctx.restore();
      } else {
        ctx.drawImage(img, f.x, f.y, f.w, f.h, dx, dy, destW, destH);
      }
      return true;
    },
  };
  return atlas;
}
module.exports = { createAtlas };
