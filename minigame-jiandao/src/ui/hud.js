function hitButton(buttons, x, y) {
  for (const b of buttons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
  }
  return null;
}

function drawBar(ctx, x, y, w, h, ratio, fg, bg) {
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fg; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
}

function drawTextC(ctx, text, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = 'bold ' + size + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function drawBtn(ctx, btn, label, enabled = true) {
  ctx.fillStyle = enabled ? '#8b5a2b' : '#555';
  ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
  ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 3;
  ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
  drawTextC(ctx, label, btn.x + btn.w / 2, btn.y + btn.h / 2, 16, enabled ? '#fff' : '#999');
}

function drawJoystick(ctx, joy) {
  if (!joy.active) return;
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(joy.baseX, joy.baseY, 44, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(joy.baseX + joy.dx * 30 * joy.mag, joy.baseY + joy.dy * 30 * joy.mag, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawActionButtons(ctx, buttons, dashReady) {
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#c0392b';
  ctx.beginPath(); ctx.arc(buttons.attack.x, buttons.attack.y, buttons.attack.r, 0, Math.PI * 2); ctx.fill();
  drawTextC(ctx, '攻', buttons.attack.x, buttons.attack.y, 22, '#fff');
  ctx.fillStyle = dashReady ? '#2980b9' : '#555';
  ctx.beginPath(); ctx.arc(buttons.dash.x, buttons.dash.y, buttons.dash.r, 0, Math.PI * 2); ctx.fill();
  drawTextC(ctx, '闪', buttons.dash.x, buttons.dash.y, 16, '#fff');
  ctx.globalAlpha = 1;
}

module.exports = { hitButton, drawBar, drawTextC, drawBtn, drawJoystick, drawActionButtons };
