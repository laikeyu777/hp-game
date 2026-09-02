const test = require('node:test');
const assert = require('node:assert/strict');

const Ads = require('./ad-rewards.js');

test('grants 80 ember for three claims and refuses the fourth', () => {
  const now = new Date('2026-09-02T07:59:00Z');
  let state = Ads.sanitizeState({}, now);

  for (let claim = 1; claim <= 3; claim += 1) {
    const result = Ads.claimEssence(state, now);
    assert.equal(result.ok, true);
    assert.equal(result.reward, 80);
    assert.equal(result.state.essenceClaims, claim);
    state = result.state;
  }

  const blocked = Ads.claimEssence(state, now);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'daily_limit');
  assert.equal(blocked.reward, 0);
  assert.equal(blocked.state.essenceClaims, 3);
});

test('resets ember claims at Beijing midnight', () => {
  const previous = { essenceDate: '2026-09-02', essenceClaims: 3 };
  const status = Ads.getEssenceStatus(previous, new Date('2026-09-02T16:01:00Z'));

  assert.deepEqual(status, { used: 0, remaining: 3, canClaim: true });
  assert.deepEqual(previous, { essenceDate: '2026-09-02', essenceClaims: 3 });
});

test('normalizes malformed ad save data without mutating it', () => {
  const malformed = { essenceDate: 42, essenceClaims: 99, future: true };
  const state = Ads.sanitizeState(malformed, new Date('2026-09-02T04:00:00Z'));

  assert.deepEqual(state, { essenceDate: '2026-09-02', essenceClaims: 0 });
  assert.equal(malformed.essenceClaims, 99);
});

test('revive is available once per normal run and never in daily mode', () => {
  assert.equal(Ads.canRevive({ mode: 'normal', reviveUsed: false }), true);
  assert.equal(Ads.canRevive({ mode: 'normal', reviveUsed: true }), false);
  assert.equal(Ads.canRevive({ mode: 'daily', reviveUsed: false }), false);
});

