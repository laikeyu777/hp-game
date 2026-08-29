(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ChallengeSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const TIME_ZONE = 'Asia/Shanghai';
  const CHALLENGE_PREFIX = 'ASH';
  const VALID_WEAPON_PATTERN = /^[a-z][a-z0-9_-]*$/i;
  const MAX_RECENT_RECORDS = 30;
  const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function toDateString(dateInput) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(dateInput));
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${map.year}${map.month}${map.day}`;
  }

  function hash32(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function encodeBase36(value, length = 4) {
    let current = value >>> 0;
    let out = '';
    for (let i = 0; i < length; i += 1) {
      out = ALPHABET[current % 36] + out;
      current = Math.floor(current / 36);
    }
    return out;
  }

  function makeCode(date, rulesVersion) {
    const digest = hash32(`ash-corridor:${date}:v${rulesVersion}`);
    const token = digest & 0xfffff;
    return `${CHALLENGE_PREFIX}-${date}-V${rulesVersion}-${encodeBase36(token, 4)}`;
  }

  function createDailyChallenge(dateInput, rulesVersion = 1) {
    const date = toDateString(dateInput);
    const code = makeCode(date, rulesVersion);
    return { date, rulesVersion, code };
  }

  function parseChallengeCode(code) {
    const normalized = String(code || '').trim().toUpperCase();
    const match = normalized.match(/^([A-Z]{3})-(\d{8})-V(\d+)-([A-Z0-9]{4})$/);
    if (!match) return { valid: false };
    const [, prefix, date, versionText, checksum] = match;
    const rulesVersion = Number(versionText);
    const expected = makeCode(date, rulesVersion);
    return {
      valid: expected === `${prefix}-${date}-V${rulesVersion}-${checksum}`,
      prefix,
      date,
      rulesVersion,
      checksum,
    };
  }

  function createSeededRandom(seed) {
    let state = hash32(String(seed)) || 1;
    return function next() {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createRandomStream(challenge, category, floor = 0, index = 0) {
    const code = typeof challenge === 'string' ? challenge : challenge && challenge.code ? challenge.code : '';
    return createSeededRandom(`${code}:${category}:${floor}:${index}`);
  }

  function calculateScore(summary = {}) {
    const completedFloors = Math.max(0, Number(summary.completedFloors) || 0);
    const enemiesDefeated = Math.max(0, Number(summary.enemiesDefeated) || 0);
    const bossesDefeated = Math.max(0, Number(summary.bossesDefeated) || 0);
    const hpRatio = Math.min(1, Math.max(0, Number(summary.hpRatio) || 0));
    const gold = Math.max(0, Number(summary.gold) || 0);
    const durationMs = Math.max(0, Number(summary.durationMs) || 0);
    const cleared = Boolean(summary.cleared);

    const breakdown = {
      floors: completedFloors * 1000,
      enemies: enemiesDefeated * 40,
      bosses: bossesDefeated * 600,
      hp: Math.round(hpRatio * 500),
      gold: gold * 5,
      clearBonus: cleared ? 10000 : 0,
      speedBonus: cleared ? Math.max(0, 6000 - Math.floor(durationMs / 1000) * 10) : 0,
    };
    const score = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
    return { score, breakdown };
  }

  function compareResults(left = {}, right = {}) {
    const fields = [
      ['score', true],
      ['completedFloors', true],
      ['durationMs', false],
      ['submittedAt', false],
    ];
    for (const [field, higherIsBetter] of fields) {
      const a = left[field] ?? 0;
      const b = right[field] ?? 0;
      if (a === b) continue;
      return higherIsBetter ? a - b : b - a;
    }
    return 0;
  }

  function isValidRecord(record) {
    if (!record || typeof record !== 'object') return false;
    if (typeof record.code !== 'string' || !/^ASH-\d{8}-V\d+-[A-Z0-9]{4}$/i.test(record.code)) return false;
    if (typeof record.score !== 'number' || !Number.isFinite(record.score)) return false;
    if (typeof record.completedFloors !== 'number' || !Number.isFinite(record.completedFloors)) return false;
    if (typeof record.durationMs !== 'number' || !Number.isFinite(record.durationMs)) return false;
    if (record.weapon != null && !VALID_WEAPON_PATTERN.test(String(record.weapon))) return false;
    if (record.submittedAt != null && Number.isNaN(Date.parse(record.submittedAt))) return false;
    return true;
  }

  function sanitizeChallengeSave(value) {
    const source = value && typeof value === 'object' ? value : {};
    const personalBest = source.personalBest && typeof source.personalBest === 'object' ? source.personalBest : {};
    const dailyBest = source.dailyBest && typeof source.dailyBest === 'object' ? source.dailyBest : {};
    const recentRecords = Array.isArray(source.recentRecords) ? source.recentRecords : [];

    const sanitizedDailyBest = {};
    for (const [code, record] of Object.entries(dailyBest)) {
      const dailyRecord = record && typeof record === 'object' ? { code, ...record } : record;
      if (isValidRecord(dailyRecord)) sanitizedDailyBest[code] = { ...dailyRecord };
    }

    const sanitizedRecentRecords = recentRecords.filter(isValidRecord).map(record => ({ ...record })).slice(0, MAX_RECENT_RECORDS);
    return {
      personalBest: {
        highestScore: Math.max(0, Number(personalBest.highestScore ?? personalBest.bestScore) || 0),
        fastestClearMs: Number(personalBest.fastestClearMs ?? (personalBest.bestDurationMs || 0)) || null,
        highestFloor: Math.max(0, Number(personalBest.highestFloor) || 0),
        weapons: {
          sword: Math.max(0, Number(personalBest.weapons?.sword) || 0),
          staff: Math.max(0, Number(personalBest.weapons?.staff) || 0),
          crossbow: Math.max(0, Number(personalBest.weapons?.crossbow) || 0),
        },
      },
      dailyBest: sanitizedDailyBest,
      recentRecords: sanitizedRecentRecords,
    };
  }

  function formatDuration(durationMs) {
    const totalSeconds = Math.max(0, Math.floor(Number(durationMs) / 1000) || 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function formatShareText(result = {}) {
    const lines = [
      `Challenge ${result.code || ''}`,
      `Score ${result.score ?? 0}`,
      `Floors ${result.completedFloors ?? 0}`,
      `Time ${formatDuration(result.durationMs)}`,
    ];
    if (result.weapon) lines.push(`Weapon ${result.weapon}`);
    if (result.cleared) lines.push('Cleared');
    return lines.join('\n');
  }

  function updatePersonalBest(challengeSave, result, mode) {
    const save = sanitizeChallengeSave(challengeSave);
    const record = {
      code: result.code,
      score: Number(result.score) || 0,
      completedFloors: Number(result.completedFloors) || 0,
      durationMs: Number(result.durationMs) || 0,
      hpRatio: Number(result.hpRatio) || 0,
      weapon: typeof result.weapon === 'string' ? result.weapon : '',
      cleared: Boolean(result.cleared),
      submittedAt: result.submittedAt || new Date().toISOString(),
      mode: mode || 'daily',
    };

    if (!isValidRecord(record)) return save;

    save.personalBest.highestFloor = Math.max(save.personalBest.highestFloor, record.completedFloors);
    save.personalBest.highestScore = Math.max(save.personalBest.highestScore, record.score);
    if (record.weapon && Object.prototype.hasOwnProperty.call(save.personalBest.weapons, record.weapon)) {
      save.personalBest.weapons[record.weapon] = Math.max(save.personalBest.weapons[record.weapon], record.score);
    }

    if (mode === 'daily') {
      const previous = save.dailyBest[record.code];
      if (!previous || compareResults(record, previous) > 0) save.dailyBest[record.code] = { ...record };
      save.recentRecords = [record, ...save.recentRecords].slice(0, MAX_RECENT_RECORDS);
    }
    return save;
  }

  return {
    createDailyChallenge,
    parseChallengeCode,
    createSeededRandom,
    createRandomStream,
    calculateScore,
    compareResults,
    updatePersonalBest,
    sanitizeChallengeSave,
    formatDuration,
    formatShareText,
  };
});
