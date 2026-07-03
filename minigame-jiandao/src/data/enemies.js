const ENEMIES = {
  soldier:   { hp: 30, speed: 55, atk: 8,  r: 12, aggroR: 150, attackR: 26,  attackCd: 1.0, coin: 6 },
  archer:    { hp: 20, speed: 45, atk: 6,  r: 11, aggroR: 220, attackR: 180, keepR: 120, attackCd: 1.6, coin: 8, arrowSpeed: 220 },
  shield:    { hp: 45, speed: 40, atk: 10, r: 13, aggroR: 150, attackR: 28,  attackCd: 1.2, coin: 10, guardAngle: Math.PI / 2 },
  berserker: { hp: 40, speed: 50, atk: 12, r: 13, aggroR: 180, attackR: 26,  attackCd: 0.9, coin: 12, rageSpeed: 95 },
};
module.exports = { ENEMIES };
