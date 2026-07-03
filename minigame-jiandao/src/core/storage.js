const SAVE_KEY = 'jiandao_save';
const SAVE_VERSION = 1;

function defaultState() {
  return {
    version: SAVE_VERSION,
    coins: 0,
    upgrades: { weapon: 0, armor: 0, dash: 0 },
    unlocked: 1, // 已解锁的最大关卡号（1-8）
    discount: { date: '', used: 0 }, // 铁匠铺半价：每日 3 次
    pendingHalf: false, // 看视频获得的半价资格，跨场景持久化直到消费
  };
}

function migrate(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.version !== 'number') return defaultState();
  if (raw.version === SAVE_VERSION) return raw;
  // 未来加版本时在此逐级迁移：if (raw.version === 1) raw = migrateV1toV2(raw); ...
  return defaultState();
}

function createStore(adapter) {
  return {
    load() {
      try {
        const raw = adapter.get(SAVE_KEY);
        if (raw == null) return defaultState();
        return migrate(typeof raw === 'string' ? JSON.parse(raw) : raw);
      } catch (e) {
        return defaultState();
      }
    },
    save(state) {
      try { adapter.set(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* 存储失败不致命 */ }
    },
  };
}

module.exports = { createStore, defaultState, migrate, SAVE_KEY, SAVE_VERSION };
