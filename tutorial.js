(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Tutorial = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const tutorialSteps = [
    { eyebrow: '第一步', title: '自动攻击', copy: '冒险者会自动攻击最近的敌人，你只需要观察战场和生命值。' },
    { eyebrow: '第二步', title: '选择路线', copy: '左路更危险但奖励更高，中路稳定，右路更安全但收益较低。' },
    { eyebrow: '第三步', title: '释放技能', copy: '点击底部技能按钮释放主动技能，战斗结束后从强化卡中选择一张。' },
  ];

  function shouldShow(settings = {}) { return settings.tutorialSeen !== true; }
  function steps() { return tutorialSteps.map(step => ({ ...step })); }
  function complete(settings = {}) { return { ...settings, tutorialSeen: true }; }

  return { shouldShow, steps, complete };
});
