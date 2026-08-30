(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BossMechanics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const definitions = {
    'furnace-lord': { type: 'lava-crack', name: '熔岩裂缝', telegraphMs: 900, intervalMs: 5200, radius: 54, damageMultiplier: 1.25 },
    'frost-queen': { type: 'ice-spikes', name: '冻结冰刺', telegraphMs: 1100, intervalMs: 5600, radius: 64, damageMultiplier: 1.18, skillLockMs: 1800 },
    'root-mother': { type: 'vine-summon', name: '腐化藤蔓', telegraphMs: 800, intervalMs: 5000, radius: 48, damageMultiplier: .95, summons: 1 },
    'sky-executioner': { type: 'thunder-mark', name: '雷电标记', telegraphMs: 1000, intervalMs: 4700, radius: 58, damageMultiplier: 1.35 },
    'void-pioneer': { type: 'void-clone', name: '虚空幻影', telegraphMs: 950, intervalMs: 5400, radius: 70, damageMultiplier: 1.1, clone: true },
  };

  function getBossMechanic(bossId, phase = 1) {
    const base = definitions[bossId] || definitions['furnace-lord'];
    const phaseScale = 1 + Math.max(0, Math.min(2, phase - 1)) * .12;
    return { ...base, phase, intervalMs: Math.round(base.intervalMs / phaseScale), damageMultiplier: Math.round(base.damageMultiplier * phaseScale * 100) / 100 };
  }

  function seeded(seed) {
    const value = Math.sin(Number(seed) * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  function createBossEvent(bossId, phase, now, seed = 0) {
    const mechanic = getBossMechanic(bossId, phase), x = 54 + Math.round(seeded(seed + phase * 17) * 252), y = 84 + Math.round(seeded(seed + phase * 31) * 220);
    return { bossId, phase, type: mechanic.type, name: mechanic.name, telegraphMs: mechanic.telegraphMs, resolvesAt: now + mechanic.telegraphMs, target: { x, y, radius: mechanic.radius }, seed };
  }

  function resolveBossEvent(event, playerState = {}, enemyState = {}) {
    const mechanic = getBossMechanic(event.bossId, event.phase), baseDamage = Number(enemyState.damage) || 0;
    const result = { damage: Math.round(baseDamage * mechanic.damageMultiplier * 100) / 100, skillLockMs: 0, summons: [], clone: false, type: mechanic.type };
    if (mechanic.skillLockMs) result.skillLockMs = mechanic.skillLockMs;
    if (mechanic.summons) result.summons = [{ kind: 'thorn-bug', hp: Math.round((enemyState.hp || 60) * .35), x: event.target.x, y: event.target.y }];
    if (mechanic.clone) result.clone = true;
    if (playerState.maxHp && playerState.maxHp < 1) result.damage = 0;
    return result;
  }

  return { definitions, getBossMechanic, createBossEvent, resolveBossEvent };
});
