(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BuildSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const tags = {
    crit: { name: '暴击', color: '#f3c95a' },
    fire: { name: '火焰', color: '#f58b4a' },
    survival: { name: '生存', color: '#66d3c2' },
    speed: { name: '攻速', color: '#9fe36b' },
    skill: { name: '技能', color: '#b68cff' },
  };

  const perkTags = {
    crit: ['crit'],
    combo: ['crit'],
    fire: ['fire'],
    blast: ['fire'],
    sustain: ['survival'],
    guard: ['survival'],
    lowhp: ['survival'],
    speed: ['speed'],
    skill: ['skill'],
  };

  function getPerkTags(perkId) {
    return [...(perkTags[perkId] || [])];
  }

  function getBuildState(perks = []) {
    const counts = Object.fromEntries(Object.keys(tags).map(tag => [tag, 0]));
    perks.forEach(perkId => getPerkTags(perkId).forEach(tag => { counts[tag] += 1; }));
    const activated = Object.fromEntries(Object.entries(counts).map(([tag, count]) => [tag, [2, 4, 6].filter(level => count >= level)]));
    return { counts, activated };
  }

  function getBuildBonuses(perks = []) {
    const { counts } = getBuildState(perks);
    return {
      critDamage: counts.crit >= 2 ? 1.35 : 1,
      critAttackSpeed: counts.crit >= 4 ? 0.82 : 1,
      executeChance: counts.crit >= 6 ? 0.12 : 0,
      burnDamage: counts.fire >= 2 ? 1.25 : 1,
      burnSpread: counts.fire >= 2,
      burnExplosion: counts.fire >= 4,
      inferno: counts.fire >= 6,
      damageTaken: counts.survival >= 2 ? 0.9 : 1,
      floorRecovery: counts.survival >= 4 ? 0.08 : 0,
      emergencyShield: counts.survival >= 6,
      attackSpeed: counts.speed >= 2 ? 0.88 : 1,
      doubleAttackChance: counts.speed >= 4 ? 0.12 : 0,
      attackRamp: counts.speed >= 6,
      skillCooldown: counts.skill >= 2 ? 0.85 : 1,
      skillDamage: counts.skill >= 4 ? 1.3 : 1,
      skillRefreshOnKill: counts.skill >= 6,
    };
  }

  return { tags, perkTags, getPerkTags, getBuildState, getBuildBonuses };
});
