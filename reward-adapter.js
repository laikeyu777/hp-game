(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RewardAdAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDemo(options = {}) {
    const delayMs = Math.max(0, Number(options.delayMs) || 1200);
    let cancelled = false;
    return {
      cancel() { cancelled = true; },
      showRewardedAd() {
        return new Promise(resolve => {
          setTimeout(() => resolve(cancelled ? { rewarded: false, reason: 'cancelled' } : { rewarded: true, reason: 'demo' }), delayMs);
        });
      },
    };
  }

  const defaultDemo = createDemo();
  return {
    createDemo,
    showRewardedAd: () => defaultDemo.showRewardedAd(),
  };
});
