const { LEVELS } = require('../data/levels');
const { createLevelState, EXIT_R } = require('../entities/level');
const { createPlayer } = require('../entities/player');
const { createEnemy } = require('../entities/enemy');
const { createBoss } = require('../entities/boss');
const { createProjectiles } = require('../entities/projectile');
const { createPickups } = require('../entities/pickup');
const { createCamera } = require('../core/camera');
const { inSector, circleHit } = require('../core/collision');
const { attackOf, maxHpOf, dashCooldownOf, dashDistOf } = require('../data/upgrades');
const { tryRevive } = require('../flow/adgates');
const hud = require('../ui/hud');

const THEME_BG = { valley: '#7a8c5a', forest: '#3e5a3e', castle: '#5a5a6a' };

// 挥剑结算：对扇形内每个敌人造成伤害与击退，返回击杀数
function resolveSwing(swing, player, enemies) {
  let kills = 0;
  for (const en of enemies) {
    if (en.dead) continue;
    if (!inSector(player.x, player.y, swing.dir, swing.radius, swing.halfAngle, en.x, en.y, en.r)) continue;
    const wasDead = en.dead;
    en.takeHit(swing.dmg, Math.cos(swing.dir) * swing.knock, Math.sin(swing.dir) * swing.knock, swing.dir);
    if (!wasDead && en.dead) kills++;
  }
  return kills;
}

function createBattleScene(deps) {
  const { platform, gs, input, view, go } = deps;
  let s = null; // 每次 enter 重建的局内状态

  function reviveLabel() {
    if (s.reviveUsed) return '本关已复活过';
    if (s.reviveFailed) return '广告暂不可用';
    if (!platform.ads.available()) return '本关不可复活';
    return '看视频原地复活';
  }
  function reviveEnabled() {
    return !s.reviveUsed && !s.adBusy && !s.reviveFailed && platform.ads.available();
  }

  function spawnAll(cfg) {
    const list = cfg.spawns.map((sp) => createEnemy(sp.type, sp.x, sp.y));
    if (cfg.boss) list.push(createBoss(cfg.boss, cfg.w / 2, 250));
    return list;
  }

  return {
    enter({ levelIndex }) {
      const cfg = LEVELS[levelIndex];
      const enemies = spawnAll(cfg);
      const level = createLevelState(cfg);
      level.noteSpawn(enemies.length); // 含 Boss，清空才开门
      s = {
        levelIndex, cfg, enemies,
        level,
        player: createPlayer({
          atk: attackOf(gs.levelOf('weapon')),
          maxHp: maxHpOf(gs.levelOf('armor')),
          dashCd: dashCooldownOf(gs.levelOf('dash')),
          dashDist: dashDistOf(gs.levelOf('dash')),
          x: cfg.playerStart.x, y: cfg.playerStart.y,
        }),
        projectiles: createProjectiles(),
        pickups: createPickups(),
        camera: createCamera(view.w, view.h),
        earned: 0, reviveUsed: false, reviveFailed: false, phase: 'playing', adBusy: false,
        deadButtons: [
          { id: 'revive', x: view.w / 2 - 110, y: view.h / 2, w: 220, h: 52 },
          { id: 'giveup', x: view.w / 2 - 110, y: view.h / 2 + 70, w: 220, h: 44 },
        ],
      };
      input.reset();
      platform.recorder.start();
    },
    exit() { platform.recorder.stop(); s = null; },

    update(dt) {
      if (!s || s.phase !== 'playing') return;
      const { player, enemies, cfg } = s;
      const world = {
        player, walls: cfg.obstacles, mapW: cfg.w, mapH: cfg.h,
        shoot: (x, y, dir, dmg, speed) => s.projectiles.spawn(x, y, dir, dmg, speed),
      };

      // 输入
      for (const ev of input.consume()) {
        if (ev === 'attack') {
          const swing = player.tryAttack();
          if (swing) {
            platform.audio.play('attack');
            const before = s.enemies.filter((e) => !e.dead).length;
            resolveSwing(swing, player, s.enemies);
            const after = s.enemies.filter((e) => !e.dead).length;
            for (let i = 0; i < before - after; i++) s.level.noteDeath();
            if (before > after) { platform.audio.play('hit'); s.camera.shake(3, 0.1); }
            // 击杀掉金币
            for (const en of s.enemies) {
              if (en.dead && !en._looted) { en._looted = true; s.pickups.spawnCoins(en.x, en.y, en.coin); }
            }
          }
        } else if (ev === 'dash') {
          const dx = input.joy.mag > 0 ? input.joy.dx : Math.cos(player.facing);
          const dy = input.joy.mag > 0 ? input.joy.dy : Math.sin(player.facing);
          if (player.tryDash(dx, dy)) platform.audio.play('dash');
        }
      }

      player.update(dt, cfg.obstacles, cfg.w, cfg.h,
        input.joy.dx * input.joy.mag, input.joy.dy * input.joy.mag);

      // 敌人与Boss
      for (const en of enemies) {
        if (en.dead) continue;
        en.update(dt, world);
        if (en.pendingHit) {
          let hit = false;
          if (en.pendingHit.kind === 'sweep') {
            hit = inSector(en.x, en.y, en.facing, 90, (3 * Math.PI) / 4, player.x, player.y, player.r);
          } else if (en.pendingHit.kind === 'charge') {
            hit = circleHit(en.x, en.y, en.r, player.x, player.y, player.r);
          } else {
            hit = circleHit(en.x, en.y, en.r + 18, player.x, player.y, player.r); // 近战挥刀
          }
          if (hit) {
            const dir = Math.atan2(player.y - en.y, player.x - en.x);
            if (player.takeHit(en.pendingHit.dmg, Math.cos(dir) * 120, Math.sin(dir) * 120)) {
              platform.audio.play('hurt'); s.camera.shake(5, 0.15);
            }
          }
          if (en.pendingHit.kind !== 'charge') en.pendingHit = null; // 冲锋持续判定
        }
      }

      s.projectiles.update(dt, world, (dmg, dir) => {
        if (player.takeHit(dmg, Math.cos(dir) * 100, Math.sin(dir) * 100)) {
          platform.audio.play('hurt'); s.camera.shake(4, 0.12);
        }
      });
      s.pickups.update(dt, player, (v) => {
        s.earned += v; gs.addCoins(v); platform.audio.play('coin');
      });

      s.camera.follow(player.x, player.y, cfg.w, cfg.h);
      s.camera.update(dt);

      if (player.dead) { s.phase = 'dead'; input.reset(); platform.audio.play('die'); return; }
      if (s.level.atExit(player)) {
        s.phase = 'cleared';
        gs.unlockNext(s.levelIndex + 1);
        s.earned += cfg.reward; gs.addCoins(cfg.reward);
        go('result', { levelIndex: s.levelIndex, earned: s.earned, isBoss: !!cfg.boss });
      }
    },

    onTap(x, y) {
      if (!s || s.phase !== 'dead' || s.adBusy) return;
      const id = hud.hitButton(s.deadButtons, x, y);
      if (id === 'revive' && !s.reviveUsed && platform.ads.available()) {
        s.adBusy = true;
        tryRevive(platform.ads, s.reviveUsed).then((r) => {
          s.adBusy = false;
          if (r === 'revived') {
            s.reviveUsed = true;
            s.player.dead = false; s.player.hp = s.player.maxHp; s.player.invulnT = 1.5;
            s.phase = 'playing';
          } else if (r === 'failed') {
            s.reviveFailed = true;
          }
          // 'unavailable'：停留在死亡界面，玩家可选放弃
        }).catch(() => { s.adBusy = false; s.reviveFailed = true; });
      } else if (id === 'giveup') {
        go('levelselect');
      }
    },

    render(ctx) {
      if (!s) return;
      const { cfg, player } = s;
      const ox = s.camera.ox(), oy = s.camera.oy();
      ctx.fillStyle = THEME_BG[cfg.theme];
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.save();
      ctx.translate(-ox, -oy);

      // 障碍
      ctx.fillStyle = '#3a3226';
      for (const o of cfg.obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);
      // 出口
      ctx.fillStyle = s.level.exitOpen() ? '#f1c40f' : '#333';
      ctx.beginPath(); ctx.arc(cfg.exit.x, cfg.exit.y, EXIT_R, 0, Math.PI * 2); ctx.fill();

      // 金币与箭
      ctx.fillStyle = '#f39c12';
      s.pickups.forEach((c) => { ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#ecf0f1';
      s.projectiles.forEach((a) => { ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill(); });

      // 敌人（含前摇提示）
      const COLORS = { soldier: '#b03a2e', archer: '#9b59b6', shield: '#7f8c8d', berserker: '#d35400' };
      for (const en of s.enemies) {
        if (en.dead) continue;
        if (en.state === 'telegraph' || en.state === 'windup') {
          ctx.globalAlpha = 0.3; ctx.fillStyle = '#e74c3c';
          ctx.beginPath(); ctx.arc(en.x, en.y, en.r + 20, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = en.kind ? '#2c3e50' : COLORS[en.type];
        ctx.beginPath(); ctx.arc(en.x, en.y, en.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(en.x, en.y);
        ctx.lineTo(en.x + Math.cos(en.facing) * en.r, en.y + Math.sin(en.facing) * en.r); ctx.stroke();
        hud.drawBar(ctx, en.x - 16, en.y - en.r - 10, 32, 4, en.hp / en.maxHp, '#e74c3c', '#222');
      }

      // 玩家（无敌闪烁）
      if (player.invulnT <= 0 || Math.floor(player.invulnT * 12) % 2 === 0) {
        ctx.fillStyle = '#2980b9';
        ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(player.x, player.y);
        ctx.lineTo(player.x + Math.cos(player.facing) * 20, player.y + Math.sin(player.facing) * 20); ctx.stroke();
      }
      // 挥剑弧线
      if (player.swing) {
        ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(player.x, player.y);
        ctx.arc(player.x, player.y, player.swing.radius,
          player.swing.dir - player.swing.halfAngle, player.swing.dir + player.swing.halfAngle);
        ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.restore();

      // HUD
      hud.drawBar(ctx, 16, 20, 140, 14, player.hp / player.maxHp, '#27ae60', '#222');
      hud.drawTextC(ctx, '金币 ' + gs.data.coins, view.w - 70, 27, 14, '#f1c40f');
      hud.drawTextC(ctx, '第 ' + (s.levelIndex + 1) + ' 关', view.w / 2, 27, 14, '#fff');
      hud.drawJoystick(ctx, input.joy);
      hud.drawActionButtons(ctx, input.buttons, player.dashCdLeft <= 0);

      if (s.phase === 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, view.w, view.h);
        hud.drawTextC(ctx, '你阵亡了', view.w / 2, view.h / 2 - 70, 28, '#e74c3c');
        hud.drawBtn(ctx, s.deadButtons[0], reviveLabel(), reviveEnabled());
        hud.drawBtn(ctx, s.deadButtons[1], '返回选关', !s.adBusy);
      }
    },
  };
}
module.exports = { createBattleScene, resolveSwing };
