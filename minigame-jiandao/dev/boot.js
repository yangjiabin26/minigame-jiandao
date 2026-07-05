// 极简同步 CommonJS 加载器：仅本地开发用
/* global Image */
(function () {
  const cache = {};
  function resolve(base, path) {
    const parts = (base + '/../' + path).split('/');
    const out = [];
    for (const p of parts) {
      if (p === '.' || p === '') continue;
      if (p === '..') out.pop(); else out.push(p);
    }
    let file = out.join('/');
    if (!file.endsWith('.js')) file += '.js';
    return file;
  }
  function load(file) {
    if (cache[file]) return cache[file].exports;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '../' + file, false); // 同步，仅开发用
    xhr.send();
    const module = { exports: {} };
    cache[file] = module;
    const fn = new Function('module', 'exports', 'require',
      xhr.responseText + '\n//# sourceURL=' + file);
    fn(module, module.exports, (p) => load(resolve(file, p)));
    return module.exports;
  }

  const canvas = document.getElementById('game');
  const { createMockPlatform } = load('src/platform/mock.js');
  const platform = createMockPlatform({ canvas, width: 375, height: 667 });

  // 浏览器真实资源实现：覆盖 mock 的 Node 假 readJson/createImage
  platform.readJson = function (p) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', p, false);
      xhr.send();
      return xhr.status === 200 ? JSON.parse(xhr.responseText) : null;
    } catch (e) {
      return null;
    }
  };
  platform.createImage = function () { return new Image(); };

  // 把 mock 注入 platform/index 的缓存，让 main.js 拿到带 canvas 的实例
  const platformIndex = load('src/platform/index.js');
  platformIndex.getPlatform = () => platform;

  // 键盘 → 触摸模拟
  const keys = {};
  const JOY_ID = 100, BASE = { x: 90, y: 500 };
  function joyTouch() {
    const dx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    const dy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
    return { id: JOY_ID, x: BASE.x + dx * 60, y: BASE.y + dy * 60 };
  }
  let joyActive = false;
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ('wasd'.includes(k)) {
      keys[k] = true;
      if (!joyActive) { platform.touch.emit('start', [{ id: JOY_ID, x: BASE.x, y: BASE.y }]); joyActive = true; }
      platform.touch.emit('move', [joyTouch()]);
    }
    if (k === 'j') platform.touch.emit('start', [{ id: 200, x: 375 - 70, y: 667 - 90 }]);
    if (k === 'k') platform.touch.emit('start', [{ id: 201, x: 375 - 152, y: 667 - 56 }]);
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if ('wasd'.includes(k)) {
      keys[k] = false;
      if (!keys.w && !keys.a && !keys.s && !keys.d) {
        platform.touch.emit('end', [joyTouch()]); joyActive = false;
      } else platform.touch.emit('move', [joyTouch()]);
    }
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    platform.touch.emit('start', [{ id: 300, x: e.clientX - r.left, y: e.clientY - r.top }]);
  });
  canvas.addEventListener('mouseup', (e) => {
    const r = canvas.getBoundingClientRect();
    platform.touch.emit('end', [{ id: 300, x: e.clientX - r.left, y: e.clientY - r.top }]);
  });

  // 隐藏标签页时浏览器暂停 RAF；dev 退化为 setTimeout 驱动，保证自动化/后台验收可用
  const origRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) =>
    (document.hidden ? setTimeout(() => cb(performance.now()), 16) : origRaf(cb));

  load('src/main.js').start();
})();
