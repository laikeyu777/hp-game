const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const Store = require('./leaderboard-store.js');
const Platform = require('./hupu-platform.js');

function runResult(overrides = {}) {
  return {
    completedFloors: 12,
    durationMs: 45000,
    score: 4200,
    weapon: 'crossbow',
    enemiesDefeated: 28,
    bossesDefeated: 1,
    hpRatio: 0.75,
    gold: 40,
    cleared: false,
    ...overrides,
  };
}

test('normal results enter the all-time pending queue', () => {
  const submission = Store.createSubmission(runResult(), 'normal');
  const state = Store.enqueue(Store.createState(), submission);

  assert.equal(state.pending.length, 1);
  assert.equal(state.pending[0].scope, 'all');
  assert.equal(state.pending[0].mode, 'normal');
});

test('daily results enter the queue partition for their challenge code', () => {
  const code = 'ASH-20260902-V1-7K3P';
  const submission = Store.createSubmission(runResult({ score: 4600 }), 'daily', code);
  const state = Store.enqueue(Store.createState(), submission);

  assert.equal(state.pending[0].scope, `daily:${code}`);
  assert.equal(state.pending[0].code, code);
  assert.equal(state.pending[0].mode, 'daily');
});

test('the same result is queued once even when it is submitted twice', () => {
  const submission = Store.createSubmission(runResult(), 'normal');
  let state = Store.enqueue(Store.createState(), submission);
  state = Store.enqueue(state, Store.createSubmission(runResult(), 'normal'));

  assert.equal(state.pending.length, 1);
  assert.equal(state.pending[0].submissionKey, submission.submissionKey);
});

test('a cloud failure keeps the local pending result available for retry', async () => {
  const submission = Store.createSubmission(runResult(), 'normal');
  const state = Store.enqueue(Store.createState(), submission);
  const result = await Platform.flushPending(state.pending, state);

  assert.equal(result.ok, false);
  assert.deepEqual(result.failed, [submission.submissionKey]);
  assert.equal(result.state.pending.length, 1);
  assert.equal(result.state.pending[0].submissionKey, submission.submissionKey);
});

test('the offline shell declares the final leaderboard cache revision', () => {
  const serviceWorker = fs.readFileSync('./sw.js', 'utf8');
  const game = fs.readFileSync('./game.js', 'utf8');

  assert.match(serviceWorker, /ash-corridor-v37-hupu/);
  assert.match(serviceWorker, /styles\.css\?v=12/);
  assert.match(game, /register\('sw\.js\?v=37'/);
});
