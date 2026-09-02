const test = require('node:test');
const assert = require('node:assert/strict');

const BossIntro = require('./boss-intro.js');

test('keeps a standard boss arrival active for 1600 milliseconds', () => {
  const intro = BossIntro.create({
    bossName: '熔炉领主',
    mechanic: '熔岩裂缝',
    now: 1000,
    reducedMotion: false,
  });

  assert.deepEqual(intro, {
    startedAt: 1000,
    durationMs: 1600,
    name: '熔炉领主',
    mechanic: '熔岩裂缝',
    reducedMotion: false,
  });
  assert.equal(BossIntro.status(intro, 2599).active, true);
  assert.equal(BossIntro.status(intro, 2600).active, false);
});

test('shortens boss arrival when reduced motion is requested', () => {
  const intro = BossIntro.create({ bossName: '虚空先驱', mechanic: '虚空幻影', now: 50, reducedMotion: true });

  assert.equal(intro.durationMs, 600);
  assert.equal(BossIntro.status(intro, 650).active, false);
  assert.equal(BossIntro.status(intro, 650).elapsedMs, 600);
});

test('returns an inactive status for missing intro state', () => {
  assert.deepEqual(BossIntro.status(null, 200), { active: false, elapsedMs: 0, remainingMs: 0 });
});

