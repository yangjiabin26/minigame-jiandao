function createMockPlatform(opts = {}) {
  const mem = new Map();
  const handlers = { start: [], move: [], end: [] };
  return {
    name: 'mock',
    system: { width: opts.width || 375, height: opts.height || 667, pixelRatio: 1 },
    createCanvas() { return opts.canvas || null; },
    storage: {
      get(k) { return mem.has(k) ? mem.get(k) : null; },
      set(k, v) { mem.set(k, v); },
    },
    ads: {
      adResult: opts.adResult !== undefined ? opts.adResult : true,
      adAvailable: opts.adAvailable !== undefined ? opts.adAvailable : true,
      showRewarded() { return Promise.resolve(this.adResult); },
      available() { return this.adAvailable; },
    },
    share() {},
    audio: { play() {}, stopAll() {} },
    recorder: { start() {}, stop() {} },
    onError() {},
    touch: {
      onStart(cb) { handlers.start.push(cb); },
      onMove(cb) { handlers.move.push(cb); },
      onEnd(cb) { handlers.end.push(cb); },
      emit(type, touches) { handlers[type].forEach((cb) => cb(touches)); },
    },
  };
}
module.exports = { createMockPlatform };
