const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const contractPath = './docs/superpowers/specs/2026-09-02-hupu-leaderboard-api-contract.md';

function readContract() {
  return fs.readFileSync(contractPath, 'utf8');
}

test('leaderboard contract defines environment-independent list, me, and submit endpoints', () => {
  const contract = readContract();

  assert.match(contract, /GET\s+\/api\/leaderboard\/list/);
  assert.match(contract, /GET\s+\/api\/leaderboard\/me/);
  assert.match(contract, /POST\s+\/api\/leaderboard\/submit/);
  assert.match(contract, /scope=daily\|all/);
  assert.match(contract, /challenge code/i);
});

test('leaderboard contract keeps account identity server-owned and responses minimal', () => {
  const contract = readContract();
  const responseSection = contract.slice(contract.indexOf('## GET /api/leaderboard/list'));
  const responseExamples = [...responseSection.matchAll(/```json\s*([\s\S]*?)```/g)].map(match => match[1]).join('\n');

  assert.match(contract, /must not send.*account.*id/i);
  assert.match(contract, /server.*derives.*account/i);
  for (const field of ['nickname', 'rank', 'score', 'completedFloors', 'durationMs', 'weapon']) {
    assert.match(responseExamples, new RegExp(`\\b${field}\\b`));
  }
  assert.doesNotMatch(responseExamples, /puid|userId|phone|device|saveData|full save/i);
});

test('leaderboard contract requires server-side recalculation, scoped uniqueness, pagination, and validation failures', () => {
  const contract = readContract();

  assert.match(contract, /server.*recalculates.*score/i);
  assert.match(contract, /unique key.*account.*scope/i);
  assert.match(contract, /daily.*challenge code/i);
  assert.match(contract, /limit.*50/i);
  assert.match(contract, /INVALID_FLOOR/);
  assert.match(contract, /INVALID_WEAPON/);
  assert.match(contract, /INVALID_CHALLENGE_CODE/);
  assert.match(contract, /INVALID_DURATION/);
});
