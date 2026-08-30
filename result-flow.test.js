const assert = require('assert');
const ResultFlow = require('./result-flow.js');

(async () => {
  const flow = ResultFlow.createFlowForTest({ hp: 0, maxHp: 100, reviveUsed: false });
  assert.equal(flow.canRevive(), true);
  assert.equal(await flow.revive(Promise.resolve({ rewarded: true })), true);
  assert.equal(flow.hp, 35);
  assert.equal(flow.reviveUsed, true);
  assert.equal(await flow.revive(Promise.resolve({ rewarded: true })), false);
  assert.equal(flow.hp, 35);

  const cancelled = ResultFlow.createFlowForTest({ hp: 0, maxHp: 100 });
  assert.equal(await cancelled.revive(Promise.resolve({ rewarded: false })), false);
  assert.equal(cancelled.hp, 0);
  assert.match(require('./share-adapter.js').createResultText(ResultFlow.buildShareResult({ mode: 'normal', completedFloors: 4 })), /层数：4/);
  console.log('result flow tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
