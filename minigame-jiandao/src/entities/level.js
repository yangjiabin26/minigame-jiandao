const { circleHit } = require('../core/collision');

const EXIT_R = 26;

function createLevelState(cfg) {
  let left = 0;
  return {
    get enemiesLeft() { return left; },
    noteSpawn(n) { left += n; },
    noteDeath() { left = Math.max(0, left - 1); },
    exitOpen() { return left === 0; },
    atExit(player) {
      if (left !== 0) return false;
      return circleHit(cfg.exit.x, cfg.exit.y, EXIT_R, player.x, player.y, player.r);
    },
  };
}
module.exports = { createLevelState, EXIT_R };
