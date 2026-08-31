const test = require('node:test');
const assert = require('node:assert/strict');
const Challenge = require('./challenge-system.js');

test('same Beijing date creates the same canonical code', () => {
  const a = Challenge.createDailyChallenge('2026-08-30T01:00:00Z');
  const b = Challenge.createDailyChallenge('2026-08-30T23:00:00+08:00');
  assert.equal(a.code, b.code);
  assert.match(a.code, /^ASH-20260830-V1-[A-Z0-9]{4}$/);
});

test('challenge code parses case-insensitively and rejects checksum errors', () => {
  const code = Challenge.createDailyChallenge('2026-08-30').code;
  assert.equal(Challenge.parseChallengeCode(code.toLowerCase()).valid, true);
  assert.equal(Challenge.parseChallengeCode(code.replace(/.$/, 'X')).valid, false);
});

test('seeded streams are repeatable and scoped by category and floor', () => {
  const challenge = Challenge.createDailyChallenge('2026-08-30');
  const a = Challenge.createRandomStream(challenge, 'rewards', 4, 0);
  const b = Challenge.createRandomStream(challenge, 'rewards', 4, 0);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.notEqual(a(), Challenge.createRandomStream(challenge, 'events', 4, 0)());
});

test('score includes clear and speed bonuses only for a floor 50 clear', () => {
  const result = Challenge.calculateScore({
    completedFloors: 50,
    enemiesDefeated: 100,
    bossesDefeated: 5,
    hpRatio: 0.5,
    gold: 20,
    durationMs: 300000,
    cleared: true,
  });

  assert.equal(result.score, 50_000 + 4_000 + 3_000 + 250 + 100 + 10_000 + 3_000);
});

test('comparison prefers higher score, then more floors, then faster time', () => {
  const slower = { score: 100, completedFloors: 10, durationMs: 5000, submittedAt: '2026-08-30T00:00:00.000Z' };
  const faster = { score: 100, completedFloors: 10, durationMs: 4000, submittedAt: '2026-08-30T00:00:00.000Z' };
  const deeper = { score: 100, completedFloors: 11, durationMs: 9000, submittedAt: '2026-08-30T00:00:00.000Z' };
  const better = { score: 101, completedFloors: 1, durationMs: 9999, submittedAt: '2026-08-30T00:00:00.000Z' };

  assert.equal(Challenge.compareResults(better, slower) > 0, true);
  assert.equal(Challenge.compareResults(deeper, slower) > 0, true);
  assert.equal(Challenge.compareResults(faster, slower) > 0, true);
  assert.equal(Challenge.compareResults(slower, faster) < 0, true);
});

test('sanitizeChallengeSave normalizes record shapes and drops malformed entries', () => {
  const save = Challenge.sanitizeChallengeSave({
    personalBest: { highestFloor: 2, bestScore: 3, bestDurationMs: 4, bestWeapon: 'axe' },
    dailyBest: {
      'ASH-20260830-V1-AAAA': { score: 1, completedFloors: 1, durationMs: 2, weapon: 'sword', submittedAt: '2026-08-30T00:00:00.000Z' },
      bad: { nope: true },
    },
    recentRecords: [
      { code: 'ASH-20260830-V1-AAAA', score: 1, completedFloors: 1, durationMs: 2, weapon: 'sword', submittedAt: '2026-08-30T00:00:00.000Z' },
      { nope: true },
    ],
  });

  assert.equal(save.personalBest.highestFloor, 2);
  assert.equal(save.personalBest.highestScore, 3);
  assert.equal(save.personalBest.fastestClearMs, 4);
  assert.deepEqual(save.personalBest.weapons, { sword: 0, staff: 0, crossbow: 0 });
  assert.deepEqual(Object.keys(save.dailyBest), ['ASH-20260830-V1-AAAA']);
  assert.equal(save.recentRecords.length, 1);
});

test('v4 challenge save migrates to an empty v5 shape', () => {
  const save = Challenge.sanitizeChallengeSave({ personalBest: { highestFloor: 4 } });
  assert.equal(save.personalBest.highestFloor, 4);
  assert.equal(save.personalBest.highestScore, 0);
  assert.deepEqual(save.personalBest.weapons, { sword: 0, staff: 0, crossbow: 0 });
});

test('updatePersonalBest tracks daily best and recent records with a 30 item cap', () => {
  let save = Challenge.sanitizeChallengeSave({});
  for (let i = 0; i < 31; i += 1) {
    save = Challenge.updatePersonalBest(
      save,
      {
        code: `ASH-202608${String(i + 1).padStart(2, '0')}-V1-AAAA`,
        score: i,
        completedFloors: i + 1,
        durationMs: 1000,
        hpRatio: 0,
        weapon: 'sword',
        cleared: false,
        submittedAt: new Date(i * 1000).toISOString(),
      },
      'daily',
    );
  }

  assert.equal(save.recentRecords.length, 30);
  assert.equal(save.personalBest.highestFloor, 31);
  assert.equal(save.dailyBest['ASH-20260831-V1-AAAA'].score, 30);
  assert.equal(save.personalBest.weapons.sword, 30);
});

test('speed bonus follows the duration formula and normal mode does not add daily records', () => {
  assert.equal(Challenge.calculateScore({ completedFloors: 50, durationMs: 600000, cleared: true }).breakdown.speedBonus, 0);
  let save = Challenge.sanitizeChallengeSave({});
  save = Challenge.updatePersonalBest(save, { code: 'ASH-20260830-V1-AAAA', score: 10, completedFloors: 2, durationMs: 1000, weapon: 'sword' }, 'normal');
  assert.deepEqual(save.dailyBest, {});
  assert.equal(save.recentRecords.length, 0);
});

test('normal runs receive a personal score without entering daily records', () => {
  let save = Challenge.sanitizeChallengeSave({});
  save = Challenge.updatePersonalBest(save, {
    mode: 'normal',
    score: 0,
    completedFloors: 3,
    enemiesDefeated: 6,
    durationMs: 12000,
    hpRatio: 0.8,
    gold: 10,
    weapon: 'staff',
  }, 'normal');
  assert.ok(save.personalBest.highestScore > 0);
  assert.ok(save.personalBest.weapons.staff > 0);
  assert.equal(save.dailyBest && Object.keys(save.dailyBest).length, 0);
});

test('formatDuration and formatShareText produce readable summaries', () => {
  assert.equal(Challenge.formatDuration(3723000), '1:02:03');

  const text = Challenge.formatShareText({
    code: 'ASH-20260830-V1-ABCD',
    score: 1234,
    completedFloors: 17,
    durationMs: 3723000,
    weapon: 'sword',
    cleared: true,
  });

  assert.match(text, /ASH-20260830-V1-ABCD/);
  assert.match(text, /1234/);
  assert.match(text, /17/);
  assert.match(text, /1:02:03/);
});
