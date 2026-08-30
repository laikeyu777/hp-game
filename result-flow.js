(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ResultFlow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createFlowForTest(initial = {}) {
    const flow = {
      hp: Math.max(0, Number(initial.hp) || 0),
      maxHp: Math.max(1, Number(initial.maxHp) || 1),
      reviveUsed: Boolean(initial.reviveUsed),
      canRevive() { return this.hp <= 0 && !this.reviveUsed; },
      async revive(adPromise) {
        if (!this.canRevive()) return false;
        const result = await adPromise;
        if (!result?.rewarded) return false;
        this.hp = Math.max(1, Math.round(this.maxHp * .35));
        this.reviveUsed = true;
        return true;
      },
    };
    return flow;
  }

  function buildShareResult(result = {}) {
    return {
      title: '一指登塔：灰烬回廊',
      mode: result.mode || 'normal',
      code: result.code || '',
      weapon: result.weapon || '',
      weaponName: result.weaponName || result.weapon || '',
      score: Number(result.score) || 0,
      completedFloors: Math.max(0, Number(result.completedFloors) || 0),
      bossesDefeated: Math.max(0, Number(result.bossesDefeated) || 0),
      durationMs: Math.max(0, Number(result.durationMs) || 0),
      cleared: Boolean(result.cleared),
    };
  }

  return { createFlowForTest, buildShareResult };
});
