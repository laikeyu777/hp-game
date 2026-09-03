(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Achievements = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const definitions = [
    { id: 'sword-clear', name: '铁锋登顶', desc: '使用长剑通关 50 层。', reward: 40, test: run => run.won && run.weapon === 'sword' },
    { id: 'staff-clear', name: '星火登顶', desc: '使用法杖通关 50 层。', reward: 40, test: run => run.won && run.weapon === 'staff' },
    { id: 'crossbow-clear', name: '弦响登顶', desc: '使用弩通关 50 层。', reward: 40, test: run => run.won && run.weapon === 'crossbow' },
    { id: 'build-four', name: '流派成形', desc: '单局激活任意 4 件套。', reward: 35, test: run => run.maxBuildCount >= 4 },
    { id: 'no-shop-heal', name: '不饮星火', desc: '不购买商店回血并通关。', reward: 45, test: run => run.won && run.shopHeals === 0 },
    { id: 'low-hp-clear', name: '余烬未灭', desc: '生命低于 30% 时通关。', reward: 50, test: run => run.won && run.hpRatio < .3 },
    { id: 'boss-hunter', name: '五冠猎手', desc: '单局击败五名 Boss。', reward: 60, test: run => run.bossesDefeated >= 5 },
    { id: 'ascension-3', name: '深渊行者', desc: '通关深渊 III。', reward: 60, test: run => run.won && run.ascension >= 3 },
    { id: 'ascension-5', name: '深渊征服者', desc: '通关深渊 V。', reward: 90, test: run => run.won && run.ascension >= 5 },
    { id: 'ascension-10', name: '回廊尽头', desc: '通关深渊 X。', reward: 180, test: run => run.won && run.ascension >= 10 },
  ];

  function getDefinitions() {
    return definitions.map(({ test, ...item }) => ({ ...item }));
  }

  function evaluateRun(runSummary = {}, progress = []) {
    const completed = new Set(progress);
    return definitions.filter(item => !completed.has(item.id) && item.test(runSummary)).map(item => item.id);
  }

  function mergeProgress(progress = [], unlockedIds = []) {
    return [...new Set([...progress, ...unlockedIds])];
  }

  function getReward(ids = []) {
    const selected = new Set(ids);
    return definitions.filter(item => selected.has(item.id)).reduce((sum, item) => sum + item.reward, 0);
  }

  return { getDefinitions, evaluateRun, mergeProgress, getReward };
});
