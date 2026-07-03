const STEP = 1 / 60;
const MAX_DT = 0.25;

function createStepper(update, step = STEP) {
  let acc = 0;
  return {
    advance(dt) {
      acc += Math.min(dt, MAX_DT);
      while (acc >= step) { update(step); acc -= step; }
    },
  };
}

function createLoop(update, render) {
  const stepper = createStepper(update);
  let running = false;
  let last = 0;
  function frame(now) {
    if (!running) return;
    if (last) stepper.advance((now - last) / 1000);
    last = now;
    render();
    requestAnimationFrame(frame);
  }
  return {
    start() { running = true; last = 0; requestAnimationFrame(frame); },
    stop() { running = false; },
  };
}

module.exports = { STEP, createStepper, createLoop };
