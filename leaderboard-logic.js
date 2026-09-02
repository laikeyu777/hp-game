(function (root, factory) {
  const api = factory(typeof require === 'function' ? require('./challenge-system.js') : root.ChallengeSystem);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.LeaderboardLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ChallengeSystem) {
  const WEAPONS = new Set(['sword', 'staff', 'crossbow']);
  const DEFAULT_LIMIT = 50;

  class LeaderboardValidationError extends Error {
    constructor(field, message) {
      super(`${field}: ${message}`);
      this.name = 'LeaderboardValidationError';
      this.code = 'INVALID_LEADERBOARD_FIELD';
      this.field = field;
    }
  }

  function numberField(input, field, { min, max, required = true } = {}) {
    if (input == null || input === '') {
      if (!required) return undefined;
      throw new LeaderboardValidationError(field, 'is required');
    }
    const value = Number(input);
    if (!Number.isFinite(value) || value < min || value > max) {
      const range = max === Infinity ? `>= ${min}` : `${min}-${max}`;
      throw new LeaderboardValidationError(field, `must be finite and in range ${range}`);
    }
    return value;
  }

  function normalizeSubmission(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new LeaderboardValidationError('submission', 'must be an object');
    }

    const mode = input.mode == null ? 'normal' : String(input.mode).trim().toLowerCase();
    if (mode !== 'normal' && mode !== 'daily') {
      throw new LeaderboardValidationError('mode', 'must be normal or daily');
    }

    const weapon = String(input.weapon || '').trim().toLowerCase();
    if (!WEAPONS.has(weapon)) throw new LeaderboardValidationError('weapon', 'must be sword, staff, or crossbow');

    const completedFloors = numberField(input.completedFloors, 'completedFloors', { min: 0, max: 50 });
    const durationMs = numberField(input.durationMs, 'durationMs', { min: 0, max: Infinity });
    const hpRatio = numberField(input.hpRatio, 'hpRatio', { min: 0, max: 1 });
    const enemiesDefeated = numberField(input.enemiesDefeated ?? 0, 'enemiesDefeated', { min: 0, max: Infinity });
    const bossesDefeated = numberField(input.bossesDefeated ?? 0, 'bossesDefeated', { min: 0, max: Infinity });
    const gold = numberField(input.gold ?? 0, 'gold', { min: 0, max: Infinity });
    const cleared = Boolean(input.cleared);
    const submittedAt = input.submittedAt == null ? new Date().toISOString() : String(input.submittedAt);
    if (Number.isNaN(Date.parse(submittedAt))) {
      throw new LeaderboardValidationError('submittedAt', 'must be a valid date');
    }

    const normalized = {
      mode,
      code: input.code == null ? undefined : String(input.code).trim().toUpperCase(),
      weapon,
      completedFloors,
      enemiesDefeated,
      bossesDefeated,
      durationMs,
      hpRatio,
      gold,
      cleared,
      submittedAt,
    };
    normalized.score = ChallengeSystem && typeof ChallengeSystem.calculateScore === 'function'
      ? ChallengeSystem.calculateScore(normalized).score
      : Number(input.score) || 0;
    if (input.scope != null) normalized.scope = String(input.scope);
    return normalized;
  }

  function compareEntries(left = {}, right = {}) {
    const leftScore = Number.isFinite(Number(left.score)) ? Number(left.score) : 0;
    const rightScore = Number.isFinite(Number(right.score)) ? Number(right.score) : 0;
    if (leftScore !== rightScore) return leftScore > rightScore ? 1 : -1;

    const leftDuration = Number.isFinite(Number(left.durationMs)) ? Number(left.durationMs) : Infinity;
    const rightDuration = Number.isFinite(Number(right.durationMs)) ? Number(right.durationMs) : Infinity;
    if (leftDuration !== rightDuration) return leftDuration < rightDuration ? 1 : -1;

    const leftSubmitted = Date.parse(left.submittedAt);
    const rightSubmitted = Date.parse(right.submittedAt);
    const leftTime = Number.isNaN(leftSubmitted) ? Infinity : leftSubmitted;
    const rightTime = Number.isNaN(rightSubmitted) ? Infinity : rightSubmitted;
    if (leftTime !== rightTime) return leftTime < rightTime ? 1 : -1;
    return 0;
  }

  function sameScope(left, right) {
    if (!left || !right) return true;
    if (left.scope != null || right.scope != null) return left.scope === right.scope;
    return (left.mode || 'normal') === (right.mode || 'normal') && (left.code || '') === (right.code || '');
  }

  function upsertPersonalBest(previous, candidate) {
    if (!previous) return candidate ? { ...candidate } : null;
    if (!candidate) return { ...previous };
    if (!sameScope(previous, candidate)) return { ...candidate };
    return compareEntries(candidate, previous) > 0 ? { ...candidate } : { ...previous };
  }

  function isValidEntry(entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
    if (!Number.isFinite(Number(entry.score)) || Number(entry.score) < 0) return false;
    if (entry.completedFloors != null && (!Number.isFinite(Number(entry.completedFloors)) || Number(entry.completedFloors) < 0 || Number(entry.completedFloors) > 50)) return false;
    if (entry.durationMs != null && (!Number.isFinite(Number(entry.durationMs)) || Number(entry.durationMs) < 0)) return false;
    if (entry.hpRatio != null && (!Number.isFinite(Number(entry.hpRatio)) || Number(entry.hpRatio) < 0 || Number(entry.hpRatio) > 1)) return false;
    if (entry.weapon != null && !WEAPONS.has(String(entry.weapon).toLowerCase())) return false;
    if (entry.submittedAt != null && Number.isNaN(Date.parse(entry.submittedAt))) return false;
    return true;
  }

  function sanitizeEntries(entries, options = {}) {
    const limit = Number.isFinite(Number(options.limit)) ? Math.max(0, Math.floor(Number(options.limit))) : DEFAULT_LIMIT;
    return (Array.isArray(entries) ? entries : [])
      .filter(isValidEntry)
      .map(entry => ({ ...entry, score: Number(entry.score) }))
      .sort((left, right) => compareEntries(right, left))
      .slice(0, limit);
  }

  return {
    LeaderboardValidationError,
    normalizeSubmission,
    compareEntries,
    upsertPersonalBest,
    sanitizeEntries,
  };
});
