function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

function circleHit(ax, ay, ar, bx, by, br) {
  const r = ar + br;
  return dist2(ax, ay, bx, by) <= r * r;
}

function circleRect(cx, cy, cr, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw), ny = clamp(cy, ry, ry + rh);
  return dist2(cx, cy, nx, ny) <= cr * cr;
}

// 归一化角差到 (-π, π]
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

// 原点 o、朝向 dir、半径 radius、半角 halfAngle 的扇形是否覆盖圆(t, tr)
function inSector(ox, oy, dir, radius, halfAngle, tx, ty, tr = 0) {
  const dx = tx - ox, dy = ty - oy;
  const d2 = dx * dx + dy * dy;
  const r = radius + tr;
  if (d2 > r * r) return false;
  if (d2 === 0) return true;
  return Math.abs(angleDiff(Math.atan2(dy, dx), dir)) <= halfAngle;
}

module.exports = { clamp, circleHit, circleRect, inSector, angleDiff };
