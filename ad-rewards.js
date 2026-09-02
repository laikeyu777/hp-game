(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AdRewards = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ESSENCE_REWARD = 80;
  const DAILY_ESSENCE_LIMIT = 3;
  const REVIVE_HP_RATIO = 0.35;

  function beijingDate(now = new Date()) {
    const value = now instanceof Date ? now : new Date(now);
    const valid = Number.isFinite(value.getTime()) ? value : new Date();
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(valid);
  }

  function sanitizeState(value, now = new Date()) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const today = beijingDate(now);
    const matchesToday = typeof source.essenceDate === 'string' && source.essenceDate === today;
    const rawClaims = Number(source.essenceClaims);
    const claims = matchesToday && Number.isFinite(rawClaims)
      ? Math.min(DAILY_ESSENCE_LIMIT, Math.max(0, Math.floor(rawClaims)))
      : 0;
    return { essenceDate: today, essenceClaims: claims };
  }

  function getEssenceStatus(value, now = new Date()) {
    const state = sanitizeState(value, now);
    return {
      used: state.essenceClaims,
      remaining: DAILY_ESSENCE_LIMIT - state.essenceClaims,
      canClaim: state.essenceClaims < DAILY_ESSENCE_LIMIT,
    };
  }

  function claimEssence(value, now = new Date()) {
    const state = sanitizeState(value, now);
    if (state.essenceClaims >= DAILY_ESSENCE_LIMIT) {
      return { ok: false, reward: 0, reason: 'daily_limit', state };
    }
    return {
      ok: true,
      reward: ESSENCE_REWARD,
      state: { ...state, essenceClaims: state.essenceClaims + 1 },
    };
  }

  function canRevive(run) {
    const state = run && typeof run === 'object' ? run : {};
    return state.mode === 'normal' && state.reviveUsed !== true;
  }

  return {
    ESSENCE_REWARD,
    DAILY_ESSENCE_LIMIT,
    REVIVE_HP_RATIO,
    beijingDate,
    sanitizeState,
    getEssenceStatus,
    claimEssence,
    canRevive,
  };
});

