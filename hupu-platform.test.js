const test = require('node:test');
const assert = require('node:assert/strict');

const HupuPlatform = require('./hupu-platform.js');

function withHost(host, run) {
  const previous = globalThis.ColorboxAI;
  const previousBase = globalThis.ACTIVITY_API_BASE;
  globalThis.ColorboxAI = host;
  globalThis.ACTIVITY_API_BASE = 'https://activity.example.test';
  return Promise.resolve()
    .then(run)
    .finally(() => {
      if (previous === undefined) delete globalThis.ColorboxAI;
      else globalThis.ColorboxAI = previous;
      if (previousBase === undefined) delete globalThis.ACTIVITY_API_BASE;
      else globalThis.ACTIVITY_API_BASE = previousBase;
    });
}

test('missing ColorboxAI returns a guest user without throwing', async () => {
  const previous = globalThis.ColorboxAI;
  delete globalThis.ColorboxAI;
  try {
    assert.deepEqual(await HupuPlatform.getUser(), { loggedIn: false, nickname: '' });
  } finally {
    if (previous === undefined) delete globalThis.ColorboxAI;
    else globalThis.ColorboxAI = previous;
  }
});

test('getUser reads only the host nickname and normalizes login state', async () => {
  await withHost({
    auth: {
      getUserInfo: async () => ({ code: 200, data: { islogin: 1, nickname: '  灰烬旅人  ', puid: 'private-id' } }),
    },
  }, async () => {
    assert.deepEqual(await HupuPlatform.getUser(), { loggedIn: true, nickname: '灰烬旅人' });
  });
});

test('request failures return a typed result and do not throw', async () => {
  await withHost({
    cloud: {
      request: async () => { throw new Error('network down'); },
    },
  }, async () => {
    const result = await HupuPlatform.request('/api/leaderboard/list');
    assert.equal(result.ok, false);
    assert.equal(typeof result.reason, 'string');
    assert.notEqual(result.reason.length, 0);
  });
});

test('request accepts null options and does not forward caller authorization headers', async () => {
  const calls = [];
  await withHost({
    cloud: {
      request: async params => {
        calls.push(params);
        return { statusCode: 200, code: 200, data: {} };
      },
    },
  }, async () => {
    const result = await HupuPlatform.request('/api/leaderboard/list', null);
    assert.equal(result.ok, true);

    await HupuPlatform.request('/api/leaderboard/list', {
      headers: { Authorization: 'Bearer private-token', 'X-Token': 'private-token', Accept: 'application/json' },
    });
    assert.deepEqual(calls[1].headers, { Accept: 'application/json' });
  });
});

test('submitLeaderboard calls the cloud adapter and normalizes its returned entry', async () => {
  const calls = [];
  await withHost({
    cloud: {
      request: async params => {
        calls.push(params);
        return { statusCode: 200, code: 200, data: { entry: { rank: 2, nickname: '灰烬旅人', score: '1234', durationMs: 5000, weapon: 'staff' } } };
      },
    },
  }, async () => {
    const result = await HupuPlatform.submitLeaderboard({ weapon: 'staff', completedFloors: 10 });
    assert.equal(result.ok, true);
    assert.equal(result.entry.score, 1234);
    assert.equal(result.entry.rank, 2);
    assert.equal(calls[0].url, 'https://activity.example.test/api/leaderboard/submit');
    assert.equal(calls[0].method, 'POST');
    assert.equal(calls[0].auth, true);
  });
});

test('submitLeaderboard rejects a remote entry without a non-empty Hupu nickname', async () => {
  await withHost({
    cloud: {
      request: async () => ({
        statusCode: 200,
        code: 200,
        data: { entry: { rank: 2, nickname: '   ', score: 1234, durationMs: 5000, weapon: 'staff' } },
      }),
    },
  }, async () => {
    const result = await HupuPlatform.submitLeaderboard({ weapon: 'staff', completedFloors: 10 });
    assert.deepEqual(result, { ok: false, reason: 'invalid_response' });
  });
});

test('fetchLeaderboard requests list and current-player rank in parallel', async () => {
  const started = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await withHost({
    cloud: {
      request: async params => {
        started.push(params.url);
        await gate;
        if (params.url.includes('/me?')) return { statusCode: 200, code: 200, data: { rank: 3, score: 90 } };
        return { statusCode: 200, code: 200, data: { entries: [{ rank: 1, nickname: 'A', score: 100 }] } };
      },
    },
  }, async () => {
    const pending = HupuPlatform.fetchLeaderboard('daily', 'ash-20260902-v1-abcd');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(started.length, 2);
    release();
    const result = await pending;
    assert.equal(result.ok, true);
    assert.equal(result.entries[0].score, 100);
    assert.equal(result.me.rank, 3);
  });
});

test('fetchLeaderboard returns only whitelisted leaderboard fields for the current player', async () => {
  await withHost({
    cloud: {
      request: async params => {
        if (params.url.includes('/me?')) {
          return {
            statusCode: 200,
            code: 200,
            data: {
              rank: 3,
              nickname: '灰烬旅人',
              score: 90,
              completedFloors: 8,
              durationMs: 12000,
              weapon: 'staff',
              submittedAt: '2026-09-02T12:00:00.000Z',
              submissionKey: 'daily-123',
              puid: 'private-id',
              userId: 'private-user-id',
              phoneNumber: '13800138000',
              unknownServerField: 'do-not-expose',
            },
          };
        }
        return { statusCode: 200, code: 200, data: { entries: [{ rank: 1, nickname: 'A', score: 100 }] } };
      },
    },
  }, async () => {
    const result = await HupuPlatform.fetchLeaderboard('all');
    assert.equal(result.ok, true);
    assert.deepEqual(result.me, {
      rank: 3,
      nickname: '灰烬旅人',
      score: 90,
      completedFloors: 8,
      durationMs: 12000,
      weapon: 'staff',
      submittedAt: '2026-09-02T12:00:00.000Z',
      submissionKey: 'daily-123',
    });
  });
});

test('flushPending attempts each submission once and reports failures for retry', async () => {
  const attempted = [];
  await withHost({
    cloud: {
      request: async params => {
        attempted.push(params.data.submissionKey);
        if (params.data.submissionKey === 'failed') return { statusCode: 503, code: 503, message: 'offline' };
        return { statusCode: 200, code: 200, data: { entry: { rank: 1, nickname: '灰烬旅人', score: 100 } } };
      },
    },
  }, async () => {
    const first = await HupuPlatform.flushPending([
      { submissionKey: 'ok', score: 100 },
      { submissionKey: 'failed', score: 90 },
    ]);
    const second = await HupuPlatform.flushPending([
      { submissionKey: 'ok', score: 100 },
      { submissionKey: 'failed', score: 90 },
    ]);
    assert.deepEqual(attempted, ['ok', 'failed']);
    assert.deepEqual(first.synced, ['ok']);
    assert.deepEqual(first.failed, ['failed']);
    assert.deepEqual(second.synced, []);
    assert.deepEqual(second.failed, ['failed']);
  });
});
