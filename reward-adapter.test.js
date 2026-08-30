const assert = require('assert');
const RewardAdAdapter = require('./reward-adapter.js');

(async () => {
  const demo = RewardAdAdapter.createDemo({ delayMs: 0 });
  assert.deepEqual(await demo.showRewardedAd(), { rewarded: true, reason: 'demo' });
  const cancelled = RewardAdAdapter.createDemo({ delayMs: 0 });
  cancelled.cancel();
  assert.deepEqual(await cancelled.showRewardedAd(), { rewarded: false, reason: 'cancelled' });
  console.log('reward adapter tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
