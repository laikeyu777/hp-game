const assert = require('assert');
const ShareAdapter = require('./share-adapter.js');

assert.match(ShareAdapter.createResultText({ score: 1234, completedFloors: 8 }), /1,234|1234/);
assert.match(ShareAdapter.createResultText({ mode: 'daily', code: 'ASH-20260830-V1-AAAA', score: 99 }), /ASH-20260830/);

(async () => {
  const calls = [];
  const result = await ShareAdapter.share('test', {
    navigator: { clipboard: { writeText: async text => calls.push(text) } },
    window: { open: () => calls.push('hupu') },
  });
  assert.deepEqual(result, { ok: true, method: 'clipboard' });
  assert.deepEqual(calls, ['test', 'hupu']);
  assert.deepEqual(await ShareAdapter.share('test', {}), { ok: false, method: 'unavailable' });
  console.log('share adapter tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
