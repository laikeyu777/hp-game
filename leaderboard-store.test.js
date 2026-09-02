const test = require('node:test');
const assert = require('node:assert/strict');

const Store = require('./leaderboard-store.js');

test('createState returns versioned partitions and preserves unknown fields', () => {
  const state = Store.createState({
    version: 0,
    futureFlag: true,
    entries: { all: [{ rank: 2, score: 10 }], daily: { 'ASH-20260902-V1-ABCD': [{ rank: 1, score: 20 }] } },
    pending: [{ submissionKey: 'old', scope: 'all', score: 10 }],
  });

  assert.equal(state.version, 1);
  assert.equal(state.futureFlag, true);
  assert.deepEqual(state.entries.all, [{ rank: 2, score: 10 }]);
  assert.deepEqual(state.entries.daily['ASH-20260902-V1-ABCD'], [{ rank: 1, score: 20 }]);
  assert.equal(state.pending.length, 1);
});

test('enqueue is idempotent by submission key and caps pending records at 30', () => {
  let state = Store.createState();
  state = Store.enqueue(state, { submissionKey: 'run-1', scope: 'all', score: 100 });
  state = Store.enqueue(state, { submissionKey: 'run-1', scope: 'all', score: 999 });
  assert.equal(state.pending.length, 1);
  assert.equal(state.pending[0].score, 100);

  for (let i = 2; i <= 32; i += 1) {
    state = Store.enqueue(state, { submissionKey: `run-${i}`, scope: 'all', score: i });
  }
  assert.equal(state.pending.length, 30);
  assert.equal(state.pending[0].submissionKey, 'run-3');
  assert.equal(state.pending.at(-1).submissionKey, 'run-32');
});

test('markSynced removes pending item and updates its leaderboard partition', () => {
  let state = Store.createState();
  state = Store.enqueue(state, { submissionKey: 'run-1', scope: 'all', score: 100 });
  state = Store.markSynced(state, 'run-1', { rank: 3, score: 100 });
  assert.equal(state.pending.length, 0);
  assert.equal(Store.getCached(state, 'all')[0].rank, 3);
});

test('daily submissions are cached by challenge code without mixing all-time entries', () => {
  let state = Store.createState();
  state = Store.enqueue(state, {
    submissionKey: 'daily-1',
    scope: 'daily',
    code: 'ASH-20260902-V1-ABCD',
    score: 200,
  });
  state = Store.markSynced(state, 'daily-1', {
    rank: 1,
    score: 200,
    code: 'ASH-20260902-V1-ABCD',
  });

  assert.equal(Store.getCached(state, 'all').length, 0);
  assert.equal(Store.getCached(state, 'daily:ASH-20260902-V1-ABCD')[0].score, 200);
});

test('submission keys are stable and include score-defining run fields', () => {
  const base = {
    mode: 'daily',
    code: 'ash-20260902-v1-abcd',
    weapon: 'staff',
    completedFloors: 10,
    durationMs: 12345,
    score: 987,
  };
  const first = Store.createSubmissionKey(base);
  const second = Store.createSubmissionKey({ ...base, code: base.code.toUpperCase() });
  assert.equal(first, second);
  assert.notEqual(first, Store.createSubmissionKey({ ...base, score: 988 }));
  assert.notEqual(first, Store.createSubmissionKey({ ...base, durationMs: 12346 }));
});

test('createSubmission adds a partition and stable key without changing result inputs', () => {
  const result = { completedFloors: 4, durationMs: 5000, score: 120, weapon: 'sword' };
  const submission = Store.createSubmission(result, 'normal');
  assert.equal(submission.scope, 'all');
  assert.equal(typeof submission.submissionKey, 'string');
  assert.equal(submission.completedFloors, 4);
  assert.equal(submission.mode, 'normal');
});

test('run result queueing keeps normal and daily submissions in separate partitions', () => {
  const result = {
    completedFloors: 12,
    durationMs: 45000,
    score: 4200,
    weapon: 'crossbow',
    enemiesDefeated: 24,
  };
  let state = Store.createState();
  state = Store.enqueue(state, Store.createSubmission(result, 'normal'));
  state = Store.enqueue(state, Store.createSubmission({ ...result, score: 5100, code: 'ASH-20260902-V1-ABCD' }, 'daily', 'ASH-20260902-V1-ABCD'));

  assert.equal(state.pending.length, 2);
  assert.equal(state.pending[0].scope, 'all');
  assert.equal(state.pending[1].scope, 'daily:ASH-20260902-V1-ABCD');
  assert.notEqual(state.pending[0].submissionKey, state.pending[1].submissionKey);
});
