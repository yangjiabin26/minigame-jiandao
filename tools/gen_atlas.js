const path = require('path');
const { cutSprites } = require('./cut_sprites');
const { MANIFEST } = require('./sprite_manifest');

const root = path.join(__dirname, '..');
const out = cutSprites(
  MANIFEST,
  path.join(root, 'assets-src'),
  path.join(root, 'minigame-jiandao/assets/sprites.png'),
  path.join(root, 'minigame-jiandao/assets/sprites.json')
);
console.log(`图集生成: ${out.count} 帧, ${out.w}x${out.h}`);
