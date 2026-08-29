(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Ascension = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const roman = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

  function clamp(level) {
    return Math.max(0, Math.min(10, Math.floor(Number(level) || 0)));
  }

  function getAscensionModifiers(level) {
    const value = clamp(level);
    return {
      enemyHp: Math.round((1 + value * .09) * 100) / 100,
      enemyDamage: Math.round((1 + value * .065) * 1000) / 1000,
      recovery: Math.max(.45, Math.round((1 - value * .055) * 1000) / 1000),
      shopCost: Math.round((1 + Math.max(0, value - 2) * .08) * 100) / 100,
      bossPower: Math.round((1 + value * .085) * 1000) / 1000,
    };
  }

  function getNextAscension(current, won) {
    const value = clamp(current);
    return won ? Math.min(10, value + 1) : value;
  }

  function getAscensionLabel(level) {
    const value = clamp(level);
    return value === 0 ? '普通冒险' : '深渊 ' + roman[value];
  }

  return { getAscensionModifiers, getNextAscension, getAscensionLabel };
});
