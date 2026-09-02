const test = require('node:test');
const assert = require('node:assert/strict');

const LeaderboardLogic = require('./leaderboard-logic.js');

test('normalizeSubmission returns a normalized score object for valid runs', () => {
  const normalized = LeaderboardLogic.normalizeSubmission({
    mode: 'normal',
    weapon: 'sword',
    completedFloors: 50,
    enemiesDefeated: 120,
    bossesDefeated: 5,
    durationMs: 180000,
    hpRatio: 0.8,
    gold: 100,
    cleared: true,
    submittedAt: '2026-09-02T12:00:00.000Z',
  });

  assert.equal(normalized.mode, 'normal');
  assert.equal(normalized.weapon, 'sword');
  assert.equal(normalized.completedFloors, 50);
  assert.equal(normalized.durationMs, 180000);
  assert.equal(normalized.hpRatio, 0.8);
  assert.equal(normalized.cleared, true);
  assert.equal(normalized.submittedAt, '2026-09-02T12:00:00.000Z');
  assert.equal(typeof normalized.score, 'number');
  assert.ok(normalized.score > 0);
});

test('normalizeSubmission rejects invalid leaderboard bounds with recognizable errors', () => {
  const valid = { mode: 'normal', weapon: 'staff', completedFloors: 1, durationMs: 0, hpRatio: 0 };

  assert.throws(() => LeaderboardLogic.normalizeSubmission({ ...valid, completedFloors: 999 }), /floor/i);
  assert.throws(() => LeaderboardLogic.normalizeSubmission({ ...valid, durationMs: Infinity }), /duration/i);
  assert.throws(() => LeaderboardLogic.normalizeSubmission({ ...valid, durationMs: -1 }), /duration/i);
  assert.throws(() => LeaderboardLogic.normalizeSubmission({ ...valid, hpRatio: 1.1 }), /hp/i);
  assert.throws(() => LeaderboardLogic.normalizeSubmission({ ...valid, weapon: 'axe' }), /weapon/i);
});

test('compareEntries ranks score descending, duration ascending, then submitted time ascending', () => {
  assert.equal(LeaderboardLogic.compareEntries({ score: 90 }, { score: 100 }), -1);
  assert.equal(LeaderboardLogic.compareEntries({ score: 100 }, { score: 90 }), 1);
  assert.equal(LeaderboardLogic.compareEntries({ score: 100, durationMs: 900 }, { score: 100, durationMs: 1000 }), 1);
  assert.equal(LeaderboardLogic.compareEntries({ score: 100, durationMs: 1000 }, { score: 100, durationMs: 900 }), -1);
  assert.equal(
    LeaderboardLogic.compareEntries(
      { score: 100, durationMs: 900, submittedAt: '2026-09-02T09:00:00.000Z' },
      { score: 100, durationMs: 900, submittedAt: '2026-09-02T10:00:00.000Z' },
    ),
    1,
  );
});

test('upsertPersonalBest keeps the stronger record and replaces weaker previous records', () => {
  assert.equal(LeaderboardLogic.upsertPersonalBest({ score: 100 }, { score: 90 }).score, 100);
  assert.equal(LeaderboardLogic.upsertPersonalBest({ score: 100, durationMs: 900 }, { score: 100, durationMs: 800 }).durationMs, 800);
  assert.equal(LeaderboardLogic.upsertPersonalBest(null, { score: 10 }).score, 10);
});

test('upsertPersonalBest does not overwrite all-time records with daily records', () => {
  const allTime = { mode: 'normal', scope: 'all', score: 100, durationMs: 1000 };
  const daily = { mode: 'daily', scope: 'daily', code: 'ASH-20260902-V1-ABCD', score: 200, durationMs: 500 };

  assert.deepEqual(LeaderboardLogic.upsertPersonalBest(allTime, daily), allTime);
});

test('upsertPersonalBest does not overwrite a daily record for a different challenge code', () => {
  const previous = { mode: 'daily', code: 'ASH-20260902-V1-ABCD', score: 100, durationMs: 1000 };
  const candidate = { mode: 'daily', code: 'ASH-20260903-V1-WXYZ', score: 200, durationMs: 500 };

  assert.deepEqual(LeaderboardLogic.upsertPersonalBest(previous, candidate), previous);
});

test('upsertPersonalBest does not overwrite scoped daily records for different challenge codes', () => {
  const previous = { mode: 'daily', scope: 'daily', code: 'ASH-20260902-V1-ABCD', score: 100, durationMs: 1000 };
  const candidate = { mode: 'daily', scope: 'daily', code: 'ASH-20260903-V1-WXYZ', score: 200, durationMs: 500 };

  assert.deepEqual(LeaderboardLogic.upsertPersonalBest(previous, candidate), previous);
});

test('sanitizeEntries filters malformed rows, normalizes valid rows, sorts them, and applies limit', () => {
  const entries = LeaderboardLogic.sanitizeEntries([
    { rank: 9, nickname: 'Slow', mode: 'normal', weapon: 'sword', completedFloors: 2, durationMs: 2000, hpRatio: 0.5, score: 20, submittedAt: '2026-09-02T10:00:00.000Z' },
    null,
    { rank: 1, nickname: 'A', mode: 'normal', weapon: 'staff', completedFloors: 3, durationMs: 1000, hpRatio: 0.6, score: 20, submittedAt: '2026-09-02T09:00:00.000Z' },
    { rank: 2, nickname: 'Bad', mode: 'normal', weapon: 'axe', completedFloors: 3, durationMs: 1000, hpRatio: 0.6, score: 999 },
  ], { limit: 1 });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].nickname, 'A');
  assert.equal(entries[0].rank, 1);
});
