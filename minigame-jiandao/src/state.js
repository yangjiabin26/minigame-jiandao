const { upgradeCost, LINES } = require('./data/upgrades');

function createGameState(store) {
  const s = store.load();
  const api = {
    get data() { return s; },
    save() { store.save(s); },
    addCoins(n) { s.coins += n; api.save(); },
    spend(n) {
      if (s.coins < n) return false;
      s.coins -= n; api.save(); return true;
    },
    levelOf(line) { return s.upgrades[line]; },
    costOf(line, halfPrice = false) {
      const c = upgradeCost(line, s.upgrades[line]);
      return halfPrice ? Math.ceil(c / 2) : c;
    },
    buyUpgrade(line, halfPrice = false) {
      if (s.upgrades[line] >= LINES[line].max) return false;
      const usePendingHalf = !!s.pendingHalf;
      const effectiveHalf = halfPrice || usePendingHalf;
      if (!api.spend(api.costOf(line, effectiveHalf))) return false;
      s.upgrades[line] += 1;
      if (usePendingHalf) s.pendingHalf = false;
      api.save(); return true;
    },
    setPendingHalf(v) { s.pendingHalf = v; api.save(); },
    unlockNext(clearedLevel) {
      if (clearedLevel >= s.unlocked && s.unlocked < 8) { s.unlocked = clearedLevel + 1; api.save(); }
    },
    discountLeft(today) {
      if (s.discount.date !== today) { s.discount = { date: today, used: 0 }; api.save(); }
      return 3 - s.discount.used;
    },
    useDiscount(today) {
      if (api.discountLeft(today) <= 0) return false;
      s.discount.used += 1; api.save(); return true;
    },
  };
  return api;
}

module.exports = { createGameState };
