// 地图约定：竖长房间，玩家从下方出生，出口在上方。obstacles 是不可通行矩形。
const LEVELS = [
  { // L1 山谷：教学关，3 敌兵
    theme: 'valley', w: 750, h: 1000,
    obstacles: [{ x: 200, y: 400, w: 120, h: 40 }, { x: 450, y: 620, w: 120, h: 40 }],
    spawns: [
      { type: 'soldier', x: 300, y: 620 }, { type: 'soldier', x: 480, y: 430 },
      { type: 'soldier', x: 370, y: 250 },
    ],
    playerStart: { x: 375, y: 900 }, exit: { x: 375, y: 80 },
  },
  { // L2 山谷：引入弓箭手
    theme: 'valley', w: 750, h: 1100,
    obstacles: [{ x: 120, y: 350, w: 160, h: 40 }, { x: 470, y: 550, w: 160, h: 40 }, { x: 280, y: 780, w: 180, h: 40 }],
    spawns: [
      { type: 'soldier', x: 200, y: 700 }, { type: 'soldier', x: 550, y: 700 },
      { type: 'soldier', x: 375, y: 470 }, { type: 'soldier', x: 200, y: 280 },
      { type: 'archer', x: 550, y: 250 },
    ],
    playerStart: { x: 375, y: 1000 }, exit: { x: 375, y: 80 },
  },
  { // L3 森林：引入盾兵
    theme: 'forest', w: 800, h: 1100,
    obstacles: [{ x: 100, y: 300, w: 60, h: 220 }, { x: 640, y: 300, w: 60, h: 220 }, { x: 320, y: 600, w: 160, h: 60 }],
    spawns: [
      { type: 'soldier', x: 250, y: 750 }, { type: 'soldier', x: 550, y: 750 },
      { type: 'soldier', x: 400, y: 500 }, { type: 'archer', x: 200, y: 250 },
      { type: 'archer', x: 600, y: 250 }, { type: 'shield', x: 400, y: 350 },
    ],
    playerStart: { x: 400, y: 1000 }, exit: { x: 400, y: 80 },
  },
  { // L4 森林 Boss：督军 + 2 护卫
    theme: 'forest', w: 800, h: 1000, boss: 'warlord',
    obstacles: [],
    spawns: [{ type: 'soldier', x: 250, y: 400 }, { type: 'soldier', x: 550, y: 400 }],
    playerStart: { x: 400, y: 900 }, exit: { x: 400, y: 80 },
  },
  { // L5 城堡：引入狂战士
    theme: 'castle', w: 800, h: 1100,
    obstacles: [{ x: 200, y: 400, w: 400, h: 50 }],
    spawns: [
      { type: 'shield', x: 300, y: 700 }, { type: 'shield', x: 500, y: 700 },
      { type: 'archer', x: 250, y: 280 }, { type: 'archer', x: 550, y: 280 },
      { type: 'berserker', x: 400, y: 550 },
    ],
    playerStart: { x: 400, y: 1000 }, exit: { x: 400, y: 80 },
  },
  { // L6 城堡：狂战士群
    theme: 'castle', w: 800, h: 1200,
    obstacles: [{ x: 120, y: 380, w: 200, h: 50 }, { x: 480, y: 380, w: 200, h: 50 }, { x: 300, y: 750, w: 200, h: 50 }],
    spawns: [
      { type: 'berserker', x: 250, y: 900 }, { type: 'berserker', x: 550, y: 900 },
      { type: 'berserker', x: 400, y: 600 }, { type: 'shield', x: 300, y: 300 },
      { type: 'shield', x: 500, y: 300 }, { type: 'archer', x: 400, y: 180 },
      { type: 'archer', x: 150, y: 550 },
    ],
    playerStart: { x: 400, y: 1100 }, exit: { x: 400, y: 80 },
  },
  { // L7 城堡：大混战
    theme: 'castle', w: 850, h: 1300,
    obstacles: [{ x: 150, y: 450, w: 120, h: 120 }, { x: 580, y: 450, w: 120, h: 120 }, { x: 360, y: 850, w: 130, h: 120 }],
    spawns: [
      { type: 'soldier', x: 250, y: 1000 }, { type: 'soldier', x: 600, y: 1000 },
      { type: 'shield', x: 300, y: 650 }, { type: 'shield', x: 550, y: 650 },
      { type: 'berserker', x: 425, y: 500 }, { type: 'berserker', x: 200, y: 300 },
      { type: 'archer', x: 425, y: 200 }, { type: 'archer', x: 650, y: 300 },
    ],
    playerStart: { x: 425, y: 1200 }, exit: { x: 425, y: 80 },
  },
  { // L8 城堡 Boss：黑骑士单挑
    theme: 'castle', w: 800, h: 1000, boss: 'blackknight',
    obstacles: [],
    spawns: [],
    playerStart: { x: 400, y: 900 }, exit: { x: 400, y: 80 },
  },
];
module.exports = { LEVELS };
