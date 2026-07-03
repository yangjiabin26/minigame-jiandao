const { createMockPlatform } = require('./mock');

let cached = null;
function getPlatform() {
  if (cached) return cached;
  if (typeof tt !== 'undefined') {
    const { createDouyinPlatform } = require('./douyin');
    cached = createDouyinPlatform();
  } else {
    cached = createMockPlatform();
  }
  return cached;
}
module.exports = { getPlatform };
