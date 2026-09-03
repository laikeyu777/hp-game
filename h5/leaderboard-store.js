(function (root, factory) {
  const logic = typeof require === 'function' ? require('./leaderboard-logic.js') : root.LeaderboardLogic;
  const api = factory(logic);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.LeaderboardStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (LeaderboardLogic) {
  const VERSION = 1;
  const MAX_PENDING = 30;
  const MAX_ENTRIES = 50;

  function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
    return value;
  }

  function sanitizeRows(rows) {
    const source = Array.isArray(rows) ? rows : [];
    if (LeaderboardLogic && typeof LeaderboardLogic.sanitizeEntries === 'function') {
      return LeaderboardLogic.sanitizeEntries(source, { limit: MAX_ENTRIES }).map(clone);
    }
    return source.filter(row => row && typeof row === 'object').slice(0, MAX_ENTRIES).map(clone);
  }

  function normalizeEntries(value) {
    if (Array.isArray(value)) return { all: sanitizeRows(value), daily: {} };
    const source = asObject(value);
    const dailySource = asObject(source.daily);
    const daily = {};
    Object.entries(dailySource).forEach(([code, rows]) => {
      daily[String(code).trim().toUpperCase()] = sanitizeRows(rows);
    });
    return { ...source, all: sanitizeRows(source.all), daily };
  }

  function normalizePending(value) {
    if (!Array.isArray(value)) return [];
    return value
      .filter(item => item && typeof item === 'object' && String(item.submissionKey || '').trim())
      .map(item => ({ ...clone(item), submissionKey: String(item.submissionKey).trim() }))
      .slice(-MAX_PENDING);
  }

  function createState(value) {
    const source = asObject(value);
    return {
      ...clone(source),
      version: VERSION,
      entries: normalizeEntries(source.entries),
      pending: normalizePending(source.pending),
    };
  }

  function normalizeMode(input) {
    return String(input == null ? 'normal' : input).trim().toLowerCase() === 'daily' ? 'daily' : 'normal';
  }

  function normalizeCode(input) {
    return input == null ? '' : String(input).trim().toUpperCase();
  }

  function numberValue(input) {
    const value = Number(input);
    return Number.isFinite(value) ? value : 0;
  }

  function createSubmissionKey(input = {}) {
    const fields = [
      normalizeMode(input.mode),
      normalizeCode(input.code || input.challengeCode),
      String(input.weapon || '').trim().toLowerCase(),
      numberValue(input.completedFloors),
      numberValue(input.durationMs),
      numberValue(input.score),
    ];
    return `lb-v${VERSION}-${fields.map(field => encodeURIComponent(String(field))).join('|')}`;
  }

  function createSubmission(result = {}, mode = result.mode, challengeCode = result.code) {
    const normalizedMode = normalizeMode(mode);
    const code = normalizeCode(challengeCode);
    const submission = {
      ...clone(asObject(result)),
      mode: normalizedMode,
      code: code || undefined,
      scope: normalizedMode === 'daily' ? `daily:${code}` : 'all',
    };
    submission.submissionKey = createSubmissionKey(submission);
    return submission;
  }

  function enqueue(state, submission) {
    const current = createState(state);
    if (!submission || typeof submission !== 'object') return current;
    const submissionKey = String(submission.submissionKey || '').trim();
    if (!submissionKey || current.pending.some(item => item.submissionKey === submissionKey)) return current;
    current.pending = [...current.pending, { ...clone(submission), submissionKey }].slice(-MAX_PENDING);
    return current;
  }

  function parseScope(scope, fallbackCode = '') {
    if (scope && typeof scope === 'object') {
      const type = String(scope.scope || scope.mode || 'all').toLowerCase();
      return type === 'daily' ? `daily:${normalizeCode(scope.code || fallbackCode)}` : 'all';
    }
    const value = String(scope || 'all').trim();
    if (value.toLowerCase() === 'daily') return `daily:${normalizeCode(fallbackCode)}`;
    if (value.toLowerCase().startsWith('daily:')) return `daily:${normalizeCode(value.slice(6))}`;
    if (value.toLowerCase() === 'all' || !value) return 'all';
    return `daily:${normalizeCode(value)}`;
  }

  function upsertRows(rows, entry) {
    const source = Array.isArray(rows) ? rows : [];
    const key = entry && entry.submissionKey;
    const withoutDuplicate = key ? source.filter(row => row.submissionKey !== key) : source;
    return sanitizeRows([...withoutDuplicate, entry]);
  }

  function markSynced(state, submissionKey, remoteEntry) {
    const current = createState(state);
    const key = String(submissionKey || '').trim();
    const pending = current.pending.find(item => item.submissionKey === key);
    current.pending = current.pending.filter(item => item.submissionKey !== key);
    if (!remoteEntry || typeof remoteEntry !== 'object') return current;

    const source = {
      ...clone(remoteEntry),
      ...(pending || {}),
      ...clone(remoteEntry),
      submissionKey: key || remoteEntry.submissionKey,
    };
    const partition = parseScope(source.scope || source.mode, source.code);
    if (partition === 'all') {
      current.entries.all = upsertRows(current.entries.all, source);
    } else {
      const code = partition.slice(6);
      current.entries.daily[code] = upsertRows(current.entries.daily[code], { ...source, code, scope: 'daily' });
    }
    return current;
  }

  function getCached(state, scope) {
    const current = createState(state);
    const partition = parseScope(scope, scope && scope.code);
    if (partition === 'all') return current.entries.all.map(clone);
    return (current.entries.daily[partition.slice(6)] || []).map(clone);
  }

  return {
    VERSION,
    MAX_PENDING,
    createState,
    createSubmissionKey,
    createSubmission,
    enqueue,
    markSynced,
    getCached,
  };
});
