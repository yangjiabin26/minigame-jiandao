async function safeShow(ads) {
  try { return await ads.showRewarded(); } catch (e) { return false; }
}

async function tryRevive(ads, usedThisLevel) {
  if (usedThisLevel) return 'unavailable';
  const ok = await safeShow(ads);
  return ok ? 'revived' : 'failed';
}

async function tryDouble(ads, coins) {
  const ok = await safeShow(ads);
  return ok ? coins * 2 : coins;
}

async function tryDiscount(ads, state, today) {
  if (state.discountLeft(today) <= 0) return false;
  const ok = await safeShow(ads);
  if (!ok) return false; // 广告失败不消耗次数
  return state.useDiscount(today);
}

module.exports = { tryRevive, tryDouble, tryDiscount };
