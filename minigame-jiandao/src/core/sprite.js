function createAnim({ frames, fps, loop = true }) {
  const a = {
    frame: 0, done: false, _t: 0,
    update(dt) {
      if (a.done) return;
      a._t += dt;
      const idx = Math.floor(a._t * fps);
      if (loop) { a.frame = idx % frames; return; }
      if (idx >= frames - 1) { a.frame = frames - 1; a.done = true; } else { a.frame = idx; }
    },
    reset() { a.frame = 0; a.done = false; a._t = 0; },
  };
  return a;
}
module.exports = { createAnim };
