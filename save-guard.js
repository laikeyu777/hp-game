(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SaveGuard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createGuard() {
    const accepted = new Set();
    return {
      acceptOnce(key, action) {
        if (accepted.has(key)) return false;
        accepted.add(key);
        action?.();
        return true;
      },
    };
  }

  function sanitizeImportedSave(value, defaults = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    if (!Number.isFinite(Number(value.version)) || Number(value.version) < 1 || Number(value.version) > Number(defaults.version || 5)) return null;
    if (!Number.isFinite(Number(value.essence)) || Number(value.essence) < 0) return null;
    const knownWeapons = ['sword', 'staff', 'crossbow'];
    const unlockedWeapons = Array.isArray(value.unlockedWeapons) ? [...new Set(value.unlockedWeapons.filter(id => knownWeapons.includes(id)))] : ['sword'];
    if (!unlockedWeapons.includes('sword')) unlockedWeapons.push('sword');
    const upgrades = { ...defaults.upgrades };
    for (const key of Object.keys(upgrades)) {
      const amount = Number(value.upgrades?.[key] ?? upgrades[key]);
      if (!Number.isInteger(amount) || amount < 0 || amount > 3) return null;
      upgrades[key] = amount;
    }
    const settings = { ...defaults.settings };
    for (const key of Object.keys(settings)) {
      if (value.settings?.[key] != null && typeof value.settings[key] !== 'boolean') return null;
      settings[key] = value.settings?.[key] ?? settings[key];
    }
    return {
      ...defaults,
      ...value,
      version: Number(defaults.version || value.version),
      essence: Math.floor(Number(value.essence)),
      bestFloor: Math.max(0, Math.min(50, Math.floor(Number(value.bestFloor) || 0))),
      unlockedWeapons,
      upgrades,
      settings,
    };
  }

  const defaultGuard = createGuard();
  return { createGuard, createGuardForTest: createGuard, acceptOnce: defaultGuard.acceptOnce, sanitizeImportedSave };
});
