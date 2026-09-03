const test = require('node:test');
const assert = require('node:assert/strict');

const api = require('./index.js');
const fs = require('node:fs');

test('leaderboard migration does not grant public write access', () => {
  const migration = fs.readFileSync(require('node:path').join(__dirname, '../../migrations/20260902000001_create_leaderboard_entries.sql'), 'utf8');
  assert.match(migration, /revoke\s+all\s+on\s+table\s+public\.leaderboard_entries\s+from\s+public/i);
  assert.match(migration, /grant\s+all\s+on\s+table\s+public\.leaderboard_entries\s+to\s+service_role/i);
  assert.doesNotMatch(migration, /grant\s+all\s+on\s+table\s+public\.leaderboard_entries\s+to\s+public/i);
});

test('validates and recalculates a normal leaderboard submission', () => {
  const result = api.validateSubmission({
    mode: 'normal',
    scope: 'all',
    weapon: 'sword',
    completedFloors: 12,
    enemiesDefeated: 28,
    bossesDefeated: 1,
    durationMs: 45000,
    hpRatio: 0.75,
    gold: 40,
    cleared: false,
    score: 999999,
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.score, 14295);
  assert.equal(result.value.scopeKey, 'all');
});

test('rejects a daily submission with a mismatched challenge code', () => {
  const result = api.validateSubmission({
    mode: 'daily',
    scope: 'daily',
    code: 'ASH-20260101-V1-0000',
    weapon: 'staff',
    completedFloors: 5,
    enemiesDefeated: 10,
    bossesDefeated: 0,
    durationMs: 10000,
    hpRatio: 1,
    gold: 0,
    cleared: false,
  }, { todayCode: 'ASH-20260902-V1-ABCD' });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'INVALID_CHALLENGE_CODE');
});

test('reads identity only from the gateway context', () => {
  const encoded = Buffer.from(JSON.stringify({ customUserId: 'puid-7' })).toString('base64');
  assert.deepEqual(api.readPuid({ headers: { 'x-cloudbase-context': encoded } }), { puid: 'puid-7', nickname: '虎扑玩家' });
  assert.throws(() => api.readPuid({ headers: {} }), error => error.statusCode === 401);
});

test('sorts entries by score, then duration, then submission time', () => {
  const entries = api.sortEntries([
    { score: 100, durationMs: 900, submittedAt: '2026-09-02T12:00:02.000Z' },
    { score: 100, durationMs: 800, submittedAt: '2026-09-02T12:00:03.000Z' },
    { score: 100, durationMs: 800, submittedAt: '2026-09-02T12:00:01.000Z' },
  ]);
  assert.deepEqual(entries.map(entry => entry.durationMs), [800, 800, 900]);
  assert.equal(entries[0].submittedAt, '2026-09-02T12:00:01.000Z');
});

test('maps validated submissions to the migration column names', () => {
  const validated = api.validateSubmission({
    mode: 'normal', scope: 'all', weapon: 'crossbow', completedFloors: 3,
    enemiesDefeated: 4, bossesDefeated: 0, durationMs: 9000, hpRatio: 0.5, gold: 2,
  });
  const row = api.toDbRecord(validated.value, { puid: 'puid-1', nickname: '玩家' });
  assert.equal(row.scope_key, 'all');
  assert.equal(row.completed_floors, 3);
  assert.equal(row.duration_ms, 9000);
  assert.equal(row.submitted_at, validated.value.submittedAt);
});

test('rejects fractional counters that cannot represent a real run', () => {
  const result = api.validateSubmission({
    mode: 'normal', scope: 'all', weapon: 'sword', completedFloors: 1.5,
    enemiesDefeated: 2, bossesDefeated: 0, durationMs: 9000, hpRatio: 0.5, gold: 2,
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'INVALID_STATS');
});
