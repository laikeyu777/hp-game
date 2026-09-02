(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BossIntro = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STANDARD_DURATION_MS = 1600;
  const REDUCED_DURATION_MS = 600;

  function create({ bossName, mechanic, now, reducedMotion = false }) {
    return {
      startedAt: Math.max(0, Number(now) || 0),
      durationMs: reducedMotion ? REDUCED_DURATION_MS : STANDARD_DURATION_MS,
      name: String(bossName || '未知首领'),
      mechanic: String(mechanic || '未知机制'),
      reducedMotion: Boolean(reducedMotion),
    };
  }

  function status(intro, now) {
    if (!intro || typeof intro !== 'object') {
      return { active: false, elapsedMs: 0, remainingMs: 0 };
    }
    const elapsedMs = Math.max(0, Math.min(intro.durationMs, (Number(now) || 0) - intro.startedAt));
    return {
      active: elapsedMs < intro.durationMs,
      elapsedMs,
      remainingMs: Math.max(0, intro.durationMs - elapsedMs),
    };
  }

  return { STANDARD_DURATION_MS, REDUCED_DURATION_MS, create, status };
});

